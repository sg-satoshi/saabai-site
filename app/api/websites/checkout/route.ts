import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { ATTR_COOKIE, attrMetadata, parseAttr } from "@/lib/growth/attribution";
import { PRESENCE, presenceCheckoutEnabled, presencePriceId } from "@/lib/website-presence";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ enabled: presenceCheckoutEnabled() });
}

const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const price = presencePriceId();
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!price || !key) {
    return NextResponse.json({ error: "Online checkout is not available yet", fallback: true }, { status: 503 });
  }
  const email = clean(body.email, 200);
  const business = clean(body.business, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Please use a valid email" }, { status: 400 });
  if (!business) return NextResponse.json({ error: "Please add your business name" }, { status: 400 });

  const origin = req.headers.get("origin") ?? "https://saabai.ai";
  const attr = parseAttr(req.cookies.get(ATTR_COOKIE)?.value);
  // care_autostart=manual: the $100/mo care subscription is started by Shane at go-live (not automated).
  const metadata: Record<string, string> = {
    product: "website_presence",
    tier: "presence",
    business,
    deposit: String(PRESENCE.deposit),
    balance: String(PRESENCE.balance),
    care_monthly: String(PRESENCE.care),
    care_autostart: "manual",
    ...attrMetadata(attr),
  };
  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "hosted_page",
      line_items: [{ price, quantity: 1 }],
      customer_email: email,
      customer_creation: "always",
      invoice_creation: { enabled: true, invoice_data: { description: "Saabai Presence website: deposit (50%)", metadata } },
      name_collection: { individual: { enabled: true, optional: false } },
      phone_number_collection: { enabled: true },
      metadata,
      payment_intent_data: { metadata, description: "Saabai Presence website: deposit (50%)" },
      custom_text: { submit: { message: PRESENCE.terms } },
      success_url: `${origin}/websites/buy/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/websites/buy?cancelled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[websites checkout]", err);
    return NextResponse.json({ error: "Could not start checkout", fallback: true }, { status: 502 });
  }
}
