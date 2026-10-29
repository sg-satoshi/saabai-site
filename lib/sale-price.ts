/**
 * Sale pricing: pure maths, policy checks and formatting. NO server imports, so the
 * admin editor, public components, checkout routes and tests share one source of truth.
 *
 * A sale lives on a catalogue product (lib/product-catalogue.ts) as `sale` and applies to
 * one fee (`appliesTo`). getEffectivePrice() is the only place that decides whether a sale
 * is live, so an ended sale reverts on the next render with no cron.
 *
 * Australian Consumer Law: a sale is only shown publicly, or charged, when the product is
 * linked to a public price whose checkout AND every page that prints that price are wired
 * to the sale (checkoutHonoursSale), and the sale passes the policy in lib/sale-policy.ts.
 */
import { SALE_POLICY, type SalePolicy } from "./sale-policy";

export type SaleFee = "one_time" | "setup" | "recurring";

export interface SaleFields {
  id?: string; // sale id, written to checkout metadata
  appliesTo?: SaleFee; // default: one_time for one-off products, else recurring
  salePrice: number; // cents, AUD
  saleStartsAt: string; // ISO with +10:00 (Brisbane)
  saleEndsAt: string | null; // ISO with +10:00, or null for until further notice
  showCountdown: boolean;
  showRibbon?: boolean;
  /** Which published price on the public site this product stands for, if any. */
  publicSlot?: PublicSlotId;
}

/** One regular price change, appended by the product PATCH route. */
export interface PriceChange {
  at: string; // ISO
  fee: SaleFee;
  fromCents: number | null;
  toCents: number;
  by?: string;
}

export type SaleStatus = "none" | "scheduled" | "live" | "ended" | "invalid";

export interface EffectivePrice {
  saleId: string | null;
  fee: SaleFee;
  original: number; // cents
  effective: number; // cents actually due now
  onSale: boolean;
  status: SaleStatus;
  saveCents: number;
  savePercent: number; // whole percent, floored
  endsAt: string | null;
  showCountdown: boolean;
  showRibbon: boolean;
}

export interface PricedProduct {
  id?: string;
  active?: boolean;
  createdAt?: string;
  billingType?: "one_time" | "recurring" | "setup_monthly";
  oneTimeAmount?: number;
  recurringAmount?: number;
  setupFee?: number;
  sale?: SaleFields | null;
  priceHistory?: PriceChange[];
}

const DAY = 86_400_000;

export function saleFeeOf(p: PricedProduct): SaleFee {
  if (p.sale?.appliesTo) return p.sale.appliesTo;
  return p.billingType === "one_time" ? "one_time" : "recurring";
}

/** The regular price of the fee the sale applies to. */
export function basePriceCents(p: PricedProduct, fee: SaleFee = saleFeeOf(p)): number {
  if (fee === "one_time") return p.oneTimeAmount || 0;
  if (fee === "setup") return p.setupFee || 0;
  return p.recurringAmount || 0;
}

/** Sale must be above 0 and below the regular price. */
export function validateSalePrice(salePrice: number, original: number): string | null {
  if (!Number.isFinite(salePrice)) return "Enter a sale price.";
  if (salePrice <= 0) return "Sale price must be above $0.";
  if (salePrice >= original) return `Sale price must be below the regular price of ${formatCents(original)}.`;
  return null;
}

/** $ and % saved. Percent is floored, never rounded up (ACL: don't overstate a discount). */
export function discountOf(original: number, sale: number): { saveCents: number; savePercent: number } {
  const saveCents = Math.max(0, original - sale);
  const savePercent = original > 0 ? Math.floor((saveCents / original) * 100) : 0;
  return { saveCents, savePercent };
}

