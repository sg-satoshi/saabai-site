/**
 * POST /api/portal/blueprint/[id]/submit { consent: true }
 * Validates required answers + consent, snapshots, locks, then emails the client
 * (confirmation) and Saabai (ready to build). Safe to call twice: the second call
 * returns ok with already:true and sends nothing.
 */
import { after } from "next/server";
import { guardEngagement } from "../../../../../../lib/portal-blueprint/api";
import { submitForBuild } from "../../../../../../lib/portal-blueprint/store";
import { adminReadyEmail, submitConfirmationEmail } from "../../../../../../lib/portal-blueprint/emails";
import { EMAIL_BRAND, sendBrandedEmail } from "../../../../../../lib/email/branded-layout";
import { baseUrl } from "../../../../../../lib/portal-blueprint/links";
import { answersOf, computeProgress, TIER_NAMES } from "../../../../../../lib/portal-blueprint/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guardEngagement(req, id, true);
  if (!g.ok) return g.response;
  let consent: unknown = null;
  try {
    consent = (await req.json())?.consent;
  } catch {
    /* treated as no consent */
  }
  const r = await submitForBuild(id, g.email, consent);
  if (r.status === "consent") return Response.json({ error: "Please tick the box to confirm you are ready to submit." }, { status: 400 });
  if (r.status === "missing_required") return Response.json({ error: "Some required questions are still blank.", labels: r.labels }, { status: 422 });
  if (r.status === "notfound") return Response.json({ error: "Not found" }, { status: 404 });
  if (r.status === "busy") return Response.json({ error: "Busy, please retry" }, { status: 503 });

  const e = r.engagement;
  if (!r.already) {
    after(async () => {
      try {
        const prog = computeProgress(e, answersOf(e));
        const tierName = TIER_NAMES[e.tier];
        await Promise.allSettled([
          sendBrandedEmail({
            to: e.contactEmail,
            email: submitConfirmationEmail({ name: e.contactName, tierName, portalUrl: `${baseUrl()}/portal/${e.id}/submitted`, answered: prog.answered, total: prog.totalQuestions }),
            from: process.env.BLUEPRINT_FROM_EMAIL || EMAIL_BRAND.fromShane,
            replyTo: EMAIL_BRAND.supportEmail,
          }),
          sendBrandedEmail({
            to: EMAIL_BRAND.supportEmail,
            email: adminReadyEmail({ firmName: e.firmName, tier: tierName, contactName: e.contactName, contactEmail: e.contactEmail, adminUrl: `${baseUrl()}/saabai-admin/audits/${e.id}`, answered: prog.answered, total: prog.totalQuestions, blanks: prog.blanks.length }),
            from: EMAIL_BRAND.from,
          }),
        ]);
      } catch (err) {
        console.error("[blueprint-portal] submit emails failed", err instanceof Error ? err.message : err);
      }
    });
  }
  return g.refresh(Response.json({ ok: true, already: r.already, submittedAt: e.portal?.submittedAt }));
}
