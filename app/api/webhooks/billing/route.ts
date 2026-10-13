/**
 * Stripe webhook for site billing (setup, add-ons, dunning, status).
 * Endpoint: https://www.saabai.ai/api/webhooks/billing  (secret: STRIPE_BILLING_WEBHOOK_SECRET)
 * Events: checkout.session.completed, invoice.paid, invoice.payment_failed,
 * customer.subscription.updated, customer.subscription.deleted
 */
import type Stripe from "stripe";
import { getStripe } from "../../../../lib/stripe";
import { handleBillingEvent } from "../../../../lib/billing/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_BILLING_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return Response.json({ error: "Not configured" }, { status: 400 });
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    // Expand invoice payment error (card last4) for dunning copy when needed.
    if (event.type === "invoice.payment_failed") {
      const inv = event.data.object as Stripe.Invoice & { payment_intent?: string };
      if (typeof inv.payment_intent === "string") {
        try {
          const pi = await getStripe().paymentIntents.retrieve(inv.payment_intent, { expand: ["last_payment_error.payment_method"] });
          (inv as unknown as { payment_intent: unknown }).payment_intent = pi;
        } catch { /* copy falls back to "your card" */ }
      }
    }
    const result = await handleBillingEvent(event as unknown as { type: string; data: { object: unknown } } as never);
    return Response.json({ received: true, result });
  } catch (e) {
    console.error("[billing webhook]", event.type, e);
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }
}
