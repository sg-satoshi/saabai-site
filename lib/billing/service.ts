/**
 * Billing orchestration used by admin routes, portal routes, webhook and cron.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "node:crypto";
import { sendBrandedEmail } from "../email/branded-layout";
import { enableFeature, disableFeature } from "../addons/flags";
import { getCatalog } from "./catalog";
import { DEFAULT_SENDER, isAllowedSender, paymentFailedEmail, setupLinkEmail, sitePausedEmail } from "./emails";
import { discountOffCents, normaliseDiscount, normaliseSetupDiscount, type SetupDiscount, type PlanDiscount, dueDunningStep, dunningDays, isLinkExpired, LINK_TTL_DAYS, linkExpiresAt, shouldPause, isDuplicateSetupPayment, validateFirstPaymentDate, statusAfterFailure, statusFromSubscription } from "./state";
import { findBySubscription, getSiteBilling, listSiteBilling, saveSiteBilling, setPayToken, type SiteBillingRecord } from "./store";
import { addDeferredSetupFee, BILLING_SOURCE, expireCheckoutSession, periodOf, siteUrl, stripeConfigured } from "./stripe-ops";
import { redemptionFrom } from "../coupons/core";
import { recordRedemptionUse, resolveRedemptionCode } from "../coupons/stripe";

export interface SetupInput {
  siteId: string;
  siteName: string;
  siteDomain?: string;
  contactName: string;
  contactEmail: string;
  planId: string; // plan id or "custom"
  customCents?: number;
  customLabel?: string;
  setupFeeCents?: number;
  setupFeeDescription?: string;
  startDate: string;
  gst?: boolean;
  sender?: string;
  discount?: Partial<PlanDiscount>;
  setupDiscount?: Partial<SetupDiscount>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function buildSetup(input: SetupInput): Promise<{ ok: true; rec: SiteBillingRecord } | { ok: false; error: string }> {
  if (!input.siteId) return { ok: false, error: "Missing site" };
  if (!EMAIL_RE.test(input.contactEmail || "")) return { ok: false, error: "Enter a valid client email" };
  const dateErr = validateFirstPaymentDate(input.startDate);
  if (dateErr) return { ok: false, error: dateErr };
  const catalog = await getCatalog();
  let planName: string, monthlyCents: number, priceVersion: number | undefined;
  if (input.planId === "custom") {
    monthlyCents = Math.round(Number(input.customCents) || 0);
    planName = (input.customLabel || "Website care").slice(0, 60);
    if (monthlyCents < 100) return { ok: false, error: "Custom amount must be at least $1" };
  } else {
    const plan = catalog.plans.find((p) => p.id === input.planId);
    if (!plan) return { ok: false, error: "Unknown plan" };
    planName = plan.name; monthlyCents = plan.priceCents; priceVersion = plan.priceVersion;
  }
  const disc = normaliseDiscount(input.discount, monthlyCents);
  if (!disc.ok) return { ok: false, error: disc.error };
  const netMonthly = disc.discount ? monthlyCents - discountOffCents(monthlyCents, disc.discount) : monthlyCents;
  if (netMonthly > 0 && netMonthly < 100) {
    return { ok: false, error: "After the discount the monthly price must be $0 (waived) or at least $1" };
  }
  const setupFeeCents = Math.max(0, Math.round(Number(input.setupFeeCents) || 0));
  const sdisc = normaliseSetupDiscount(input.setupDiscount, setupFeeCents);
  if (!sdisc.ok) return { ok: false, error: sdisc.error };
  const existing = await getSiteBilling(input.siteId);
  if (existing && !["link_expired", "cancelled", "pending"].includes(existing.status)) {
    return { ok: false, error: "This site already has billing set up" };
  }
  const now = new Date().toISOString();
  const rec: SiteBillingRecord = {
    ...(existing || {}),
    siteId: input.siteId,
    siteName: input.siteName,
    status: "pending",
    planId: input.planId,
    planName,
    monthlyCents,
    priceVersion,
    discount: disc.discount,
    setupFeeCents,
    setupDiscount: sdisc.discount,
    setupFeeDescription: input.setupFeeDescription?.slice(0, 80),
    startDate: input.startDate,
    gst: !!input.gst && catalog.gstRegistered,
    contact: { name: (input.contactName || "").slice(0, 80), email: input.contactEmail.trim().toLowerCase() },
    sender: input.sender && isAllowedSender(input.sender) ? input.sender : DEFAULT_SENDER,
    addons: existing?.addons || [],
    history: existing?.history || [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  return { ok: true, rec };
}

export function payUrlFor(token: string) {
  return `${siteUrl()}/pay/${token}`;
}

export function previewSetupEmail(rec: SiteBillingRecord, siteDomain?: string, payUrl = `${siteUrl()}/pay/preview`) {
  return setupLinkEmail({
    contactName: rec.contact.name, siteName: rec.siteName, siteDomain, planName: rec.planName, monthlyCents: rec.monthlyCents,
    setupFeeCents: rec.setupFeeCents, setupFeeDescription: rec.setupFeeDescription, startDate: rec.startDate, gst: rec.gst, payUrl, discount: rec.discount, setupDiscount: rec.setupDiscount,
  });
}

/** Rotate a 7-day pay token and email the client. */
export async function sendSetupLink(rec: SiteBillingRecord, siteDomain?: string): Promise<{ rec: SiteBillingRecord; emailed: boolean; payUrl: string }> {
  // A new link may carry new prices, so never reuse the old Checkout Session.
  if (rec.checkoutSessionId && stripeConfigured()) await expireCheckoutSession(rec.checkoutSessionId);
  rec = { ...rec, checkoutSessionId: undefined };
  const token = crypto.randomBytes(24).toString("hex");
  await setPayToken(token, rec.siteId, LINK_TTL_DAYS * 86400 + 3600);
  const sentAt = new Date().toISOString();
  const payUrl = payUrlFor(token);
  const emailed = await sendBrandedEmail({ to: rec.contact.email, from: rec.sender, replyTo: "hello@saabai.ai", email: previewSetupEmail(rec, siteDomain, payUrl) });
  const saved = await saveSiteBilling({ ...rec, status: "pending", payToken: token, linkSentAt: sentAt, linkExpiresAt: linkExpiresAt(sentAt) }, emailed ? `Payment link emailed to ${rec.contact.email}` : "Payment link created (email not sent)");
  return { rec: saved, emailed, payUrl };
}

