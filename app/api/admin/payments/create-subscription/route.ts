/**
 * POST /api/admin/payments/create-subscription
 * Creates a Stripe subscription with a recurring price.
 * Returns the client_secret for the initial payment confirmation.
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
import { classifySubscription } from "../../../../../lib/subscription-classify";

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
  // Money route: full admins only (restricted staff are refused).
  const actor = await moneyAdmin();
  if (!actor) {
    return moneyDeny();
  }

  const stripe = getStripe();

  try {
    const body = await req.json();
    const { amount, description, customerName, customerEmail, interval, customDays, promotionCode, setupFee, startDate, productType: productTypeIn, clientId } = body || {};
    const rid = requireRequestId(body);
    if ("error" in rid) return NextResponse.json({ error: rid.error }, { status: rid.status });
    const { requestId } = rid;
    const base = idemKey("create-subscription", requestId, { actor, amount, description, customerEmail, interval, customDays, promotionCode, setupFee, startDate, clientId });

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

    // Linked billing client first, then email (no duplicate customers).
    const { customerId, client } = await resolveMoneyCustomer(stripe, { clientId, email: customerEmail, name: customerName, source: "saabai-admin-subscription", idemBase: base });
    if (!customerId) return NextResponse.json({ error: "Customer could not be resolved" }, { status: 400 });

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
      }, { idempotencyKey: "saabai:admin-subscription-product:v1" });
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
        customer_email: customerEmail || "",
      },
    }, { idempotencyKey: stepKey(base, "price") });

    // Validate an optional coupon and apply it natively to the subscription.
    let appliedCode: string | null = null;
    const subDiscounts: { promotion_code: string }[] = [];
    let onceUse: string | null = null; // promo id when the one-per-customer rule applies
    if (promotionCode) {
      const { coupon, error: couponErr } = await resolveCouponForManual(stripe, promotionCode, customerEmail);
      if (couponErr) return NextResponse.json({ error: couponErr }, { status: 400 });
      if (coupon?.oncePerCustomer) onceUse = coupon.promotionCodeId;
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
        saabai_client_id: client?.id || "",
        productType:
          typeof productTypeIn === "string" && productTypeIn.trim()
            ? String(productTypeIn).trim()
            : classifySubscription({ description }),
      },
      expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
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

    const subscription = await stripe.subscriptions.create(subParams, { idempotencyKey: stepKey(base, "sub") });
    await logMoneyAction({ actor, action: "subscription.create", amountCents: price.unit_amount ?? undefined, currency: "aud", clientId: client?.id, clientEmail: customerEmail, stripeIds: { subscription: subscription.id, customer: customerId, price: price.id }, priceId: price.id, ok: true, note: `${description} (${interval})` });

    const latestInvoice = subscription.latest_invoice as unknown as Record<string, unknown>;
    let clientSecret: string | null = null;
    if (latestInvoice && typeof latestInvoice !== "string") {
      const paymentIntent = latestInvoice.payment_intent;
      if (paymentIntent && typeof paymentIntent !== "string") {
        clientSecret = (paymentIntent as unknown as Record<string, string | null>).client_secret;
      }
    }

    // When the billing cycle is anchored to a FUTURE date, Stripe does not
    // create an immediate invoice/PaymentIntent. Instead it issues a
    // pending_setup_intent to capture the card for the upcoming invoice.
    // Surface that client secret so the frontend can confirm the card.
    const pendingSetup = subscription.pending_setup_intent as unknown as Record<string, unknown> | null;
    let setupIntentClientSecret: string | null = null;
    if (pendingSetup && typeof pendingSetup !== "string") {
      setupIntentClientSecret = (pendingSetup as unknown as Record<string, string | null>).client_secret;
    }

    if (onceUse) await markUsed(onceUse, customerEmail, "admin:create-subscription:" + Date.now());
    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,
      setupIntentClientSecret,
      amount: price.unit_amount,
      setupAmount,
      startDate: billingAnchor ? startDate : null,
      interval,
      status: subscription.status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payments/create-subscription]", msg);
    await logMoneyAction({ actor, action: "subscription.create", ok: false, note: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
