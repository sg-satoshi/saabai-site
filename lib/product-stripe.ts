/**
 * Shared helpers for the admin product routes: admin auth, input validation,
 * and Stripe Price creation. Keeps the route handlers thin.
 */
import type Stripe from "stripe";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "./auth";
import {
  INTERVAL_MAP,
  type ProductInput,
  type BillingType,
  type Interval,
  type CatalogueProduct,
} from "./product-catalogue";
import type { FeeDiscount, FeeKey } from "./product-pricing";

// Which fee keys a discount may target, per billing type.
const FEE_KEYS_FOR: Record<BillingType, FeeKey[]> = {
  one_time: ["one_time"],
  recurring: ["recurring"],
  setup_monthly: ["setup", "recurring"],
};

/** Parse + validate the per-fee discounts array from the request body. At most one per fee. */
function parseDiscounts(raw: unknown, billingType: BillingType): FeeDiscount[] {
  if (!Array.isArray(raw)) return [];
  const allowed = FEE_KEYS_FOR[billingType];
  const out: FeeDiscount[] = [];
  const seen = new Set<FeeKey>();

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const d = item as Record<string, unknown>;

    const appliesTo = d.appliesTo as FeeKey;
    if (!allowed.includes(appliesTo) || seen.has(appliesTo)) continue;

    const kind = d.kind === "fixed" ? "fixed" : "percent";
    const value = typeof d.value === "number" ? d.value : parseFloat(String(d.value));
    if (!value || Number.isNaN(value) || value <= 0) continue;
    if (kind === "percent" && value > 100) continue;

    const fd: FeeDiscount = { appliesTo, kind, value: kind === "fixed" ? Math.round(value) : value };
    if (typeof d.endDate === "string" && d.endDate.trim()) fd.endDate = d.endDate.trim();
    if (typeof d.label === "string" && d.label.trim()) fd.label = d.label.trim();
    out.push(fd);
    seen.add(appliesTo);
  }
  return out;
}

// ── Auth ──────────────────────────────────────────────────────────────────
// Matches the page guard (payments/page.tsx) — any admin session, which
// includes directory users with role "admin" (e.g. hello@saabai.ai), not just
// the env SAABAI_ADMIN_ID account.
export async function isAdminRequest(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = await verifySessionToken(token);
  if (!session) return false;
  return isAdminSession(session.clientId);
}

// ── Validation ────────────────────────────────────────────────────────────

const BILLING_TYPES: BillingType[] = ["one_time", "recurring", "setup_monthly"];

function toCents(v: unknown): number {
  if (typeof v === "number") return Math.round(v);
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? 0 : n;
}

export function validateProductInput(body: Record<string, unknown>): { input?: ProductInput; error?: string } {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return { error: "Name is required" };

  const billingType = body?.billingType as BillingType;
  if (!BILLING_TYPES.includes(billingType)) return { error: "Invalid price type" };

  const input: ProductInput = {
    name,
    description: typeof body?.description === "string" ? body.description : "",
    imageUrl: typeof body?.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : undefined,
    active: body?.active !== false,
    gstInclusive: body?.gstInclusive !== false,
    billingType,
  };

  const discounts = parseDiscounts(body.discounts, billingType);
  if (discounts.length) input.discounts = discounts;

  if (billingType === "one_time") {
    const amt = toCents(body.oneTimeAmount);
    if (amt < 50) return { error: "One-time amount must be at least $0.50" };
    input.oneTimeAmount = amt;
    return { input };
  }

  // recurring + setup_monthly
  const rec = toCents(body.recurringAmount);
  if (rec < 50) return { error: "Recurring amount must be at least $0.50" };
  input.recurringAmount = rec;

  const interval = body.interval as Interval;
  if (!INTERVAL_MAP[interval]) return { error: "Invalid interval" };
  input.interval = interval;

  if (body.trialDays != null && body.trialDays !== "") {
    const days = toCents(body.trialDays);
    if (days < 0 || days > 365) return { error: "Trial days must be between 0 and 365" };
    if (days > 0) input.trialDays = days;
  }

  if (billingType === "setup_monthly") {
    const setup = toCents(body.setupFee);
    if (setup < 50) return { error: "Setup fee must be at least $0.50" };
    input.setupFee = setup;
  }

  return { input };
}

// ── Stripe price creation ─────────────────────────────────────────────────

export async function createStripePrices(
  stripe: Stripe,
  input: ProductInput,
  stripeProductId: string,
  stripeSetupProductId?: string,
): Promise<CatalogueProduct["stripePriceIds"]> {
  const tax_behavior: "inclusive" | "exclusive" = input.gstInclusive ? "inclusive" : "exclusive";
  const ids: CatalogueProduct["stripePriceIds"] = {};

  if (input.billingType === "one_time") {
    const p = await stripe.prices.create({
      product: stripeProductId,
      currency: "aud",
      unit_amount: input.oneTimeAmount!,
      tax_behavior,
    });
    ids.oneTime = p.id;
    return ids;
  }

  const cfg = INTERVAL_MAP[input.interval!];
  const recurring = await stripe.prices.create({
    product: stripeProductId,
    currency: "aud",
    unit_amount: input.recurringAmount!,
    recurring: { interval: cfg.interval, interval_count: cfg.interval_count },
    tax_behavior,
  });
  ids.recurring = recurring.id;

  if (input.billingType === "setup_monthly") {
    // Setup fee lives on its own Stripe product (falls back to main if not split).
    const setup = await stripe.prices.create({
      product: stripeSetupProductId || stripeProductId,
      currency: "aud",
      unit_amount: input.setupFee!,
      tax_behavior,
    });
    ids.setup = setup.id;
  }

  return ids;
}

/** Ensure a "<name> — Setup fee" Stripe product exists for a setup_monthly product. */
export async function ensureSetupProduct(
  stripe: Stripe,
  name: string,
  existingId?: string,
): Promise<string> {
  if (existingId) {
    await stripe.products.update(existingId, { name: `${name} — Setup fee`, active: true }).catch(() => null);
    return existingId;
  }
  const product = await stripe.products.create({
    name: `${name} — Setup fee`,
    metadata: { source: "saabai-catalogue-setup" },
  });
  return product.id;
}

/** Archive every Stripe price id we hold for a product (used on price change / archive). */
export async function archiveStripePrices(
  stripe: Stripe,
  priceIds: CatalogueProduct["stripePriceIds"],
): Promise<void> {
  const ids = [priceIds.oneTime, priceIds.recurring, priceIds.setup].filter(Boolean) as string[];
  await Promise.all(
    ids.map((id) => stripe.prices.update(id, { active: false }).catch(() => null)),
  );
}