export function saleStatus(
  sale: SaleFields | null | undefined,
  original: number,
  now: Date = new Date(),
  policy: SalePolicy = SALE_POLICY,
): SaleStatus {
  if (!sale) return "none";
  if (validateSalePrice(sale.salePrice, original)) return "invalid";
  const t = now.getTime();
  const start = Date.parse(sale.saleStartsAt);
  if (Number.isNaN(start)) return "invalid";
  if (t < start) return "scheduled";
  if (sale.saleEndsAt) {
    const end = Date.parse(sale.saleEndsAt);
    if (Number.isNaN(end) || end <= start) return "invalid";
    if (t >= end) return "ended";
  } else if (t >= start + policy.openSaleMaxDays * DAY) {
    return "ended"; // Q6 hard maximum for until-further-notice sales
  }
  return "live";
}

/** The single price helper used everywhere a sale could change what is shown or charged. */
export function getEffectivePrice(product: PricedProduct, now: Date = new Date(), policy: SalePolicy = SALE_POLICY): EffectivePrice {
  const fee = saleFeeOf(product);
  const original = basePriceCents(product, fee);
  const sale = product.sale || null;
  const status = saleStatus(sale, original, now, policy);
  if (status !== "live" || !sale) {
    return { saleId: null, fee, original, effective: original, onSale: false, status, saveCents: 0, savePercent: 0, endsAt: null, showCountdown: false, showRibbon: false };
  }
  const { saveCents, savePercent } = discountOf(original, sale.salePrice);
  return {
    saleId: sale.id || null,
    fee,
    original,
    effective: sale.salePrice,
    onSale: true,
    status,
    saveCents,
    savePercent,
    endsAt: sale.saleEndsAt,
    showCountdown: Boolean(sale.showCountdown && sale.saleEndsAt),
    showRibbon: Boolean(sale.showRibbon),
  };
}

// ── Policy checks (Q3, Q5, Q6, Q7) ──────────────────────────────────────────

/** Q5: when the regular price of this fee last changed (falls back to product creation). */
export function lastPriceChangeAt(p: PricedProduct, fee: SaleFee = saleFeeOf(p)): string | null {
  const changes = (p.priceHistory || []).filter((c) => c.fee === fee).map((c) => c.at).sort();
  return changes.length ? changes[changes.length - 1] : p.createdAt || null;
}

/** Q5 guard: the regular price must be unchanged for priceStableDays before the sale starts. */
export function priceChangeGuard(
  p: PricedProduct,
  startIso: string,
  policy: SalePolicy = SALE_POLICY,
): { ok: boolean; changedAt: string | null; daysBefore: number | null; earliestStart: string | null } {
  const changedAt = lastPriceChangeAt(p);
  if (!changedAt) return { ok: true, changedAt: null, daysBefore: null, earliestStart: null };
  const gap = Date.parse(startIso) - Date.parse(changedAt);
  const earliestStart = toBrisbaneIso(new Date(Date.parse(changedAt) + policy.priceStableDays * DAY));
  return { ok: gap >= policy.priceStableDays * DAY, changedAt, daysBefore: Math.floor(gap / DAY), earliestStart };
}

/** Q6: until-further-notice sales get a review warning after openSaleReviewDays. */
export function saleReview(sale: SaleFields | null | undefined, now: Date = new Date(), policy: SalePolicy = SALE_POLICY): { days: number; needsReview: boolean } {
  if (!sale || sale.saleEndsAt) return { days: 0, needsReview: false };
  const days = Math.floor((now.getTime() - Date.parse(sale.saleStartsAt)) / DAY);
  return { days: Math.max(0, days), needsReview: days >= policy.openSaleReviewDays };
}

/** Policy reasons a sale on this product/fee can't run at all (null = allowed). */
export function policyBlockReason(p: PricedProduct, policy: SalePolicy = SALE_POLICY): string | null {
  const fee = saleFeeOf(p);
  if (fee === "recurring" && policy.recurringDiscountMonths <= 0) {
    return "Monthly fees can't be discounted (sale policy: setup and one-off fees only).";
  }
  const slot = p.sale?.publicSlot;
  if (slot && PUBLIC_SLOTS[slot]?.family === "blueprint" && !policy.blueprintDiscountAllowed) {
    return "Blueprint discounting is switched off (sale policy).";
  }
  return null;
}

// ── Flag ────────────────────────────────────────────────────────────────────

