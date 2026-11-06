/** POST (admin): email the client a fresh portal sign-in link. */
import { after } from "next/server";
import { requireAdmin } from "../../../../../../../lib/audit-admin";
import { getEngagement, logEvent } from "../../../../../../../lib/audit-store";
import { portalBaseUrl, sendPortalLink } from "../../../../../../../lib/portal-blueprint/links";
import { portalAllowed } from "../../../../../../../lib/portal-blueprint/flag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const e = await getEngagement(id);
  if (!e) return Response.json({ error: "Not found" }, { status: 404 });
  if (!portalAllowed(e.contactEmail)) return Response.json({ error: "The portal is not enabled for this client yet." }, { status: 409 });
  await logEvent(id, "portal_link_sent", "Admin resent the portal link");
  const base = portalBaseUrl(req);
  after(() => sendPortalLink(e.contactEmail, { base }));
  return Response.json({ ok: true });
}
