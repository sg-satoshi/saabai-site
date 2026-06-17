/**
 * POST /api/admin/payments/create-invoice
 * Creates and sends a Stripe Invoice to a customer.
 * Admin-only — requires valid saabai_session cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../../../../lib/auth";
import { getStripe } from "../../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export async function POST(req: NextRequest) {
  // Auth
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session || session.clientId !== ADMIN_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stripe = getStripe();

  try {
    const { amount, description, customerName, customerEmail, message } = await req.json();

    // Validate
    if (!amount || typeof amount !== "number" || amount < 50) {
      return NextResponse.json({ error: "Amount must be at least 50 cents ($0.50)" }, { status: 400 });
    }
    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }
    if (!customerEmail || typeof customerEmail !== "string") {
      return NextResponse.json({ error: "Customer email is required for invoices" }, { status: 400 });
    }

    // Find or create customer
    const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
    let customerId: string;
    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        name: customerName || undefined,
        email: customerEmail,
        metadata: { source: "saabai-admin-payments" },
      });
      customerId = customer.id;
    }

    // Create invoice item
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: Math.round(amount),
      currency: "aud",
      description,
      metadata: { source: "saabai-admin-payments" },
    });

    // Create and finalize invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      description: message || description,
      metadata: {
        source: "saabai-admin-payments",
        description,
      },
      auto_advance: false, // we'll finalize + send manually
    });

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    const sent = await stripe.invoices.sendInvoice(finalized.id);

    return NextResponse.json({
      id: sent.id,
      amount: sent.amount_due,
      status: sent.status,
      hostedUrl: sent.hosted_invoice_url,
      pdfUrl: sent.invoice_pdf,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payments/create-invoice]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
