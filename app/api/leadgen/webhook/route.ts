/**
 * LeadGen Stripe Webhook Handler
 * Creates client records on successful checkout.
 */
import { NextRequest } from "next/server";
import { createClient, getClientBySlug, listClients } from "../../../../lib/leadgen-config";
import { saveDirectoryUser } from "../../../../lib/user-directory";

function getStripe() {
  const Stripe = require("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-11-20.acacia",
  });
}

function generateSlug(email: string): string {
  const name = email.split("@")[0].replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${name}-${suffix}`;
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event: any;

  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("[LeadGen Webhook] Signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const tier = (session.metadata?.tier || "starter") as "starter" | "pro" | "enterprise";
        const email = session.customer_details?.email || session.customer_email || "";

        if (!email) {
          console.error("[LeadGen Webhook] No customer email in session");
          break;
        }

        const slug = generateSlug(email);

        // Check if client already exists for this email
        const existing = await getClientBySlug(slug);
        if (existing) {
          console.log(`[LeadGen Webhook] Client already exists for ${email}`);
          break;
        }

        const client = await createClient({
          slug,
          businessName: email.split("@")[0],
          niche: "plumbing",
          description: "Emergency and scheduled plumbing services",
          phone: "",
          email,
          serviceArea: "Brisbane",
          businessHours: "24/7",
          branding: {
            primaryColor: "#C9A84C",
            accentColor: "#62C5D1",
            widgetTitle: "Jack",
            greeting: "Hi, I'm Jack! Need a hand with your plumbing?",
          },
          status: "active",
          subscription: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            tier,
            status: "active",
          },
        });

        console.log(`[LeadGen Webhook] Client created: ${slug} (${email}) — ${tier}`);

        // Create a login user so the client can access their portal
        try {
          const allClients = await listClients();
          const existingUser = allClients.find((c) => c.email === email);
          if (existingUser) {
            const genPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
            await saveDirectoryUser({
              id: `leadgen_${existingUser.id}`,
              name: existingUser.businessName,
              email: email.toLowerCase(),
              password: genPassword,
              role: "user",
              dashboardUrl: "/leadgen/portal",
              approvedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            });
            console.log(`[LeadGen Webhook] Login user created for ${email} — initial password: ${genPassword}`);
          }
        } catch (userErr) {
          console.error("[LeadGen Webhook] Failed to create user:", userErr);
        }

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        console.log(`[LeadGen Webhook] Subscription event: ${event.type}`);
        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("[LeadGen Webhook] Handler error:", error);
    return new Response("Webhook handler failed", { status: 500 });
  }
}
