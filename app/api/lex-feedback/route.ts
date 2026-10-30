/**
 * POST /api/lex-feedback: a signed-in Lex user reports a bug, idea or question from any Lex screen.
 * Caller, firm, browser and app version come from the server (signed cookies, headers), never the body.
 * Saved to Redis (lib/lex-feedback) and Saabai is alerted via the existing lexAlert (hello@saabai.ai only;
 * the alert carries type, firm and page, never the message or screenshot). No email to the user.
 */
import { resolveReviewActor } from "@/lib/lex-review-access";
import { alertFeedback, appVersion, saveFeedback, validateFeedback } from "@/lib/lex-feedback";
import { lexAlert } from "@/lib/lex-subscription-emails";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const PER_HOUR = 20;

export async function POST(req: Request) {
  const actor = await resolveReviewActor(req);
  if (!actor) return Response.json({ error: "Sign in to send feedback" }, { status: 401 });
  const v = validateFeedback(await req.json().catch(() => null));
  if (!v.ok) return Response.json({ error: v.error, field: v.field }, { status: 400 });
  const user = actor.kind === "firm" ? actor.email : `admin:${actor.id}`;
  try {
    const r = getRedis();
    if (r) {
      const k = `lex:feedback:rl:${user}`;
      const n = Number(await r.incr(k));
      if (n === 1) await r.expire(k, 3600);
      if (n > PER_HOUR) return Response.json({ error: "Thanks, that's a lot of feedback for one hour. Please try again later." }, { status: 429 });
    }
    const item = await saveFeedback(v.value, {
      firm: actor.kind === "firm" ? actor.firm : "saabai-staff", user,
      browser: req.headers.get("user-agent") ?? "", appVersion: appVersion(),
    });
    await alertFeedback(item, lexAlert);
    return Response.json({ ok: true, id: item.id, screenshotSkipped: v.value.screenshotRejected });
  } catch (err) {
    console.error("[lex-feedback]", err instanceof Error ? err.name : "error");
    return Response.json({ error: "Could not send. Please try again." }, { status: 500 });
  }
}
