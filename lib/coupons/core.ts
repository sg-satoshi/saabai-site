/**
 * Coupons: pure helpers shared by the admin API, checkout and webhooks.
 * No Stripe calls here so it runs in tests and on the client.
 */

export const TARGETS = [
  { id: "all", label: "All products", group: "All" },
  { id: "blueprint_starter", label: "Blueprint Starter ($497)", group: "Blueprint", tier: "starter" },
  { id: "blueprint_pro", label: "Blueprint Pro ($1,497)", group: "Blueprint", tier: "pro" },
  { id: "blueprint_business", label: "Blueprint Business ($3,500)", group: "Blueprint", tier: "business" },
  { id: "care_presence", label: "Care plan: Presence ($100/mo)", group: "Website care", planId: "presence" },
  { id: "care_growth", label: "Care plan: Growth ($200/mo)", group: "Website care", planId: "growth" },
  { id: "care_signature", label: "Care plan: Signature ($300/mo)", group: "Website care", planId: "signature" },
] as const;

export type TargetId = (typeof TARGETS)[number]["id"];
export const CARE_PLAN_IDS = ["presence", "growth", "signature"] as const;
export type CarePlanId = (typeof CARE_PLAN_IDS)[number];

export const isTarget = (v: unknown): v is TargetId => TARGETS.some((t) => t.id === v);
export const targetLabel = (id: string) => TARGETS.find((t) => t.id === id)?.label ?? id;

/** End of the given day (YYYY-MM-DD) in Brisbane (UTC+10, no daylight saving), as a unix timestamp. */
export function brisbaneEndOfDay(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const ms = Date.parse(`${date}T23:59:59+10:00`);
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

/** Format a unix expiry as a Brisbane date + time label. */
export function brisbaneLabel(unix: number): string {
  return new Date(unix * 1000).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function normaliseCode(v: unknown): string {
  return typeof v === "string" ? v.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40) : "";
}

export interface CouponInput {
  code: string;
  kind: "percent" | "fixed";
  value: number;
  duration: "once" | "forever" | "repeating";
  durationMonths?: number;
  target: TargetId;
  firstTimeOnly: boolean;
  minimumSpendCents?: number;
  maxRedemptions?: number;
  expiresAt?: number;
}

/** Validate a raw admin request body. Returns an error string or the clean input. */
export function parseCouponInput(body: Record<string, unknown>): CouponInput | string {
  const code = normaliseCode(body.code);
  if (code.length < 3) return "Codes need at least 3 letters or numbers";
  const kind = body.kind === "fixed" ? "fixed" : "percent";
  const value = typeof body.value === "number" ? body.value : parseFloat(String(body.value));
  if (!value || Number.isNaN(value) || value <= 0) return "Discount value must be greater than zero";
  if (kind === "percent" && value > 100) return "Percentage cannot exceed 100";
  const duration = body.duration === "forever" ? "forever" : body.duration === "repeating" ? "repeating" : "once";
  const months = parseInt(String(body.durationMonths ?? ""), 10);
  const target = isTarget(body.target) ? body.target : "all";
  const minSpend = parseFloat(String(body.minimumSpend ?? ""));
  const max = parseInt(String(body.maxRedemptions ?? ""), 10);
  let expiresAt: number | undefined;
  if (typeof body.expiresAt === "string" && body.expiresAt.trim()) {
    const ts = brisbaneEndOfDay(body.expiresAt.trim());
    if (ts == null) return "Expiry date isn't valid";
    if (ts * 1000 <= Date.now()) return "Expiry must be today or later";
    expiresAt = ts;
  }
  return {
    code, kind, value, duration,
    durationMonths: duration === "repeating" ? Math.max(1, months || 1) : undefined,
    target,
    firstTimeOnly: body.firstTimeOnly === true || body.firstTimeOnly === "true",
    minimumSpendCents: minSpend > 0 ? Math.round(minSpend * 100) : undefined,
    maxRedemptions: max > 0 ? max : undefined,
    expiresAt,
  };
}

/** Stripe coupon + promotion code params. `productId` is the Stripe product behind the target (null for All). */
export function buildStripeParams(i: CouponInput, productId: string | null) {
  const coupon: Record<string, unknown> = {
    duration: i.duration,
    name: i.code,
    metadata: { source: "saabai-admin", target: i.target, first_time_only: String(i.firstTimeOnly) },
  };
  if (i.kind === "percent") coupon.percent_off = i.value;
  else { coupon.amount_off = Math.round(i.value * 100); coupon.currency = "aud"; }
  if (i.duration === "repeating") coupon.duration_in_months = i.durationMonths ?? 1;
  if (i.target !== "all") {
    if (!productId) throw new Error("That product isn't linked to Stripe yet. Run 'Set up coupon products' first.");
    coupon.applies_to = { products: [productId] };
  }
  const restrictions: Record<string, unknown> = {};
  if (i.firstTimeOnly) restrictions.first_time_transaction = true;
  if (i.minimumSpendCents) { restrictions.minimum_amount = i.minimumSpendCents; restrictions.minimum_amount_currency = "aud"; }
  const promo: Record<string, unknown> = { code: i.code, metadata: { target: i.target } };
  if (Object.keys(restrictions).length) promo.restrictions = restrictions;
  if (i.maxRedemptions) promo.max_redemptions = i.maxRedemptions;
  if (i.expiresAt) promo.expires_at = i.expiresAt;
  return { coupon, promo };
}

export interface Redemption {
  code?: string;
  promotionCodeId?: string;
  couponId?: string;
  discountCents: number;
}

type DiscountLike = { promotion_code?: string | { id: string; code?: string } | null; coupon?: string | { id: string } | null };

/** Pull the discount from a completed Checkout Session (webhook payload). Null when no code was used. */
export function redemptionFrom(session: { total_details?: { amount_discount?: number | null } | null; discounts?: DiscountLike[] | null; metadata?: Record<string, string> | null }): Redemption | null {
  const d = (session.discounts ?? [])[0];
  const discountCents = session.total_details?.amount_discount ?? 0;
  const metaCode = session.metadata?.coupon_code || undefined;
  if (!d && !metaCode && !discountCents) return null;
  const pc = d?.promotion_code;
  const cp = d?.coupon;
  return {
    code: (typeof pc === "object" && pc?.code) || metaCode,
    promotionCodeId: typeof pc === "string" ? pc : pc?.id,
    couponId: typeof cp === "string" ? cp : cp?.id,
    discountCents,
  };
}
