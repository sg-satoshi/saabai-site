/**
 * POST /api/admin/payments/create-subscription
 * Creates a Stripe subscription with a recurring price.
 * Returns the client_secret for the initial payment confirmation.
 * Admin-only — requires valid saabai_session cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../../../../lib/auth";
import { getStripe } from "../../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

// Map readable intervals to Stripe interval + interval_count
const INTERVAL_MAP: Record<string, { interval: "day" | "week" | "month" | "year"; interval_count: number }> = {
  weekly:    { interval: "week",  interval_count: 1 },
  fortnightly: { interval: "week", interval_count: 2 },
  monthly:   { interval: "month", interval_count: 1 },
  quarterly: { interval: "month", interval_count: 3 },
  yearly:    { interval: "year",  interval_count: 1 },
};

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session || session.clientId !== ADMIN_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stripe = getStripe();

  try {
    const { amount, description, customerName, customerEmail, interval } = await req.json();

    // Validate
    if (!amount || typeof amount !== "number" || amount < 50) {
      return NextResponse.json({ error: "Amount must be at least 50 cents ($0.50)" }, { status: 400 });
    }
    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }
    if (!interval || !INTERVAL_MAP[interval]) {
      return NextResponse.json({ error: "Invalid interval. Use: weekly, fortnightly, monthly, quarterly, yearly" }, { status: 400 });
    }
    if (!customerEmail || typeof customerEmail !== "string") {
      return NextResponse.json({ error: "Customer email is required for subscriptions" }, { status: 400 });
    }

    const intervalConfig = INTERVAL_MAP[interval];

    // Find or create customer
    const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
    let customerId: string;
    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        name: customerName || undefined,
        email: customerEmail,
        metadata: { source: "saabai-admin-subscription" },
      });
      customerId = customer.id;
    }

    // Create or reuse a product for this subscription
    // Use a stable product for all admin subscriptions so we don't bloat the product catalog
    let productId: string;
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });
    const existingProduct = products.data.find(p => p.metadata?.source === "saabai-admin-subscription");
    if (existingProduct) {
      productId = existingProduct.id;
    } else {
      const product = await stripe.products.create({
        name: "Saabai Admin Subscription",
        description: "Recurring payments created from the Saabai admin panel",
        metadata: { source: "saabai-admin-subscription" },
      });
      productId = product.id;
    }

    // Create a recurring price
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: Math.round(amount),
      currency: "aud",
      recurring: {
        interval: intervalConfig.interval,
        interval_count: intervalConfig.interval_count,
      },
      metadata: {
        description,
        customer_name: customerName || "",
        customer_email: customerEmail,
      },
    });

    // Create the subscription — starts immediately
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      metadata: {
        source: "saabai-admin-subscription",
        description,
        interval,
      },
      expand: ["latest_invoice.payment_intent"],
    });

    const latestInvoice = subscription.latest_invoice as unknown as Record<string, unknown>;
    let clientSecret: string | null = null;
    if (latestInvoice && typeof latestInvoice !== "string") {
      const paymentIntent = latestInvoice.payment_intent;
      if (paymentIntent && typeof paymentIntent !== "string") {
        clientSecret = (paymentIntent as unknown as Record<string, string | null>).client_secret;
      }
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,
      amount: price.unit_amount,
      interval,
      status: subscription.status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payments/create-subscription]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
