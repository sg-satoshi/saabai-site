/**
 * GET /api/lex-me
 * Tells the Lex page whether the caller is a full Saabai admin, so admin-only
 * links (AI model settings) are hidden from firm users. Read-only; the admin
 * pages enforce access themselves. Firm users also get today's review and
 * compare usage for their own firm, for the firm dashboard. Admins are uncapped.
 */
import { resolveReviewActor, firmUsageToday } from "../../../lib/lex-review-access";
import { docUsage } from "../../../lib/lex-doc-allowance";
import { getDirectoryUser } from "../../../lib/user-directory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const actor = await resolveReviewActor(req);
    if (!actor) return Response.json({ admin: false, signedIn: false }, { status: 401 });
    if (actor.kind === "admin") return Response.json({ admin: true, signedIn: true, email: null, usage: null, docs: null });
    let usage = null;
    try { usage = await firmUsageToday(actor.firm); } catch { /* usage is optional on the dashboard */ }
    let docs = null;
    try { docs = await docUsage(actor.firm); } catch { /* document allowance is optional on the page */ }
    let name: string | null = null;
    try { name = (await getDirectoryUser(actor.email))?.name?.trim() || null; } catch { /* name is optional */ }
    return Response.json({ admin: false, signedIn: true, email: actor.email, name, usage, docs });
  } catch (err) {
    console.error("[lex-me]", err instanceof Error ? err.name : err);
    return Response.json({ admin: false }, { status: 500 });
  }
}