export function isSalePricingEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = (env.SALE_PRICING_ENABLED || "").trim().toLowerCase();
  return v === "1" || v === "true";
}

// ── Dates (Brisbane, UTC+10, no daylight saving) ─────────────────────────────

/** ISO timestamp written with the Brisbane +10:00 offset, e.g. 2026-11-15T23:59:59+10:00. */
export function toBrisbaneIso(d: Date): string {
  const b = new Date(d.getTime() + 10 * 3_600_000);
  return b.toISOString().replace(/\.\d{3}Z$/, "+10:00");
}

/** End of a Brisbane calendar day (YYYY-MM-DD), Brisbane offset. */
export function brisbaneEndOfDay(ymd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return Number.isNaN(Date.parse(`${ymd}T23:59:59+10:00`)) ? null : `${ymd}T23:59:59+10:00`;
}

/** Brisbane date + time (YYYY-MM-DD, HH:MM) as an ISO timestamp with +10:00. */
export function brisbaneAt(ymd: string, hm = "00:00"): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || !/^\d{2}:\d{2}$/.test(hm)) return null;
  const iso = `${ymd}T${hm}:00+10:00`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

/** "For X days" from a start: exactly X × 24h later. */
export function endAfterDays(startIso: string, days: number): string | null {
  const s = Date.parse(startIso);
  if (Number.isNaN(s) || !Number.isInteger(days) || days < 1 || days > 365) return null;
  return toBrisbaneIso(new Date(s + days * DAY));
}

export function formatBrisbaneDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Brisbane", ...opts }).format(new Date(iso));
}

/** YYYY-MM-DD in Brisbane. */
export function brisbaneYmd(iso: string): string {
  return formatBrisbaneDate(iso, { year: "numeric", month: "2-digit", day: "2-digit" }).split("/").reverse().join("-");
}

// ── Formatting ──────────────────────────────────────────────────────────────

export function formatCents(cents: number): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}

/** Admin preview: "Save $100, 20% off". */
export function saleSummary(original: number, sale: number): string {
  const { saveCents, savePercent } = discountOf(original, sale);
  return savePercent > 0 ? `Save ${formatCents(saveCents)}, ${savePercent}% off` : `Save ${formatCents(saveCents)}`;
}

/**
 * Countdown text (Q2). More than countdownFixedDateAboveHours left: "Sale ends 15 Nov".
 * Otherwise "Ends in 05h 42m" (no seconds; callers update once a minute). At or past the end: "".
 */
