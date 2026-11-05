/**
 * Stripe operations for site billing. Prices are created inline (price_data)
 * so each subscription keeps the price it signed up on: catalogue price
 * changes never move existing subscribers until moved manually.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStripe } from "../stripe";
import type { SiteBillingRecord } from "./store";
import { formatAud } from "./catalog";
import { checkoutFirstPaymentText } from "./emails";
import { brisbaneToday, couponDurationMonths, discountLabel, discountOffCents, firstChargeAt } from "./state";
import { careProductFor, findActivePromo, promoCoversProducts } from "../coupons/stripe";
import { normaliseCode, promoIsOnce, promoNotStartedMessage } from "../coupons/core";
import { hasUsed } from "../coupons/once";

export const BILLING_SOURCE = "saabai-billing";
export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;
export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "https://www.saabai.ai";

export const GST_BLOCKED = "GST billing links are switched off until Stripe tax is set up. Untick GST for this site.";

export async function ensureCustomer(rec: SiteBillingRecord): Promise<string> {
  const stripe = getStripe();
  if (rec.stripeCustomerId) return rec.stripeCustomerId;
  const c = await stripe.customers.create({
    name: rec.contact.name || rec.siteName,
    email: rec.contact.email,
    description: rec.siteName,
    metadata: { siteId: rec.siteId, source: BILLING_SOURCE },
  });
  return c.id;
}

/**
 * Fresh Checkout Session each time the 7-day pay link is opened.
 * Customers can type a promo code on Stripe's page, or a ?code= on the pay
 * link pre-applies one (Stripe doesn't allow both on one session).
 */
