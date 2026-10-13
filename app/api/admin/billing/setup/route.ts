/**
 * POST /api/admin/billing/setup  (admin only)
 * { action: "preview" | "send" | "resend" | "cancel" | "manage", ...SetupInput }
 */
import { requireAdminSession } from "../../../../../lib/admin-guard";
import { buildSetup, previewSetupEmail, sendCardUpdateLink, sendSetupLink, type SetupInput } from "../../../../../lib/billing/service";
import { getSiteBilling, saveSiteBilling } from "../../../../../lib/billing/store";
import { billingPortalUrl, cancelAtPeriodEnd, siteUrl, stripeConfigured } from "../../../../../lib/billing/stripe-ops";
import { SENDER_OPTIONS } from "../../../../../lib/billing/emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json({ senders: SENDER_OPTIONS, stripe: stripeConfigured() });
}

export async function POST(req: Request) {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  let body: SetupInput & { action?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const action = body.action || "preview";

  if (action === "preview" || action === "send") {
    const built = await buildSetup(body);
    if (!built.ok) return Response.json({ error: built.error }, { status: 400 });
    if (action === "preview") {
      const email = previewSetupEmail(built.rec, body.siteDomain);
      return Response.json({ preview: { subject: email.subject, html: email.html, from: built.rec.sender, to: `${built.rec.contact.name} <${built.rec.contact.email}>` } });
    }
    const { rec, emailed, payUrl } = await sendSetupLink(built.rec, body.siteDomain);
    return Response.json({ ok: true, emailed, payUrl, status: rec.status, linkExpiresAt: rec.linkExpiresAt });
  }

  const rec = await getSiteBilling(body.siteId);
  if (!rec) return Response.json({ error: "No billing set up for this site" }, { status: 404 });

  if (action === "resend") {
    if (!["pending", "link_expired"].includes(rec.status)) return Response.json({ error: "Only pending or expired links can be resent" }, { status: 400 });
    const out = await sendSetupLink(rec, body.siteDomain);
    return Response.json({ ok: true, emailed: out.emailed, payUrl: out.payUrl, status: out.rec.status, linkExpiresAt: out.rec.linkExpiresAt });
  }
  if (action === "card-link") {
    if (!["payment_failed", "past_due", "paused"].includes(rec.status)) return Response.json({ error: "No failed payment on this site" }, { status: 400 });
    const emailed = await sendCardUpdateLink(rec);
    return Response.json({ ok: true, emailed });
  }
  if (action === "manage") {
    if (!rec.stripeCustomerId || !stripeConfigured()) return Response.json({ url: "https://dashboard.stripe.com/customers" });
    return Response.json({ url: `https://dashboard.stripe.com/customers/${rec.stripeCustomerId}` });
  }
  if (action === "portal") {
    if (!rec.stripeCustomerId) return Response.json({ error: "No Stripe customer yet" }, { status: 400 });
    return Response.json({ url: await billingPortalUrl(rec.stripeCustomerId, `${siteUrl()}/saabai-admin/site-factory`) });
  }
  if (action === "cancel") {
    if (rec.stripeSubscriptionId) await cancelAtPeriodEnd(rec.stripeSubscriptionId);
    const saved = await saveSiteBilling({ ...rec, status: rec.stripeSubscriptionId ? "cancelling" : "cancelled", payToken: rec.stripeSubscriptionId ? rec.payToken : undefined }, "Cancelled by admin");
    return Response.json({ ok: true, status: saved.status });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
