/**
 * POST /api/lex/signup: validate, save a pending signup (24h), start a Stripe subscription Checkout.
 * Off (503) until STRIPE_LEX_FIRM_PRICE_ID and STRIPE_SECRET_KEY are set. Rate limited in proxy (lib/form-guard).
 * Provisioning happens only in the verified Stripe webhook (app/api/stripe/webhook).
 */
import { NextRequest, NextResponse } from "next/server";
import { ATTR_COOKIE, attrMetadata, parseAttr } from "@/lib/growth/attribution";
import { getStripe } from "@/lib/stripe";
import { siteUrl } from "@/lib/billing/stripe-ops";
import { savePendingSignup, validateSignup } from "@/lib/lex-subscription";
import { stripeErrorFields } from "@/lib/lex-signup-log";

export const runtime = "nodejs";

function lexPriceId(): string | undefined {
  const v = process.env.STRIPE_LEX_FIRM_PRICE_ID?.trim();
  return v || undefined;
}

export async function GET() {
  return NextResponse.json({ enabled: Boolean(process.env.STRIPE_SECRET_KEY && lexPriceId()) });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const v = validateSignup(body);
  if (!v.ok) return NextResponse.json({ error: v.error, field: v.field }, { status: 400 });

  const price = lexPriceId();
  if (!price || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Online signup for Lex isn't open yet. Please book a demo and we'll set you up." }, { status: 503 });
  }

  // Redirects come from our configured site URL, never the request's Origin header.
  const origin = siteUrl();
  try {
    const pending = await savePendingSignup(v.value);
    const attr = parseAttr(req.cookies.get(ATTR_COOKIE)?.value);
    const metadata: Record<string, string> = {
      product: "lex", plan: "firm", pendingId: pending.id, termsVersion: pending.termsVersion,
      firmName: v.value.firmName.slice(0, 100), ...attrMetadata(attr),
    };
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: v.value.email,
      client_reference_id: pending.id,
      consent_collection: { terms_of_service: "required" },
      metadata,
      subscription_data: { metadata, description: `Lex Firm plan: ${v.value.firmName.slice(0, 100)}` },
      success_url: `${origin}/lex/signup/done?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/lex/signup?cancelled=1`,
    });
    if (!session.url) return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[lex signup] Error", stripeErrorFields(err));
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
