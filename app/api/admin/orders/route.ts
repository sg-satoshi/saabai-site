/**
 * GET /api/admin/orders
 * Returns all Stripe customers, their subscriptions, and invoice history.
 * Admin-only — requires valid saabai_session cookie.
 */

import Stripe from "stripe";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export interface InvoiceRecord {
  id: string;
  amount: number; // cents
  status: string;
  date: number; // unix timestamp
  description: string;
  hostedUrl: string | null;
}

export interface OrderRecord {
  customerId: string;
  name: string | null;
  email: string | null;
  plan: string;
  status: string; // active | past_due | canceled | trialing | unpaid
  currentPeriodEnd: number | null; // next billing unix timestamp
  monthlyAmount: number | null; // cents
  totalPaid: number; // cents
  createdAt: number; // unix timestamp
  invoices: InvoiceRecord[];
}

function derivePlan(amount: number | null): string {
  if (!amount) return "Starter";
  return amount >= 49900 ? "Growth" : "Starter";
}

export async function GET() {
  // Auth check
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const session = await verifySessionToken(token);
  if (!session || session.clientId !== ADMIN_ID) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return Response.json({ error: "Stripe not configured" }, { status: 500 });

  // Pin to a stable API version — the SDK default (2026-04-22.dahlia) has breaking changes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as any });

  try {
    // 1. Subscriptions — no expand to keep it simple
    let subscriptionsRes;
    try {
      subscriptionsRes = await stripe.subscriptions.list({ limit: 100 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[orders] subscriptions.list failed:", msg);
      return Response.json({ error: `subscriptions.list: ${msg}` }, { status: 500 });
    }

    // 2. Collect unique customer IDs and fetch in parallel
    const customerIds = [...new Set(
      subscriptionsRes.data
        .map(s => typeof s.customer === "string" ? s.customer : (s.customer as Stripe.Customer | null)?.id ?? "")
        .filter(Boolean)
    )];

    const customerMap: Record<string, Stripe.Customer> = {};
    await Promise.all(
      customerIds.map(async id => {
        try {
          const c = await stripe.customers.retrieve(id);
          if (c && !("deleted" in c)) customerMap[id] = c as Stripe.Customer;
        } catch { /* skip */ }
      })
    );

    // 3. Invoices
    let invoicesRes;
    try {
      invoicesRes = await stripe.invoices.list({ limit: 100 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[orders] invoices.list failed:", msg);
      return Response.json({ error: `invoices.list: ${msg}` }, { status: 500 });
    }

    // Group paid invoices by customer ID
    const invoicesByCustomer: Record<string, InvoiceRecord[]> = {};
    for (const inv of invoicesRes.data) {
      if (inv.status !== "paid") continue;
      const custId = typeof inv.customer === "string" ? inv.customer
        : (inv.customer as Stripe.Customer | null)?.id ?? "";
      if (!custId) continue;
      if (!invoicesByCustomer[custId]) invoicesByCustomer[custId] = [];
      invoicesByCustomer[custId].push({
        id: inv.id,
        amount: inv.amount_paid,
        status: "paid",
        date: inv.created,
        description: inv.lines?.data?.[0]?.description ?? "Payment",
        hostedUrl: inv.hosted_invoice_url ?? null,
      });
    }

    // 4. Build order records
    const orders: OrderRecord[] = subscriptionsRes.data.map(sub => {
      const customerId = typeof sub.customer === "string" ? sub.customer
        : (sub.customer as Stripe.Customer | null)?.id ?? "";
      const customer = customerMap[customerId] ?? null;
      const monthlyItem = sub.items.data.find(item => item.price?.recurring?.interval === "month");
      const monthlyAmount = monthlyItem?.price?.unit_amount ?? null;
      const invs = invoicesByCustomer[customerId] ?? [];
      const totalPaid = invs.reduce((sum, i) => sum + i.amount, 0);

      return {
        customerId,
        name: customer?.name ?? null,
        email: customer?.email ?? null,
        plan: derivePlan(monthlyAmount),
        status: sub.status,
        currentPeriodEnd: null, // derived from invoices below
        monthlyAmount,
        totalPaid,
        createdAt: sub.created,
        invoices: invs.sort((a, b) => b.date - a.date),
      };
    });

    // Derive next billing from most recent invoice date + ~30 days
    for (const order of orders) {
      const latest = order.invoices[0];
      if (latest && order.status === "active") {
        order.currentPeriodEnd = latest.date + 30 * 86400;
      }
    }

    orders.sort((a, b) => b.createdAt - a.createdAt);
    return Response.json({ orders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[orders] Stripe error:", msg);
    return Response.json({ error: `Stripe error: ${msg}` }, { status: 500 });
  }
}
