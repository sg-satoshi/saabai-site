/**
 * Pure builders for sale-aware Stripe Checkout params. The amount always comes from a
 * SaleCharge computed server-side (checkoutSaleCharge); nothing here reads a client value.
 */
import type { SaleCharge } from "./sale-price";
import { saleMetadata } from "./sale-price";

export type LineItem =
  | { price: string; quantity: 1 }
  | { price_data: { currency: "aud"; unit_amount: number; product_data: { name: string } }; quantity: 1 };

/** Blueprint (one-off): fixed price ID, or price_data at the sale amount. */
export function blueprintLineItem(priceId: string, charge: SaleCharge | null, name: string): LineItem {
  if (!charge) return { price: priceId, quantity: 1 };
  return { price_data: { currency: "aud", unit_amount: charge.nowCents, product_data: { name } }, quantity: 1 };
}

/**
 * LeadGen (monthly): the fixed price ID plus a single-use coupon for the first N months
 * (Q3). price_data can't time-limit a recurring discount, so a coupon is the only way to
 * charge the sale for N months and then the regular price.
 */
export function leadgenSaleCoupon(charge: SaleCharge, months: number, label: string) {
  if (!Number.isInteger(months) || months < 1) return null;
  return {
    amount_off: charge.wasCents - charge.nowCents,
    currency: "aud" as const,
    duration: "repeating" as const,
    duration_in_months: months,
    max_redemptions: 1,
    name: `${label} sale`.slice(0, 40),
    metadata: saleMetadata(charge),
  };
}

export { saleMetadata };
