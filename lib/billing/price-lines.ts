/**
 * Saved price lines per billing client (Phase B).
 * A line is a product (site catalogue or Stripe Price) or a custom description, with an amount,
 * one-off or recurring interval, quantity and optional discount. GST mode is stored only:
 * nothing here adds tax, and the UI shows "GST not applicable" while Saabai is not registered.
 * Stripe Prices are reused by lookup_key so repeat charges do not pile up new Prices.
 */
import type Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { getRedis } from "../redis";
import { INTERVAL_MAP, type Interval } from "../product-catalogue";

export const PRICE_LINES_PREFIX = "saabai:billing:lines:";
export const LINE_INTERVALS = Object.keys(INTERVAL_MAP) as Interval[];

export type LineSource = "catalogue" | "stripe" | "custom";
export type GstMode = "none" | "inclusive" | "exclusive";
export interface LineDiscount { kind: "percent" | "amount"; value: number }

export interface PriceLine {
  id: string;
  source: LineSource;
  /** Catalogue product id (source catalogue) or Stripe price id (source stripe). */
  refId?: string;
  /** Stripe product the price hangs off (catalogue or Stripe source). Custom lines use the client's own product. */
  stripeProductId?: string;
  description: string;
  /** Unit amount in cents, AUD, before discount. */
  unitAmount: number;
  quantity: number;
  /** "once" for one-off, otherwise a recurring interval. */
  interval: "once" | Interval;
  discount?: LineDiscount;
  /** Stored only. Not charged until GST registration is confirmed. */
  gstMode: GstMode;
  createdAt: string;
  updatedAt: string;
}

