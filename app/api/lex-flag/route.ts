/**
 * POST /api/lex-flag
 * A signed-in Lex user flags a problem with an answer. Saved to Redis (lex:flags,
 * newest 500) for the Saabai team to review. Internal only: no email is sent.
 */
import { resolveReviewActor } from "../../../lib/lex-review-access";
import { getRedis } from "../../../lib/redis";
import { FLAG_REASONS, normalizeFlag } from "../../../lib/lex-flag";
import { appVersion, saveFeedback } from "../../../lib/lex-feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const actor = await resolveReviewActor(req);
  if (!actor) return Response.json({ error: "Sign in to flag an answer" }, { status: 401 });
  const flag = normalizeFlag(await req.json().catch(() => null));
  if (!flag) return Response.json({ error: "reason and answer required" }, { status: 400 });
  const redis = getRedis();
  if (!redis) return Response.json({ error: "Flag storage unavailable" }, { status: 503 });
  try {
    const by = actor.kind === "firm" ? actor.email : `admin:${actor.id}`;
    await redis.lpush("lex:flags", JSON.stringify({ ...flag, by }));
    await redis.ltrim("lex:flags", 0, 499);
    // Also file it in the feedback inbox (triage status, tags, export). Note only: the answer text stays in lex:flags.
    try {
      const label = FLAG_REASONS.find((r) => r.key === flag.reason)?.label ?? flag.reason;
      await saveFeedback({ type: "answer_flag", message: `${label}${flag.note ? `: ${flag.note}` : ""} (thread ${flag.threadId || "unknown"})`, page: "/lex (answer)", screenshot: null },
        { firm: actor.kind === "firm" ? actor.firm : "saabai-staff", user: by, browser: req.headers.get("user-agent") ?? "", appVersion: appVersion(), source: "flag" });
    } catch (e) { console.error("[lex-flag] feedback copy failed", e instanceof Error ? e.name : "error"); }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[lex-flag]", err instanceof Error ? err.name : err);
    return Response.json({ error: "Could not save the flag" }, { status: 500 });
  }
}