export function formatCountdown(endsAtIso: string, now: Date = new Date(), policy: SalePolicy = SALE_POLICY): string {
  const ms = Date.parse(endsAtIso) - now.getTime();
  if (Number.isNaN(ms) || ms <= 0) return "";
  if (ms > policy.countdownFixedDateAboveHours * 3_600_000) return `Sale ends ${formatBrisbaneDate(endsAtIso)}`;
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `Ends in ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

/** Static end text for screen readers: "Sale ends 15 Nov 2026, 11:59 pm Brisbane time". */
export function srEndText(endsAtIso: string): string {
  return `Sale ends ${formatBrisbaneDate(endsAtIso, { day: "numeric", month: "short", year: "numeric" })}, ${formatBrisbaneDate(endsAtIso, { hour: "numeric", minute: "2-digit" })} Brisbane time`;
}

// ── JSON-LD ─────────────────────────────────────────────────────────────────

/** Offer price fields: the effective price, plus priceValidUntil (Brisbane date) when a live sale has an end. */
export function offerPriceFields(ep: EffectivePrice): { price: string; priceCurrency: "AUD"; priceValidUntil?: string } {
  const out: { price: string; priceCurrency: "AUD"; priceValidUntil?: string } = {
    price: centsToPriceString(ep.effective),
    priceCurrency: "AUD",
  };
  if (ep.onSale && ep.endsAt) out.priceValidUntil = brisbaneYmd(ep.endsAt);
  return out;
}

export function centsToPriceString(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

// ── Public slots, surfaces and checkout integrity ───────────────────────────

/**
 * Every place on the public site that prints a published price. A slot may only show or
 * charge a sale when its checkout AND every surface listed for it are in WIRED_SURFACES,
 * so a sale can never show on one page and not another.
 */
export type Surface =
  | "pricing-card" | "pricing-jsonld" | "pricing-meta"
  | "blueprint-card" | "blueprint-jsonld" | "blueprint-meta" | "blueprint-checkout-page"
  | "leadgen-card" | "websites-card" | "websites-jsonld" | "websites-meta" | "legal-jsonld"
  | "llms" | "mia"
  | "home" | "compare" | "seo-ai-search" | "score" | "custom-ai-agents" | "services" | "faq"
  | "about" | "process" | "location-pages" | "case-studies" | "og-image" | "ai-receptionist" | "ai-chatbot-pages"
  | "lex-pages" | "layout-jsonld";

/** Surfaces this codebase actually renders from the sale records. */
export const WIRED_SURFACES: ReadonlySet<Surface> = new Set<Surface>([
  "pricing-card", "pricing-jsonld", "pricing-meta",
  "blueprint-card", "blueprint-jsonld", "blueprint-meta",
  "leadgen-card", "websites-card", "websites-jsonld", "websites-meta",
  "llms", "mia",
]);

export type PublicSlotId =
  | "blueprint-starter" | "blueprint-pro" | "blueprint-business"
  | "leadgen-starter" | "leadgen-pro" | "leadgen-enterprise"
  | "care-presence" | "care-growth" | "care-signature"
  | "build-presence" | "build-growth" | "build-signature"
  | "lex-firm";

export interface PublicSlot {
  id: PublicSlotId;
  family: "blueprint" | "leadgen" | "care" | "build" | "lex";
  label: string;
  fee: SaleFee;
  publishedCents: number;
  checkout: string;
  /** True once the checkout route charges getEffectivePrice server-side. */
  checkoutWired: boolean;
  surfaces: Surface[];
  /** Exact phrases in llms.txt and meta copy that state this price. */
  textTokens: string[];
}

const BP_SURFACES: Surface[] = [
  "pricing-card", "pricing-jsonld", "pricing-meta", "blueprint-card", "blueprint-jsonld", "blueprint-meta",
  "blueprint-checkout-page", "llms", "mia", "home", "compare", "seo-ai-search", "score", "custom-ai-agents",
  "services", "faq", "about", "process", "location-pages", "case-studies", "og-image", "ai-receptionist",
  "ai-chatbot-pages", "layout-jsonld",
];
const LG_SURFACES: Surface[] = ["leadgen-card", "pricing-card", "pricing-jsonld", "llms", "mia"];
const CARE_SURFACES: Surface[] = [
  "websites-card", "websites-jsonld", "websites-meta", "pricing-card", "pricing-jsonld", "pricing-meta", "llms", "mia",
  "home", "ai-receptionist", "location-pages", "faq", "compare", "services", "layout-jsonld",
];
const LEX_SURFACES: Surface[] = ["pricing-card", "pricing-jsonld", "legal-jsonld", "llms", "lex-pages", "ai-chatbot-pages"];

export const PUBLIC_SLOTS: Record<PublicSlotId, PublicSlot> = {
  "blueprint-starter": { id: "blueprint-starter", family: "blueprint", label: "Blueprint Starter", fee: "one_time", publishedCents: 49_700, checkout: "/api/blueprint/checkout (price_data on sale)", checkoutWired: true, surfaces: BP_SURFACES, textTokens: ["Starter $497", "Starter is $497", "from $497"] },
  "blueprint-pro": { id: "blueprint-pro", family: "blueprint", label: "Blueprint Pro", fee: "one_time", publishedCents: 149_700, checkout: "/api/blueprint/checkout (price_data on sale)", checkoutWired: true, surfaces: BP_SURFACES, textTokens: ["Pro $1,497", "Pro is $1,497"] },
  "blueprint-business": { id: "blueprint-business", family: "blueprint", label: "Blueprint Business", fee: "one_time", publishedCents: 350_000, checkout: "/api/blueprint/checkout (price_data on sale)", checkoutWired: true, surfaces: BP_SURFACES, textTokens: ["Business $3,500", "Business is $3,500"] },
  "leadgen-starter": { id: "leadgen-starter", family: "leadgen", label: "LeadGen Starter", fee: "recurring", publishedCents: 19_700, checkout: "/api/leadgen/checkout (time-limited coupon on sale)", checkoutWired: true, surfaces: LG_SURFACES, textTokens: ["Starter $197/month"] },
  "leadgen-pro": { id: "leadgen-pro", family: "leadgen", label: "LeadGen Pro", fee: "recurring", publishedCents: 39_700, checkout: "/api/leadgen/checkout (time-limited coupon on sale)", checkoutWired: true, surfaces: LG_SURFACES, textTokens: ["Pro $397/month"] },
  "leadgen-enterprise": { id: "leadgen-enterprise", family: "leadgen", label: "LeadGen Enterprise", fee: "recurring", publishedCents: 99_700, checkout: "/api/leadgen/checkout (time-limited coupon on sale)", checkoutWired: true, surfaces: LG_SURFACES, textTokens: ["Enterprise $997/month"] },
  "care-presence": { id: "care-presence", family: "care", label: "Presence care plan", fee: "recurring", publishedCents: 10_000, checkout: "Quoted and invoiced, no online checkout", checkoutWired: false, surfaces: CARE_SURFACES, textTokens: ["Presence $100/month"] },
  "care-growth": { id: "care-growth", family: "care", label: "Growth care plan", fee: "recurring", publishedCents: 20_000, checkout: "Quoted and invoiced, no online checkout", checkoutWired: false, surfaces: CARE_SURFACES, textTokens: ["Growth $200/month"] },
  "care-signature": { id: "care-signature", family: "care", label: "Signature care plan", fee: "recurring", publishedCents: 30_000, checkout: "Quoted and invoiced, no online checkout", checkoutWired: false, surfaces: CARE_SURFACES, textTokens: ["Signature $300/month"] },
  "build-presence": { id: "build-presence", family: "build", label: "Presence build (from)", fee: "setup", publishedCents: 200_000, checkout: "Quoted and invoiced, no online checkout", checkoutWired: false, surfaces: CARE_SURFACES, textTokens: ["Presence from $2,000"] },
  "build-growth": { id: "build-growth", family: "build", label: "Growth build (from)", fee: "setup", publishedCents: 400_000, checkout: "Quoted and invoiced, no online checkout", checkoutWired: false, surfaces: CARE_SURFACES, textTokens: ["Growth from $4,000"] },
  "build-signature": { id: "build-signature", family: "build", label: "Signature build (from)", fee: "setup", publishedCents: 650_000, checkout: "Quoted and invoiced, no online checkout", checkoutWired: false, surfaces: CARE_SURFACES, textTokens: ["Signature from $6,500"] },
  "lex-firm": { id: "lex-firm", family: "lex", label: "Lex Firm", fee: "recurring", publishedCents: 29_900, checkout: "Lex billing (not wired)", checkoutWired: false, surfaces: LEX_SURFACES, textTokens: ["The Firm plan is $299 a month"] },
};

export function isPublicSlotId(v: unknown): v is PublicSlotId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(PUBLIC_SLOTS, v);
}

/** Surfaces for a slot that don't yet render the sale. */
export function unwiredSurfaces(slot: PublicSlotId, wired: ReadonlySet<Surface> = WIRED_SURFACES): Surface[] {
  return PUBLIC_SLOTS[slot].surfaces.filter((s) => !wired.has(s));
}

/** Why the public display and sale charge are off for a product (null = it may show and charge). */
export function publicBlockReason(
  product: PricedProduct,
  opts: { policy?: SalePolicy; wired?: ReadonlySet<Surface>; slots?: Record<PublicSlotId, PublicSlot> } = {},
): string | null {
  const policy = opts.policy ?? SALE_POLICY;
  const slots = opts.slots ?? PUBLIC_SLOTS;
  const slotId = product.sale?.publicSlot;
  if (!slotId || !isPublicSlotId(slotId)) return "Not linked to a public price.";
  const s = slots[slotId];
  const pol = policyBlockReason(product, policy);
  if (pol) return pol;
  if (!s.checkoutWired) return `Checkout can't charge the sale amount: ${s.checkout}.`;
  const missing = unwiredSurfaces(slotId, opts.wired ?? WIRED_SURFACES);
  if (missing.length) return `Not every page that shows this price follows the sale yet (${missing.join(", ")}).`;
  if (saleFeeOf(product) !== s.fee) return "The sale applies to a different fee than the linked public price.";
  if (basePriceCents(product) !== s.publishedCents) return "This product's regular price doesn't match the published price it is linked to.";
  return null;
}

