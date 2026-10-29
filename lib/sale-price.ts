/**
 * Sale pricing: pure maths and formatting. NO server imports, so the admin editor,
 * the public components and the tests all share one source of truth.
 *
 * A sale lives on a catalogue product (lib/product-catalogue.ts) as `sale`. It
 * applies to the product's headline fee (one-time amount, or the recurring amount).
 * getEffectivePrice() is the only place that decides whether a sale is live, so an
 * ended sale reverts on the next render with no cron.
 *
 * Australian Consumer Law: a sale is only ever shown publicly when the checkout for
 * that public price can actually charge the sale amount (checkoutHonoursSale).
 */

export interface SaleFields {
  salePrice: number; // cents, AUD
  saleStartsAt: string; // ISO timestamp
  saleEndsAt: string | null; // ISO timestamp, or null for until further notice
  showCountdown: boolean;
  /** Which published price on the public site this product stands for, if any. */
  publicSlot?: PublicSlotId;
}

export type SaleStatus = "none" | "scheduled" | "live" | "ended" | "invalid";

export interface EffectivePrice {
  original: number; // cents
  effective: number; // cents actually due now
  onSale: boolean;
  status: SaleStatus;
  saveCents: number;
  savePercent: number; // whole percent, rounded
  endsAt: string | null;
  showCountdown: boolean;
}

export interface PricedProduct {
  billingType?: "one_time" | "recurring" | "setup_monthly";
  oneTimeAmount?: number;
  recurringAmount?: number;
  sale?: SaleFields | null;
}

/** Headline amount a sale applies to: one-time amount, else the recurring amount. */
export function basePriceCents(p: PricedProduct): number {
  return (p.billingType === "one_time" ? p.oneTimeAmount : p.recurringAmount) || 0;
}

/** Sale must be above 0 and below the original. */
export function validateSalePrice(salePrice: number, original: number): string | null {
  if (!Number.isFinite(salePrice) || salePrice <= 0) return "Sale price must be more than $0.";
  if (salePrice >= original) return "Sale price must be less than the original price.";
  return null;
}

export function discountOf(original: number, sale: number): { saveCents: number; savePercent: number } {
  const saveCents = Math.max(0, original - sale);
  const savePercent = original > 0 ? Math.round((saveCents / original) * 100) : 0;
  return { saveCents, savePercent };
}

export function saleStatus(sale: SaleFields | null | undefined, original: number, now: Date = new Date()): SaleStatus {
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
  }
  return "live";
}

/** The single price helper used everywhere a sale could change what is shown. */
export function getEffectivePrice(product: PricedProduct, now: Date = new Date()): EffectivePrice {
  const original = basePriceCents(product);
  const sale = product.sale || null;
  const status = saleStatus(sale, original, now);
  if (status !== "live" || !sale) {
    return { original, effective: original, onSale: false, status, saveCents: 0, savePercent: 0, endsAt: null, showCountdown: false };
  }
  const { saveCents, savePercent } = discountOf(original, sale.salePrice);
  return {
    original,
    effective: sale.salePrice,
    onSale: true,
    status,
    saveCents,
    savePercent,
    endsAt: sale.saleEndsAt,
    showCountdown: Boolean(sale.showCountdown && sale.saleEndsAt),
  };
}

// ── Flag ────────────────────────────────────────────────────────────────────

export function isSalePricingEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = (env.SALE_PRICING_ENABLED || "").trim().toLowerCase();
  return v === "1" || v === "true";
}

// ── Dates (Brisbane, UTC+10, no daylight saving) ─────────────────────────────

const BNE_OFFSET = "+10:00";

