/**
 * LeadGen Stripe Webhook Handler
 * Handles subscription lifecycle events
 */

import { NextRequest } from "next/server";
import Stripe from "stripe";
import { updateClient, getClientBySlug } from "../../../../lib/leadgen-config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const slug = session.metadata?.clientSlug;
        const tier = session.metadata?.tier as "starter" | "pro" | "enterprise";

        if (slug && tier && session.customer && session.subscription) {
          await updateClient(slug, {
            subscription: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              tier,
              status: "active",
            },
          });
          console.log(`[LeadGen] Subscription activated for ${slug}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        // Find client by subscription ID and update status
        // (You can expand this later with a reverse lookup)
        console.log(`[LeadGen] Subscription updated: ${subscription.id}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[LeadGen] Subscription canceled: ${subscription.id}`);
        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response("Webhook handler failed", { status: 500 });
  }
}
