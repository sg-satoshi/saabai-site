/**
 * LeadGen Top-Up Checkout API
 *
 * Creates a Stripe checkout session for purchasing extra SMS/WhatsApp message blocks.
 * Handles both authenticated client portal users and manual purchases.
 */
import { NextRequest } from "next/server";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_TOPUP_PRICE_ID = process.env.STRIPE_TOPUP_PRICE_ID || "";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.saabai.ai";

export async function POST(req: NextRequest) {
  try {
    const { channel, blocks, clientId, email } = await req.json();

    if (!channel || !["sms", "whatsapp"].includes(channel)) {
      return Response.json({ error: "Invalid channel" }, { status: 400 });
    }
    if (!blocks || blocks < 1 || blocks > 100) {
      return Response.json({ error: "Invalid blocks (1-100)" }, { status: 400 });
    }
    if (!clientId || !email) {
      return Response.json({ error: "clientId and email required" }, { status: 400 });
    }

    if (!STRIPE_SECRET_KEY || !STRIPE_TOPUP_PRICE_ID) {
      return Response.json({ error: "Stripe not configured" }, { status: 501 });
    }

    const Stripe = require("stripe");
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" });

    const totalMessages = blocks * 100;
    const totalPrice = blocks * 15; // $15 per 100-message block

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{
        price: STRIPE_TOPUP_PRICE_ID,
        quantity: blocks,
      }],
      metadata: {
        type: "leadgen_topup",
        clientId,
        channel,
        blocks: blocks.toString(),
        totalMessages: totalMessages.toString(),
      },
      success_url: `${BASE_URL}/leadgen/success?topup=completed&channel=${channel}&messages=${totalMessages}`,
      cancel_url: `${BASE_URL}/leadgen/portal`,
    });

    return Response.json({ url: session.url });
  } catch (e: unknown) {
    console.error("[TopUp Checkout] Error:", e);
    const msg = e instanceof Error ? e.message : "Internal server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
