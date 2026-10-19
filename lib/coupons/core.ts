/**
 * Coupons: pure helpers shared by the admin API, checkout and webhooks.
 * No Stripe calls here so it runs in tests and on the client.
 */
import { formatInstant, parseInstant, SITE_TZ } from "./time";

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

/** Targets that map to one Stripe product each (everything except "All"). */
export const PRODUCT_TARGETS = TARGETS.filter((t) => t.id !== "all");
/** Stored as `target` when a coupon is limited to more than one product. */
export const MULTI_TARGET = "multi";

export const isTarget = (v: unknown): v is TargetId => TARGETS.some((t) => t.id === v);
export const targetLabel = (id: string) => TARGETS.find((t) => t.id === id)?.label ?? id;

/** End of the given day (YYYY-MM-DD) in Brisbane (UTC+10, no daylight saving), as a unix timestamp. */
export function brisbaneEndOfDay(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const ms = Date.parse(`${date}T23:59:59+10:00`);
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

/** Start of the given day (YYYY-MM-DD) in Brisbane, as a unix timestamp. */
export function brisbaneStartOfDay(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const ms = Date.parse(`${date}T00:00:00+10:00`);
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

/** Start of "today" in Brisbane (UTC+10, no daylight saving) as a unix timestamp. */
export function brisbaneStartOfToday(nowMs = Date.now()): number {
  const DAY = 86400;
  return Math.floor((Math.floor(nowMs / 1000) + 10 * 3600) / DAY) * DAY - 10 * 3600;
}

/** Start date (unix) stamped on a code's metadata. Null when none, missing or garbage (= starts immediately). */
export function codeStartsAt(meta: Record<string, string | undefined> | null | undefined): number | null {
  const n = parseInt(meta?.starts_at ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Clear customer-facing message when a code hasn't started yet, otherwise null. */
export function notStartedMessage(code: string, startsAt: number | null, nowMs = Date.now()): string | null {
  if (!startsAt || startsAt * 1000 <= nowMs) return null;
  return `The code ${code} isn't active yet. It starts on ${formatInstant(startsAt, SITE_TZ)} (Brisbane time).`;
}

type PromoLike = { code: string; metadata?: Record<string, string> | null; promotion?: { coupon?: string | { metadata?: Record<string, string> | null } | null } | null };

/** Message when a Stripe promotion code (coupon expanded) has a start date still in the future, else null. */
export function promoNotStartedMessage(promo: PromoLike, nowMs = Date.now()): string | null {
  const c = promo.promotion?.coupon;
  const meta = { ...(c && typeof c === "object" ? c.metadata ?? {} : {}), ...(promo.metadata ?? {}) };
  return notStartedMessage(promo.code, codeStartsAt(meta), nowMs);
}

/** Format a unix instant as a Brisbane date + time label, with the zone abbreviation. */
export function brisbaneLabel(unix: number): string {
  return formatInstant(unix, SITE_TZ);
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
  /** "all", a single product target (legacy shape), or "multi" when `targets` has 2+ entries. */
  target: TargetId | typeof MULTI_TARGET;
  /** Selected product targets. Empty means All products. */
  targets: Exclude<TargetId, "all">[];
  firstTimeOnly: boolean;
  minimumSpendCents?: number;
  maxRedemptions?: number;
  expiresAt?: number;
  /** Active-from (unix). Enforced by us; Stripe promotion codes have no start date. */
  startsAt?: number;
  /** One use per customer, tracked by us (hashed email). Stripe has no per-customer limit. */
  oncePerCustomer: boolean;
}

/**
 * Product targets from a request body. Accepts the new `targets` array and the
 * legacy single `target`. "all" (or nothing picked) means no restriction. Unknown
 * ids are ignored and duplicates removed, keeping picker order.
 */
export function parseTargets(body: Record<string, unknown>): Exclude<TargetId, "all">[] {
  const raw: unknown[] = Array.isArray(body.targets) ? body.targets : body.target !== undefined ? [body.target] : [];
  if (raw.includes("all")) return [];
  const set = new Set(raw.filter((v): v is Exclude<TargetId, "all"> => isTarget(v) && v !== "all"));
  return PRODUCT_TARGETS.map((t) => t.id).filter((id) => set.has(id));
}

/**
 * Which picker targets a coupon covers, from the metadata we stamp on it.
 * Older codes only carry a single `target`; Stripe's own product list is the
 * fallback for codes made in the Stripe dashboard. Empty array = All products.
 */
export function targetsFromMetadata(meta: Record<string, string | undefined> | null | undefined, restrictedProducts: string[] = []): { targets: string[]; unknownProducts: number } {
  const list = (meta?.targets ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (list.length) return { targets: list, unknownProducts: 0 };
  const t = meta?.target;
  if (t && t !== "all" && t !== "product" && t !== MULTI_TARGET) return { targets: [t], unknownProducts: 0 };
  if (restrictedProducts.length) return { targets: [], unknownProducts: restrictedProducts.length };
  return { targets: [], unknownProducts: 0 };
}

/**
 * Does a coupon restricted to `restricted` Stripe products discount any of the
 * products being bought? No restriction (undefined or empty) covers everything.
 * Stripe silently skips the discount when nothing matches, so callers use this
 * to refuse the code with a clear message instead.
 */
export function couponCoversProducts(restricted: string[] | null | undefined, productIds: (string | null | undefined)[]): boolean {
  if (!restricted || restricted.length === 0) return true;
  return productIds.some((id) => !!id && restricted.includes(id));
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
  const picked = parseTargets(body);
  const target: CouponInput["target"] = picked.length === 0 ? "all" : picked.length === 1 ? picked[0] : MULTI_TARGET;
  const minSpend = parseFloat(String(body.minimumSpend ?? ""));
  const max = parseInt(String(body.maxRedemptions ?? ""), 10);
  let expiresAt: number | undefined;
  const hasEnd = typeof body.expiresAt === "number" || (typeof body.expiresAt === "string" && body.expiresAt.trim());
  if (hasEnd) {
    const ts = parseInstant(body.expiresAt, "end");
    if (ts == null) return "Expiry date isn't valid";
    if (ts * 1000 <= Date.now()) return "Expiry must be in the future";
    expiresAt = ts;
  }
  let startsAt: number | undefined;
  const hasStart = typeof body.startsAt === "number" || (typeof body.startsAt === "string" && body.startsAt.trim());
  if (hasStart) {
    const ts = parseInstant(body.startsAt, "start");
    if (ts == null) return "Start date isn't valid";
    if (ts * 1000 < Date.now() - 86400e3) return "Start date can't be in the past"; // a start up to a day back just means "now" (admins can be in any timezone)
    if (ts * 1000 > Date.now()) startsAt = ts; // already reached = starts now, nothing to schedule
    if (expiresAt && ts >= expiresAt) return "Start date must be before the expiry date";
  }
  return {
    code, kind, value, duration,
    durationMonths: duration === "repeating" ? Math.max(1, months || 1) : undefined,
    target,
    targets: picked,
    oncePerCustomer: body.oncePerCustomer === true || body.oncePerCustomer === "true",
    firstTimeOnly: body.firstTimeOnly === true || body.firstTimeOnly === "true",
    minimumSpendCents: minSpend > 0 ? Math.round(minSpend * 100) : undefined,
    maxRedemptions: max > 0 ? max : undefined,
    expiresAt,
    startsAt,
  };
}

/**
 * Stripe coupon + promotion code params. `productIds` are the Stripe products behind
 * the selected targets (a single id string for the legacy call shape, null/empty for All).
 * Stripe's coupon `applies_to.products` takes a list, so multi-product is native.
 */
export function buildStripeParams(i: CouponInput, productIds: string | string[] | null) {
  const ids = [...new Set(Array.isArray(productIds) ? productIds : productIds ? [productIds] : [])];
  const coupon: Record<string, unknown> = {
    duration: i.duration,
    name: i.code,
    metadata: { source: "saabai-admin", target: i.target, ...(i.targets?.length ? { targets: i.targets.join(",") } : {}), first_time_only: String(i.firstTimeOnly), ...(i.startsAt ? { starts_at: String(i.startsAt) } : {}), ...(i.oncePerCustomer ? { once_per_customer: "true" } : {}) },
  };
  if (i.kind === "percent") coupon.percent_off = i.value;
  else { coupon.amount_off = Math.round(i.value * 100); coupon.currency = "aud"; }
  if (i.duration === "repeating") coupon.duration_in_months = i.durationMonths ?? 1;
  if (i.target !== "all") {
    if (ids.length < 1) throw new Error("That product isn't linked to Stripe yet. Run 'Set up coupon products' first.");
    coupon.applies_to = { products: ids };
  }
  const restrictions: Record<string, unknown> = {};
  if (i.firstTimeOnly) restrictions.first_time_transaction = true;
  if (i.minimumSpendCents) { restrictions.minimum_amount = i.minimumSpendCents; restrictions.minimum_amount_currency = "aud"; }
  const promo: Record<string, unknown> = { code: i.code, metadata: { target: i.target, ...(i.targets?.length ? { targets: i.targets.join(",") } : {}), ...(i.startsAt ? { starts_at: String(i.startsAt) } : {}), ...(i.oncePerCustomer ? { once_per_customer: "true" } : {}) } };
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

/** Picker search: case-insensitive match on label or group. Blank query returns everything. */
export function searchProductTargets(query: string) {
  const q = query.trim().toLowerCase();
  return PRODUCT_TARGETS.filter((t) => !q || t.label.toLowerCase().includes(q) || t.group.toLowerCase().includes(q));
}

/** Human summary of the products a code covers, for the codes list. */
export function describeCoverage(targets: string[], unknownProducts = 0): string {
  if (targets.length === 0) return unknownProducts ? `${unknownProducts} product${unknownProducts === 1 ? "" : "s"}` : "All products";
  if (targets.length === 1) return targetLabel(targets[0]);
  return `${targets.length} products`;
}

export interface ShareLink { id: string; label: string; url: string }
export interface ShareInfo {
  /** Ready-to-copy checkout URLs, one per linkable product the code covers. */
  links: ShareLink[];
  /** True when the code also covers care plans, which have no public URL (the pay link is per client). */
  careNote: boolean;
  /** The suffix to append to a client pay link. */
  paySuffix: string;
}

/**
 * Share URLs for a code. Only Blueprint has a public checkout URL, so that is what gets a link;
 * a code covering All products offers every Blueprint tier. A restriction we couldn't map to
 * our products (made in the Stripe dashboard) offers none rather than a link that may not apply.
 */
export function shareLinks(code: string, targets: string[], unknownProducts = 0, base = "https://www.saabai.ai"): ShareInfo {
  const c = encodeURIComponent(normaliseCode(code));
  const paySuffix = `?code=${c}`;
  const allProducts = targets.length === 0 && unknownProducts === 0;
  const covered = allProducts ? PRODUCT_TARGETS.map((t) => t.id as string) : targets;
  const links: ShareLink[] = PRODUCT_TARGETS
    .filter((t) => "tier" in t && covered.includes(t.id))
    .map((t) => ({ id: t.id, label: t.label, url: `${base}/blueprint/checkout?tier=${(t as { tier: string }).tier}&code=${c}` }));
  const careNote = covered.some((id) => id.startsWith("care_"));
  return { links, careNote, paySuffix };
}

// ---------- one use per customer (our own tracking) ----------

export const ONCE_MESSAGE = "This code has already been used with this email address. It can only be used once per customer.";

/** Does this code carry the one-use-per-customer rule? Reads promo metadata, then coupon metadata. */
export function isOncePerCustomer(meta: Record<string, string | undefined> | null | undefined): boolean {
  return meta?.once_per_customer === "true";
}

/** Same rule for a Stripe promotion code with its coupon expanded. */
export function promoIsOnce(promo: { metadata?: Record<string, string> | null; promotion?: { coupon?: string | { metadata?: Record<string, string> | null } | null } | null }): boolean {
  const c = promo.promotion?.coupon;
  return isOncePerCustomer({ ...(c && typeof c === "object" ? c.metadata ?? {} : {}), ...(promo.metadata ?? {}) });
}

/**
 * Email as we compare it: trimmed, lowercased, and the +tag dropped from the local part
 * (name+offer@x.com is the same person as name@x.com). Null when it isn't an email.
 */
export function normaliseEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const e = v.trim().toLowerCase();
  const m = /^([^\s@+]+)(?:\+[^\s@]*)?@([^\s@]+\.[^\s@]+)$/.exec(e);
  return m ? `${m[1]}@${m[2]}` : null;
}

/** Redis key for one (promotion code, customer hash) pair. Never contains an email. */
export const onceKey = (promotionCodeId: string, customerHash: string) => `coupon:once:${promotionCodeId}:${customerHash}`;
