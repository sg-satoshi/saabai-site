export const runtime = "edge";

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "WotOlpik2Jh26pUiTVLy";

export async function POST(req: Request) {
  const { text } = await req.json();
  if (!text?.trim()) return new Response("No text", { status: 400 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return new Response("TTS not configured", { status: 500 });

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.replace(/\|\|\|/g, " ").slice(0, 1000),
        model_id: "eleven_flash_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!res.ok) return new Response("TTS failed", { status: res.status });

  return new Response(res.body, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}
