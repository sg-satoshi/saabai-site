import Stripe from "stripe";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

// Stripe requires the raw request body to verify signatures — do NOT parse as JSON first.
export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const resend  = new Resend(process.env.RESEND_API_KEY!);
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
    const plan          = session.metadata?.plan ?? "unknown";
    const label         = session.metadata?.label ?? plan;
    const customerEmail = session.customer_details?.email ?? "—";
    const customerName  = session.customer_details?.name  ?? "New client";

    try {
      await resend.emails.send({
        from:    "Saabai <noreply@saabai.ai>",
        to:      "hello@saabai.ai",
        subject: `New Lex signup — ${label} plan`,
        html: `
          <h2>New Lex client signed up</h2>
          <table>
            <tr><td><strong>Name</strong></td><td>${customerName}</td></tr>
            <tr><td><strong>Email</strong></td><td>${customerEmail}</td></tr>
            <tr><td><strong>Plan</strong></td><td>${label}</td></tr>
            <tr><td><strong>Session</strong></td><td>${session.id}</td></tr>
          </table>
          <p>Head to the <a href="https://dashboard.stripe.com">Stripe dashboard</a> to view payment details.</p>
        `,
      });
    } catch (err) {
      console.error("[stripe webhook] failed to send notification email", err);
    }
  }

  return NextResponse.json({ received: true });
}
