import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getPremiumModel } from "../../../../lib/chat-config";
import { put, list } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 120;

function minifyHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .replace(/>\s+</g, "><")
    .trim();
}

function applyDiff(html: string, diff: Array<{ f: string; r: string }>): { result: string; applied: number } {
  let result = html;
  let applied = 0;
  for (const op of diff) {
    if (op.f && result.includes(op.f)) {
      result = result.replace(op.f, op.r ?? "");
      applied++;
    } else {
      console.warn(`[edit-diff] no match for: "${op.f?.slice(0, 80)}"`);
    }
  }
  return { result, applied };
}

const SYSTEM_PROMPT = `You are a web design assistant that edits client websites. Direct personality. No filler phrases.

CRITICAL RULE: When the user asks you to make ANY change, you MUST output a <CHANGES> block. Do NOT describe what you plan to do or what you see in the HTML. Do NOT say "I need to..." or "I can see...". Just do it. If you described something in a previous message but didn't produce <CHANGES>, you failed — fix it now by outputting <CHANGES> immediately.

RESPONSE FORMAT:

1. MAKING CHANGES: One short sentence saying what you changed (past tense), then immediately:
<CHANGES>[{"f":"exact text","r":"replacement"}]</CHANGES>

2. CONVERSATION ONLY (genuine clarification needed, nothing to change): Respond naturally — no <CHANGES> block. Only use this when you truly cannot make the change without more info.

DIFF RULES — HTML is MINIFIED (whitespace stripped, tags joined with "><"):
- "f" must be EXACT verbatim — copy character-for-character from the HTML shown
- Tags are joined: "</section><footer" not "</section> <footer"
- CSS values have no spaces: "color:#fff" not "color: #fff"
- Make each "f" 40-100 chars — unique enough to match exactly once
- Minimum ops — one op per logical change
- To add before footer: f="</section><footer", r="[new html]</section><footer"
- To change a colour: f="background-color:#abc123", r="background-color:#newval"
- NEVER wrap <CHANGES> in backticks or markdown
- Never use em dashes (—) in any copy you write. Use a comma, colon, or rewrite instead.`;

// Fetch a URL and return its visible text content (strips tags, collapses whitespace)
async function fetchUrlContent(url: string): Promise<{ text: string; imageUrls: string[] }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { text: `[Could not fetch ${url}: HTTP ${res.status}]`, imageUrls: [] };
    const html = await res.text();

    // Extract image URLs before stripping tags
    const imgMatches = [...html.matchAll(/(?:src|data-src)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)/gi)];
    const imageUrls = [...new Set(imgMatches.map(m => m[1]))].slice(0, 12);

    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    return { text: cleaned.slice(0, 6000), imageUrls };
  } catch {
    return { text: `[Could not fetch ${url}]`, imageUrls: [] };
  }
}

