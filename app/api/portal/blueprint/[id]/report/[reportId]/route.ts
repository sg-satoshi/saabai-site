/**
 * GET /api/portal/blueprint/[id]/report/[reportId]
 * Streams a delivered Blueprint file to its signed-in owner. Flag, session and
 * ownership via guardEngagement. The storage URL is never sent to the client.
 */
import { guardEngagement } from "../../../../../../../lib/portal-blueprint/api";
import { handleReportDownload } from "../../../../../../../lib/portal-blueprint/report-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; reportId: string }> }) {
  const { id, reportId } = await params;
  return handleReportDownload(req, id, reportId, {
    guard: (r, i) => guardEngagement(r, i, false),
    fetchFile: (url) => fetch(url, { cache: "no-store" }),
  });
}
