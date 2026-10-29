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
import { handleReportPatch } from "../../../../../../lib/portal-blueprint/report-routes";
import { getRedis } from "../../../../../../lib/redis";
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
  const { id } = await params;
  const base = portalBaseUrl(req);
  return handleReportPatch(req, id, {
    requireAdmin,
    getEngagement,
    updateEngagement: (eid, patch) => updateEngagement(eid, patch),
    logEvent: (eid, type, summary, detail) => logEvent(eid, type, summary, detail),
    afterDelivery: async (engagement, delivered) => {
      await recordEvent({
        contactId: engagement.contactEmail, type: "report_delivered", refId: id,
        meta: { tier: engagement.tier, version: delivered.version },
      });
      // Growth: schedule the upsell and testimonial request. Both wait for Shane's approval before anything is sent.
      try {
        const who = { email: engagement.contactEmail, name: engagement.contactName, auditId: id, tier: engagement.tier, deliveredAt: delivered.deliveredAt };
        await Promise.all([scheduleUpsell(who), scheduleTestimonial(who)]);
      } catch (err) { console.error("[growth] schedule after delivery failed", err); }
    },
    claimSendOnce: async (key) => {
      const redis = getRedis();
      if (!redis) return true; // no Redis: the "first delivery of this version" check still applies
      return (await redis.set(key, "1", { nx: true, ex: 60 * 60 * 24 * 90 })) === "OK";
    },
    sendReady: async (engagement) => {
      await sendBrandedEmail({
        to: engagement.contactEmail,
        email: reportReadyEmail({ name: engagement.contactName, tierName: TIER_NAMES[engagement.tier], portalUrl: `${base}/portal/${engagement.id}` }),
        from: process.env.BLUEPRINT_FROM_EMAIL || EMAIL_BRAND.fromShane,
        replyTo: EMAIL_BRAND.supportEmail,
      });
    },
    defer: (fn) => after(fn),
  });
}
