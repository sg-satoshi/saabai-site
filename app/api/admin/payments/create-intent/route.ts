/**
 * POST /api/admin/payments/create-intent
 * Creates a Stripe PaymentIntent for an inline card charge.
 * Admin-only — requires valid saabai_session cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../../../../lib/auth";
import { getStripe } from "../../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export async function POST(req: NextRequest) {
  // Auth
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session || session.clientId !== ADMIN_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stripe = getStripe();

  let paymentIntent: import("stripe").Stripe.PaymentIntent | null = null;

  try {
    const { amount, description, customerName, customerEmail } = await req.json();

    // Validate
    if (!amount || typeof amount !== "number" || amount < 50) {
      return NextResponse.json({ error: "Amount must be at least 50 cents ($0.50)" }, { status: 400 });
    }
    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    // Create or find customer
    let customerId: string | undefined;
    if (customerEmail) {
      const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          name: customerName || undefined,
          email: customerEmail,
          metadata: { source: "saabai-admin-payments" },
        });
        customerId = customer.id;
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: "aud",
      description,
      customer: customerId,
      metadata: {
        source: "saabai-admin-payments",
        description,
        customer_name: customerName || "",
        customer_email: customerEmail || "",
      },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
      amount: paymentIntent.amount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payments/create-intent]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
