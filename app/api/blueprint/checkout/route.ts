import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { TIERS, isTier, type BlueprintTier } from "@/lib/blueprint";

export const runtime = "nodejs";

function priceIdFor(tier: BlueprintTier): string | undefined {
  const v = process.env[TIERS[tier].priceEnv];
  return v && v.trim() ? v.trim() : undefined;
}

function enabled(tier: BlueprintTier): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && priceIdFor(tier));
}

// GET: which tiers can be bought online right now. Used by the checkout page
// to show an enquire fallback instead of erroring when env vars are missing.
export async function GET() {
  return NextResponse.json({
    tiers: { starter: enabled("starter"), pro: enabled("pro"), business: enabled("business") },
  });
}

const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const tier = body.tier;
  if (!isTier(tier)) return NextResponse.json({ error: "Invalid tier" }, { status: 400 });

  const price = priceIdFor(tier);
  const key = process.env.STRIPE_SECRET_KEY;
  if (!price || !key) {
    return NextResponse.json({ error: "Online checkout is not available yet", fallback: true }, { status: 503 });
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const business = clean(body.business, 160);
  const phone = clean(body.phone, 40);
  const website = clean(body.website, 200);
  const abn = clean(body.abn, 20);
  if (!name || !email || !business || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please add your name, email and business name" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? "https://saabai.ai";
  const metadata = { product: "blueprint", tier, name, business, phone, website, abn };

  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      customer_email: email,
      customer_creation: "always",
      invoice_creation: { enabled: true, invoice_data: { description: `Saabai ${TIERS[tier].name} Blueprint`, metadata } },
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      metadata,
      payment_intent_data: { metadata, description: `Saabai ${TIERS[tier].name} Blueprint` },
      success_url: `${origin}/blueprint/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/blueprint/checkout?tier=${tier}&cancelled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[blueprint checkout]", err);
    return NextResponse.json({ error: "Could not start checkout", fallback: true }, { status: 502 });
  }
}
