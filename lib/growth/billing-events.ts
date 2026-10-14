/**
 * Maps care plan billing webhooks to contact_events, and alerts Shane on failed
 * payments (internal email only; the client-facing dunning email is unchanged).
 */
import type Stripe from "stripe";
import { Resend } from "resend";
import { recordEvent, type ContactEventType } from "./events";
import { escapeHtml } from "../html-escape";

export const ALERT_TO = () => process.env.GROWTH_ALERT_EMAIL || "hello@saabai.ai";

export function failedPaymentAlert(i: { email: string; name?: string; amountCents?: number; attempt?: number; invoiceUrl?: string; reason?: string }) {
  const amt = i.amountCents != null ? `$${(i.amountCents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "a payment";
  return {
    subject: `Payment failed: ${i.name || i.email} (${amt})`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#13152a">
<div style="background:#0b092e;padding:20px 24px;border-radius:12px 12px 0 0"><p style="color:#62c5d1;font-size:11px;letter-spacing:.18em;text-transform:uppercase;margin:0">Client health alert</p><h1 style="color:#fff;font-size:20px;margin:6px 0 0">A care plan payment failed</h1></div>
<div style="background:#fff;border:1px solid #dfe2ea;border-top:0;border-radius:0 0 12px 12px;padding:20px 24px;font-size:14px;line-height:1.6">
<p><b>${escapeHtml(i.name || i.email)}</b> (${escapeHtml(i.email)}) didn't go through for ${amt}${i.attempt ? `, attempt ${i.attempt}` : ""}.${i.reason ? ` Reason: ${escapeHtml(i.reason)}.` : ""}</p>
<p>Stripe will retry and the dunning email has gone to the client. Suggested next step: a quick personal check-in. Nothing else has been sent.</p>
<p><a href="https://saabai.ai/saabai-admin/journey?email=${encodeURIComponent(i.email)}" style="display:inline-block;background:#62c5d1;color:#0b092e;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open their journey</a>${i.invoiceUrl ? ` &nbsp;<a href="${escapeHtml(i.invoiceUrl)}" style="color:#1595a6">Invoice</a>` : ""}</p>
</div></div>`,
  };
}

type AnyObj = Record<string, unknown> & { customer_email?: string | null; customer_details?: { email?: string | null; name?: string | null } };

export async function recordBillingGrowthEvent(event: Stripe.Event): Promise<void> {
  try {
    const o = event.data.object as unknown as AnyObj;
    const email = (o.customer_email || o.customer_details?.email || (o.metadata as Record<string, string> | undefined)?.email || "") as string;
    const contactId = email || (typeof o.customer === "string" ? `stripe:${o.customer}` : "");
    if (!contactId) return;
    const map: Record<string, ContactEventType> = {
      "checkout.session.completed": "care_plan_started",
      "invoice.paid": "payment",
      "invoice.payment_failed": "payment_failed",
      "customer.subscription.updated": "care_plan_changed",
      "customer.subscription.deleted": "care_plan_cancelled",
    };
    const type = map[event.type];
    if (!type) return;
    const amountCents = (o.amount_paid ?? o.amount_due ?? o.amount_total) as number | undefined;
    await recordEvent({ id: `stripe_${event.id}`, contactId, type, refId: String(o.id ?? ""), amountCents, meta: { stripeType: event.type, attempt: o.attempt_count } });
    if (type === "payment_failed" && email && process.env.RESEND_API_KEY) {
      const pi = o.payment_intent as { last_payment_error?: { message?: string } } | undefined;
      const a = failedPaymentAlert({ email, name: (o.customer_name as string) || undefined, amountCents: o.amount_due as number, attempt: o.attempt_count as number, invoiceUrl: o.hosted_invoice_url as string, reason: pi?.last_payment_error?.message });
      await new Resend(process.env.RESEND_API_KEY).emails.send({ from: "Saabai Alerts <hello@saabai.ai>", to: [ALERT_TO()], subject: a.subject, html: a.html });
    }
  } catch (err) {
    console.error("[growth billing event]", err);
  }
}
