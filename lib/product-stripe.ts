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
import type { ProductDiscount, FeeKey } from "./product-pricing";

// Which fee keys a discount may target, per billing type.
const FEE_KEYS_FOR: Record<BillingType, FeeKey[]> = {
  one_time: ["one_time"],
  recurring: ["recurring"],
  setup_monthly: ["setup", "recurring"],
};

/** Parse + validate an optional discount from the request body. Returns undefined if absent/invalid. */
function parseDiscount(raw: unknown, billingType: BillingType): ProductDiscount | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const d = raw as Record<string, unknown>;

  const kind = d.kind === "fixed" ? "fixed" : "percent";
  const value = typeof d.value === "number" ? d.value : parseFloat(String(d.value));
  if (!value || Number.isNaN(value) || value <= 0) return undefined;
  if (kind === "percent" && value > 100) return undefined;

  const allowed = FEE_KEYS_FOR[billingType];
  const appliesTo = Array.isArray(d.appliesTo)
    ? (d.appliesTo.filter((k): k is FeeKey => allowed.includes(k as FeeKey)))
    : [];
  if (appliesTo.length === 0) return undefined;

  const discount: ProductDiscount = {
    kind,
    value: kind === "fixed" ? Math.round(value) : value,
    appliesTo,
  };
  if (typeof d.endDate === "string" && d.endDate.trim()) discount.endDate = d.endDate.trim();
  if (typeof d.label === "string" && d.label.trim()) discount.label = d.label.trim();
  return discount;
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

  const discount = parseDiscount(body.discount, billingType);
  if (discount) input.discount = discount;

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
    const setup = await stripe.prices.create({
      product: stripeProductId,
      currency: "aud",
      unit_amount: input.setupFee!,
      tax_behavior,
    });
    ids.setup = setup.id;
  }

  return ids;
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
