/**
 * Stripe side of coupons: the fixed products coupons can be restricted to,
 * code lookup for ?code= links, and resolving which code a checkout used.
 *
 * Care plans: one fixed Stripe product per plan (metadata saabai_care_plan),
 * created only by the admin "Set up coupon products" action. Until that runs,
 * care checkouts keep using inline product_data exactly as before.
 */
import type Stripe from "stripe";
import { getStripe } from "../stripe";
import { getRedis } from "../redis";
import { TIERS, type BlueprintTier } from "../blueprint";
import { CARE_PLAN_IDS, TARGETS, type CarePlanId, type Redemption, type TargetId } from "./core";

export const CARE_PRODUCTS_KEY = "saabai:coupons:care-products";
const CARE_NAMES: Record<CarePlanId, string> = { presence: "Presence", growth: "Growth", signature: "Signature" };

export async function getCareProductMap(): Promise<Partial<Record<CarePlanId, string>>> {
  const r = getRedis();
  if (!r) return {};
  return ((await r.get<Partial<Record<CarePlanId, string>>>(CARE_PRODUCTS_KEY)) ?? {}) as Partial<Record<CarePlanId, string>>;
}

export async function careProductFor(planId: string): Promise<string | undefined> {
  if (!(CARE_PLAN_IDS as readonly string[]).includes(planId)) return undefined;
  try { return (await getCareProductMap())[planId as CarePlanId]; } catch { return undefined; }
}

/**
 * Idempotent: finds an existing product by metadata first, and creates with a
 * fixed idempotency key otherwise. Safe to run any number of times.
 */
export async function ensureCareProducts(): Promise<{ planId: CarePlanId; productId: string; created: boolean }[]> {
  const stripe = getStripe();
  const map = await getCareProductMap();
  const out: { planId: CarePlanId; productId: string; created: boolean }[] = [];
  for (const planId of CARE_PLAN_IDS) {
    let id = map[planId];
    let created = false;
    if (id) {
      const p = await stripe.products.retrieve(id).catch(() => null);
      if (!p || p.deleted || !p.active) id = undefined;
    }
    if (!id) {
      const found = await stripe.products.search({ query: `metadata['saabai_care_plan']:'${planId}' AND active:'true'`, limit: 1 });
      id = found.data[0]?.id;
    }
    if (!id) {
      const p = await stripe.products.create(
        { name: `${CARE_NAMES[planId]} website care`, metadata: { saabai_care_plan: planId, planId, source: "saabai-billing" } },
        { idempotencyKey: `saabai-care-product-${planId}-v1` },
      );
      id = p.id;
      created = true;
    }
    map[planId] = id;
    out.push({ planId, productId: id, created });
  }
  const r = getRedis();
  if (r) await r.set(CARE_PRODUCTS_KEY, map);
  return out;
}

export interface TargetStatus { id: TargetId; label: string; productId: string | null; ready: boolean; note?: string }

/** Which Stripe product each picker option maps to, with a price check for Blueprint. */
export async function targetStatuses(): Promise<TargetStatus[]> {
  const stripe = getStripe();
  const care = await getCareProductMap().catch(() => ({} as Partial<Record<CarePlanId, string>>));
  return Promise.all(TARGETS.map(async (t): Promise<TargetStatus> => {
    if (t.id === "all") return { id: t.id, label: t.label, productId: null, ready: true };
    if ("tier" in t) {
      const env = process.env[TIERS[t.tier as BlueprintTier].priceEnv]?.trim();
      if (!env) return { id: t.id, label: t.label, productId: null, ready: false, note: "Price ID env var not set" };
      try {
        const price = await stripe.prices.retrieve(env);
        const productId = typeof price.product === "string" ? price.product : price.product.id;
        const want = TIERS[t.tier as BlueprintTier].price * 100;
        if (price.unit_amount !== want) return { id: t.id, label: t.label, productId, ready: false, note: `Stripe price is $${(price.unit_amount ?? 0) / 100}, site says $${want / 100}` };
        return { id: t.id, label: t.label, productId, ready: true };
      } catch {
        return { id: t.id, label: t.label, productId: null, ready: false, note: "Couldn't read the Stripe price" };
      }
    }
    const productId = care[t.planId as CarePlanId] ?? null;
    return { id: t.id, label: t.label, productId, ready: !!productId, note: productId ? undefined : "Run 'Set up coupon products'" };
  }));
}

/** Active promotion code by its customer-facing code, for ?code= links. */
export async function findActivePromo(code: string): Promise<Stripe.PromotionCode | null> {
  if (!code) return null;
  try {
    const res = await getStripe().promotionCodes.list({ code, active: true, limit: 1 });
    const p = res.data[0];
    if (!p || (p.expires_at && p.expires_at * 1000 < Date.now())) return null;
    if (p.max_redemptions && p.times_redeemed >= p.max_redemptions) return null;
    return p;
  } catch { return null; }
}

/** Fill in the human code when the webhook only carried the promotion code id. */
export async function resolveRedemptionCode(r: Redemption | null): Promise<Redemption | null> {
  if (!r || r.code || !r.promotionCodeId) return r;
  try { const p = await getStripe().promotionCodes.retrieve(r.promotionCodeId); return { ...r, code: p.code }; } catch { return r; }
}
