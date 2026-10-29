import { portalAllowed, portalEnabled } from "../../../../../lib/portal-blueprint/flag";
import { getBpSession } from "../../../../../lib/portal-blueprint/session";
import { findEngagementsByEmail } from "../../../../../lib/audit-store";
import { notFound, publicView } from "../../../../../lib/portal-blueprint/api";
import { answersOf, computeProgress } from "../../../../../lib/portal-blueprint/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!portalEnabled()) return notFound();
  const s = await getBpSession();
  if (!s) return Response.json({ error: "Please sign in" }, { status: 401 });
  const list = portalAllowed(s.email) ? await findEngagementsByEmail(s.email) : [];
  return Response.json({
    engagements: list.map((e) => ({ ...publicView(e), progress: computeProgress(e, answersOf(e)).percent })),
  });
}
