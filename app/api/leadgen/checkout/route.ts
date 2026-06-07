/**
 * LeadGen Stripe Checkout
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

    const priceMap: Record<string, string> = {
      starter: process.env.STRIPE_PRICE_STARTER!,
      pro: process.env.STRIPE_PRICE_PRO!,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE!,
    };

    const priceId = priceMap[tier];
    if (!priceId) {
      return Response.json({ error: "Invalid tier" }, { status: 400, headers: CORS });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_creation: "always",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { tier, source: "leadgen" },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.saabai.ai"}/leadgen/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.saabai.ai"}/leadgen`,
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
