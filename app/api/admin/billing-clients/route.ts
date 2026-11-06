/**
 * GET  /api/admin/billing-clients        list (optional ?q= search)
 * POST /api/admin/billing-clients        create a billing client and its Stripe Customer
 * Full admins only.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";
import { moneyAdmin, moneyDeny } from "../../../../lib/billing/money-auth";
import { logMoneyAction } from "../../../../lib/billing/audit-log";
import { listBillingClients, newClient, saveBillingClient, searchClients, syncStripeCustomer, validateClientInput } from "../../../../lib/billing/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await moneyAdmin())) return moneyDeny();
  const q = req.nextUrl.searchParams.get("q") || "";
  return NextResponse.json({ clients: searchClients(await listBillingClients(), q) });
}

export async function POST(req: NextRequest) {
  const actor = await moneyAdmin();
  if (!actor) return moneyDeny();
  const { input, error } = validateClientInput(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error }, { status: 400 });
  const dup = (await listBillingClients()).find((c) => c.email === input.email);
  if (dup) return NextResponse.json({ error: "A client with this email already exists", clientId: dup.id }, { status: 409 });

  let client = await saveBillingClient(newClient(input));
  try {
    const { customerId, via } = await syncStripeCustomer(getStripe(), client);
    client = await saveBillingClient({ ...client, stripeCustomerId: customerId });
    await logMoneyAction({ actor, action: "client.create", clientId: client.id, clientEmail: client.email, stripeIds: { customer: customerId }, ok: true, note: `customer ${via}` });
    return NextResponse.json({ client, stripe: via });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logMoneyAction({ actor, action: "client.create", clientId: client.id, clientEmail: client.email, ok: false, note: `Stripe sync failed: ${msg}` });
    return NextResponse.json({ client, error: `Saved, but Stripe sync failed: ${msg}` }, { status: 502 });
  }
}