async function ensureUpdateToken(rec: SiteBillingRecord): Promise<SiteBillingRecord> {
  if (rec.payToken) {
    await setPayToken(rec.payToken, rec.siteId, 60 * 86400);
    return rec;
  }
  const token = crypto.randomBytes(24).toString("hex");
  await setPayToken(token, rec.siteId, 60 * 86400);
  return { ...rec, payToken: token };
}

async function sendDunning(rec: SiteBillingRecord, day: number, inv?: any) {
  const r = await ensureUpdateToken(rec);
  const email = paymentFailedEmail({
    contactName: r.contact.name, siteName: r.siteName, planName: r.planName,
    amountCents: inv?.amount_due ?? r.monthlyCents, invoiceNumber: inv?.number || undefined,
    cardLast4: inv?.payment_intent?.last_payment_error?.payment_method?.card?.last4,
    updateUrl: `${payUrlFor(r.payToken!)}?update=1`, day,
  });
  await sendBrandedEmail({ to: r.contact.email, from: r.sender, replyTo: "hello@saabai.ai", email });
  return r;
}

/** Admin "Send card update link": emails the dunning copy for the current day now. */
export async function sendCardUpdateLink(rec: SiteBillingRecord): Promise<boolean> {
  const day = rec.failedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(rec.failedAt)) / 86_400_000)) : 0;
  const r = await sendDunning(rec, day);
  await saveSiteBilling({ ...r, lastDunningAt: new Date().toISOString() }, "Card update link sent by admin");
  return !!process.env.RESEND_API_KEY;
}

