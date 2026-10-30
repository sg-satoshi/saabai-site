/** POST: opens the Stripe billing portal for the caller's Lex firm. Firm admin (the signer) only. */
import { resolveSessionEmail } from "@/lib/lex-review-access";
import { LEX_PORTAL_CONFIG_ID, firmByEmail } from "@/lib/lex-subscription";
import { billingPortalUrl, siteUrl, stripeConfigured } from "@/lib/billing/stripe-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // No 'lex' needed: a lapsed owner (Lex removed for non-payment) must still be able to pay.
    const email = await resolveSessionEmail(req);
    if (!email) return Response.json({ error: "Sign in first" }, { status: 401 });
    const firm = await firmByEmail(email);
    if (!firm || firm.adminEmail !== email) return Response.json({ error: "Only the account owner can manage billing" }, { status: 403 });
    if (!firm.customerId || !stripeConfigured()) return Response.json({ error: "Billing isn't available for this account" }, { status: 404 });
    return Response.json({ url: await billingPortalUrl(firm.customerId, `${siteUrl()}/lex/billing`, false, LEX_PORTAL_CONFIG_ID) });
  } catch (err) {
    console.error("[lex billing portal]", err instanceof Error ? err.name : err);
    return Response.json({ error: "Could not open billing" }, { status: 502 });
  }
}
