/**
 * LeadGen Stripe Checkout
 */
import { NextRequest, NextResponse } from "next/server";
import { getCheckoutSaleCharge } from "@/lib/public-sales";
import { leadgenSaleCoupon, saleMetadata } from "@/lib/sale-checkout";
import { SALE_POLICY } from "@/lib/sale-policy";
import type { PublicSlotId } from "@/lib/sale-price";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function getStripe() {
  const Stripe = require("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-11-20.acacia",
  });
}

const BASE = () => process.env.NEXT_PUBLIC_BASE_URL || "https://www.saabai.ai";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const isForm = !req.headers.get("content-type")?.includes("json");
    const body = isForm
      ? await req.formData().then((fd) => Object.fromEntries(fd as any))
      : await req.json();

    const { tier } = body as { tier: string };
    const stripe = getStripe();

    const priceMap: Record<string, string> = {
      starter: process.env.STRIPE_PRICE_STARTER!,
      pro: process.env.STRIPE_PRICE_PRO!,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE!,
    };

    const priceId = priceMap[tier];
    if (!priceId) {
      return Response.json({ error: "Invalid tier" }, { status: 400, headers: CORS });
    }

    // Sale price: re-checked now from the server record. Never trusts a client amount.
    const sale = await getCheckoutSaleCharge(`leadgen-${tier}` as PublicSlotId);
    const couponParams = sale ? leadgenSaleCoupon(sale, SALE_POLICY.recurringDiscountMonths, `LeadGen ${tier}`) : null;
    const coupon = couponParams ? await stripe.coupons.create(couponParams) : null;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
      payment_method_types: ["card"],
      customer_creation: "always",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { tier, source: "leadgen", ...(sale && coupon ? saleMetadata(sale) : {}) },
      success_url: `${BASE()}/leadgen/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE()}/leadgen`,
    });

    if (isForm) {
      return NextResponse.redirect(session.url!, 303);
    }

    return Response.json({ url: session.url }, { headers: CORS });
  } catch (error: any) {
    console.error("[LeadGen Checkout]", error);
    return Response.json({ error: error.message }, { status: 500, headers: CORS });
  }
}
