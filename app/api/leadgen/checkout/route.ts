/**
 * LeadGen Stripe Checkout (Simplified)
 */

import { NextRequest } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
  try {
    const body = req.headers.get("content-type")?.includes("json")
      ? await req.json()
      : await req.formData().then(fd => Object.fromEntries(fd as any));

    const { tier } = body as { tier: string };

    const priceMap: Record<string, string> = {
      starter: process.env.STRIPE_PRICE_STARTER!,
      pro: process.env.STRIPE_PRICE_PRO!,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE!,
    };

    const priceId = priceMap[tier];
    if (!priceId) {
      return Response.json({ error: "Invalid tier" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/leadgen/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/leadgen`,
    });

    return Response.json({ url: session.url });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
