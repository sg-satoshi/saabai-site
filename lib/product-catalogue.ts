/**
 * Product catalogue — Redis-backed store for admin-managed products.
 * Each record mirrors a Stripe Product + Price(s); Stripe stays the source of
 * truth for billing, this holds display metadata + the Stripe IDs.
 * Stripe sync lives in the API routes (app/api/admin/products), not here.
 */
import { getRedis } from "./redis";
import type { ProductDiscount, FeeDiscount } from "./product-pricing";

// ── Types ───────────────────────────────────────────────────────────────────

export type BillingType = "one_time" | "recurring" | "setup_monthly";
export type Interval = "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly";

export interface CatalogueProduct {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  active: boolean;
  gstInclusive: boolean;
  billingType: BillingType;
  // amounts in cents (AUD)
  oneTimeAmount?: number;   // one_time
  recurringAmount?: number; // recurring + setup_monthly
  interval?: Interval;      // recurring + setup_monthly
  setupFee?: number;        // setup_monthly
  trialDays?: number;       // optional; applied at checkout, not stored on Stripe price
  discounts?: FeeDiscount[]; // per-fee sale prices (setup vs recurring vs one-time)
  discount?: ProductDiscount; // legacy single discount; read-only fallback for old records
  stripeProductId: string;
  // For setup_monthly, the setup fee lives on its own Stripe product so coupons
  // can target setup vs recurring independently.
  stripeSetupProductId?: string;
  stripePriceIds: { oneTime?: string; recurring?: string; setup?: string };
  createdAt: string;
  updatedAt: string;
}

// Fields a caller may set when creating/updating (server fills the rest).
export type ProductInput = Omit<
  CatalogueProduct,
  "id" | "stripeProductId" | "stripePriceIds" | "createdAt" | "updatedAt"
>;

// ── Constants ───────────────────────────────────────────────────────────────

const PROD_PREFIX = "admin:products:";
const PROD_INDEX = "admin:products:index";

export const INTERVAL_MAP: Record<Interval, { interval: "day" | "week" | "month" | "year"; interval_count: number }> = {
  weekly:      { interval: "week",  interval_count: 1 },
  fortnightly: { interval: "week",  interval_count: 2 },
  monthly:     { interval: "month", interval_count: 1 },
  quarterly:   { interval: "month", interval_count: 3 },
  yearly:      { interval: "year",  interval_count: 1 },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Operations ──────────────────────────────────────────────────────────────

export async function listProducts(): Promise<CatalogueProduct[]> {
  const redis = getRedis();
  if (!redis) return [];

  const ids = await redis.smembers(PROD_INDEX);
  if (!ids || ids.length === 0) return [];

  const results = await Promise.all(ids.map((id) => redis.get<CatalogueProduct>(PROD_PREFIX + id)));
  const products = results.filter(Boolean) as CatalogueProduct[];
  // Newest first
  return products.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getProduct(id: string): Promise<CatalogueProduct | null> {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get<CatalogueProduct>(PROD_PREFIX + id);
}

export async function saveProduct(product: CatalogueProduct): Promise<CatalogueProduct> {
  const redis = getRedis();
  if (redis) {
    await redis.set(PROD_PREFIX + product.id, product);
    await redis.sadd(PROD_INDEX, product.id);
  }
  return product;
}

/** Build a fresh record from input + resolved Stripe IDs. Server-side create. */
export function buildProduct(
  input: ProductInput,
  stripeProductId: string,
  stripePriceIds: CatalogueProduct["stripePriceIds"],
  stripeSetupProductId?: string,
): CatalogueProduct {
  const now = new Date().toISOString();
  return {
    ...input,
    id: "prod_" + uid(),
    stripeProductId,
    stripeSetupProductId,
    stripePriceIds,
    createdAt: now,
    updatedAt: now,
  };
}

export async function deleteProduct(id: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  await redis.del(PROD_PREFIX + id);
  await redis.srem(PROD_INDEX, id);
  return true;
}
