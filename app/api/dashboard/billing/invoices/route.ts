/**
 * GET /api/dashboard/billing/invoices — the logged-in client's Stripe invoices.
 * Client-auth (not admin). Finds their Stripe customer by email.
 */
import { NextResponse } from "next/server";
import { getStripe } from "../../../../../lib/stripe";
import { getClientSession } from "../../../../../lib/client-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const client = await getClientSession();
  if (!client) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!client.email) return NextResponse.json({ invoices: [] });

  try {
    const stripe = getStripe();
    const customers = await stripe.customers.list({ email: client.email, limit: 1 });
    if (customers.data.length === 0) return NextResponse.json({ invoices: [] });

    const list = await stripe.invoices.list({ customer: customers.data[0].id, limit: 100 });
    const invoices = list.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      created: inv.created,
      amount: inv.total,
      currency: inv.currency,
      status: inv.status,
      pdfUrl: inv.invoice_pdf,
      hostedUrl: inv.hosted_invoice_url,
      description: inv.lines?.data?.[0]?.description ?? null,
    }));
    return NextResponse.json({ invoices });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[dashboard/billing/invoices]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