export async function createSetupCheckout(rec: SiteBillingRecord, customerId: string, code?: string): Promise<{ url: string; id: string }> {
  // GST on would undercharge vs the email (Checkout has no tax rates yet), so refuse.
  if (rec.gst) throw new Error(GST_BLOCKED);
  const stripe = getStripe();
  // Fixed per-plan product (set up from Marketing > Offers & Coupons) so product-restricted codes match.
  let fixedProduct = await careProductFor(rec.planId);
  // Admin discount: a one-use coupon scoped to the care plan product only (not the setup fee).
  // It replaces customer promo codes on this session (Stripe allows one or the other).
  let adminCoupon: string | null = null;
  // First payment today: charged at Checkout. Future date: card saved now, first invoice on that date (trial until then).
  const first = firstChargeAt(rec.startDate);
  const nowMs = Date.now();
  if (rec.discount) {
    if (!fixedProduct) {
      const prod = await stripe.products.create({ name: `${rec.planName} website care`, metadata: { planId: rec.planId, siteId: rec.siteId, source: BILLING_SOURCE } });
      fixedProduct = prod.id;
    }
    const d = rec.discount;
    const coupon = await stripe.coupons.create({
      name: (d.label || "Discount").slice(0, 40),
      ...(d.type === "percent" ? { percent_off: d.value } : { amount_off: d.value, currency: "aud" }),
      ...(d.months ? { duration: "repeating" as const, duration_in_months: couponDurationMonths(d.months, nowMs, first.mode === "future" ? first.at : undefined) } : { duration: "forever" as const }),
      applies_to: { products: [fixedProduct] },
      max_redemptions: 1,
      metadata: { source: BILLING_SOURCE, siteId: rec.siteId, kind: "admin_discount" },
    });
    adminCoupon = coupon.id;
  }
  let promo = code && !adminCoupon ? await findActivePromo(normaliseCode(code)) : null;
  // A product-restricted code (one or several products) only pre-applies if it covers this care plan.
  // Otherwise skip the pre-apply so the customer still reaches Stripe, where they can retry a code.
  if (promo && !promoCoversProducts(promo, [fixedProduct])) promo = null;
  // A code with a start date still in the future isn't pre-applied (Stripe itself has no start date).
  if (promo && promoNotStartedMessage(promo)) promo = null;
  // One use per customer: the client's email is on the billing record, so check it before pre-applying.
  if (promo && promoIsOnce(promo) && (await hasUsed(promo.id, rec.contact?.email))) promo = null;
  const line_items: any[] = [
    {
      quantity: 1,
      price_data: {
        currency: "aud",
        unit_amount: rec.monthlyCents,
        recurring: { interval: "month" },
        ...(fixedProduct ? { product: fixedProduct } : { product_data: { name: `${rec.planName} website care`, metadata: { planId: rec.planId } } }),
        tax_behavior: "exclusive",
      } as any,
    },
  ];
  // Setup fee discount: charged as a reduced one-off price (no coupon, so the monthly coupon is untouched).
  // A fully waived setup fee is left off the Checkout entirely (no zero-amount line).
  const setupOff = discountOffCents(rec.setupFeeCents, rec.setupDiscount);
  const setupNet = rec.setupFeeCents - setupOff;
  const setupName = `Setup${rec.setupFeeDescription ? `: ${rec.setupFeeDescription}` : " fee"}`;
  if (setupNet > 0 && first.mode === "now") {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "aud",
        unit_amount: setupNet,
        product_data: {
          name: setupName,
          ...(setupOff && rec.setupDiscount ? { description: `Normally ${formatAud(rec.setupFeeCents)}. ${discountLabel(rec.setupDiscount, formatAud)}.` } : {}),
        },
      },
    });
  }
  const meta: Record<string, string> = { source: BILLING_SOURCE, kind: "setup", siteId: rec.siteId, planId: rec.planId };
  if (promo) meta.coupon_code = promo.code;
  if (adminCoupon) meta.admin_coupon = adminCoupon;
  if (setupOff) meta.setup_discount_cents = String(setupOff);
  if (first.mode === "future") {
    meta.first_payment = rec.startDate;
    if (setupNet > 0) { meta.deferred_setup_cents = String(setupNet); meta.setup_name = setupName.slice(0, 450); }
  }
  // Stripe Checkout needs trial_end at least 2 days out; closer dates use whole Brisbane calendar
  // days, so the charge still lands on the stated date (rounding hours could land a day early).
  const trial = first.mode === "future"
    ? first.at - nowMs >= 49 * 3600_000 ? { trial_end: Math.floor(first.at / 1000) } : { trial_period_days: Math.max(1, Math.round((Date.parse(rec.startDate) - Date.parse(brisbaneToday(nowMs))) / 86_400_000)) }
    : {};
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items,
    // Today: setup + first month charged now, renews monthly from today. Future: nothing now,
    // first invoice (first month + setup fee, added by the webhook) on that date, monthly from it.
    subscription_data: {
      metadata: { ...meta, product_type: "website_care", description: rec.siteName },
      ...trial,
    },
    ...(first.mode === "future" ? { custom_text: { submit: { message: checkoutFirstPaymentText(rec, !adminCoupon) } } } : {}),
    metadata: meta,
    ...(adminCoupon ? { discounts: [{ coupon: adminCoupon }] } : promo ? { discounts: [{ promotion_code: promo.id }] } : { allow_promotion_codes: true }),
    payment_method_collection: "always",
    success_url: `${siteUrl()}/pay/done?site=${encodeURIComponent(rec.siteName)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/pay/${rec.payToken}`,
  });
  return { url: session.url!, id: session.id };
}

/** Future first payment: put the setup fee on the subscription's first invoice. Idempotent per session. */
export async function addDeferredSetupFee(customer: string, subscription: string, cents: number, description: string, sessionId: string) {
  await getStripe().invoiceItems.create(
    { customer, subscription, amount: cents, currency: "aud", description, metadata: { source: BILLING_SOURCE, kind: "setup_fee" } },
    { idempotencyKey: `setupfee-${sessionId}` },
  );
}

