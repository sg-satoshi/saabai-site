/**
 * GET /api/admin/billing-clients/:id   client + linked Stripe customer, payments, invoices, subscriptions
 * PUT /api/admin/billing-clients/:id   edit, then update (or create) the Stripe Customer
 * Full admins only.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../../lib/stripe";
import { moneyAdmin, moneyDeny } from "../../../../../lib/billing/money-auth";
import { logMoneyAction } from "../../../../../lib/billing/audit-log";
import { getBillingClient, listBillingClients, saveBillingClient, syncStripeCustomer, validateClientInput } from "../../../../../lib/billing/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  if (!(await moneyAdmin())) return moneyDeny();
  const client = await getBillingClient((await ctx.params).id);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!client.stripeCustomerId) return NextResponse.json({ client, stripe: null });
  try {
    const stripe = getStripe();
    const cid = client.stripeCustomerId;
    const [customer, pis, invoices, subs] = await Promise.all([
      stripe.customers.retrieve(cid),
      stripe.paymentIntents.list({ customer: cid, limit: 25 }),
      stripe.invoices.list({ customer: cid, limit: 25 }),
      stripe.subscriptions.list({ customer: cid, status: "all", limit: 25 }),
    ]);
    const deleted = (customer as { deleted?: boolean }).deleted === true;
    return NextResponse.json({
      client,
      stripe: {
        customer: deleted ? { id: cid, deleted: true } : { id: cid, name: (customer as { name?: string }).name ?? null, email: (customer as { email?: string }).email ?? null },
        payments: pis.data.map((p) => ({ id: p.id, amount: p.amount, currency: p.currency, status: p.status, created: p.created, description: p.description })),
        invoices: invoices.data.map((i) => ({ id: i.id, number: i.number, amount: i.total, currency: i.currency, status: i.status, created: i.created, url: i.hosted_invoice_url })),
        subscriptions: subs.data.map((s) => ({ id: s.id, status: s.status, created: s.created, amount: s.items.data[0]?.price?.unit_amount ?? null, interval: s.items.data[0]?.price?.recurring?.interval ?? null })),
      },
    });
  } catch (err) {
    return NextResponse.json({ client, stripe: null, error: err instanceof Error ? err.message : String(err) });
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const actor = await moneyAdmin();
  if (!actor) return moneyDeny();
  const existing = await getBillingClient((await ctx.params).id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { input, error } = validateClientInput(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error }, { status: 400 });
  if (input.email !== existing.email) {
    const dup = (await listBillingClients()).find((c) => c.email === input.email && c.id !== existing.id);
    if (dup) return NextResponse.json({ error: "Another client already uses this email" }, { status: 409 });
  }
  let client = await saveBillingClient({ ...existing, ...input });
  try {
    const { customerId, via } = await syncStripeCustomer(getStripe(), client);
    if (customerId !== client.stripeCustomerId) client = await saveBillingClient({ ...client, stripeCustomerId: customerId });
    await logMoneyAction({ actor, action: "client.update", clientId: client.id, clientEmail: client.email, stripeIds: { customer: customerId }, ok: true, note: `customer ${via}` });
    return NextResponse.json({ client, stripe: via });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logMoneyAction({ actor, action: "client.update", clientId: client.id, clientEmail: client.email, ok: false, note: `Stripe sync failed: ${msg}` });
    return NextResponse.json({ client, error: `Saved, but Stripe sync failed: ${msg}` }, { status: 502 });
  }
}
