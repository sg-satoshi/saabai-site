/**
 * GET /api/lex-me
 * Tells the Lex page whether the caller is a full Saabai admin, so admin-only
 * links (AI model settings) are hidden from firm users. Read-only; the admin
 * pages enforce access themselves. Firm users also get today's review and
 * compare usage for their own firm, for the firm dashboard. Admins are uncapped.
 */
import { resolveReviewActor, firmUsageToday } from "../../../lib/lex-review-access";
import { getDirectoryUser } from "../../../lib/user-directory";
import { LEX_DEMO_FIRM_NAME, LEX_DEMO_LABEL, LEX_DEMO_USER_NAME } from "../../../lib/lex-demo-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const actor = await resolveReviewActor(req);
    if (!actor) return Response.json({ admin: false, signedIn: false }, { status: 401 });
    if (actor.kind === "admin") return Response.json({ admin: true, signedIn: true, email: null, usage: null });
    if (actor.demo) {
      let usage = null;
      try { usage = await firmUsageToday(actor.firm); } catch { /* optional */ }
      return Response.json({ admin: false, signedIn: true, email: actor.email, name: LEX_DEMO_USER_NAME, usage, demo: { label: LEX_DEMO_LABEL, firmName: LEX_DEMO_FIRM_NAME } });
    }
    let usage = null;
    try { usage = await firmUsageToday(actor.firm); } catch { /* usage is optional on the dashboard */ }
    let name: string | null = null;
    try { name = (await getDirectoryUser(actor.email))?.name?.trim() || null; } catch { /* name is optional */ }
    return Response.json({ admin: false, signedIn: true, email: actor.email, name, usage });
  } catch (err) {
    console.error("[lex-me]", err instanceof Error ? err.name : err);
    return Response.json({ admin: false }, { status: 500 });
  }
}
