/**
 * POST /api/admin/payments/create-subscription
 * Creates a Stripe subscription with a recurring price.
 * Returns the client_secret for the initial payment confirmation.
 * Admin-only — requires valid saabai_session cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../../lib/stripe";
import { isAdminRequest } from "../../../../../lib/product-stripe";
import { resolveCouponForManual } from "../../../../../lib/sell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Map readable intervals to Stripe interval + interval_count
const INTERVAL_MAP: Record<string, { interval: "day" | "week" | "month" | "year"; interval_count: number }> = {
  weekly:    { interval: "week",  interval_count: 1 },
  fortnightly: { interval: "week", interval_count: 2 },
  monthly:   { interval: "month", interval_count: 1 },
  quarterly: { interval: "month", interval_count: 3 },
  yearly:    { interval: "year",  interval_count: 1 },
};

const MAX_DAYS = 365; // Stripe max interval_count for day

export async function POST(req: NextRequest) {
  // Auth — any admin session (env admin or directory-role admin), matching the page guard.
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stripe = getStripe();

  try {
    const { amount, description, customerName, customerEmail, interval, customDays, promotionCode, setupFee, startDate } = await req.json();

    // Validate
    if (!amount || typeof amount !== "number" || amount < 50) {
      return NextResponse.json({ error: "Amount must be at least 50 cents ($0.50)" }, { status: 400 });
    }
    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    let intervalConfig: { interval: "day" | "week" | "month" | "year"; interval_count: number };

    if (interval === "custom") {
      const days = typeof customDays === "number" ? customDays : parseInt(String(customDays), 10);
      if (!days || days < 1 || days > MAX_DAYS) {
        return NextResponse.json({ error: `Custom days must be between 1 and ${MAX_DAYS}` }, { status: 400 });
      }
      intervalConfig = { interval: "day", interval_count: days };
    } else {
      if (!INTERVAL_MAP[interval]) {
        return NextResponse.json({ error: "Invalid interval. Use: weekly, fortnightly, monthly, quarterly, yearly, or custom" }, { status: 400 });
      }
      intervalConfig = INTERVAL_MAP[interval];
    }

    if (!customerEmail || typeof customerEmail !== "string") {
      return NextResponse.json({ error: "Customer email is required for subscriptions" }, { status: 400 });
    }

    // Optional one-off first payment (setup fee), charged now with the card.
    const setupAmount = Number.isFinite(setupFee) ? Math.max(0, Math.round(setupFee)) : 0;

    // Optional start date — when the recurring billing first comes out.
    let billingAnchor: number | null = null;
    if (typeof startDate === "string" && startDate.trim()) {
      const ts = Math.floor(new Date(startDate.trim() + "T09:00:00").getTime() / 1000);
      if (Number.isNaN(ts) || ts * 1000 <= Date.now()) {
        return NextResponse.json({ error: "Start date must be in the future" }, { status: 400 });
      }
      billingAnchor = ts;
      // A future start with no upfront payment means there is no charge now to
      // capture the card, so the recurring charge would later fail. Require a
      // first payment for delayed-start subscriptions.
      if (setupAmount < 50) {
        return NextResponse.json(
          { error: "A future start date needs a first payment amount so the card can be captured today." },
          { status: 400 },
        );
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
        metadata: { source: "saabai-admin-subscription" },
      });
      customerId = customer.id;
    }

    // Create or reuse a product for this subscription
    // Use a stable product for all admin subscriptions so we don't bloat the product catalog
    let productId: string;
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });
    const existingProduct = products.data.find(p => p.metadata?.source === "saabai-admin-subscription");
    if (existingProduct) {
      productId = existingProduct.id;
    } else {
      const product = await stripe.products.create({
        name: "Saabai Admin Subscription",
        description: "Recurring payments created from the Saabai admin panel",
        metadata: { source: "saabai-admin-subscription" },
      });
      productId = product.id;
    }

    // Create a recurring price
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: Math.round(amount),
      currency: "aud",
      recurring: {
        interval: intervalConfig.interval,
        interval_count: intervalConfig.interval_count,
      },
      metadata: {
        description,
        customer_name: customerName || "",
        customer_email: customerEmail,
      },
    });

    // Validate an optional coupon and apply it natively to the subscription.
    let appliedCode: string | null = null;
    const subDiscounts: { promotion_code: string }[] = [];
    if (promotionCode) {
      const { coupon, error: couponErr } = await resolveCouponForManual(stripe, promotionCode);
      if (couponErr) return NextResponse.json({ error: couponErr }, { status: 400 });
      if (coupon) {
        subDiscounts.push({ promotion_code: coupon.promotionCodeId });
        appliedCode = coupon.code;
      }
    }

    const subParams: import("stripe").Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: price.id }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      ...(subDiscounts.length ? { discounts: subDiscounts } : {}),
      metadata: {
        source: "saabai-admin-subscription",
        description,
        interval,
        coupon_code: appliedCode || "",
      },
      expand: ["latest_invoice.payment_intent"],
    };

    // One-off first payment (setup fee) — added to the first invoice, charged now.
    if (setupAmount >= 50) {
      subParams.add_invoice_items = [
        { price_data: { currency: "aud", product: productId, unit_amount: setupAmount }, quantity: 1 },
      ];
    }

    // Delay the first recurring charge to the chosen start date (no proration for
    // the gap). The setup fee above still bills now and captures the card.
    if (billingAnchor) {
      subParams.billing_cycle_anchor = billingAnchor;
      subParams.proration_behavior = "none";
    }

    const subscription = await stripe.subscriptions.create(subParams);

    const latestInvoice = subscription.latest_invoice as unknown as Record<string, unknown>;
    let clientSecret: string | null = null;
    if (latestInvoice && typeof latestInvoice !== "string") {
      const paymentIntent = latestInvoice.payment_intent;
      if (paymentIntent && typeof paymentIntent !== "string") {
        clientSecret = (paymentIntent as unknown as Record<string, string | null>).client_secret;
      }
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,
      amount: price.unit_amount,
      setupAmount,
      startDate: billingAnchor ? startDate : null,
      interval,
      status: subscription.status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payments/create-subscription]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
