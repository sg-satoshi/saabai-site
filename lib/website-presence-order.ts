import type Stripe from "stripe";
import { escapeHtml } from "./html-escape";
import { PRESENCE, orderRef } from "./website-presence";

/**
 * Paid Presence deposit: email hello@saabai.ai with the order and the manual
 * go-live steps (balance invoice + $100/mo care subscription). Safe without Resend.
 */
export async function handlePresenceDeposit(session: Stripe.Checkout.Session) {
  const ref = orderRef(session.id);
  const email = session.customer_details?.email || session.customer_email || "";
  const name = session.customer_details?.name || "";
  const business = session.metadata?.business || "";
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ref, emailed: false };
  const { Resend } = await import("resend");
  const { error } = await new Resend(key).emails.send({
    from: process.env.BLUEPRINT_FROM_EMAIL || "Saabai <hello@saabai.ai>",
    to: "hello@saabai.ai",
    replyTo: email || undefined,
    subject: `New Presence website deposit: ${business || name || email} (${ref})`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:600px">
<h2>Presence website deposit paid</h2>
<p><b>${escapeHtml(business)}</b><br>${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;<br>${escapeHtml(session.customer_details?.phone || "")}</p>
<p>Order ${ref}. Deposit $${PRESENCE.deposit.toLocaleString("en-AU")} AUD paid (Stripe ${escapeHtml(session.id)}).</p>
<p><b>To do:</b><br>1. Watch for their onboarding form, reply within 1 business day with a start date.<br>2. Invoice the $${PRESENCE.balance.toLocaleString("en-AU")} balance before go-live.<br>3. At go-live, start the $${PRESENCE.care}/mo Presence care subscription for this customer (manual step).</p>
</div>`,
  });
  if (error) console.error("[presence deposit] email failed", error);
  return { ref, emailed: !error };
}
