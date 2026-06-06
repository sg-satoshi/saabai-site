/**
 * LeadGen Stripe Checkout
 * Creates a recurring subscription checkout session
 */

import { NextRequest } from "next/server";
import Stripe from "stripe";
import { getClientBySlug, updateClient } from "../../../../../lib/leadgen-config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export async function POST(req: NextRequest) {
  try {
    const { slug, tier } = await req.json();

    if (!slug || !tier) {
      return Response.json({ error: "slug and tier required" }, { status: 400 });
    }

    const client = await getClientBySlug(slug);
    if (!client) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    // Map tier to Stripe Price ID (you must create these in Stripe first)
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
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/leadgen/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/leadgen`,
      metadata: {
        clientSlug: slug,
        tier,
      },
      customer_email: client.email,
    });

    return Response.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
