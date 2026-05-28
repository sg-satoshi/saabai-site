import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getPremiumModel } from "../../../../lib/chat-config";
import { buildDesignerPersona } from "../../../../lib/site-factory-prompt";
import { list } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 60;

function extractSiteSummary(html: string): string {
  const parts: string[] = [];

  const sectionIds = [...html.matchAll(/<section[^>]+id="([^"]+)"/gi)].map(m => m[1]);
  if (sectionIds.length) parts.push(`Sections: ${sectionIds.join(", ")}`);

  const navLinks = [...html.matchAll(/<a[^>]*href="#[^"]*"[^>]*>([^<]{2,30})<\/a>/gi)]
    .map(m => m[1].trim())
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 8);
  if (navLinks.length) parts.push(`Navigation: ${navLinks.join(" | ")}`);

  const headings = [...html.matchAll(/<h[12][^>]*>([^<]{3,})<\/h[12]>/gi)]
    .map(m => m[1].replace(/<[^>]+>/g, "").trim())
    .filter(Boolean)
    .slice(0, 8);
  if (headings.length) parts.push(`Headings: ${headings.map(h => `"${h}"`).join(", ")}`);

  const ctaText = [...html.matchAll(/<(?:button|a)[^>]*class="[^"]*(?:btn|cta|button)[^"]*"[^>]*>([^<]{2,40})<\/(?:button|a)>/gi)]
    .map(m => m[1].trim())
    .filter(Boolean)
    .slice(0, 5);
  if (ctaText.length) parts.push(`CTAs: ${ctaText.map(c => `"${c}"`).join(", ")}`);

  const cssVars = [...html.matchAll(/--(?:color|bg|primary|secondary|accent|brand|font|heading|text)[^:\s]*:\s*([^;}\n]{2,40})/gi)]
    .map(m => `${m[0].split(":")[0].trim()}: ${m[1].trim()}`)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 10);
  if (cssVars.length) parts.push(`Brand tokens:\n${cssVars.map(v => `  ${v}`).join("\n")}`);

  const paraMatch = html.match(/<p[^>]*>([^<]{40,})<\/p>/i);
  if (paraMatch) parts.push(`Hero copy snippet: "${paraMatch[1].trim().slice(0, 160)}"`);

  return parts.join("\n");
}

const CONVERSATION_RULES = `

---

CONVERSATION MODE — think and advise, do not make changes.

- Give honest, specific opinions on what is and isn't working on this site
- Suggest concrete improvements and connect each one to a real business outcome
- Answer design and marketing questions with depth and confidence
- If the user asks you to make a specific change, confirm you can do it and invite them: "Want me to make that change now?"
- If you spot something worth fixing that they haven't mentioned, flag it at the end

Do NOT output <CHANGES> or <SECTION_REWRITE> blocks — no code, no HTML, no diffs.
Respond in plain prose and markdown. No filler. No hedging.`;

export async function POST(req: NextRequest) {
  try {
    const { slug, siteName, niche, message, history = [] } = await req.json();
    if (!slug || !message?.trim()) {
      return Response.json({ error: "slug and message are required" }, { status: 400 });
    }

    let siteSummary = "";
    try {
      const { blobs } = await list({ prefix: `sites/${slug}/` });
      const blob =
        blobs.find(b => b.pathname === `sites/${slug}/draft.html`) ??
        blobs.find(b => b.pathname === `sites/${slug}/index.html`);
      if (blob) {
        const htmlRes = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
        const html = await htmlRes.text();
        siteSummary = extractSiteSummary(html);
      }
    } catch { /* continue without summary */ }

    const systemPrompt = buildDesignerPersona(siteName, niche) + CONVERSATION_RULES;

    const priorMessages = (history as Array<{ role: string; content: string }>)
      .filter(m => (m.role === "user" || m.role === "assistant") && m.content)
      .slice(-12)
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 3000) }));

    const userContent = siteSummary
      ? `${message}\n\n---\nSite overview:\n${siteSummary}`
      : message;

    const { textStream } = streamText({
      model: getPremiumModel(),
      system: systemPrompt,
      messages: [...priorMessages, { role: "user", content: userContent }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of textStream) {
          try { controller.enqueue(encoder.encode(chunk)); } catch { break; }
        }
        // Emit RESULT marker so client parser knows this was a chat-only response
        try { controller.enqueue(encoder.encode(`<RESULT>{"opsApplied":0,"mode":"chat"}</RESULT>`)); } catch { /* */ }
        try { controller.close(); } catch { /* */ }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[site-factory/converse]", msg);
    return new Response(msg, { status: 500 });
  }
}
