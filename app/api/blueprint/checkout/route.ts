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

export async function GET() {
  return NextResponse.json({
    tiers: { starter: enabled("starter"), pro: enabled("pro"), business: enabled("business") },
    publishableKeyConfigured: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
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
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!price || !key) {
    return NextResponse.json({ error: "Online checkout is not available yet", fallback: true }, { status: 503 });
  }

  // Optional prefill fields (legacy hosted form). Embedded mode does not require them.
  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const business = clean(body.business, 160);
  const phone = clean(body.phone, 40);
  const website = clean(body.website, 200);
  const abn = clean(body.abn, 20);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please use a valid email" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? "https://saabai.ai";
  const metadata = { product: "blueprint", tier, name, business, phone, website, abn };
  const embedded = body.ui_mode !== "hosted";

  try {
    const stripe = new Stripe(key);
    const common = {
      mode: "payment" as const,
      line_items: [{ price, quantity: 1 }],
      customer_creation: "always" as const,
      invoice_creation: {
        enabled: true,
        invoice_data: { description: `Saabai ${TIERS[tier].name} Blueprint`, metadata },
      },
      billing_address_collection: "auto" as const,
      allow_promotion_codes: true,
      metadata,
      payment_intent_data: { metadata, description: `Saabai ${TIERS[tier].name} Blueprint` },
      // Optional extras inside Stripe Checkout so payment is never blocked by our form.
      custom_fields: [
        {
          key: "business_name",
          label: { type: "custom" as const, custom: "Business name" },
          type: "text" as const,
          optional: true,
        },
        {
          key: "website",
          label: { type: "custom" as const, custom: "Website (optional)" },
          type: "text" as const,
          optional: true,
        },
      ],
    };

    if (embedded) {
      const session = await stripe.checkout.sessions.create({
        ...common,
        ...(email ? { customer_email: email } : {}),
        ui_mode: "embedded_page",
        return_url: `${origin}/blueprint/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        redirect_on_completion: "always",
      });
      if (!session.client_secret) {
        return NextResponse.json({ error: "Could not start checkout", fallback: true }, { status: 502 });
      }
      return NextResponse.json({ clientSecret: session.client_secret, sessionId: session.id });
    }

    if (!name || !email || !business) {
      return NextResponse.json({ error: "Please add your name, email and business name" }, { status: 400 });
    }
    const session = await stripe.checkout.sessions.create({
      ...common,
      customer_email: email,
      ui_mode: "hosted_page",
      success_url: `${origin}/blueprint/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/blueprint/checkout?tier=${tier}&cancelled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[blueprint checkout]", err);
    return NextResponse.json({ error: "Could not start checkout", fallback: true }, { status: 502 });
  }
}
