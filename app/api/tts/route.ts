export const runtime = "edge";

// xAI TTS voices: ara (warm), eve (energetic), rex (confident), sal (smooth), leo (authoritative)
const DEFAULT_VOICE = process.env.XAI_TTS_VOICE ?? "ara";

export async function POST(req: Request) {
  const { text, voiceId } = await req.json();
  if (!text?.trim()) return new Response("No text", { status: 400 });

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return new Response("TTS not configured", { status: 500 });

  const cleanText = text
    .replace(/\|\|\|/g, " ")
    .replace(/Saabai\.ai/gi, "Saarbye dot ai")
    .replace(/Saabai/gi, "Saarbye")
    .slice(0, 1000);

  // voiceId passed from clients is an ElevenLabs ID — ignore it, use xAI voice names only
  const activeVoice = (voiceId && ["ara", "eve", "rex", "sal", "leo"].includes(voiceId))
    ? voiceId
    : DEFAULT_VOICE;

  const res = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: cleanText,
      language: "auto",
      voice_id: activeVoice,
      output_format: {
        codec: "mp3",
        sample_rate: 24000,
        bit_rate: 128000,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return new Response(`xAI TTS error ${res.status}: ${body}`, { status: res.status });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "X-Voice": activeVoice,
    },
  });
}