/** Status and URL of an earlier setup Checkout Session (null if it can't be read). */
export async function getCheckoutSession(id: string): Promise<{ status: string | null; url: string | null } | null> {
  try {
    const s = await getStripe().checkout.sessions.retrieve(id);
    return { status: s.status ?? null, url: s.url ?? null };
  } catch { return null; }
}

export async function expireCheckoutSession(id: string) {
  try { await getStripe().checkout.sessions.expire(id); } catch { /* already expired or completed */ }
}

export async function billingPortalUrl(customerId: string, returnUrl: string, updateCard = false, configuration?: string): Promise<string> {
  const stripe = getStripe();
  const s = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
    ...(configuration ? { configuration } : {}),
    ...(updateCard ? { flow_data: { type: "payment_method_update" as const } } : {}),
  });
  return s.url;
}

async function planItem(subId: string) {
  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subId);
  const item = sub.items.data.find((i) => !(i.metadata || {}).addonId) || sub.items.data[0];
  return { sub, item };
}

/** Upgrade: now, prorated and invoiced immediately. Downgrade: no proration, bills from next cycle. */
export async function changePlan(rec: SiteBillingRecord, next: { planId: string; planName: string; monthlyCents: number }, kind: "upgrade" | "downgrade") {
  const stripe = getStripe();
  const { sub, item } = await planItem(rec.stripeSubscriptionId!);
  await stripe.subscriptions.update(sub.id, {
    items: [{ id: item.id, price_data: { currency: "aud", unit_amount: next.monthlyCents, recurring: { interval: "month" }, product: (item.price.product as string) } as any }],
    proration_behavior: kind === "upgrade" ? "always_invoice" : "none",
    metadata: { ...(sub.metadata || {}), planId: next.planId },
  });
}

export async function addMonthlyAddon(rec: SiteBillingRecord, addon: { id: string; name: string; priceCents: number }) {
  const stripe = getStripe();
  const product = await stripe.products.create({ name: `${addon.name} add-on`, metadata: { addonId: addon.id } });
  const item = await stripe.subscriptionItems.create({
    subscription: rec.stripeSubscriptionId!,
    price_data: { currency: "aud", unit_amount: addon.priceCents, recurring: { interval: "month" }, product: product.id },
    proration_behavior: "always_invoice",
    metadata: { addonId: addon.id, siteId: rec.siteId },
  });
  return item.id;
}

/** Stop billing the add-on from next cycle (no credit). Feature stays on until period end. */
export async function removeMonthlyAddon(itemId: string) {
  const stripe = getStripe();
  await stripe.subscriptionItems.del(itemId, { proration_behavior: "none" });
}

export async function oneOffAddonCheckout(rec: SiteBillingRecord, addon: { id: string; name: string; priceCents: number }, returnUrl: string) {
  const stripe = getStripe();
  const meta = { source: BILLING_SOURCE, kind: "addon", siteId: rec.siteId, addonId: addon.id };
  const s = await stripe.checkout.sessions.create({
    mode: "payment",
    ...(rec.stripeCustomerId ? { customer: rec.stripeCustomerId } : { customer_email: rec.contact.email }),
    line_items: [{ quantity: 1, price_data: { currency: "aud", unit_amount: addon.priceCents, product_data: { name: addon.name } } }],
    metadata: meta,
    payment_intent_data: { metadata: meta },
    success_url: `${returnUrl}?addon=${addon.id}&paid=1`,
    cancel_url: returnUrl,
  });
  return s.url!;
}

export async function cancelAtPeriodEnd(subId: string, cancel = true) {
  await getStripe().subscriptions.update(subId, { cancel_at_period_end: cancel });
}

export function periodOf(sub: any): { start?: string; end?: string } {
  const s = sub?.current_period_start ?? sub?.items?.data?.[0]?.current_period_start;
  const e = sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end;
  return { start: s ? new Date(s * 1000).toISOString() : undefined, end: e ? new Date(e * 1000).toISOString() : undefined };
}
