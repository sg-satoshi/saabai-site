/**
 * POST /api/admin/payments/create-intent
 * Creates a Stripe PaymentIntent for an inline card charge.
 * Admin-only — requires valid saabai_session cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../../lib/stripe";
import { moneyAdmin } from "../../../../../lib/billing/money-auth";
import { logMoneyAction } from "../../../../../lib/billing/audit-log";
import { cleanRequestId, idemKey, stepKey } from "../../../../../lib/billing/idempotency";
import { resolveMoneyCustomer } from "../../../../../lib/billing/money-customer";
import { markUsed } from "../../../../../lib/coupons/once";
import { resolveCouponForManual, couponOff } from "../../../../../lib/sell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Money route: full admins only (restricted staff are refused).
  const actor = await moneyAdmin();
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stripe = getStripe();

  try {
    const body = await req.json();
    const { amount, description, customerName, customerEmail, promotionCode, clientId } = body;
    const base = idemKey("create-intent", cleanRequestId(body.requestId), { actor, amount, description, customerEmail, promotionCode, clientId });

    // Validate
    if (!amount || typeof amount !== "number" || amount < 50) {
      return NextResponse.json({ error: "Amount must be at least 50 cents ($0.50)" }, { status: 400 });
    }
    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    // Apply an optional coupon to the one-time amount (server-authoritative).
    let chargeAmount = Math.round(amount);
    let appliedCode: string | null = null;
    let onceUse: string | null = null; // promo id when the one-per-customer rule applies
    if (promotionCode) {
      const { coupon, error } = await resolveCouponForManual(stripe, promotionCode, typeof customerEmail === "string" ? customerEmail : undefined);
      if (error) return NextResponse.json({ error }, { status: 400 });
      if (coupon?.oncePerCustomer) onceUse = coupon.promotionCodeId;
      if (coupon) {
        chargeAmount = couponOff(chargeAmount, coupon);
        appliedCode = coupon.code;
        if (chargeAmount < 50) {
          return NextResponse.json({ error: "Amount after the coupon is below the $0.50 minimum" }, { status: 400 });
        }
      }
    }

    // Linked billing client first, then email (no duplicate customers).
    const { customerId, client } = await resolveMoneyCustomer(stripe, { clientId, email: customerEmail, name: customerName, source: "saabai-admin-payments", idemBase: base });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: chargeAmount,
      currency: "aud",
      description,
      customer: customerId,
      metadata: {
        source: "saabai-admin-payments",
        description,
        customer_name: customerName || "",
        customer_email: customerEmail || "",
        coupon_code: appliedCode || "",
        saabai_client_id: client?.id || "",
      },
      automatic_payment_methods: { enabled: true },
    }, { idempotencyKey: stepKey(base, "pi") });
    await logMoneyAction({ actor, action: "payment.create", amountCents: paymentIntent.amount, currency: "aud", clientId: client?.id, clientEmail: customerEmail, stripeIds: { payment_intent: paymentIntent.id, customer: customerId || "" }, ok: true, note: description });

    if (onceUse) await markUsed(onceUse, customerEmail, "admin:create-intent:" + Date.now());
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
      amount: paymentIntent.amount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payments/create-intent]", msg);
    await logMoneyAction({ actor, action: "payment.create", ok: false, note: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