// ---------- webhook handlers ----------

export async function handleBillingEvent(event: { type: string; data: { object: any } }): Promise<string> {
  const o = event.data.object;
  switch (event.type) {
    case "checkout.session.completed": {
      if (o.metadata?.source !== BILLING_SOURCE) return "ignored";
      const rec = await getSiteBilling(o.metadata.siteId);
      if (!rec) return "no-record";
      if (o.metadata.kind === "setup") {
        if (isDuplicateSetupPayment(rec, o.subscription)) {
          await saveSiteBilling(rec, `Review: second setup payment received (session ${o.id}, subscription ${o.subscription}). Cancel and refund the duplicate in Stripe`);
          return "duplicate-setup";
        }
        const red = await resolveRedemptionCode(redemptionFrom(o));
        const useResult = await recordRedemptionUse(red, o.customer_details?.email || rec.contact?.email, o.id);
        const coupon = red ? { couponCode: red.code ?? red.promotionCodeId ?? (o.metadata.admin_coupon ? `Admin: ${rec.discount?.label || "Discount"}` : undefined), discountCents: red.discountCents } : {};
        // Future first payment: the setup fee goes on the first real invoice (at trial end).
        const deferred = Number(o.metadata.deferred_setup_cents || 0);
        let setupNote = "";
        if (deferred > 0 && o.subscription && !rec.setupFeeQueued) {
          try {
            await addDeferredSetupFee(String(o.customer), String(o.subscription), deferred, o.metadata.setup_name || "Setup fee", o.id);
            setupNote = `. Setup fee ${(deferred / 100).toFixed(2)} added to the first invoice`;
          } catch (e) {
            setupNote = `. Review: setup fee NOT added to the first invoice (${String((e as Error)?.message || e).slice(0, 120)})`;
          }
        }
        await saveSiteBilling({ ...rec, ...coupon, ...(setupNote.startsWith(". Setup") ? { setupFeeQueued: true } : {}), status: "active", stripeCustomerId: o.customer || rec.stripeCustomerId, stripeSubscriptionId: o.subscription || rec.stripeSubscriptionId, failedAt: undefined, dunningSent: 0 }, (red ? `Paid, subscription active (code ${coupon.couponCode})${useResult === "repeat" ? ". Review: this email had already used this one-per-customer code" : ""}` : "Paid, subscription active") + setupNote);
        return "setup-active";
      }
      if (o.metadata.kind === "addon") {
        const catalog = await getCatalog();
        const addon = catalog.addons.find((a) => a.id === o.metadata.addonId);
        if (addon?.feature) await enableFeature(rec.siteId, addon.feature);
        const addons = rec.addons.filter((a) => a.addonId !== o.metadata.addonId);
        addons.push({ addonId: o.metadata.addonId, status: "active", priceCents: o.amount_total ?? addon?.priceCents ?? 0, billing: "one_off", addedAt: new Date().toISOString() });
        await saveSiteBilling({ ...rec, addons }, `Add-on bought: ${addon?.name || o.metadata.addonId}`);
        return "addon-active";
      }
      return "ignored";
    }
    case "invoice.paid": {
      const rec = o.subscription ? await findBySubscription(String(o.subscription)) : null;
      if (!rec) return "no-record";
      const line = o.lines?.data?.[0]?.period;
      const next: SiteBillingRecord = { ...rec, failedAt: undefined, dunningSent: 0, lastDunningAt: undefined };
      if (line) { next.currentPeriodStart = new Date(line.start * 1000).toISOString(); next.currentPeriodEnd = new Date(line.end * 1000).toISOString(); }
      if (rec.pendingPlan && next.currentPeriodStart && next.currentPeriodStart >= rec.pendingPlan.effectiveAt.slice(0, 10)) {
        Object.assign(next, { planId: rec.pendingPlan.planId, planName: rec.pendingPlan.planName, monthlyCents: rec.pendingPlan.monthlyCents, pendingPlan: undefined });
      }
      if (["payment_failed", "past_due", "paused", "pending", "link_expired"].includes(rec.status)) next.status = "active";
      await saveSiteBilling(next, `Invoice paid ${o.number || ""}`.trim());
      return "paid";
    }
    case "invoice.payment_failed": {
      const rec = o.subscription ? await findBySubscription(String(o.subscription)) : null;
      if (!rec) return "no-record";
      let next: SiteBillingRecord = { ...rec, status: statusAfterFailure(rec.status, o.attempt_count || 1), failedAt: rec.failedAt || new Date().toISOString() };
      if (!rec.dunningSent) {
        next = await sendDunning(next, 0, o);
        next.dunningSent = 1;
        next.lastDunningAt = new Date().toISOString();
      }
      await saveSiteBilling(next, `Payment failed (attempt ${o.attempt_count || 1})`);
      return next.status;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const rec = await findBySubscription(o.id);
      if (!rec) return "no-record";
      const status = event.type.endsWith("deleted") ? "cancelled" : statusFromSubscription(o, rec.status);
      const per = periodOf(o);
      const next = { ...rec, status, currentPeriodStart: per.start || rec.currentPeriodStart, currentPeriodEnd: per.end || rec.currentPeriodEnd };
      if (status === "cancelled") {
        const catalog = await getCatalog();
        for (const a of rec.addons) { const f = catalog.addons.find((x) => x.id === a.addonId)?.feature; if (f) await disableFeature(rec.siteId, f); }
      }
      await saveSiteBilling(next, status !== rec.status ? `Status: ${status}` : undefined);
      return status;
    }
    default:
      return "ignored";
  }
}

