/**
 * GET /api/lex-me
 * Tells the Lex page whether the caller is a full Saabai admin, so admin-only
 * links (AI model settings) are hidden from firm users. Read-only; the admin
 * pages enforce access themselves. Firm users also get today's review and
 * compare usage for their own firm, for the firm dashboard. Admins are uncapped.
 */
import { resolveReviewActor, firmUsageToday } from "../../../lib/lex-review-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const actor = await resolveReviewActor(req);
    if (!actor) return Response.json({ admin: false, signedIn: false }, { status: 401 });
    if (actor.kind === "admin") return Response.json({ admin: true, signedIn: true, email: null, usage: null });
    let usage = null;
    try { usage = await firmUsageToday(actor.firm); } catch { /* usage is optional on the dashboard */ }
    return Response.json({ admin: false, signedIn: true, email: actor.email, usage });
  } catch (err) {
    console.error("[lex-me]", err instanceof Error ? err.name : err);
    return Response.json({ admin: false }, { status: 500 });
  }
}
