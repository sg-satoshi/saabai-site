/**
 * Selling helpers: validate a coupon code against Stripe, compute the amounts we
 * actually charge (product discount baked in), and build a display quote.
 *
 * How discounts flow to Stripe:
 *  - Product discount  -> baked into the ad-hoc prices / PaymentIntent amount (both paths).
 *  - Coupon code       -> subscriptions & checkout links pass it to Stripe NATIVELY
 *                         (discounts: [{ promotion_code }]); one-time charge-now folds it
 *                         into the PaymentIntent amount.
 */
import type Stripe from "stripe";
import type { CatalogueProduct } from "./product-catalogue";
import { feeDisplay } from "./product-pricing";

export interface ResolvedCoupon {
  promotionCodeId: string;
  code: string;
  percentOff: number | null;
  amountOff: number | null; // cents
}

/** Look up + validate a customer coupon code for this product. Empty code -> no coupon, no error. */
export async function resolveCoupon(
  stripe: Stripe,
  codeInput: string | undefined,
  product: CatalogueProduct,
): Promise<{ coupon?: ResolvedCoupon; error?: string }> {
  const code = (codeInput || "").trim();
  if (!code) return {};

  const list = await stripe.promotionCodes.list({ code, active: true, limit: 1, expand: ["data.promotion.coupon"] });
  const pc = list.data[0];
  if (!pc) return { error: "Coupon code not found or inactive" };
  if (pc.expires_at && pc.expires_at * 1000 < Date.now()) return { error: "Coupon code has expired" };
  if (pc.max_redemptions && pc.times_redeemed >= pc.max_redemptions) return { error: "Coupon code has reached its redemption limit" };

  const c = pc.promotion.coupon as Stripe.Coupon;
  const restricted = c.applies_to?.products;
  if (restricted && restricted.length > 0 && !restricted.includes(product.stripeProductId)) {
    return { error: "This code does not apply to this product" };
  }

  return {
    coupon: {
      promotionCodeId: pc.id,
      code: pc.code,
      percentOff: c.percent_off ?? null,
      amountOff: c.amount_off ?? null,
    },
  };
}

/**
 * Validate a coupon for a free-form (non-product) manual charge. Same checks as
 * resolveCoupon, but rejects product-restricted codes since there is no product
 * to match against.
 */
export async function resolveCouponForManual(
  stripe: Stripe,
  codeInput: string | undefined,
): Promise<{ coupon?: ResolvedCoupon; error?: string }> {
  const code = (codeInput || "").trim();
  if (!code) return {};

  const list = await stripe.promotionCodes.list({ code, active: true, limit: 1, expand: ["data.promotion.coupon"] });
  const pc = list.data[0];
  if (!pc) return { error: "Coupon code not found or inactive" };
  if (pc.expires_at && pc.expires_at * 1000 < Date.now()) return { error: "Coupon code has expired" };
  if (pc.max_redemptions && pc.times_redeemed >= pc.max_redemptions) return { error: "Coupon code has reached its redemption limit" };

  const c = pc.promotion.coupon as Stripe.Coupon;
  const restricted = c.applies_to?.products;
  if (restricted && restricted.length > 0) {
    return { error: "This code only applies to a specific product. Use the Sell button on that product instead." };
  }

  return {
    coupon: {
      promotionCodeId: pc.id,
      code: pc.code,
      percentOff: c.percent_off ?? null,
      amountOff: c.amount_off ?? null,
    },
  };
}

export interface BakedAmounts {
  setup?: number;
  recurring?: number;
  oneTime?: number;
}

/** Amounts after the product's own discount (what we build Stripe prices / charges from). */
export function bakedAmounts(product: CatalogueProduct): BakedAmounts {
  const d = product.discount;
  if (product.billingType === "one_time") {
    return { oneTime: feeDisplay("one_time", product.oneTimeAmount || 0, d).discounted };
  }
  const out: BakedAmounts = { recurring: feeDisplay("recurring", product.recurringAmount || 0, d).discounted };
  if (product.billingType === "setup_monthly") {
    out.setup = feeDisplay("setup", product.setupFee || 0, d).discounted;
  }
  return out;
}

/** Apply a coupon to a single amount (percent or fixed). Used for one-time charge-now. */
export function couponOff(amount: number, coupon?: ResolvedCoupon | null): number {
  if (!coupon) return amount;
  if (coupon.percentOff != null) return Math.max(0, Math.round(amount * (1 - coupon.percentOff / 100)));
  if (coupon.amountOff != null) return Math.max(0, amount - coupon.amountOff);
  return amount;
}

export interface QuoteLine {
  key: "setup" | "recurring" | "one_time";
  label: string;
  original: number; // full price, cents
  final: number; // after product discount + percent coupon, cents
}

export interface SaleQuote {
  lines: QuoteLine[];
  couponCode: string | null;
  couponAmountOff: number | null; // shown separately (applied at checkout)
}

/**
 * Display quote. Percent coupons fold into each line (exact, matches Stripe).
 * Fixed-$ coupons are surfaced separately since Stripe applies them to the invoice total.
 */
export function buildQuote(product: CatalogueProduct, coupon?: ResolvedCoupon | null): SaleQuote {
  const d = product.discount;
  const pct = coupon?.percentOff ?? null;
  const foldPct = (n: number) => (pct != null ? Math.max(0, Math.round(n * (1 - pct / 100))) : n);

  const lines: QuoteLine[] = [];
  if (product.billingType === "one_time") {
    const orig = product.oneTimeAmount || 0;
    lines.push({ key: "one_time", label: "One-off", original: orig, final: foldPct(feeDisplay("one_time", orig, d).discounted) });
  } else {
    if (product.billingType === "setup_monthly") {
      const s = product.setupFee || 0;
      lines.push({ key: "setup", label: "Setup", original: s, final: foldPct(feeDisplay("setup", s, d).discounted) });
    }
    const r = product.recurringAmount || 0;
    lines.push({ key: "recurring", label: "Recurring", original: r, final: foldPct(feeDisplay("recurring", r, d).discounted) });
  }

  return {
    lines,
    couponCode: coupon?.code ?? null,
    couponAmountOff: coupon?.amountOff ?? null,
  };
}

/** Find an existing Stripe customer by email, or create one. */
export async function createOrFindCustomer(stripe: Stripe, name: string | undefined, email: string): Promise<string> {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) return existing.data[0].id;
  const customer = await stripe.customers.create({
    name: name || undefined,
    email,
    metadata: { source: "saabai-sell" },
  });
  return customer.id;
}
