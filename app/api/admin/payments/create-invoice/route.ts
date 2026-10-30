/**
 * POST /api/admin/payments/create-invoice
 * Creates and sends a Stripe Invoice to a customer.
 * Admin-only — requires valid saabai_session cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../../lib/stripe";
import { moneyAdmin, moneyDeny } from "../../../../../lib/billing/money-auth";
import { logMoneyAction } from "../../../../../lib/billing/audit-log";
import { idemKey, requireRequestId, stepKey } from "../../../../../lib/billing/idempotency";
import { resolveMoneyCustomer } from "../../../../../lib/billing/money-customer";
import { markUsed } from "../../../../../lib/coupons/once";
import { resolveCouponForManual } from "../../../../../lib/sell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Money route: full admins only (restricted staff are refused).
  const actor = await moneyAdmin();
  if (!actor) {
    return moneyDeny();
  }

  const stripe = getStripe();

  try {
    const body = await req.json();
    const { amount, description, customerName, customerEmail, message, promotionCode, daysUntilDue, dueDate, clientId } = body;
    const rid = requireRequestId(body);
    if ("error" in rid) return NextResponse.json({ error: rid.error }, { status: rid.status });
    const { requestId } = rid;
    const base = idemKey("create-invoice", requestId, { actor, amount, description, customerEmail, message, promotionCode, daysUntilDue, dueDate, clientId });

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
    let onceUse: string | null = null; // promo id when the one-per-customer rule applies
    if (promotionCode) {
      const { coupon, error: couponErr } = await resolveCouponForManual(stripe, promotionCode, customerEmail);
      if (couponErr) return NextResponse.json({ error: couponErr }, { status: 400 });
      if (coupon?.oncePerCustomer) onceUse = coupon.promotionCodeId;
      if (coupon) {
        invoiceDiscounts.push({ promotion_code: coupon.promotionCodeId });
        appliedCode = coupon.code;
      }
    }

    // Linked billing client first, then email (no duplicate customers).
    const { customerId, client } = await resolveMoneyCustomer(stripe, { clientId, email: customerEmail, name: customerName, source: "saabai-admin-payments", idemBase: base });
    if (!customerId) return NextResponse.json({ error: "Customer could not be resolved" }, { status: 400 });

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
        saabai_client_id: client?.id || "",
      },
      auto_advance: false, // we'll finalize + send manually
    }, { idempotencyKey: stepKey(base, "invoice") });

    // Attach the line item to THIS invoice explicitly. Relying on Stripe to sweep
    // up pending invoice items is unreliable and left the invoice totalling $0.
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      amount: Math.round(amount),
      currency: "aud",
      description,
      metadata: { source: "saabai-admin-payments" },
    }, { idempotencyKey: stepKey(base, "item") });

    const finalized = invoice.status === "draft" ? await stripe.invoices.finalizeInvoice(invoice.id, {}, { idempotencyKey: stepKey(base, "finalize") }) : invoice;
    const sent = await stripe.invoices.sendInvoice(finalized.id, {}, { idempotencyKey: stepKey(base, "send") });
    await logMoneyAction({ actor, action: "invoice.send", amountCents: sent.amount_due, currency: "aud", clientId: client?.id, clientEmail: customerEmail, stripeIds: { invoice: sent.id, customer: customerId }, ok: true, note: description });

    if (onceUse) await markUsed(onceUse, customerEmail, "admin:create-invoice:" + Date.now());
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
    await logMoneyAction({ actor, action: "invoice.send", ok: false, note: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
