import { readJsonBody, readSessionAuth, voiceJson, voiceOriginAllowed } from "@/lib/voice-demo/http";
import { pulseVoiceSession } from "@/lib/voice-demo/limits";
import { getVoiceStore } from "@/lib/voice-demo/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Client heartbeat. continue:false means the 2 minute server cap has been reached. */
export async function POST(req: Request) {
  if (!voiceOriginAllowed(req)) return voiceJson({ ok: false }, 403);
  const auth = readSessionAuth(await readJsonBody(req, 4_000));
  if (!auth) return voiceJson({ ok: false }, 400);
  const { store } = getVoiceStore();
  const pulse = await pulseVoiceSession(store, auth.sessionId, auth.secret, Date.now());
  if (!pulse.ok) return voiceJson({ ok: false }, 404);
  return voiceJson({ ok: true, continue: pulse.continue, hardEndAt: pulse.hardEndAt, serverNow: pulse.serverNow }, 200);
}