export function checkoutHonoursSale(product: PricedProduct, opts?: Parameters<typeof publicBlockReason>[1]): boolean {
  return publicBlockReason(product, opts) === null;
}

/** Live, honoured sale for one slot. Flag off or blocked: null. Used by pages AND checkout. */
export function publicSaleForSlot(
  slot: PublicSlotId,
  products: PricedProduct[],
  opts: { enabled: boolean; now?: Date; policy?: SalePolicy; wired?: ReadonlySet<Surface>; slots?: Record<PublicSlotId, PublicSlot> },
): EffectivePrice | null {
  if (!opts.enabled) return null;
  for (const p of products) {
    if (p.active === false) continue;
    if (p.sale?.publicSlot !== slot) continue;
    if (!checkoutHonoursSale(p, opts)) continue;
    const ep = getEffectivePrice(p, opts.now, opts.policy);
    if (ep.onSale) return ep;
  }
  return null;
}

export type PublicSales = Partial<Record<PublicSlotId, EffectivePrice>>;

/** Rewrite price phrases in llms.txt / meta copy for live sales. No sales: text unchanged. */
export function applySalesToText(text: string, sales: PublicSales): string {
  let out = text;
  for (const [slot, ep] of Object.entries(sales) as [PublicSlotId, EffectivePrice][]) {
    if (!ep?.onSale) continue;
    const was = formatCents(ep.original);
    const now = formatCents(ep.effective);
    const until = ep.endsAt ? ` until ${formatBrisbaneDate(ep.endsAt, { day: "numeric", month: "short", year: "numeric" })}` : "";
    for (const token of PUBLIC_SLOTS[slot].textTokens) {
      out = out.split(token).join(token.replace(was, `${now} (on sale, was ${was}${until})`));
    }
  }
  return out;
}

