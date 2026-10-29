import { scheduleTestimonial, scheduleUpsell } from "@/lib/growth/growth2";
import { recordEvent } from "@/lib/growth/events";
/**
 * POST /api/audit/engagements/[id]/report — generate a .docx report draft
 * from the engagement (profile + assessment), store in Vercel Blob, and
 * version it on the engagement record. Admin only.
 *
 * PATCH /api/audit/engagements/[id]/report — mark a report version delivered
 * (body: { reportId }). Sets engagement status to "delivered".
 * Body { reportId, action: "review" } marks a version reviewed instead.
 * For Blueprint portal buyers (flag), delivery needs a reviewed version and
 * emails the client a portal link. Flag off: unchanged.
 */

import { put } from "@vercel/blob";
import { after } from "next/server";
import { canDeliver, markReviewed, reviewRequired } from "../../../../../../lib/portal-blueprint/deliver";
import { reportReadyEmail } from "../../../../../../lib/portal-blueprint/emails";
import { EMAIL_BRAND, sendBrandedEmail } from "../../../../../../lib/email/branded-layout";
import { portalBaseUrl } from "../../../../../../lib/portal-blueprint/links";
import { TIER_NAMES } from "../../../../../../lib/portal-blueprint/progress";
import { requireAdmin } from "../../../../../../lib/audit-admin";
import { getEngagement, logEvent, updateEngagement } from "../../../../../../lib/audit-store";
import { buildAuditReportDocx } from "../../../../../../lib/audit-report";
import { clientFromEngagement, runBlueprintSearchAudit } from "../../../../../../lib/blueprint/search-audit";
import { AuditEngagement, AuditReport, newId } from "../../../../../../lib/audit-types";
import type { SearchAudit } from "../../../../../../lib/blueprint/search-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

/** GET-only crawl of the client's site. A failed crawl still produces a report, with nothing guessed. */
async function searchForEngagement(engagement: AuditEngagement): Promise<SearchAudit | null> {
  const website = engagement.website?.trim();
  if (!website) return null;
  try {
    return await runBlueprintSearchAudit({ url: website, client: clientFromEngagement(engagement) });
  } catch {
    return null;
  }
}

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const engagement = await getEngagement(id);
  if (!engagement)
    return Response.json({ error: "Not found" }, { status: 404 });

  const search = await searchForEngagement(engagement);
  const buffer = await buildAuditReportDocx(engagement, search);

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

  let body: { reportId?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.reportId !== "string") return Response.json({ error: "reportId required" }, { status: 400 });

  if (body.action === "review") {
    const reviewed = markReviewed(engagement.reports ?? [], body.reportId);
    if (!reviewed) return Response.json({ error: "Report not found" }, { status: 404 });
    const r = reviewed.find((x) => x.id === body.reportId);
    await updateEngagement(id, { reports: reviewed });
    const upd = await logEvent(id, "report_reviewed", `Report v${r?.version ?? "?"} reviewed`, r?.filename);
    return Response.json({ engagement: upd });
  }

  const check = canDeliver(engagement, body.reportId);
  if (!check.ok) return Response.json({ error: check.error }, { status: check.status });
  const alreadyDelivered = Boolean((engagement.reports ?? []).find((x) => x.id === body.reportId)?.deliveredAt);

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
    // First delivery starts the credit clock. Later versions do not move it.
    ...(engagement.deliveredAt || !deliveredReport?.deliveredAt
      ? {}
      : { deliveredAt: deliveredReport.deliveredAt }),
  });
  const updated = await logEvent(
    id,
    "report_delivered",
    `Report v${deliveredReport?.version ?? "?"} delivered to client`,
    deliveredReport?.filename
  );

  await recordEvent({
    contactId: engagement.contactEmail, type: "report_delivered", refId: id,
    meta: { tier: engagement.tier, version: deliveredReport?.version },
  });
  // Growth: schedule the upsell and testimonial request. Both wait for Shane's approval before anything is sent.
  try {
    const who = { email: engagement.contactEmail, name: engagement.contactName, auditId: id, tier: engagement.tier, deliveredAt: deliveredReport?.deliveredAt };
    await Promise.all([scheduleUpsell(who), scheduleTestimonial(who)]);
  } catch (err) { console.error("[growth] schedule after delivery failed", err); }

  // Portal buyers get a "ready" email with a link into their portal. Only on first delivery of this version.
  if (!alreadyDelivered && reviewRequired(engagement)) {
    const base = portalBaseUrl(req);
    after(async () => {
      try {
        await sendBrandedEmail({
          to: engagement.contactEmail,
          email: reportReadyEmail({ name: engagement.contactName, tierName: TIER_NAMES[engagement.tier], portalUrl: `${base}/portal/${engagement.id}` }),
          from: process.env.BLUEPRINT_FROM_EMAIL || EMAIL_BRAND.fromShane,
          replyTo: EMAIL_BRAND.supportEmail,
        });
      } catch (err) {
        console.error("[blueprint-portal] report ready email failed", err instanceof Error ? err.message : err);
      }
    });
  }

  return Response.json({ engagement: updated });
}
