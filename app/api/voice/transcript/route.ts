import { readJsonBody, readSessionAuth, voiceJson, voiceOriginAllowed } from "@/lib/voice-demo/http";
import { saveVoiceTranscript } from "@/lib/voice-demo/limits";
import { getVoiceStore } from "@/lib/voice-demo/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stores a text transcript only: time, duration and lines.
 * No audio, and no IP address.
 */
export async function POST(req: Request) {
  if (!voiceOriginAllowed(req)) return voiceJson({ ok: false }, 403);
  const body = await readJsonBody(req);
  const auth = readSessionAuth(body);
  if (!auth || !body) return voiceJson({ ok: false }, 400);
  const { store } = getVoiceStore();
  const stored = await saveVoiceTranscript(store, {
    sessionId: auth.sessionId,
    secret: auth.secret,
    lines: body.lines,
    now: Date.now(),
  });
  if (!stored) return voiceJson({ ok: false }, 404);
  return voiceJson({ ok: true }, 200);
}
