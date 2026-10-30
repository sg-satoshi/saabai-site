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
    if (client.stripeCustomerId) return { customerId: client.stripeCustomerId, client };
    const { customerId } = await syncStripeCustomer(stripe, client);
    await saveBillingClient({ ...client, stripeCustomerId: customerId });
    return { customerId, client };
  }
  if (!opts.email) return {};
  const found = await stripe.customers.list({ email: opts.email, limit: 20 });
  const pick = pickExistingCustomer("", found.data as never) ?? found.data.find((c) => !(c as { deleted?: boolean }).deleted)?.id;
  if (pick) return { customerId: pick, client: null };
  const created = await stripe.customers.create(
    { name: opts.name || undefined, email: opts.email, metadata: { source: opts.source } },
    { idempotencyKey: stepKey(opts.idemBase, "customer") },
  );
  return { customerId: created.id, client: null };
}
