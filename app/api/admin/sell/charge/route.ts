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
import { isAdminRequest } from "../../../../../lib/product-stripe";
import { resolveCoupon, bakedAmounts, couponOff, createOrFindCustomer } from "../../../../../lib/sell";
import { ensureClientAccount } from "../../../../../lib/client-account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const customerEmail = typeof body?.customerEmail === "string" ? body.customerEmail.trim() : "";
  const customerName = typeof body?.customerName === "string" ? body.customerName.trim() : "";
  if (!customerEmail) return NextResponse.json({ error: "Customer email is required" }, { status: 400 });

  const product = await getProduct(String(body?.productId || ""));
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  try {
    const stripe = getStripe();

    const { coupon, error } = await resolveCoupon(stripe, body?.code, product);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const customerId = await createOrFindCustomer(stripe, customerName, customerEmail);
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
      });
      clientSecret = pi.client_secret;
    } else {
      const cfg = INTERVAL_MAP[product.interval!];
      const recurringPrice = await stripe.prices.create({
        product: product.stripeProductId,
        currency: "aud",
        unit_amount: baked.recurring || 0,
        recurring: { interval: cfg.interval, interval_count: cfg.interval_count },
        tax_behavior: taxBehavior,
      });

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

      const subscription = await stripe.subscriptions.create(subParams);
      const latestInvoice = subscription.latest_invoice as unknown as Record<string, unknown>;
      if (latestInvoice && typeof latestInvoice !== "string") {
        const pi = latestInvoice.payment_intent;
        if (pi && typeof pi !== "string") {
          clientSecret = (pi as unknown as Record<string, string | null>).client_secret;
        }
      }
    }

    // Create the client login + welcome email (idempotent).
    await ensureClientAccount({ name: customerName, email: customerEmail, productName: product.name });

    return NextResponse.json({ clientSecret, billingType: product.billingType });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/sell/charge]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