// ---------- daily cron ----------

export async function runBillingCron(now = Date.now()) {
  const out = { expired: 0, dunning: 0, paused: 0, addonsEnded: 0 };
  const catalog = await getCatalog();
  for (let rec of await listSiteBilling()) {
    let changed = false;
    const events: string[] = [];
    if (rec.status === "pending" && isLinkExpired(rec.linkExpiresAt, now)) {
      rec = { ...rec, status: "link_expired" }; changed = true; out.expired++; events.push("Payment link expired");
    }
    if (["payment_failed", "past_due"].includes(rec.status) && rec.failedAt) {
      if (shouldPause(rec.failedAt, now)) {
        rec = { ...(await ensureUpdateToken(rec)), status: "paused" };
        await sendBrandedEmail({ to: rec.contact.email, from: rec.sender, email: sitePausedEmail({ contactName: rec.contact.name, siteName: rec.siteName, updateUrl: `${payUrlFor(rec.payToken!)}?update=1` }) });
        changed = true; out.paused++; events.push("Paused after 30 days unpaid");
      } else {
        const step = dueDunningStep(rec.failedAt, rec.dunningSent || 0, now);
        if (step !== null) {
          const day = dunningDays(400)[step];
          rec = await sendDunning(rec, day);
          rec = { ...rec, dunningSent: step + 1, lastDunningAt: new Date(now).toISOString() };
          changed = true; out.dunning++; events.push(`Reminder sent (day ${day})`);
        }
      }
    }
    const keep = [];
    for (const a of rec.addons) {
      if (a.status === "removing" && a.endsAt && Date.parse(a.endsAt) <= now) {
        const f = catalog.addons.find((x) => x.id === a.addonId)?.feature;
        if (f) await disableFeature(rec.siteId, f);
        changed = true; out.addonsEnded++; events.push(`Add-on ended: ${a.addonId}`);
      } else keep.push(a);
    }
    if (changed) await saveSiteBilling({ ...rec, addons: keep }, events.join("; "));
  }
  return out;
}
