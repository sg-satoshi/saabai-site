import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getPremiumModel } from "../../../../lib/chat-config";
import { put } from "@vercel/blob";
import { list } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 300;

const SYSTEM_PROMPT = `You are an expert web developer editing a live HTML website. The user will give you the current complete HTML and an instruction describing what to change.

RULES:
- Return the COMPLETE updated HTML file. Not a diff, not a snippet — the full <!DOCTYPE html> ... </html>.
- Make ONLY the changes described. Preserve everything else exactly.
- No markdown, no code fences, no explanations. Raw HTML only.
- Start immediately with <!DOCTYPE html>.
- If the instruction is ambiguous, make the most reasonable interpretation and apply it.
- Quality bar: the result must look as good or better than before the edit.`;

export async function POST(req: NextRequest) {
  try {
    const { slug, instruction, imageUrl } = await req.json();

    if (!slug || !instruction?.trim()) {
      return Response.json({ error: "slug and instruction are required" }, { status: 400 });
    }

    // Fetch current HTML from Blob
    const { blobs } = await list({ prefix: `sites/${slug}/index.html` });
    const blob = blobs.find((b) => b.pathname === `sites/${slug}/index.html`);
    if (!blob) {
      return Response.json({ error: "Site not found in storage" }, { status: 404 });
    }

    const htmlRes = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
    const currentHtml = await htmlRes.text();

    const userText = `Here is the current HTML:\n\n${currentHtml}\n\n---\n\nInstruction: ${instruction.trim()}\n\nReturn the complete updated HTML file.`;
    const stream = streamText({
      model: getPremiumModel(),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: imageUrl
            ? [
                { type: "image" as const, image: new URL(imageUrl) },
                { type: "text" as const, text: userText },
              ]
            : userText,
        },
      ],
    });

    const { textStream } = stream;
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

        try {
          let html = fullText
            .trim()
            .replace(/^```html\n?/i, "")
            .replace(/^```\n?/, "")
            .replace(/```\s*$/i, "")
            .trim();
          if (!html.toLowerCase().startsWith("<!doctype")) {
            html = `<!DOCTYPE html>\n${html}`;
          }
          await put(`sites/${slug}/index.html`, html, {
            access: "public",
            contentType: "text/html",
            addRandomSuffix: false,
            allowOverwrite: true,
          });
        } catch (e) {
          console.error("Edit save error:", e);
        }

        try { controller.close(); } catch { /* already closed */ }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Edit error:", error);
    return Response.json({ error: "Failed to edit site", detail: String(error) }, { status: 500 });
  }
}
