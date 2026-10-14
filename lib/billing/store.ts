/**
 * Per-site billing record (one billing setup per site), stored in Redis.
 */
import { getRedis } from "../redis";
import type { SiteBillingStatus } from "./state";

export const SITE_BILLING_PREFIX = "saabai:billing:site:";
export const SITE_BILLING_INDEX = "saabai:billing:sites";
export const PAY_TOKEN_PREFIX = "saabai:billing:paytoken:";

export interface SiteAddonState {
  addonId: string;
  status: "active" | "removing" | "pending";
  subscriptionItemId?: string;
  priceCents: number;
  billing: "one_off" | "monthly";
  endsAt?: string;
  addedAt: string;
}

export interface SiteBillingRecord {
  siteId: string;
  siteName: string;
  status: SiteBillingStatus;
  planId: string; // "custom" for custom amounts
  planName: string;
  monthlyCents: number;
  priceVersion?: number;
  setupFeeCents: number;
  setupFeeDescription?: string;
  startDate: string; // YYYY-MM-DD
  gst: boolean;
  contact: { name: string; email: string };
  sender: string;
  payToken?: string;
  linkSentAt?: string;
  linkExpiresAt?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  pendingPlan?: { planId: string; planName: string; monthlyCents: number; effectiveAt: string };
  failedAt?: string;
  dunningSent?: number;
  lastDunningAt?: string;
  updateCardUrl?: string;
  /** Promo code redeemed on the setup checkout, and the discount it gave (cents) */
  couponCode?: string;
  discountCents?: number;
  addons: SiteAddonState[];
  history: { at: string; event: string }[];
  createdAt: string;
  updatedAt: string;
}

export async function getSiteBilling(siteId: string): Promise<SiteBillingRecord | null> {
  const r = getRedis();
  if (!r) return null;
  const raw = await r.get<SiteBillingRecord | string>(SITE_BILLING_PREFIX + siteId);
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function saveSiteBilling(rec: SiteBillingRecord, event?: string): Promise<SiteBillingRecord> {
  const now = new Date().toISOString();
  const next = { ...rec, updatedAt: now, history: event ? [...(rec.history || []), { at: now, event }].slice(-50) : rec.history || [] };
  const r = getRedis();
  if (r) {
    await r.set(SITE_BILLING_PREFIX + rec.siteId, JSON.stringify(next));
    await r.sadd(SITE_BILLING_INDEX, rec.siteId);
  }
  return next;
}

export async function listSiteBilling(): Promise<SiteBillingRecord[]> {
  const r = getRedis();
  if (!r) return [];
  const ids = (await r.smembers(SITE_BILLING_INDEX)) as string[];
  const out: SiteBillingRecord[] = [];
  for (const id of ids) {
    const rec = await getSiteBilling(id);
    if (rec) out.push(rec);
  }
  return out;
}

export async function findBySubscription(subId: string): Promise<SiteBillingRecord | null> {
  return (await listSiteBilling()).find((r) => r.stripeSubscriptionId === subId) || null;
}

export async function setPayToken(token: string, siteId: string, ttlSeconds: number) {
  const r = getRedis();
  if (r) await r.set(PAY_TOKEN_PREFIX + token, siteId, { ex: ttlSeconds });
}

export async function resolvePayToken(token: string): Promise<string | null> {
  const r = getRedis();
  if (!r || !/^[a-f0-9]{32,64}$/.test(token)) return null;
  return (await r.get<string>(PAY_TOKEN_PREFIX + token)) || null;
}