const MAX_CENTS = 10_000_000; // $100k per unit, a sanity cap
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function validateLine(body: unknown, now = new Date().toISOString()): { line?: PriceLine; error?: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const source: LineSource = b.source === "catalogue" || b.source === "stripe" ? b.source : "custom";
  const description = str(b.description, 250);
  if (!description) return { error: "Description is required" };
  const unitAmount = Math.round(Number(b.unitAmount));
  if (!Number.isFinite(unitAmount) || unitAmount < 50 || unitAmount > MAX_CENTS) return { error: "Amount must be between $0.50 and $100,000" };
  const quantity = Math.round(Number(b.quantity ?? 1));
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 1000) return { error: "Quantity must be 1 to 1000" };
  const interval = b.interval === "once" || b.interval === undefined ? "once" : (LINE_INTERVALS as string[]).includes(String(b.interval)) ? (b.interval as Interval) : null;
  if (!interval) return { error: "Unknown billing interval" };
  let discount: LineDiscount | undefined;
  const d = b.discount as Record<string, unknown> | undefined;
  if (d && typeof d === "object" && Number(d.value) > 0) {
    const kind = d.kind === "amount" ? "amount" : "percent";
    const value = kind === "percent" ? Number(d.value) : Math.round(Number(d.value));
    if (!Number.isFinite(value)) return { error: "Discount must be a number" };
    if (kind === "percent" && value > 100) return { error: "Percent discount cannot exceed 100" };
    if (kind === "amount" && value > unitAmount * quantity) return { error: "Discount cannot exceed the line amount" };
    discount = { kind, value };
  }
  const refId = str(b.refId, 120) || undefined;
  if (source !== "custom" && !refId) return { error: "Pick a product" };
  if (source === "stripe" && !/^price_[A-Za-z0-9]+$/.test(refId || "")) return { error: "Unknown Stripe price" };
  const stripeProductId = str(b.stripeProductId, 120) || undefined;
  if (stripeProductId && !/^prod_[A-Za-z0-9]+$/.test(stripeProductId)) return { error: "Unknown Stripe product" };
  const gstMode: GstMode = b.gstMode === "inclusive" || b.gstMode === "exclusive" ? b.gstMode : "none";
  const id = typeof b.id === "string" && /^pl_[a-z0-9]{8,32}$/.test(b.id) ? b.id : `pl_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  return {
    line: {
      id, source, refId: source === "custom" ? undefined : refId, stripeProductId: source === "custom" ? undefined : stripeProductId,
      description, unitAmount, quantity, interval, discount, gstMode,
      createdAt: typeof b.createdAt === "string" ? b.createdAt : now, updatedAt: now,
    },
  };
}

/** Totals in cents. Discount applies to the line (unit x quantity), never below zero. */
export function lineTotals(l: Pick<PriceLine, "unitAmount" | "quantity" | "discount">): { gross: number; discount: number; net: number } {
  const gross = l.unitAmount * l.quantity;
  let off = 0;
  if (l.discount) off = l.discount.kind === "percent" ? Math.round((gross * l.discount.value) / 100) : Math.round(l.discount.value);
  off = Math.min(Math.max(0, off), gross);
  return { gross, discount: off, net: gross - off };
}

/**
 * How a line is billed in Stripe: a unit amount and quantity. If the discounted total splits
 * evenly across the quantity, bill the discounted unit x quantity; otherwise bill one unit of the total
 * (the description then says "x N") so the charged amount always equals the net total.
 */
export function billedUnit(l: PriceLine): { unitAmount: number; quantity: number; description: string } {
  const { net } = lineTotals(l);
  if (net % l.quantity === 0) return { unitAmount: net / l.quantity, quantity: l.quantity, description: l.description };
  return { unitAmount: net, quantity: 1, description: `${l.description} x ${l.quantity}` };
}

export function gstNote(mode: GstMode, registered = false): string {
  if (!registered || mode === "none") return "GST not applicable";
  return mode === "inclusive" ? "Includes GST" : "Plus GST";
}

/** Deterministic lookup_key so the same product, amount and interval always finds the same Price. */
export function priceLookupKey(productId: string, unitAmount: number, interval: PriceLine["interval"], currency = "aud"): string {
  return `saabai_${productId}_${currency}_${unitAmount}_${interval}`.slice(0, 200);
}

/** The per-client Stripe Product id used for custom lines (Stripe allows caller-chosen product ids). */
export function customProductId(clientId: string): string {
  return `saabai_custom_${clientId}`;
}

type PriceLite = Pick<Stripe.Price, "id" | "unit_amount" | "currency" | "active"> & {
  product: string | { id: string };
  recurring: { interval: string; interval_count: number } | null;
};

/** Does an existing Stripe Price exactly match this product, amount and interval? */
export function priceMatches(p: PriceLite, productId: string, unitAmount: number, interval: PriceLine["interval"], currency = "aud"): boolean {
  const pid = typeof p.product === "string" ? p.product : p.product?.id;
  if (!p.active || pid !== productId || p.unit_amount !== unitAmount || p.currency !== currency) return false;
  if (interval === "once") return !p.recurring;
  const cfg = INTERVAL_MAP[interval];
  return !!p.recurring && p.recurring.interval === cfg.interval && p.recurring.interval_count === cfg.interval_count;
}

/**
 * Find or create the Stripe Price for a billed unit. Order: the line's own Stripe price if it matches,
 * then a Price with our lookup_key, then create one carrying that lookup_key (idempotent).
 */
export async function ensurePrice(
  stripe: Stripe,
  opts: { productId: string; unitAmount: number; interval: PriceLine["interval"]; candidatePriceId?: string; clientId: string; idemKey: string },
): Promise<{ priceId: string; via: "line" | "lookup" | "created" }> {
  const { productId, unitAmount, interval } = opts;
  if (opts.candidatePriceId) {
    const p = await stripe.prices.retrieve(opts.candidatePriceId).catch(() => null);
    if (p && priceMatches(p as unknown as PriceLite, productId, unitAmount, interval)) return { priceId: p.id, via: "line" };
  }
  const key = priceLookupKey(productId, unitAmount, interval);
  const found = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  const hit = found.data.find((p) => priceMatches(p as unknown as PriceLite, productId, unitAmount, interval));
  if (hit) return { priceId: hit.id, via: "lookup" };
  const recurring = interval === "once" ? undefined : { interval: INTERVAL_MAP[interval].interval, interval_count: INTERVAL_MAP[interval].interval_count };
  const created = await stripe.prices.create(
    { product: productId, currency: "aud", unit_amount: unitAmount, ...(recurring ? { recurring } : {}), lookup_key: key, metadata: { source: "saabai-admin-pricing", saabai_lookup: key, first_client_id: opts.clientId } },
    { idempotencyKey: opts.idemKey },
  );
  return { priceId: created.id, via: "created" };
}

/** Make sure the client's custom-lines Product exists. */
export async function ensureCustomProduct(stripe: Stripe, client: { id: string; name: string; firm?: string }, idemKey: string): Promise<string> {
  const id = customProductId(client.id);
  const got = await stripe.products.retrieve(id).catch(() => null);
  if (got) return got.id;
  const created = await stripe.products.create(
    { id, name: `Custom services: ${client.firm || client.name}`, metadata: { source: "saabai-admin-pricing", saabai_client_id: client.id } },
    { idempotencyKey: idemKey },
  );
  return created.id;
}

export async function getPriceLines(clientId: string): Promise<PriceLine[]> {
  const r = getRedis();
  if (!r) return [];
  const raw = await r.get<PriceLine[] | string>(PRICE_LINES_PREFIX + clientId);
  if (!raw) return [];
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function savePriceLines(clientId: string, lines: PriceLine[]): Promise<PriceLine[]> {
  const r = getRedis();
  if (!r) throw new Error("Data store unavailable");
  await r.set(PRICE_LINES_PREFIX + clientId, JSON.stringify(lines.slice(0, 100)));
  return lines;
}
