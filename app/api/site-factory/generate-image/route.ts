import { NextRequest } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 60;

type DalleSize = "1024x1024" | "1792x1024" | "1024x1792";

const SIZE_MAP: Record<string, DalleSize> = {
  landscape: "1792x1024",
  portrait:  "1024x1792",
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

    const dalleSize = SIZE_MAP[size] ?? SIZE_MAP.landscape;
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
        model: "dall-e-3",
        prompt: fullPrompt,
        n: 1,
        size: dalleSize,
        quality: "hd",
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

    const json = await openaiRes.json() as { data: Array<{ url: string }> };
    const imageUrl = json.data?.[0]?.url;
    if (!imageUrl) {
      return Response.json({ error: "No image returned from DALL-E" }, { status: 500 });
    }

    // Download the image and re-upload to Vercel Blob (OpenAI URLs expire after ~1h)
    const imgRes = await fetch(imageUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
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
      size: dalleSize,
      prompt: fullPrompt,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("generate-image error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
