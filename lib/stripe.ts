/**
 * Shared Stripe initializer.
 * Pins the stable API version used across the codebase.
 */
import Stripe from "stripe";

/** @throws if STRIPE_SECRET_KEY is missing */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: "2024-12-18.acacia" as any,
    // Use the fetch-based HTTP client. The SDK's default Node `https` client
    // fails with "connection to Stripe" errors when bundled in Vercel's
    // serverless runtime; fetch is reliable there. Fixes all server-side calls.
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 2,
  });
}

export function getPublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;
}
