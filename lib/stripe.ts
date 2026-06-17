/**
 * Shared Stripe initializer.
 * Pins the stable API version used across the codebase.
 */
import Stripe from "stripe";

/** @throws if STRIPE_SECRET_KEY is missing */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Stripe(key, { apiVersion: "2024-12-18.acacia" as any });
}

export function getPublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;
}
