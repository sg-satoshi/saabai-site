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

  const stripe = new Stripe(stripeKey);

  // Fetch subscriptions + customers + invoices in one round-trip
  const [subscriptionsRes, invoicesRes] = await Promise.all([
    stripe.subscriptions.list({ limit: 100, expand: ["data.customer", "data.latest_invoice"] }),
    stripe.invoices.list({ limit: 200, status: "paid" }),
  ]);

  // Group invoices by customer ID
  const invoicesByCustomer: Record<string, InvoiceRecord[]> = {};
  for (const inv of invoicesRes.data) {
    const custId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? "";
    if (!custId) continue;
    if (!invoicesByCustomer[custId]) invoicesByCustomer[custId] = [];
    invoicesByCustomer[custId].push({
      id: inv.id,
      amount: inv.amount_paid,
      status: inv.status ?? "paid",
      date: inv.created,
      description: inv.lines.data[0]?.description ?? inv.description ?? "Payment",
      hostedUrl: inv.hosted_invoice_url ?? null,
    });
  }

  // Build order records
  const orders: OrderRecord[] = subscriptionsRes.data.map(sub => {
    const customer = typeof sub.customer === "object" && sub.customer !== null && !("deleted" in sub.customer)
      ? (sub.customer as Stripe.Customer)
      : null;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? "";
    const monthlyItem = sub.items.data.find(item => item.price.recurring?.interval === "month");
    const monthlyAmount = monthlyItem?.price.unit_amount ?? null;
    const invs = invoicesByCustomer[customerId] ?? [];
    const totalPaid = invs.reduce((sum, i) => sum + i.amount, 0);

    return {
      customerId,
      name: customer?.name ?? null,
      email: customer?.email ?? null,
      plan: derivePlan(monthlyAmount),
      status: sub.status,
      currentPeriodEnd: typeof sub.latest_invoice === "object" && sub.latest_invoice !== null
        ? (sub.latest_invoice as Stripe.Invoice).period_end
        : null,
      monthlyAmount,
      totalPaid,
      createdAt: sub.created,
      invoices: invs.sort((a, b) => b.date - a.date),
    };
  });

  // Sort by most recently created
  orders.sort((a, b) => b.createdAt - a.createdAt);

  return Response.json({ orders });
}
