import {
  VOICE_COPY,
  VOICE_LIMITS,
  VOICE_MODEL,
} from "@/lib/voice-demo/config";
import { parseVoiceVariant, voiceScript } from "@/lib/voice-demo/variants";
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
 * Starts a voice session for a variant id.
 * The prompt is chosen here from a fixed allow-list. A prompt in the body is rejected.
 * Checks the daily, per-visitor and concurrent caps, then mints an ephemeral
 * token that expires after the 2 minute hard cap.
 */
async function readVariant(req: Request) {
  const raw = await req.text();
  if (raw.length > 400) return "bad" as const;
  if (!raw.trim()) return "home" as const;
  try {
    return parseVoiceVariant(JSON.parse(raw));
  } catch {
    return "bad" as const;
  }
}

export async function POST(req: Request) {
  if (!voiceOriginAllowed(req)) {
    return voiceJson({ ok: false, error: "forbidden", message: VOICE_COPY.failed }, 403);
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return unavailableResponse();

  const variant = await readVariant(req);
  if (variant === "bad") {
    return voiceJson({ ok: false, error: "bad-request", message: VOICE_COPY.failed }, 400);
  }
  const script = voiceScript(variant);

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
      variant: script.variant,
      agentName: script.agentName,
      instructions: script.instructions,
      intro: script.intro,
      wrapInstructions: script.wrapInstructions,
      keyterms: script.keyterms,
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
