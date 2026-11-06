/**
 * POST /api/admin/sell/charge — in-page card charge for a catalogue product.
 * Returns a clientSecret the panel confirms with the CardElement.
 * Product discount is baked into the amount; a coupon applies natively on
 * subscriptions and is folded into the amount for one-time charges.
 * Admin-only.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../../lib/stripe";
import { getProduct, INTERVAL_MAP } from "../../../../../lib/product-catalogue";
import { moneyAdmin, moneyDeny } from "../../../../../lib/billing/money-auth";
import { logMoneyAction } from "../../../../../lib/billing/audit-log";
import { idemKey, priceSignature, requireRequestId, stepKey } from "../../../../../lib/billing/idempotency";
import { markUsed } from "../../../../../lib/coupons/once";
import { resolveCoupon, bakedAmounts, couponOff, createOrFindCustomer } from "../../../../../lib/sell";
import { ensureClientAccount } from "../../../../../lib/client-account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Money route: full admins only (restricted staff are refused).
  const actor = await moneyAdmin();
  if (!actor) {
    return moneyDeny();
  }

  const body = await req.json().catch(() => ({}));
  const customerEmail = typeof body?.customerEmail === "string" ? body.customerEmail.trim() : "";
  const customerName = typeof body?.customerName === "string" ? body.customerName.trim() : "";
  if (!customerEmail) return NextResponse.json({ error: "Customer email is required" }, { status: 400 });

  const product = await getProduct(String(body?.productId || ""));
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const rid = requireRequestId(body);
  if ("error" in rid) return NextResponse.json({ error: rid.error }, { status: rid.status });
  const { requestId } = rid;
  // Key covers the submission plus the price actually charged, so a price edit never reuses a key.
  const base = idemKey("sell-charge", requestId, { actor, productId: product.id, customerEmail, code: body?.code, priceVersion: priceSignature(product) });

  try {
    const stripe = getStripe();

    const { coupon, error } = await resolveCoupon(stripe, body?.code, product, customerEmail);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const customerId = await createOrFindCustomer(stripe, customerName, customerEmail, stepKey(base, "customer"));
    const baked = bakedAmounts(product);
    const taxBehavior: "inclusive" | "exclusive" = product.gstInclusive ? "inclusive" : "exclusive";
    const metaBase = { source: "saabai-sell", product_id: product.id, product_name: product.name, customer_email: customerEmail };

    let clientSecret: string | null = null;

    if (product.billingType === "one_time") {
      const amount = couponOff(baked.oneTime || 0, coupon);
      if (amount < 50) return NextResponse.json({ error: "Amount after discount is below the $0.50 minimum" }, { status: 400 });
      const pi = await stripe.paymentIntents.create({
        amount,
        currency: "aud",
        description: product.name,
        customer: customerId,
        metadata: metaBase,
        automatic_payment_methods: { enabled: true },
      }, { idempotencyKey: stepKey(base, "pi") });
      clientSecret = pi.client_secret;
      await logMoneyAction({ actor, action: "sell.charge", amountCents: amount, currency: "aud", clientEmail: customerEmail, stripeIds: { payment_intent: pi.id, customer: customerId }, productId: product.id, ok: true, note: product.name });
    } else {
      const cfg = INTERVAL_MAP[product.interval!];
      const recurringPrice = await stripe.prices.create({
        product: product.stripeProductId,
        currency: "aud",
        unit_amount: baked.recurring || 0,
        recurring: { interval: cfg.interval, interval_count: cfg.interval_count },
        tax_behavior: taxBehavior,
      }, { idempotencyKey: stepKey(base, "price") });

      const subParams: import("stripe").Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: recurringPrice.id }],
        payment_behavior: "default_incomplete",
        payment_settings: { payment_method_types: ["card"], save_default_payment_method: "on_subscription" },
        metadata: metaBase,
        expand: ["latest_invoice.payment_intent"],
      };
      if (product.billingType === "setup_monthly" && baked.setup) {
        subParams.add_invoice_items = [
          { price_data: { currency: "aud", product: product.stripeSetupProductId || product.stripeProductId, unit_amount: baked.setup, tax_behavior: taxBehavior }, quantity: 1 },
        ];
      }
      if (product.trialDays) subParams.trial_period_days = product.trialDays;
      if (coupon) subParams.discounts = [{ promotion_code: coupon.promotionCodeId }];

      const subscription = await stripe.subscriptions.create(subParams, { idempotencyKey: stepKey(base, "sub") });
      await logMoneyAction({ actor, action: "sell.subscription", amountCents: baked.recurring || 0, currency: "aud", clientEmail: customerEmail, stripeIds: { subscription: subscription.id, customer: customerId, price: recurringPrice.id }, productId: product.id, ok: true, note: product.name });
      const latestInvoice = subscription.latest_invoice as unknown as Record<string, unknown>;
      if (latestInvoice && typeof latestInvoice !== "string") {
        const pi = latestInvoice.payment_intent;
        if (pi && typeof pi !== "string") {
          clientSecret = (pi as unknown as Record<string, string | null>).client_secret;
        }
      }
    }

    // One use per customer: the sale exists now, so record this email against the code.
    if (coupon?.oncePerCustomer) await markUsed(coupon.promotionCodeId, customerEmail, `admin:charge:${product.id}:${Date.now()}`);

    // Create the client login + welcome email (idempotent).
    await ensureClientAccount({ name: customerName, email: customerEmail, productName: product.name });

    return NextResponse.json({ clientSecret, billingType: product.billingType });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/sell/charge]", msg);
    await logMoneyAction({ actor, action: "sell.charge", clientEmail: customerEmail, ok: false, note: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
