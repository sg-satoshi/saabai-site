/**
 * Server helpers: the live, honoured sale per public slot, for pages and checkout.
 * Flag off: returns {} / null without touching Redis, so pages and checkout are unchanged.
 */
import { listProducts } from "./product-catalogue";
import {
  isSalePricingEnabled, publicSaleForSlot, checkoutSaleCharge, PUBLIC_SLOTS,
  type PublicSales, type PublicSlotId, type SaleCharge, type PricedProduct,
} from "./sale-price";

export type { PublicSales };

async function linkedProducts(): Promise<PricedProduct[]> {
  try {
    return (await listProducts()).filter((p) => p.active && p.sale?.publicSlot);
  } catch {
    return [];
  }
}

export async function getPublicSales(now: Date = new Date()): Promise<PublicSales> {
  if (!isSalePricingEnabled()) return {};
  const products = await linkedProducts();
  const out: PublicSales = {};
  for (const slot of Object.keys(PUBLIC_SLOTS) as PublicSlotId[]) {
    const ep = publicSaleForSlot(slot, products, { enabled: true, now });
    if (ep) out[slot] = ep;
  }
  return out;
}

/** Re-checked at checkout creation, from the server record only. */
export async function getCheckoutSaleCharge(slot: PublicSlotId, now: Date = new Date()): Promise<SaleCharge | null> {
  if (!isSalePricingEnabled()) return null;
  return checkoutSaleCharge(slot, await linkedProducts(), { enabled: true, now });
}
