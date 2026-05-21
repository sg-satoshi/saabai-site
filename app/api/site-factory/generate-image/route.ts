import { NextRequest } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 60;

type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";

const SIZE_MAP: Record<string, ImageSize> = {
  landscape: "1536x1024",
  portrait:  "1024x1536",
  square:    "1024x1024",
};

const NICHE_STYLE: Record<string, string> = {
  trades:                  "professional photography, warm natural lighting, Australian residential setting",
  "allied-health":         "clean clinical photography, soft natural light, calming healthcare setting",
  "professional-services": "corporate photography, modern office environment, confident professional tone",
  retail:                  "commercial product photography, bright clean studio lighting",
  hospitality:             "food and lifestyle photography, warm ambient lighting, inviting atmosphere",
  other:                   "professional photography, natural lighting, commercial quality",
};

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured. Add it in Vercel → Settings → Environment Variables." },
      { status: 503 }
    );
  }

  try {
    const { prompt, slug, size = "landscape", niche = "other", style = "photo" } = await req.json();

    if (!prompt?.trim()) {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    const imgSize = SIZE_MAP[size] ?? SIZE_MAP.landscape;
    const nicheStyle = NICHE_STYLE[niche] ?? NICHE_STYLE.other;

    const styleGuide =
      style === "illustration"
        ? "digital illustration, vibrant colors, modern flat design style"
        : style === "abstract"
        ? "abstract art, bold geometric shapes, modern graphic design"
        : nicheStyle;

    const fullPrompt = `${prompt.trim()}. ${styleGuide}. High resolution, commercial quality, no text or watermarks.`;

    // Call OpenAI directly — avoids AI SDK injecting unsupported params
    const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: fullPrompt,
        n: 1,
        size: imgSize,
        quality: "high",
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.json().catch(() => ({}));
      const msg = (err as { error?: { message?: string } }).error?.message ?? `OpenAI ${openaiRes.status}`;
      if (openaiRes.status === 429 || msg.includes("quota") || msg.includes("billing")) {
        return Response.json({ error: "OpenAI quota exceeded or billing issue. Check your OpenAI account." }, { status: 429 });
      }
      return Response.json({ error: msg }, { status: 500 });
    }

    const json = await openaiRes.json() as { data: Array<{ b64_json?: string; url?: string }> };
    const item = json.data?.[0];
    if (!item) {
      return Response.json({ error: "No image returned from OpenAI" }, { status: 500 });
    }

    // gpt-image-1 returns base64; fall back to URL download for other models
    let buffer: Buffer;
    if (item.b64_json) {
      buffer = Buffer.from(item.b64_json, "base64");
    } else if (item.url) {
      const imgRes = await fetch(item.url);
      buffer = Buffer.from(await imgRes.arrayBuffer());
    } else {
      return Response.json({ error: "No image data returned from OpenAI" }, { status: 500 });
    }

    const filename = `sites/${slug || "shared"}/generated/${Date.now()}.png`;
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
      allowOverwrite: false,
    });

    return Response.json({
      ok: true,
      url: blob.url,
      size: imgSize,
      prompt: fullPrompt,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("generate-image error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
