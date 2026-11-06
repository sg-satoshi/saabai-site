/**
 * Product picker for admin payments (Phase B). Items come from two places:
 *  - the site catalogue (/saabai-admin/products, Redis), and
 *  - Stripe Prices read at runtime (active, with their Product).
 * Admin chooses which items show in the picker; that "available in payments" set is stored on our side.
 */
import type Stripe from "stripe";
import { getRedis } from "../redis";
import { INTERVAL_MAP, type CatalogueProduct, type Interval } from "../product-catalogue";
import { bakedAmounts } from "../sell";

export const PICKER_ENABLED_KEY = "saabai:billing:picker:enabled";

export interface PickerItem {
  key: string; // "cat:<id>" or "stripe:<priceId>"
  source: "catalogue" | "stripe";
  refId: string;
  stripeProductId?: string;
  name: string;
  unitAmount: number;
  interval: "once" | Interval;
  /** Setup fee shown as a separate one-off line when picked (catalogue setup_monthly). */
  setupAmount?: number;
  enabled: boolean;
}

export function intervalFromRecurring(r: { interval: string; interval_count: number } | null | undefined): "once" | Interval | null {
  if (!r) return "once";
  const hit = (Object.entries(INTERVAL_MAP) as [Interval, { interval: string; interval_count: number }][]).find(([, v]) => v.interval === r.interval && v.interval_count === r.interval_count);
  return hit ? hit[0] : null;
}

export function catalogueItems(products: CatalogueProduct[], enabled: Set<string>): PickerItem[] {
  return products.filter((p) => p.active).map((p) => {
    const baked = bakedAmounts(p);
    const key = `cat:${p.id}`;
    const once = p.billingType === "one_time";
    return {
      key, source: "catalogue" as const, refId: p.id, stripeProductId: p.stripeProductId || undefined, name: p.name,
      unitAmount: once ? baked.oneTime || 0 : baked.recurring || 0,
      interval: once ? "once" as const : (p.interval || "monthly"),
      setupAmount: p.billingType === "setup_monthly" && baked.setup ? baked.setup : undefined,
      enabled: enabled.has(key),
    };
  });
}

type PriceWithProduct = Pick<Stripe.Price, "id" | "unit_amount" | "currency" | "active" | "nickname"> & {
  recurring: { interval: string; interval_count: number } | null;
  product: string | { id: string; name?: string; active?: boolean; deleted?: boolean };
};

/** Stripe prices that can be picked: active, AUD, fixed amount, a supported interval, live product. */
export function stripeItems(prices: PriceWithProduct[], enabled: Set<string>): PickerItem[] {
  const out: PickerItem[] = [];
  for (const p of prices) {
    if (!p.active || p.currency !== "aud" || typeof p.unit_amount !== "number") continue;
    const prod = typeof p.product === "string" ? { id: p.product } : p.product;
    if ((prod as { deleted?: boolean }).deleted || (prod as { active?: boolean }).active === false) continue;
    const interval = intervalFromRecurring(p.recurring);
    if (!interval) continue;
    const key = `stripe:${p.id}`;
    out.push({ key, source: "stripe", refId: p.id, stripeProductId: prod.id, name: [(prod as { name?: string }).name, p.nickname].filter(Boolean).join(" ") || p.id, unitAmount: p.unit_amount, interval, enabled: enabled.has(key) });
  }
  return out;
}

export async function getEnabledKeys(): Promise<Set<string>> {
  const r = getRedis();
  if (!r) return new Set();
  return new Set(((await r.smembers(PICKER_ENABLED_KEY)) as string[]) || []);
}

export function validPickerKey(k: unknown): k is string {
  return typeof k === "string" && /^(cat:[A-Za-z0-9_-]{1,64}|stripe:price_[A-Za-z0-9]{1,64})$/.test(k);
}

export async function setPickerEnabled(key: string, on: boolean): Promise<void> {
  const r = getRedis();
  if (!r) throw new Error("Data store unavailable");
  if (on) await r.sadd(PICKER_ENABLED_KEY, key);
  else await r.srem(PICKER_ENABLED_KEY, key);
}
