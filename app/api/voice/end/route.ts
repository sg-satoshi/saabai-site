import { readJsonBody, readSessionAuth, voiceJson, voiceOriginAllowed } from "@/lib/voice-demo/http";
import { endVoiceSession } from "@/lib/voice-demo/limits";
import { getVoiceStore } from "@/lib/voice-demo/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Releases the concurrent slot. Does not refund the daily quota. */
export async function POST(req: Request) {
  if (!voiceOriginAllowed(req)) return voiceJson({ ok: false }, 403);
  const auth = readSessionAuth(await readJsonBody(req, 4_000));
  if (!auth) return voiceJson({ ok: false }, 400);
  const { store } = getVoiceStore();
  const ended = await endVoiceSession(store, auth.sessionId, auth.secret, Date.now());
  if (!ended) return voiceJson({ ok: false }, 404);
  return voiceJson({ ok: true }, 200);
}
