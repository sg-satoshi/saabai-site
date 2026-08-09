/**
 * POST /api/admin/sell/link — create a Stripe Checkout link for a catalogue
 * product. Product discount is baked into the line items; a coupon is passed to
 * Stripe natively, otherwise the customer can enter their own promotion code.
 * The client login is created by the checkout webhook on completion.
 * Admin-only.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../../lib/stripe";
import { getProduct, INTERVAL_MAP } from "../../../../../lib/product-catalogue";
import { isAdminRequest } from "../../../../../lib/product-stripe";
import { resolveCoupon, bakedAmounts } from "../../../../../lib/sell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = "https://www.saabai.ai";

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
    type SessionParams = NonNullable<Parameters<typeof stripe.checkout.sessions.create>[0]>;
    type SessionLineItem = NonNullable<SessionParams["line_items"]>[number];

    const { coupon, error } = await resolveCoupon(stripe, body?.code, product);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const baked = bakedAmounts(product);
    const taxBehavior: "inclusive" | "exclusive" = product.gstInclusive ? "inclusive" : "exclusive";
    const isSub = product.billingType !== "one_time";

    const lineItems: SessionLineItem[] = [];
    if (product.billingType === "one_time") {
      lineItems.push({
        price_data: { currency: "aud", product_data: { name: product.name }, unit_amount: baked.oneTime || 0, tax_behavior: taxBehavior },
        quantity: 1,
      });
    } else {
      const cfg = INTERVAL_MAP[product.interval!];
      lineItems.push({
        price_data: {
          currency: "aud",
          product_data: { name: product.name },
          unit_amount: baked.recurring || 0,
          recurring: { interval: cfg.interval, interval_count: cfg.interval_count },
          tax_behavior: taxBehavior,
        },
        quantity: 1,
      });
      if (product.billingType === "setup_monthly" && baked.setup) {
        lineItems.push({
          price_data: { currency: "aud", product_data: { name: `${product.name} setup fee` }, unit_amount: baked.setup, tax_behavior: taxBehavior },
          quantity: 1,
        });
      }
    }

    const params: SessionParams = {
      mode: isSub ? "subscription" : "payment",
      line_items: lineItems,
      customer_email: customerEmail,
      success_url: `${SITE}/?purchase=success`,
      cancel_url: `${SITE}/?purchase=cancelled`,
      metadata: { source: "saabai-sell", product_id: product.id, product_name: product.name, customer_name: customerName },
    };
    // Stripe forbids combining discounts + allow_promotion_codes — pick one.
    if (coupon) {
      params.discounts = [{ promotion_code: coupon.promotionCodeId }];
    } else {
      params.allow_promotion_codes = true;
    }
    if (isSub && product.trialDays) {
      params.subscription_data = { trial_period_days: product.trialDays };
    }

    const session = await stripe.checkout.sessions.create(params);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/sell/link]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
