import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

// Price IDs are created in the Stripe dashboard and stored in env vars.
// Each plan needs two prices: a one-time setup fee and a recurring monthly.
const PLANS = {
  starter: {
    setup:   process.env.STRIPE_STARTER_SETUP_PRICE_ID!,
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID!,
    label:   "Lex Starter",
  },
  growth: {
    setup:   process.env.STRIPE_GROWTH_SETUP_PRICE_ID!,
    monthly: process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID!,
    label:   "Lex Growth",
  },
} as const;

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    const { plan } = await req.json() as { plan: string };
    const config = PLANS[plan as keyof typeof PLANS];
    if (!config) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const origin = req.headers.get("origin") ?? "https://saabai.ai";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      // Recurring price becomes a subscription item.
      // One-time setup price is automatically added to the first invoice only.
      line_items: [
        { price: config.monthly, quantity: 1 },
        { price: config.setup,   quantity: 1 },
      ],
      subscription_data: {
        metadata: { plan, label: config.label },
      },
      success_url: `${origin}/counsel/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url:  `${origin}/counsel#pricing`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      metadata: { plan, label: config.label },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