/** End of a Brisbane calendar day (YYYY-MM-DD) as an ISO timestamp. */
export function brisbaneEndOfDay(ymd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(`${ymd}T23:59:59${BNE_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Start of a Brisbane calendar day (YYYY-MM-DD) as an ISO timestamp. */
export function brisbaneStartOfDay(ymd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(`${ymd}T00:00:00${BNE_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** "For X days" from a start: exactly X × 24h later. */
export function endAfterDays(startIso: string, days: number): string | null {
  const s = Date.parse(startIso);
  if (Number.isNaN(s) || !Number.isInteger(days) || days < 1 || days > 365) return null;
  return new Date(s + days * 86_400_000).toISOString();
}

export function formatBrisbaneDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Brisbane", ...opts }).format(new Date(iso));
}

// ── Formatting ──────────────────────────────────────────────────────────────

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** "$X off (Y%)" for the admin preview. */
export function saleSummary(original: number, sale: number): string {
  const { saveCents, savePercent } = discountOf(original, sale);
  return `${formatCents(saveCents)} off (${savePercent}%)`;
}

/**
 * Countdown text. More than 7 days left: "Sale ends 15 Nov" (Brisbane date).
 * Otherwise "Ends in 2d 14h 03m". At or past the end: "" (the caller hides it).
 */
export function formatCountdown(endsAtIso: string, now: Date = new Date()): string {
  const ms = Date.parse(endsAtIso) - now.getTime();
  if (Number.isNaN(ms) || ms <= 0) return "";
  if (ms > 7 * 86_400_000) return `Sale ends ${formatBrisbaneDate(endsAtIso)}`;
  const totalMin = Math.floor(ms / 60_000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `Ends in ${d}d ${h}h ${String(m).padStart(2, "0")}m`;
  if (h > 0) return `Ends in ${h}h ${String(m).padStart(2, "0")}m`;
  if (totalMin > 0) return `Ends in ${m}m`;
  return `Ends in ${Math.ceil(ms / 1000)}s`;
}

// ── JSON-LD ─────────────────────────────────────────────────────────────────

/** Offer price fields: the effective price, plus priceValidUntil when a live sale has an end. */
export function offerPriceFields(ep: EffectivePrice): { price: string; priceCurrency: "AUD"; priceValidUntil?: string } {
  const out: { price: string; priceCurrency: "AUD"; priceValidUntil?: string } = {
    price: centsToPriceString(ep.effective),
    priceCurrency: "AUD",
  };
  if (ep.onSale && ep.endsAt) out.priceValidUntil = formatBrisbaneDate(ep.endsAt, { year: "numeric", month: "2-digit", day: "2-digit" }).split("/").reverse().join("-");
  return out;
}

function centsToPriceString(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

// ── Public slots + checkout integrity ───────────────────────────────────────

/**
 * Published prices on the public site that a catalogue product can stand for.
 * `checkoutHonoursSale` is true only when that checkout can charge a dynamic amount.
 * Every public checkout today uses a fixed Stripe price ID, so all are false and the
 * public sale display stays off for them until checkout is changed (needs Shane).
 */
export type PublicSlotId =
  | "blueprint-starter"
  | "blueprint-pro"
  | "blueprint-business"
  | "leadgen-starter"
  | "leadgen-pro"
  | "leadgen-enterprise";

export interface PublicSlot {
  id: PublicSlotId;
  label: string;
  publishedCents: number;
  checkout: string;
  checkoutHonoursSale: boolean;
}

export const PUBLIC_SLOTS: Record<PublicSlotId, PublicSlot> = {
  "blueprint-starter": { id: "blueprint-starter", label: "Blueprint Starter (/blueprint, /pricing)", publishedCents: 49_700, checkout: "Fixed Stripe price ID (STRIPE_BLUEPRINT_STARTER_PRICE_ID)", checkoutHonoursSale: false },
  "blueprint-pro": { id: "blueprint-pro", label: "Blueprint Pro (/blueprint, /pricing)", publishedCents: 149_700, checkout: "Fixed Stripe price ID (STRIPE_BLUEPRINT_PRO_PRICE_ID)", checkoutHonoursSale: false },
  "blueprint-business": { id: "blueprint-business", label: "Blueprint Business (/blueprint, /pricing)", publishedCents: 350_000, checkout: "Fixed Stripe price ID (STRIPE_BLUEPRINT_BUSINESS_PRICE_ID)", checkoutHonoursSale: false },
  "leadgen-starter": { id: "leadgen-starter", label: "LeadGen Starter (/leadgen, /pricing)", publishedCents: 19_700, checkout: "Fixed Stripe price ID (STRIPE_PRICE_STARTER)", checkoutHonoursSale: false },
  "leadgen-pro": { id: "leadgen-pro", label: "LeadGen Pro (/leadgen, /pricing)", publishedCents: 39_700, checkout: "Fixed Stripe price ID (STRIPE_PRICE_PRO)", checkoutHonoursSale: false },
  "leadgen-enterprise": { id: "leadgen-enterprise", label: "LeadGen Enterprise (/leadgen, /pricing)", publishedCents: 99_700, checkout: "Fixed Stripe price ID (STRIPE_PRICE_ENTERPRISE)", checkoutHonoursSale: false },
};

export function isPublicSlotId(v: unknown): v is PublicSlotId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(PUBLIC_SLOTS, v);
}

/** Why the public display is off for a product (null = it may show). */
export function publicBlockReason(product: PricedProduct): string | null {
  const slot = product.sale?.publicSlot;
  if (!slot || !isPublicSlotId(slot)) return "Not linked to a public price.";
  const s = PUBLIC_SLOTS[slot];
  if (!s.checkoutHonoursSale) return `Checkout can't charge the sale amount yet: ${s.checkout}.`;
  if (basePriceCents(product) !== s.publishedCents) return "This product's price doesn't match the published price it is linked to.";
  return null;
}

export function checkoutHonoursSale(product: PricedProduct): boolean {
  return publicBlockReason(product) === null;
}

/** What the public site should show for one slot. Flag off or blocked: no sale. */
export function publicSaleForSlot(
  slot: PublicSlotId,
  products: PricedProduct[],
  opts: { enabled: boolean; now?: Date },
): EffectivePrice | null {
  if (!opts.enabled) return null;
  for (const p of products) {
    if (p.sale?.publicSlot !== slot) continue;
    if (!checkoutHonoursSale(p)) continue;
    const ep = getEffectivePrice(p, opts.now);
    if (ep.onSale) return ep;
  }
  return null;
}

/** Parse + validate the sale body for the admin route. */
export function parseSaleInput(raw: unknown, original: number, now: Date = new Date()): { sale?: SaleFields | null; error?: string } {
  if (raw === null) return { sale: null };
  if (!raw || typeof raw !== "object") return { error: "Invalid sale" };
  const r = raw as Record<string, unknown>;
  const salePrice = typeof r.salePrice === "number" ? Math.round(r.salePrice) : NaN;
  const err = validateSalePrice(salePrice, original);
  if (err) return { error: err };
  const saleStartsAt = typeof r.saleStartsAt === "string" && !Number.isNaN(Date.parse(r.saleStartsAt))
    ? new Date(r.saleStartsAt).toISOString()
    : now.toISOString();
  let saleEndsAt: string | null = null;
  if (r.saleEndsAt != null && r.saleEndsAt !== "") {
    if (typeof r.saleEndsAt !== "string" || Number.isNaN(Date.parse(r.saleEndsAt))) return { error: "Invalid end date" };
    saleEndsAt = new Date(r.saleEndsAt).toISOString();
    if (Date.parse(saleEndsAt) <= Date.parse(saleStartsAt)) return { error: "End must be after the start." };
  }
  const sale: SaleFields = { salePrice, saleStartsAt, saleEndsAt, showCountdown: r.showCountdown === true };
  if (r.publicSlot != null && r.publicSlot !== "") {
    if (!isPublicSlotId(r.publicSlot)) return { error: "Unknown public price" };
    sale.publicSlot = r.publicSlot;
  }
  return { sale };
}