// ── Checkout ────────────────────────────────────────────────────────────────

export interface SaleCharge {
  saleId: string;
  wasCents: number;
  nowCents: number;
  endsAt: string | null;
}

/**
 * What checkout should charge for a slot. Computed ONLY from the server-side product
 * record and the clock; there is deliberately no client amount parameter.
 * null = no live honoured sale, use the fixed Stripe price ID.
 */
export function checkoutSaleCharge(
  slot: PublicSlotId,
  products: PricedProduct[],
  opts: { enabled: boolean; now?: Date; policy?: SalePolicy; wired?: ReadonlySet<Surface>; slots?: Record<PublicSlotId, PublicSlot> },
): SaleCharge | null {
  const ep = publicSaleForSlot(slot, products, opts);
  if (!ep || !ep.onSale || ep.effective <= 0 || ep.effective >= ep.original) return null;
  return { saleId: ep.saleId || "sale", wasCents: ep.original, nowCents: ep.effective, endsAt: ep.endsAt };
}

export function saleMetadata(c: SaleCharge): Record<string, string> {
  return {
    sale_id: c.saleId,
    sale_was_cents: String(c.wasCents),
    sale_now_cents: String(c.nowCents),
    ...(c.endsAt ? { sale_ends_at: c.endsAt } : {}),
  };
}

// ── Admin input ─────────────────────────────────────────────────────────────

