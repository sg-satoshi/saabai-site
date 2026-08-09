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
