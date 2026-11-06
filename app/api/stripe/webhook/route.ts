import Stripe from "stripe";
import { handleBlueprintCheckout } from "@/lib/blueprint-order";
import { redemptionFrom } from "@/lib/coupons/core";
import { recordRedemptionUse, resolveRedemptionCode } from "@/lib/coupons/stripe";
import { attrFromMetadata } from "@/lib/growth/attribution";
import { recordEvent, touchContact } from "@/lib/growth/events";
import { markUpsellConverted, recordReferralPurchase } from "@/lib/growth/growth2";
import { reportCheckoutPurchase } from "@/lib/marketing/report-purchase";
import { handleLexLifecycle, provisionLexCheckout, releaseFoundingPlace } from "@/lib/lex-subscription";
import { lexAlert, lexMailer } from "@/lib/lex-subscription-emails";

export const runtime = "nodejs";

/**
 * Canonical Stripe webhook for Blueprint and Lex (secret: STRIPE_WEBHOOK_SECRET).
 * Routes strictly by metadata.product. Lex provisioning lives only here (lib/lex-subscription).
 * app/api/webhooks/stripe is retired (410).
 * Events: checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid, invoice.payment_failed.
 */
const LEX_LIFECYCLE = new Set(["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "invoice.paid", "invoice.payment_failed"]);

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey) return Response.json({ error: "STRIPE_SECRET_KEY not configured" }, { status: 500 });
  if (!webhookSecret) return Response.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 500 });

  const stripe = new Stripe(stripeKey);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing stripe-signature" }, { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (LEX_LIFECYCLE.has(event.type)) {
    try {
      const result = await handleLexLifecycle(event as never, lexMailer);
      return Response.json({ received: true, lex: result });
    } catch (err) {
      console.error("[stripe webhook] lex lifecycle failed", event.type, err instanceof Error ? err.name : err);
      return Response.json({ error: "Handler failed" }, { status: 500 });
    }
  }

  // Lex founding: an abandoned founding checkout gives its reserved place back (the hourly sweep is the fallback).
  if (event.type === "checkout.session.expired") {
    const md = (event.data.object as Stripe.Checkout.Session).metadata ?? {};
    if (md.product === "lex" && md.founding === "1" && md.trialFirmId) {
      const released = await releaseFoundingPlace(md.trialFirmId).catch(() => false);
      return Response.json({ received: true, lex: released ? "founding-released" : "founding-none" });
    }
  }

  if (event.type !== "checkout.session.completed") {
    return Response.json({ received: true, skipped: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  // Which promo code (if any) this checkout used, recorded on the order and the journey.
  const redemption = await resolveRedemptionCode(redemptionFrom(session as never));

  // One use per customer: record this email (hashed) against the code if the rule applies.
  const useResult = await recordRedemptionUse(redemption, session.customer_details?.email || session.customer_email, session.id);
  if (useResult === "repeat") console.warn(`[coupon once] REPEAT redemption of ${redemption?.code ?? redemption?.promotionCodeId} by a returning email (session ${session.id}). Review.`);

  // Journey + attribution (idempotent on the Stripe event id).
  const buyer = session.customer_details?.email || session.customer_email;
  if (buyer && session.payment_status === "paid") {
    const attr = attrFromMetadata(session.metadata as Record<string, string>);
    await touchContact(buyer, attr, session.customer_details?.name ?? undefined);
    await recordEvent({
      id: `stripe_${event.id}`, contactId: buyer,
      type: session.metadata?.product === "blueprint" ? "blueprint_purchased" : "purchase",
      refId: session.id, amountCents: session.amount_total ?? undefined,
      meta: { tier: session.metadata?.tier, product: session.metadata?.product || "unknown", source: attr?.l, firstTouch: attr?.f, ...(redemption ? { coupon: redemption.code ?? redemption.promotionCodeId, discountCents: redemption.discountCents } : {}), ...(useResult === "repeat" ? { repeatCouponUse: true } : {}) },
    });
    try {
      await recordReferralPurchase({ code: attr?.l?.ref || attr?.f?.ref, buyerEmail: buyer, purchaseId: session.id, amountCents: session.amount_total ?? undefined });
      if (session.metadata?.product !== "blueprint") await markUpsellConverted(buyer);
    } catch (err) { console.error("[growth] referral/upsell update failed", err); }
  }

  // Saabai Blueprint one-off orders: create engagement + send fact-find.
  if (session.metadata?.product === "blueprint") {
    if (session.payment_status !== "paid") return Response.json({ received: true, skipped: "unpaid blueprint" });
    const result = await handleBlueprintCheckout(session, redemption);
    await reportCheckoutPurchase(session);
    return Response.json({ received: true, blueprint: result });
  }
  // Lex Firm plan: provision only on a verified, paid session, once per session.
  if (session.metadata?.product === "lex") {
    try {
      const result = await provisionLexCheckout(event.id, session as never, lexMailer, lexAlert, event.created);
      if (result === "provisioned") await reportCheckoutPurchase(session);
      return Response.json({ received: true, lex: result });
    } catch (err) {
      console.error("[stripe webhook] lex provisioning failed", err instanceof Error ? err.name : err);
      return Response.json({ error: "Handler failed" }, { status: 500 });
    }
  }

  // Anything else (no or unknown product): alert only. Never treated as a Lex signup.
  if (!["saabai-sell", "saabai-billing", "leadgen"].includes(session.metadata?.source ?? "")) {
    await lexAlert(`Checkout ${session.id} completed with product "${session.metadata?.product ?? "none"}" (${session.payment_status}). Nothing was provisioned. Check it in Stripe.`);
  }
  return Response.json({ received: true, skipped: "unknown product" });
}