// Download an image URL and re-upload to Vercel Blob, returning the public blob URL
async function proxyImage(srcUrl: string, slug: string): Promise<string | null> {
  try {
    const res = await fetch(srcUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SiteFactory/1.0)", "Referer": new URL(srcUrl).origin },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 8_000_000) return null; // skip > 8MB
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = srcUrl.split(".").pop()?.split(/[?#]/)[0]?.toLowerCase() ?? "jpg";
    const safeExt = ["jpg","jpeg","png","webp","gif"].includes(ext) ? ext : "jpg";
    const hash = Buffer.from(srcUrl).toString("base64url").slice(0, 16);
    const { url } = await put(`sites/${slug}/images/${hash}.${safeExt}`, buf, {
      access: "public", contentType, addRandomSuffix: false, allowOverwrite: true,
    });
    return url;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { slug, instruction, imageUrl, history = [] } = await req.json();
    if (!slug || (!instruction?.trim() && !imageUrl)) {
      return Response.json({ error: "slug and instruction are required" }, { status: 400 });
    }

    // Fetch current HTML
    const { blobs } = await list({ prefix: `sites/${slug}/index.html` });
    const blob = blobs.find((b) => b.pathname === `sites/${slug}/index.html`);
    if (!blob) return Response.json({ error: "Site not found in storage" }, { status: 404 });

    const htmlRes = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
    const originalHtml = await htmlRes.text();
    const minHtml = minifyHtml(originalHtml);

    // Extract any URLs from the instruction — fetch content AND proxy any images found
    const urlMatches = instruction?.match(/https?:\/\/[^\s"'>]+/g) ?? [];

    // Split: page URLs (html) vs direct image URLs
    const imageExtRe = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i;
    const directImageUrls = urlMatches.filter((u: string) => imageExtRe.test(u));
    const pageUrls = urlMatches.filter((u: string) => !imageExtRe.test(u));

    // Fetch page content + embedded image list
    const fetchedPages = await Promise.all(
      pageUrls.slice(0, 3).map(async (url: string) => {
        const { text, imageUrls } = await fetchUrlContent(url);
        // Proxy all images found on the page
        const proxied = await Promise.all(
          imageUrls.map(async (imgUrl: string) => {
            const blobUrl = await proxyImage(imgUrl, slug);
            return blobUrl ? `  ${imgUrl}\n  -> USE THIS URL: ${blobUrl}` : null;
          })
        );
        const imgSection = proxied.filter(Boolean).length > 0
          ? `\nImages from this page (proxied to Vercel Blob — use the "USE THIS URL" versions):\n${proxied.filter(Boolean).join("\n")}`
          : "";
        return `\n--- Content fetched from ${url} ---\n${text}${imgSection}\n---`;
      })
    );

    // Proxy any direct image URLs pasted in the instruction
    const proxiedDirectImages = await Promise.all(
      directImageUrls.slice(0, 5).map(async (imgUrl: string) => {
        const blobUrl = await proxyImage(imgUrl, slug);
        return blobUrl
          ? `  Original: ${imgUrl}\n  USE THIS URL: ${blobUrl}`
          : `  [Could not proxy ${imgUrl}]`;
      })
    );
    const directImgContext = proxiedDirectImages.length > 0
      ? `\n--- Direct image URLs (proxied to Vercel Blob) ---\n${proxiedDirectImages.join("\n")}\n---`
      : "";

    const urlContext = [...fetchedPages, directImgContext].join("\n");

    // Build conversation history — text only, no HTML in prior turns
    const priorMessages = (history as Array<{ role: string; content: string }>)
      .filter(m => (m.role === "user" || m.role === "assistant") && m.content)
      .slice(-8)
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 400) }));

    // Current turn: instruction + fetched URL content + fresh HTML
    const currentText = `Instruction: ${instruction?.trim() || "Apply the uploaded image to the site (use as logo or hero background)"}
${urlContext}
Current site HTML (minified):
${minHtml}`;

    const currentContent = imageUrl
      ? [{ type: "image" as const, image: new URL(imageUrl) }, { type: "text" as const, text: currentText }]
      : currentText;

    const { textStream } = streamText({
      model: getPremiumModel(),
      system: SYSTEM_PROMPT,
      messages: [
        ...priorMessages,
        { role: "user", content: currentContent },
      ],
    });

    // Stream to client; accumulate full text server-side for diff extraction + save
    const encoder = new TextEncoder();
    let fullText = "";

    const readable = new ReadableStream({
      async start(controller) {
        const reader = textStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += value;
          try { controller.enqueue(encoder.encode(value)); } catch { /* client disconnected */ }
        }

        // Extract and apply diff after stream completes
        let opsApplied = 0;
        let updatedHtml: string | null = null;
        const changesMatch = fullText.match(/<CHANGES>([\s\S]*?)<\/CHANGES>/);
        if (changesMatch) {
          try {
            const clean = changesMatch[1].trim().replace(/^```json?\n?/i, "").replace(/```\s*$/i, "").trim();
            const diff = JSON.parse(clean) as Array<{ f: string; r: string }>;
            if (Array.isArray(diff) && diff.length > 0) {
              const { result, applied } = applyDiff(minHtml, diff);
              opsApplied = applied;
              if (applied > 0) {
                let newHtml = result;
                if (!newHtml.toLowerCase().includes("<!doctype")) {
                  newHtml = `<!DOCTYPE html>\n${newHtml}`;
                }
                await put(`sites/${slug}/index.html`, newHtml, {
                  access: "public",
                  contentType: "text/html",
                  addRandomSuffix: false,
                  allowOverwrite: true,
                });
                updatedHtml = newHtml;
              }
            }
          } catch (e) {
            console.error("[edit-diff] parse error:", e, "\nraw:", changesMatch[1].slice(0, 300));
          }
        }

        // Append result marker + inline updated HTML (avoids CDN propagation delay on client fetch)
        try {
          let tail = `<RESULT>{"opsApplied":${opsApplied}}</RESULT>`;
          if (updatedHtml) {
            tail += `<HTML>${Buffer.from(updatedHtml).toString("base64")}</HTML>`;
          }
          controller.enqueue(encoder.encode(tail));
        } catch { /* client gone */ }
        try { controller.close(); } catch { /* already closed */ }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Site-Slug": slug,
      },
    });
  } catch (error) {
    console.error("Edit error:", error);
    return Response.json({ error: "Failed to edit site", detail: String(error) }, { status: 500 });
  }
}
