/**
 * Retired 30 Oct 2026 (#388). No live Stripe webhook points here; checked against the live endpoint list.
 * All Stripe checkout and Lex events go to /api/stripe/webhook, and site billing to /api/webhooks/billing.
 * Answers 410 so a stray delivery is visible in Stripe instead of being silently processed twice.
 */
export const runtime = "nodejs";

export async function POST() {
  return Response.json({ error: "Gone. Use /api/stripe/webhook." }, { status: 410 });
}
