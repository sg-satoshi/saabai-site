/**
 * POST /api/admin/payments/create-invoice
 * Creates and sends a Stripe Invoice to a customer.
 * Admin-only — requires valid saabai_session cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../../lib/stripe";
import { isAdminRequest } from "../../../../../lib/product-stripe";
import { resolveCouponForManual } from "../../../../../lib/sell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Auth — any admin session (env admin or directory-role admin), matching the page guard.
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stripe = getStripe();

  try {
    const { amount, description, customerName, customerEmail, message, promotionCode, daysUntilDue, dueDate } = await req.json();

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

    // Validate an optional coupon (applied to the whole invoice below).
    let appliedCode: string | null = null;
    const invoiceDiscounts: { promotion_code: string }[] = [];
    if (promotionCode) {
      const { coupon, error: couponErr } = await resolveCouponForManual(stripe, promotionCode);
      if (couponErr) return NextResponse.json({ error: couponErr }, { status: 400 });
      if (coupon) {
        invoiceDiscounts.push({ promotion_code: coupon.promotionCodeId });
        appliedCode = coupon.code;
      }
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

    // Due date: an exact date (overrides) or payment terms in days. Stripe wants
    // exactly one of due_date / days_until_due with collection_method send_invoice.
    let dueConfig: { due_date: number } | { days_until_due: number };
    if (typeof dueDate === "string" && dueDate.trim()) {
      const ts = Math.floor(new Date(dueDate.trim() + "T23:59:59").getTime() / 1000);
      if (Number.isNaN(ts) || ts * 1000 <= Date.now()) {
        return NextResponse.json({ error: "Due date must be in the future" }, { status: 400 });
      }
      dueConfig = { due_date: ts };
    } else {
      const days = Number.isFinite(daysUntilDue) ? Math.max(0, Math.round(daysUntilDue)) : 7;
      dueConfig = { days_until_due: days };
    }

    // Create and finalize invoice. collection_method "send_invoice" is required
    // to email the customer a payable invoice (vs auto-charging a saved card).
    const invoice = await stripe.invoices.create({
      customer: customerId,
      description: message || description,
      collection_method: "send_invoice",
      ...dueConfig,
      ...(invoiceDiscounts.length ? { discounts: invoiceDiscounts } : {}),
      metadata: {
        source: "saabai-admin-payments",
        description,
        coupon_code: appliedCode || "",
      },
      auto_advance: false, // we'll finalize + send manually
    });

    // Attach the line item to THIS invoice explicitly. Relying on Stripe to sweep
    // up pending invoice items is unreliable and left the invoice totalling $0.
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      amount: Math.round(amount),
      currency: "aud",
      description,
      metadata: { source: "saabai-admin-payments" },
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
