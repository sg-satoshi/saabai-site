/**
 * POST /api/admin/payments/create-intent
 * Creates a Stripe PaymentIntent for an inline card charge.
 * Admin-only — requires valid saabai_session cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../../lib/stripe";
import { isAdminRequest } from "../../../../../lib/product-stripe";
import { resolveCouponForManual, couponOff } from "../../../../../lib/sell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Auth — any admin session (env admin or directory-role admin), matching the page guard.
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stripe = getStripe();

  try {
    const { amount, description, customerName, customerEmail, promotionCode } = await req.json();

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
    if (promotionCode) {
      const { coupon, error } = await resolveCouponForManual(stripe, promotionCode);
      if (error) return NextResponse.json({ error }, { status: 400 });
      if (coupon) {
        chargeAmount = couponOff(chargeAmount, coupon);
        appliedCode = coupon.code;
        if (chargeAmount < 50) {
          return NextResponse.json({ error: "Amount after the coupon is below the $0.50 minimum" }, { status: 400 });
        }
      }
    }

    // Create or find customer
    let customerId: string | undefined;
    if (customerEmail) {
      const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
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
    }

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
      },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
      amount: paymentIntent.amount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payments/create-intent]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
