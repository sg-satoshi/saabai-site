/**
 * GET /api/portal/blueprint/[id]/report/[reportId]
 * Sends a signed-in owner to their delivered Blueprint file. Flag, session and
 * ownership via guardEngagement. Versions not yet delivered answer 404.
 */
import { guardEngagement, notFound } from "../../../../../../../lib/portal-blueprint/api";
import { deliveredReportUrl } from "../../../../../../../lib/portal-blueprint/deliver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; reportId: string }> }) {
  const { id, reportId } = await params;
  const g = await guardEngagement(req, id, false);
  if (!g.ok) return g.response;
  const url = deliveredReportUrl(g.engagement, reportId);
  if (!url) return notFound();
  return g.refresh(new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } }));
}
