import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 120;

// Build an image-generation prompt from a post topic + platform
function buildPrompt(topic: string, platform: "linkedin" | "instagram"): string {
  if (platform === "instagram") {
    return (
      `A bold, visually striking social media image for the topic: "${topic}". ` +
      "Style: modern tech-meets-professional-services aesthetic, dark navy background, " +
      "subtle teal and electric blue accents, abstract AI/automation visual elements, " +
      "cinematic lighting. No text. Square 1:1 composition. Photorealistic."
    );
  }
  // linkedin
  return (
    `A clean, professional LinkedIn post image for the topic: "${topic}". ` +
    "Style: dark navy background (#0b092e), subtle teal accent, sophisticated corporate " +
    "minimalism, soft abstract technology or business environment. No text. " +
    "Photorealistic high quality."
  );
}

export async function POST(req: Request) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return Response.json({ error: "XAI_API_KEY not configured" }, { status: 500 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "BLOB_READ_WRITE_TOKEN not configured" }, { status: 500 });
  }

  let body: { topic?: string; platform?: "linkedin" | "instagram"; prompt?: string };
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const platform = body.platform ?? "linkedin";
  const prompt = body.prompt?.trim() || (body.topic?.trim() ? buildPrompt(body.topic, platform) : null);

  if (!prompt) return Response.json({ error: "topic or prompt required" }, { status: 400 });

  // 1. Generate image with Grok
  let b64: string;
  try {
    const genRes = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "aurora",
        prompt,
        n: 1,
        response_format: "b64_json",
      }),
    });

    if (!genRes.ok) {
      const err = await genRes.text();
      console.error(`[imagine] xAI ${genRes.status}: ${err}`);
      return Response.json({ error: `Grok image API error (${genRes.status}): ${err}` }, { status: 502 });
    }

    const genData = await genRes.json() as { data: { b64_json: string }[] };
    b64 = genData.data?.[0]?.b64_json;
    if (!b64) return Response.json({ error: "No image returned from Grok" }, { status: 502 });
  } catch (err) {
    return Response.json({ error: `Image generation failed: ${String(err)}` }, { status: 500 });
  }

  // 2. Upload to Vercel Blob for a permanent public URL
  try {
    const buffer = Buffer.from(b64, "base64");
    const filename = `social/${platform}-${Date.now()}.png`;
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: "image/png",
    });
    return Response.json({ url: blob.url, prompt });
  } catch (err) {
    return Response.json({ error: `Blob upload failed: ${String(err)}` }, { status: 500 });
  }
}
