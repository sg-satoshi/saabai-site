/**
 * POST /api/dashboard/billing/portal — create a Stripe Customer Billing Portal
 * session for the logged-in client and return its URL.
 * Requires the Billing Portal to be enabled once in the Stripe dashboard.
 */
import { NextResponse } from "next/server";
import { getStripe } from "../../../../../lib/stripe";
import { getClientSession } from "../../../../../lib/client-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const client = await getClientSession();
  if (!client) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!client.email) return NextResponse.json({ error: "No billing account found yet" }, { status: 400 });

  try {
    const stripe = getStripe();
    const customers = await stripe.customers.list({ email: client.email, limit: 1 });
    if (customers.data.length === 0) {
      return NextResponse.json({ error: "No billing account found yet" }, { status: 400 });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: "https://www.saabai.ai/dashboard/billing",
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[dashboard/billing/portal]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