function newSaleId(): string {
  return "sale_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Parse + validate the sale body for the admin route (applies Q3, Q5, Q7). */
export function parseSaleInput(
  raw: unknown,
  product: PricedProduct,
  now: Date = new Date(),
  policy: SalePolicy = SALE_POLICY,
): { sale?: SaleFields | null; error?: string } {
  if (raw === null) return { sale: null };
  if (!raw || typeof raw !== "object") return { error: "Invalid sale" };
  const r = raw as Record<string, unknown>;
  const appliesTo: SaleFee =
    r.appliesTo === "setup" || r.appliesTo === "recurring" || r.appliesTo === "one_time"
      ? r.appliesTo
      : product.billingType === "one_time" ? "one_time" : "recurring";
  if (appliesTo === "one_time" && product.billingType !== "one_time") return { error: "This product has no one-off fee." };
  if (appliesTo === "setup" && product.billingType !== "setup_monthly") return { error: "This product has no setup fee." };
  if (appliesTo === "recurring" && product.billingType === "one_time") return { error: "This product has no monthly fee." };
  const original = basePriceCents(product, appliesTo);
  const salePrice = typeof r.salePrice === "number" ? Math.round(r.salePrice) : NaN;
  const err = validateSalePrice(salePrice, original);
  if (err) return { error: err };
  const startMs = typeof r.saleStartsAt === "string" && !Number.isNaN(Date.parse(r.saleStartsAt)) ? Date.parse(r.saleStartsAt) : now.getTime();
  const saleStartsAt = toBrisbaneIso(new Date(startMs));
  let saleEndsAt: string | null = null;
  if (r.saleEndsAt != null && r.saleEndsAt !== "") {
    if (typeof r.saleEndsAt !== "string" || Number.isNaN(Date.parse(r.saleEndsAt))) return { error: "Invalid end date" };
    if (Date.parse(r.saleEndsAt) <= startMs) return { error: "End must be after the start." };
    saleEndsAt = toBrisbaneIso(new Date(Date.parse(r.saleEndsAt)));
  }
  const sale: SaleFields = {
    id: typeof r.id === "string" && /^sale_[a-z0-9]{4,20}$/.test(r.id) ? r.id : newSaleId(),
    appliesTo,
    salePrice,
    saleStartsAt,
    saleEndsAt,
    showCountdown: r.showCountdown === true && saleEndsAt !== null,
    showRibbon: r.showRibbon === true,
  };
  if (r.publicSlot != null && r.publicSlot !== "") {
    if (!isPublicSlotId(r.publicSlot)) return { error: "Unknown public price" };
    sale.publicSlot = r.publicSlot;
  }
  const candidate = { ...product, sale };
  const pol = policyBlockReason(candidate, policy);
  if (pol) return { error: pol };
  const guard = priceChangeGuard(candidate, saleStartsAt, policy);
  if (!guard.ok) {
    return { error: `Can't start this sale yet. The regular price changed ${guard.daysBefore} days before the start. Earliest allowed start: ${formatBrisbaneDate(guard.earliestStart!, { day: "numeric", month: "short", year: "numeric" })}.` };
  }
  return { sale };
}

// ── Page helpers ────────────────────────────────────────────────────────────

/** JSON-LD price fields for a published price: the sale when one is live and honoured, else the regular dollars. */
export function offerPriceOr(sale: EffectivePrice | null | undefined, regularDollars: number): { price: string; priceCurrency: "AUD"; priceValidUntil?: string } {
  return sale?.onSale ? offerPriceFields(sale) : { price: String(regularDollars), priceCurrency: "AUD" };
}

export function careSlot(tierName: string): PublicSlotId {
  return `care-${tierName.toLowerCase()}` as PublicSlotId;
}
export function buildSlot(tierName: string): PublicSlotId {
  return `build-${tierName.toLowerCase()}` as PublicSlotId;
}
export function leadgenSlot(tierName: string): PublicSlotId {
  return `leadgen-${tierName.toLowerCase()}` as PublicSlotId;
}
export function blueprintSlot(tierId: string): PublicSlotId {
  return `blueprint-${tierId}` as PublicSlotId;
}
