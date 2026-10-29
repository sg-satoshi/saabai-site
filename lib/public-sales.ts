/**
 * Server helper for public pages: the live, checkout-honoured sale per public slot.
 * Flag off: returns {} without touching Redis, so pages are unchanged.
 */
import { listProducts } from "./product-catalogue";
import { isSalePricingEnabled, publicSaleForSlot, PUBLIC_SLOTS, type EffectivePrice, type PublicSlotId } from "./sale-price";

export type PublicSales = Partial<Record<PublicSlotId, EffectivePrice>>;

export async function getPublicSales(now: Date = new Date()): Promise<PublicSales> {
  if (!isSalePricingEnabled()) return {};
  let products;
  try {
    products = (await listProducts()).filter((p) => p.active && p.sale?.publicSlot);
  } catch {
    return {};
  }
  const out: PublicSales = {};
  for (const slot of Object.keys(PUBLIC_SLOTS) as PublicSlotId[]) {
    const ep = publicSaleForSlot(slot, products, { enabled: true, now });
    if (ep) out[slot] = ep;
  }
  return out;
}
