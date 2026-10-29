/** POST: opens the Stripe billing portal for the caller's Lex firm. Firm admin (the signer) only. */
import { resolveReviewActor } from "@/lib/lex-review-access";
import { firmByEmail } from "@/lib/lex-subscription";
import { billingPortalUrl, siteUrl, stripeConfigured } from "@/lib/billing/stripe-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const actor = await resolveReviewActor(req);
    if (!actor || actor.kind !== "firm") return Response.json({ error: "Sign in first" }, { status: 401 });
    const firm = await firmByEmail(actor.email);
    if (!firm || firm.adminEmail !== actor.email) return Response.json({ error: "Only the account owner can manage billing" }, { status: 403 });
    if (!firm.customerId || !stripeConfigured()) return Response.json({ error: "Billing isn't available for this account" }, { status: 404 });
    return Response.json({ url: await billingPortalUrl(firm.customerId, `${siteUrl()}/lex`) });
  } catch (err) {
    console.error("[lex billing portal]", err instanceof Error ? err.name : err);
    return Response.json({ error: "Could not open billing" }, { status: 502 });
  }
}
