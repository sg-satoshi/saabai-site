import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { ensureClientAccount } from "../../../../lib/client-account";
import { EMAIL_BRAND, sendBrandedEmail } from "../../../../lib/email/branded-layout";
import { adminSaleNotificationEmail } from "../../../../lib/email/templates";

// Stripe requires the raw request body to verify signatures — do NOT parse as JSON first.
export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_details?.email ?? "";
    const customerName  = session.customer_details?.name  ?? "New client";

    // Legacy duplicate of app/api/stripe/webhook (the canonical route). Lex and Blueprint are handled
    // there only; this route must never provision or announce them.
    if (session.metadata?.product === "lex" || session.metadata?.product === "blueprint") {
      return NextResponse.json({ received: true, skipped: "handled by /api/stripe/webhook" });
    }
    if (session.metadata?.source === "saabai-sell") {
      const productName = session.metadata?.product_name ?? "your purchase";
      if (customerEmail) {
        try {
          await ensureClientAccount({ name: customerName, email: customerEmail, productName });
        } catch (err) {
          console.error("[stripe webhook] client account creation failed", err);
        }
      }
      try {
        await sendBrandedEmail({
          to: "hello@saabai.ai",
          from: EMAIL_BRAND.from,
          email: adminSaleNotificationEmail({
            productName,
            customerName,
            customerEmail: customerEmail || null,
            detailLines: [`Session: ${session.id}`, "Client login created and welcome email sent."],
            adminUrl: "https://dashboard.stripe.com",
          }),
        });
      } catch (err) {
        console.error("[stripe webhook] failed to send sale notification email", err);
      }
    } else {
      // Unknown checkout: alert only. No longer labelled as a Lex signup.
      try {
        await sendBrandedEmail({
          to: "hello@saabai.ai",
          from: EMAIL_BRAND.from,
          email: adminSaleNotificationEmail({
            productName: `Unrecognised checkout (product: ${session.metadata?.product ?? "none"})`,
            customerName,
            customerEmail: customerEmail || null,
            detailLines: [`Session: ${session.id}`, "Nothing was provisioned. Check it in Stripe."],
            adminUrl: "https://dashboard.stripe.com",
          }),
        });
      } catch (err) {
        console.error("[stripe webhook] failed to send notification email", err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
