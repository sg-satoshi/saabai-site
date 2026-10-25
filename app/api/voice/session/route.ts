import {
  VOICE_AGENT_NAME,
  VOICE_COPY,
  VOICE_LIMITS,
  VOICE_MODEL,
  voiceIntro,
  VOICE_WRAP_INSTRUCTIONS,
} from "@/lib/voice-demo/config";
import { buildVoiceInstructions } from "@/lib/voice-demo/prompt";
import {
  capResponse,
  unavailableResponse,
  voiceJson,
  voiceOriginAllowed,
  voiceRequestContext,
} from "@/lib/voice-demo/http";
import { refundVoiceSession, reserveVoiceSession, tightenVoiceDeadline } from "@/lib/voice-demo/limits";
import { getVoiceStore } from "@/lib/voice-demo/store";
import { mintVoiceToken } from "@/lib/voice-demo/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Starts a homepage voice session.
 * Checks the daily, per-visitor and concurrent caps, then mints an xAI
 * ephemeral token that expires after the 2 minute hard cap.
 */
export async function POST(req: Request) {
  if (!voiceOriginAllowed(req)) {
    return voiceJson({ ok: false, error: "forbidden", message: VOICE_COPY.failed }, 403);
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return unavailableResponse();

  const ctx = voiceRequestContext(req);
  const { store } = getVoiceStore();
  const now = Date.now();
  const reserved = await reserveVoiceSession(store, { visitorId: ctx.visitorId, ipHash: ctx.ipHash, now });
  if (!reserved.ok) return capResponse(reserved.reason, ctx);

  try {
    const minted = await mintVoiceToken({ apiKey, ttlSeconds: VOICE_LIMITS.hardSeconds });
    if (!minted.ok) {
      console.error("voice token failed", minted.status);
      await refundVoiceSession(store, reserved.sessionId, reserved.secret, now);
      return voiceJson({ ok: false, error: "unavailable", message: VOICE_COPY.failed }, 502, ctx);
    }

    let hardEndAt = reserved.hardEndAt;
    if (minted.expiresAtMs && minted.expiresAtMs < hardEndAt) {
      hardEndAt = minted.expiresAtMs;
      await tightenVoiceDeadline(store, reserved.sessionId, reserved.secret, hardEndAt, now);
    }

    return voiceJson({
      ok: true,
      sessionId: reserved.sessionId,
      secret: reserved.secret,
      token: minted.token,
      model: VOICE_MODEL,
      agentName: VOICE_AGENT_NAME,
      instructions: buildVoiceInstructions(),
      intro: voiceIntro(),
      wrapInstructions: VOICE_WRAP_INSTRUCTIONS,
      startedAt: reserved.startedAt,
      hardEndAt,
      serverNow: Date.now(),
    }, 200, ctx);
  } catch (err) {
    console.error("voice session failed", err instanceof Error ? err.name : "error");
    await refundVoiceSession(store, reserved.sessionId, reserved.secret, now).catch(() => {});
    return voiceJson({ ok: false, error: "unavailable", message: VOICE_COPY.failed }, 502, ctx);
  }
}
