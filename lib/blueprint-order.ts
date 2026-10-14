import type { Redemption } from "./coupons/core";
import type Stripe from "stripe";
import { EMAIL_BRAND, sendBrandedEmail } from "./email/branded-layout";
import { blueprintOrderAdminEmail, blueprintOrderCustomerEmail } from "./email/templates";
import { createEngagement, updateEngagement, logEvent, listEngagements } from "./audit-store";
import { TIERS, isTier } from "./blueprint";

const SAABAI_EMAIL = "hello@saabai.ai";
const CALENDLY = "https://calendly.com/shanegoldberg/30min";

function customField(session: Stripe.Checkout.Session, key: string): string {
  const field = session.custom_fields?.find((f) => f.key === key);
  if (!field) return "";
  if (field.type === "text") return field.text?.value?.trim() || "";
  if (field.type === "numeric") return field.numeric?.value?.trim() || "";
  if (field.type === "dropdown") return field.dropdown?.value?.trim() || "";
  return "";
}

function formatAddress(addr: Stripe.Address | null | undefined): string | undefined {
  if (!addr) return undefined;
  const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

/**
 * Handles a paid Blueprint checkout: creates the engagement in Redis,
 * stores key Stripe fields, emails the client their fact-find link,
 * and alerts hello@saabai.ai. Safe when Redis or Resend are missing.
 */
export async function handleBlueprintCheckout(session: Stripe.Checkout.Session, redemption?: Redemption | null) {
  const md = session.metadata ?? {};
  const tierId = isTier(md.tier) ? md.tier : "starter";
  const tier = TIERS[tierId];
  const email = session.customer_details?.email ?? session.customer_email ?? "";
  // Full name is required at Checkout (name_collection). Prefer Stripe, then metadata.
  const name =
    (session.customer_details?.name || "").trim() ||
    customField(session, "full_name") ||
    (md.name || "").trim();
  const firstName = name.split(/\s+/)[0] || "";
  const phone =
    (session.customer_details?.phone || "").trim() ||
    (md.phone || "").trim() ||
    undefined;
  const business = md.business || customField(session, "business_name") || name || email;
  const website = md.website || customField(session, "website") || undefined;
  const billingAddress = formatAddress(session.customer_details?.address);
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || undefined;
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id || undefined;
  const amountTotal = session.amount_total ?? undefined;
  const currency = (session.currency || "aud").toUpperCase();
  let invoiceUrl: string | undefined =
    session.invoice && typeof session.invoice !== "string"
      ? (session.invoice as Stripe.Invoice).hosted_invoice_url || undefined
      : undefined;
  // Hosted invoice URL is often not expanded on the webhook payload; leave unset if so.

  // Idempotency: skip if we already created an engagement for this session.
  const existing = (await listEngagements()).find((e) => e.stripeRef === session.id);
  if (existing) {
    return { engagement: existing.id, emailed: false, duplicate: true };
  }

  const engagement = await createEngagement({
    tier: tier.engineTier,
    firmName: business,
    firmType: "other",
    contactName: name || "Name not provided",
    contactEmail: email,
    contactPhone: phone,
    website,
    stripeRef: session.id,
    paymentIntentId,
    stripeCustomerId,
    invoiceUrl,
    amountTotal,
    currency,
    billingAddress,
    ...(redemption ? { couponCode: redemption.code ?? redemption.promotionCodeId, discountCents: redemption.discountCents } : {}),
  });

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://saabai.ai";
  const link = engagement ? `${base}/audit/factfind/${engagement.factFindToken}` : null;
  const stripeDash = `https://dashboard.stripe.com/payments/${paymentIntentId || session.id}`;
  const paidLabel = amountTotal != null ? `$${(amountTotal / 100).toLocaleString("en-AU")} ${currency}` : "paid";

  const from = process.env.BLUEPRINT_FROM_EMAIL || EMAIL_BRAND.fromShane;
  const clientEmail = blueprintOrderCustomerEmail({
    name: name || undefined,
    tierName: tier.name,
    paidLabel,
    delivery: tier.delivery,
    priceLabel: tier.priceLabel,
    factFindUrl: link,
    includesCall: tier.includesCall,
    calendlyUrl: CALENDLY,
  });
  const adminEmail = blueprintOrderAdminEmail({
    tierName: tier.name,
    paidLabel,
    name: name || undefined,
    email: email || undefined,
    phone,
    business,
    website,
    abn: md.abn || undefined,
    billingAddress,
    stripeUrl: stripeDash,
    sessionId: session.id,
    engagementId: engagement?.id ?? null,
    factFindUrl: link,
  });

  const results = await Promise.allSettled([
    email
      ? sendBrandedEmail({ to: email, email: clientEmail, from, replyTo: SAABAI_EMAIL })
      : Promise.resolve(false),
    sendBrandedEmail({ to: SAABAI_EMAIL, email: adminEmail, from }),
  ]);
  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[blueprint] email ${i} failed`, r.reason);
  });

  if (engagement && link && email) {
    await updateEngagement(engagement.id, { status: "questionnaire_sent", factFindSentAt: new Date().toISOString() });
    await logEvent(engagement.id, "questionnaire_sent", "Fact-find emailed", "Sent automatically after Blueprint checkout");
  }
  return { engagement: engagement?.id ?? null, emailed: true };
}
