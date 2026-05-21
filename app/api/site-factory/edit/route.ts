import { NextRequest } from "next/server";
import { generateText } from "ai";
import { getPremiumModel } from "../../../../lib/chat-config";
import { put, list } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 120;

// Strip comments and collapse whitespace — reduces input tokens ~25-35%
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

const SYSTEM_PROMPT = `You are an expert web developer making surgical edits to HTML files.

OUTPUT: A JSON array of find-replace operations. Nothing else — no markdown, no explanation, no code fences.
Format: [{"f":"exact text to find","r":"replacement text"}]

RULES:
- Each "f" must be an EXACT verbatim substring of the provided HTML (whitespace included)
- Use the minimum operations to achieve the requested change
- For CSS: target only the specific property value(s) that change
- Make each "f" long enough to be unique in the document — include surrounding context if needed
- Output ONLY the raw JSON array, starting with [ and ending with ]`;

export async function POST(req: NextRequest) {
  try {
    const { slug, instruction, imageUrl } = await req.json();
    if (!slug || !instruction?.trim()) {
      return Response.json({ error: "slug and instruction are required" }, { status: 400 });
    }

    // Fetch current HTML from Blob
    const { blobs } = await list({ prefix: `sites/${slug}/index.html` });
    const blob = blobs.find((b) => b.pathname === `sites/${slug}/index.html`);
    if (!blob) return Response.json({ error: "Site not found in storage" }, { status: 404 });

    const htmlRes = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
    const originalHtml = await htmlRes.text();
    const minHtml = minifyHtml(originalHtml);

    const userText = `HTML:\n${minHtml}\n\n---\nInstruction: ${instruction.trim()}`;

    const { text: rawDiff } = await generateText({
      model: getPremiumModel(),
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: imageUrl
          ? [{ type: "image" as const, image: new URL(imageUrl) }, { type: "text" as const, text: userText }]
          : userText,
      }],
    });

    // Parse diff and apply
    let newHtml = minHtml;
    let opsApplied = 0;

    try {
      const clean = rawDiff.trim().replace(/^```json?\n?/i, "").replace(/```\s*$/i, "").trim();
      const diff = JSON.parse(clean) as Array<{ f: string; r: string }>;
      if (Array.isArray(diff) && diff.length > 0) {
        const { result, applied } = applyDiff(minHtml, diff);
        newHtml = result;
        opsApplied = applied;
      }
    } catch (e) {
      console.error("[edit-diff] parse error:", e, "\nraw:", rawDiff.slice(0, 300));
    }

    // If diff produced nothing useful, 422 so client can show an error
    if (opsApplied === 0) {
      console.warn("[edit-diff] 0 ops applied — diff may have hallucinated find-strings");
      return Response.json({ error: "Could not apply changes — please rephrase your instruction and try again." }, { status: 422 });
    }

    if (!newHtml.toLowerCase().includes("<!doctype")) {
      newHtml = `<!DOCTYPE html>\n${newHtml}`;
    }

    await put(`sites/${slug}/index.html`, newHtml, {
      access: "public",
      contentType: "text/html",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // Return the updated HTML directly so the client can refresh the preview instantly
    return new Response(newHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Ops-Applied": String(opsApplied),
      },
    });
  } catch (error) {
    console.error("Edit error:", error);
    return Response.json({ error: "Failed to edit site", detail: String(error) }, { status: 500 });
  }
}
