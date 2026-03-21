export const runtime = "edge";

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "WotOlpik2Jh26pUiTVLy";

// Models in preference order — flash is fastest but requires a paid plan
const MODELS = ["eleven_flash_v2_5", "eleven_turbo_v2_5", "eleven_multilingual_v2"];

export async function POST(req: Request) {
  const { text, voiceId } = await req.json();
  if (!text?.trim()) return new Response("No text", { status: 400 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return new Response("TTS not configured", { status: 500 });

  const activeVoiceId = voiceId || VOICE_ID;

  const cleanText = text
    .replace(/\|\|\|/g, " ")
    .replace(/Saabai\.ai/gi, "Saarbye dot ai")
    .replace(/Saabai/gi, "Saarbye")
    .slice(0, 1000);

  for (const model_id of MODELS) {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${activeVoiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (res.ok) {
      return new Response(res.body, {
        headers: { "Content-Type": "audio/mpeg", "X-Model": model_id },
      });
    }

    // If it's a plan/model error (422 or 401), try the next model
    // For auth errors (401) or quota (429), no point retrying other models
    if (res.status === 401 || res.status === 429) {
      const body = await res.text();
      return new Response(`ElevenLabs error ${res.status}: ${body}`, { status: res.status });
    }
    // Otherwise try next model
  }

  return new Response("TTS failed — no model succeeded", { status: 502 });
}
