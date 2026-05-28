import { NextRequest } from "next/server";
import { streamText, generateText } from "ai";
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

// Find snippets in html that contain key words from failedF, to help AI self-correct
function findNearestSnippets(html: string, failedF: string, maxResults = 3): string[] {
  const words = failedF
    .replace(/[{}()"';:]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 5 && !/^(https?|class|style|href|data)$/.test(w));

  const found: string[] = [];
  const window = Math.max(failedF.length + 30, 80);

  for (const word of words.slice(0, 4)) {
    let idx = html.indexOf(word);
    while (idx !== -1 && found.length < maxResults) {
      const start = Math.max(0, idx - 15);
      const snippet = html.slice(start, start + window);
      if (!found.some(f => f.includes(word))) found.push(snippet);
      idx = html.indexOf(word, idx + 1);
    }
    if (found.length >= maxResults) break;
  }
  return found;
}

async function selfCorrect(
  failedOps: Array<{ f: string; r: string }>,
  html: string
): Promise<Array<{ f: string; r: string }>> {
  const context = failedOps
    .map(op => {
      const snippets = findNearestSnippets(html, op.f);
      const hint = snippets.length > 0
        ? `Nearest HTML snippets:\n${snippets.map(s => `  "${s}"`).join("\n")}`
        : "No similar text found — this change may not apply.";
      return `Wanted to find: "${op.f}"\nWanted to replace with: "${op.r}"\n${hint}`;
    })
    .join("\n\n");

  const { text } = await generateText({
    model: getPremiumModel(),
    messages: [
      {
        role: "user",
        content: `These diff ops failed because the "f" strings weren't found verbatim in the HTML. Correct them using the nearest snippets shown.

${context}

Rules:
- Copy "f" character-for-character from one of the "Nearest HTML snippets" shown
- Keep the same intent for "r" (the replacement) — adjust only "f" to match what's actually there
- If no snippet is close enough, omit that op
- Respond with ONLY a valid JSON array: [{"f":"...","r":"..."}]`,
      },
    ],
  });

  try {
    const clean = text.trim().replace(/^```json?\n?/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(clean) as Array<{ f: string; r: string }>;
  } catch {
    return [];
  }
}

function buildSystemPrompt(siteName?: string, niche?: string): string {
  const siteContext = siteName
    ? `You are working on ${siteName}${niche ? `, a ${niche} business` : ""}.`
    : "You are working on this website.";

  return `You are a world-class web designer and digital marketer. You have 15+ years turning ordinary websites into businesses that grow. Your work sits at the intersection of design, conversion optimisation, and brand storytelling. You have worked with everyone from local trades to global brands.

${siteContext} Treat this as a real client engagement — you care about their results, not just their approval.

Your character:
- Confident and direct. You don't hedge everything with "it depends" — you have a point of view and you give it
- Outcome-obsessed: every design decision connects to a business result (trust, conversions, clarity, retention)
- Genuinely curious about the client's goals. You ask about their customers, not just their colour palette
- Noticeably smart about copy. You know that "Book a Free Consultation" outperforms "Contact Us" by miles
- Willing to push back. If something will hurt performance, you say so and explain why
- You spot problems the client hasn't noticed yet, and you mention them even when not asked

What you know at expert level:
- **Conversion:** above-the-fold clarity, CTA hierarchy, reducing friction, landing page structure, trust signals
- **Copywriting:** value-proposition headlines, benefit-led body copy, CTAs that actually get clicked, social proof placement
- **Visual design:** typography as voice, whitespace as tool, colour contrast, visual hierarchy, negative space
- **Marketing psychology:** what builds trust fast, scarcity and urgency when authentic, the role of specificity in credibility
- **Local and service businesses:** what clients in ${niche ?? "this industry"} actually need to convert — it is not the same as e-commerce
- **SEO:** heading structure, meta copy, structured data, page speed fundamentals
- **Mobile-first:** most traffic is on phones — you call out anything that breaks or weakens on small screens

How you communicate:
- Lead with the business impact, then the fix: "Your hero headline is generic — nobody knows what you do. Change it to something specific and you will cut your bounce rate."
- When asked what to improve: give your three highest-impact recommendations, ranked by ROI not effort
- Use markdown naturally: **bold** key terms, use bullets for options, keep paragraphs short
- Be conversational and real — like a brilliant colleague, not a corporate tool
- Never open with filler ("Certainly!", "Great question!", "Of course!") — just say the thing
- No em dashes in your writing. Use a comma, colon, or rewrite the sentence

---

MAKING CHANGES:
When the client asks you to change, update, add, fix, or remove anything — act immediately. No preamble. Use this format:

[One sentence: what you are doing, present tense, specific]
<CHANGES>[{"f":"...","r":"..."}]</CHANGES>
[Confirm it is done. Say why it is better for the business in one or two sentences.]

If you notice a related issue worth flagging, mention it after the confirmation — but do not make uninstructed changes.

---

DIFF RULES — the HTML you receive is MINIFIED (whitespace collapsed, tags joined with "><"):
- "f" must be EXACT verbatim — copy character-for-character from the HTML shown
- Tags are joined: "</section><footer" not "</section> <footer"
- CSS in style blocks keeps spaces after colons: " color: #fff;" not " color:#fff;"
- Inline styles keep spaces: style="color: #fff; padding: 20px;"
- Each "f" should be 40-100 chars — unique enough to match exactly once
- One op per logical change
- NEVER wrap <CHANGES> in backticks or markdown fences

ANIMATED COUNTERS: Count-up numbers use data-target="200" — edit the attribute, not the visible text.

CRITICAL: Before writing any "f", verify it exists verbatim in the HTML. If you cannot find it, ask rather than guess. A wrong "f" silently fails.`;
}

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
    const { slug, siteName, niche, instruction, imageUrl, history = [] } = await req.json();
    if (!slug || (!instruction?.trim() && !imageUrl)) {
      return Response.json({ error: "slug and instruction are required" }, { status: 400 });
    }

    // Fetch current HTML — prefer draft over live
    const { blobs } = await list({ prefix: `sites/${slug}/` });
    const draftBlob = blobs.find((b) => b.pathname === `sites/${slug}/draft.html`);
    const liveBlob  = blobs.find((b) => b.pathname === `sites/${slug}/index.html`);
    const blob = draftBlob ?? liveBlob;
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
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 2000) }));

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
      system: buildSystemPrompt(siteName, niche),
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
              let { result, applied } = applyDiff(minHtml, diff);
              opsApplied = applied;

              // Self-correction: if some ops failed, let the AI try to fix their "f" strings
              const failedOps = diff.filter(op => op.f && !minHtml.includes(op.f));
              if (failedOps.length > 0) {
                try {
                  const correctedOps = await selfCorrect(failedOps, minHtml);
                  if (correctedOps.length > 0) {
                    const { result: result2, applied: applied2 } = applyDiff(result, correctedOps);
                    if (applied2 > 0) {
                      result = result2;
                      opsApplied += applied2;
                    }
                  }
                } catch (e) {
                  console.error("[edit-self-correct]", e);
                }
              }

              if (opsApplied > 0) {
                let newHtml = result;
                if (!newHtml.toLowerCase().includes("<!doctype")) {
                  newHtml = `<!DOCTYPE html>\n${newHtml}`;
                }
                await put(`sites/${slug}/draft.html`, newHtml, {
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
