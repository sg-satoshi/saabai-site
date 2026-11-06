/**
 * Customer resolution for money routes. A linked billing client wins (its stored Stripe customer);
 * otherwise find by email (oldest live match) or create with an idempotency key.
 */
import type Stripe from "stripe";
import { getBillingClient, pickExistingCustomer, syncStripeCustomer, saveBillingClient, type BillingClient } from "./clients";
import { stepKey } from "./idempotency";

export async function resolveMoneyCustomer(
  stripe: Stripe,
  opts: { clientId?: unknown; email?: string; name?: string; source: string; idemBase: string },
): Promise<{ customerId?: string; client?: BillingClient | null }> {
  const client = typeof opts.clientId === "string" && opts.clientId ? await getBillingClient(opts.clientId) : null;
  if (client) {
    // Re-check the saved id before charging: a deleted or missing customer falls through to a re-sync.
    if (client.stripeCustomerId && (await customerIsLive(stripe, client.stripeCustomerId))) {
      return { customerId: client.stripeCustomerId, client };
    }
    const { customerId } = await syncStripeCustomer(stripe, client);
    await saveBillingClient({ ...client, stripeCustomerId: customerId });
    return { customerId, client };
  }
  if (!opts.email) return {};
  const found = await stripe.customers.list({ email: opts.email, limit: 20 });
  // Untagged, live and not owned by another flow (Lex firm, site billing) or another billing client.
  const pick = pickExistingCustomer("", found.data as never);
  if (pick) return { customerId: pick, client: null };
  const created = await stripe.customers.create(
    { name: opts.name || undefined, email: opts.email, metadata: { source: opts.source } },
    { idempotencyKey: stepKey(opts.idemBase, "customer") },
  );
  return { customerId: created.id, client: null };
}

export async function customerIsLive(stripe: Stripe, id: string): Promise<boolean> {
  const got = await stripe.customers.retrieve(id).catch(() => null);
  return !!got && !(got as { deleted?: boolean }).deleted;
}
