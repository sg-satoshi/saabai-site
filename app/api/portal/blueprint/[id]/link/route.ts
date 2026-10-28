/** POST /api/portal/blueprint/[id]/link: "Save and come back later". Emails a fresh sign-in link to the signed-in buyer. */
import { after } from "next/server";
import { guardEngagement } from "../../../../../../lib/portal-blueprint/api";
import { portalBaseUrl, sendPortalLink } from "../../../../../../lib/portal-blueprint/links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guardEngagement(req, id, true);
  if (!g.ok) return g.response;
  const base = portalBaseUrl(req);
  after(() => sendPortalLink(g.email, { base }));
  return Response.json({ ok: true });
}
