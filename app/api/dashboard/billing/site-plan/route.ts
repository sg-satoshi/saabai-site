/**
 * GET /api/dashboard/billing/site-plan
 * Read-only plan details from the client's linked website billing record,
 * returned ONLY when the client has no Stripe customer (Stripe clients already
 * see everything through the Stripe billing portal).
 */
import { getClientContext } from "../../../../../lib/client-context";
import { getStripe } from "../../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getClientContext();
  if (!ctx) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const billing = ctx.site?.billing;
  if (!ctx.site || !billing || (!billing.amount && !billing.status)) return Response.json({ plan: null });

  if (ctx.email && process.env.STRIPE_SECRET_KEY) {
    try {
      const customers = await getStripe().customers.list({ email: ctx.email, limit: 1 });
      if (customers.data.length > 0) return Response.json({ plan: null });
    } catch {
      /* if Stripe is unreachable, still show the site plan */
    }
  }

  return Response.json({
    plan: {
      siteName: ctx.site.name,
      amount: billing.amount ?? null, // AUD cents per month
      status: billing.status ?? null,
      nextBillingDate: billing.nextBillingDate ?? null,
    },
  });
}
