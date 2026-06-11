/**
 * POST /api/audit/engagements/[id]/report — generate a .docx report draft
 * from the engagement (profile + assessment), store in Vercel Blob, and
 * version it on the engagement record. Admin only.
 *
 * PATCH /api/audit/engagements/[id]/report — mark a report version delivered
 * (body: { reportId }). Sets engagement status to "delivered".
 */

import { put } from "@vercel/blob";
import { requireAdmin } from "../../../../../../lib/audit-admin";
import { getEngagement, logEvent, updateEngagement } from "../../../../../../lib/audit-store";
import { buildAuditReportDocx } from "../../../../../../lib/audit-report";
import { AuditReport, newId } from "../../../../../../lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const engagement = await getEngagement(id);
  if (!engagement)
    return Response.json({ error: "Not found" }, { status: 404 });

  const buffer = await buildAuditReportDocx(engagement);

  const version = (engagement.reports?.length ?? 0) + 1;
  const safeFirm = engagement.firmName.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 40);
  const filename = `AI-Audit-${safeFirm}-v${version}.docx`;

  const { url } = await put(`audits/${engagement.id}/${filename}`, buffer, {
    access: "public", // URL contains an unguessable random suffix
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    addRandomSuffix: true,
  });

  const report: AuditReport = {
    id: newId("rpt"),
    version,
    filename,
    url,
    generatedAt: new Date().toISOString(),
  };

  await updateEngagement(id, {
    reports: [report, ...(engagement.reports ?? [])],
    status:
      engagement.status === "assessment" || engagement.status === "discovery"
        ? "report"
        : engagement.status,
  });
  const updated = await logEvent(
    id,
    "report_generated",
    `Report v${version} generated`,
    filename
  );

  return Response.json({ engagement: updated, report });
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const engagement = await getEngagement(id);
  if (!engagement)
    return Response.json({ error: "Not found" }, { status: 404 });

  let body: { reportId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reports = (engagement.reports ?? []).map((r) =>
    r.id === body.reportId
      ? { ...r, deliveredAt: new Date().toISOString() }
      : r
  );
  if (!reports.some((r) => r.id === body.reportId))
    return Response.json({ error: "Report not found" }, { status: 404 });

  const deliveredReport = reports.find((r) => r.id === body.reportId);
  await updateEngagement(id, {
    reports,
    status: "delivered",
  });
  const updated = await logEvent(
    id,
    "report_delivered",
    `Report v${deliveredReport?.version ?? "?"} delivered to client`,
    deliveredReport?.filename
  );

  return Response.json({ engagement: updated });
}
