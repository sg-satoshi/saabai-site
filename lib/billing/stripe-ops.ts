/**
 * Stripe operations for site billing. Prices are created inline (price_data)
 * so each subscription keeps the price it signed up on: catalogue price
 * changes never move existing subscribers until moved manually.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStripe } from "../stripe";
import type { SiteBillingRecord } from "./store";

export const BILLING_SOURCE = "saabai-billing";
export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;
export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "https://www.saabai.ai";

function monthAfter(date: string): number {
  const d = new Date(`${date}T09:00:00+10:00`);
  d.setMonth(d.getMonth() + 1);
  return Math.floor(d.getTime() / 1000);
}

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

/** Fresh Checkout Session each time the 7-day pay link is opened. */
export async function createSetupCheckout(rec: SiteBillingRecord, customerId: string): Promise<string> {
  const stripe = getStripe();
  const line_items: any[] = [
    {
      quantity: 1,
      price_data: {
        currency: "aud",
        unit_amount: rec.monthlyCents,
        recurring: { interval: "month" },
        product_data: { name: `${rec.planName} website care`, metadata: { planId: rec.planId } },
        tax_behavior: "exclusive",
      } as any,
    },
  ];
  if (rec.setupFeeCents > 0) {
    line_items.push({
      quantity: 1,
      price_data: { currency: "aud", unit_amount: rec.setupFeeCents, product_data: { name: `Setup${rec.setupFeeDescription ? `: ${rec.setupFeeDescription}` : " fee"}` } },
    });
  }
  const anchor = monthAfter(rec.startDate);
  const meta = { source: BILLING_SOURCE, kind: "setup", siteId: rec.siteId, planId: rec.planId };
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items,
    // First month + setup charged now; renewals from start date + 1 month.
    subscription_data: {
      metadata: { ...meta, product_type: "website_care", description: rec.siteName },
      ...(anchor > Date.now() / 1000 + 3600 ? { billing_cycle_anchor: anchor, proration_behavior: "none" as const } : {}),
    },
    metadata: meta,
    payment_method_collection: "always",
    success_url: `${siteUrl()}/pay/done?site=${encodeURIComponent(rec.siteName)}`,
    cancel_url: `${siteUrl()}/pay/${rec.payToken}`,
  });
  return session.url!;
}

export async function billingPortalUrl(customerId: string, returnUrl: string, updateCard = false): Promise<string> {
  const stripe = getStripe();
  const s = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
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
