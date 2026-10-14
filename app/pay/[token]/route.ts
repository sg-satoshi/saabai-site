/**
 * GET /pay/<token>  Client-facing payment link (valid 7 days).
 * Creates a fresh Stripe Checkout Session on each open (Checkout sessions
 * themselves expire in 24h). ?update=1 opens Stripe's card update flow.
 * ?code=XYZ pre-applies an active promotion code (invalid codes are ignored
 * and the customer can still type one on the Stripe page).
 */
import { resolvePayToken, getSiteBilling, saveSiteBilling } from "../../../lib/billing/store";
import { isLinkExpired } from "../../../lib/billing/state";
import { billingPortalUrl, createSetupCheckout, ensureCustomer, siteUrl, stripeConfigured } from "../../../lib/billing/stripe-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;font-family:Inter,system-ui,sans-serif;background:#f4f5f9;color:#13152a;display:grid;place-items:center;min-height:100vh;padding:20px;box-sizing:border-box}.c{background:#fff;border:1px solid #dfe2ea;border-radius:14px;max-width:440px;padding:28px}h1{font-size:20px;margin:0 0 10px}p{margin:0 0 10px;line-height:1.6;color:#5f6580;font-size:15px}a{color:#0e7482}</style></head><body><div class="c"><h1>${title}</h1>${body}</div></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const q = new URL(req.url).searchParams;
  const update = q.get("update") === "1";
  const code = q.get("code") || undefined; // ?code=NEWCLIENT50 pre-applies a promo code
  const siteId = await resolvePayToken(token);
  const rec = siteId ? await getSiteBilling(siteId) : null;
  if (!rec || rec.payToken !== token) return page("This link has expired", "<p>Payment links last 7 days. Reply to the email and we'll send a fresh one.</p><p><a href=\"mailto:hello@saabai.ai\">hello@saabai.ai</a></p>", 410);
  if (!stripeConfigured()) return page("Payments are being set up", "<p>We can't take payments right this second. Reply to the email and we'll sort it.</p>", 503);

  try {
    if (update || (rec.stripeSubscriptionId && rec.stripeCustomerId)) {
      if (!rec.stripeCustomerId) return page("Nothing to update yet", "<p>Your billing isn't set up yet. Use the original payment link.</p>");
      return Response.redirect(await billingPortalUrl(rec.stripeCustomerId, siteUrl(), true), 303);
    }
    if (rec.status === "link_expired" || isLinkExpired(rec.linkExpiresAt)) {
      if (rec.status !== "link_expired") await saveSiteBilling({ ...rec, status: "link_expired" }, "Payment link expired");
      return page("This link has expired", "<p>Payment links last 7 days. Reply to the email and we'll send a fresh one.</p>", 410);
    }
    if (rec.status !== "pending") return page("You're all set", "<p>This site's billing is already set up. Nothing more to do.</p>");
    const customerId = await ensureCustomer(rec);
    if (customerId !== rec.stripeCustomerId) await saveSiteBilling({ ...rec, stripeCustomerId: customerId });
    return Response.redirect(await createSetupCheckout({ ...rec, stripeCustomerId: customerId }, customerId, code), 303);
  } catch (e) {
    console.error("[pay]", e);
    return page("Something went sideways", "<p>We couldn't open the secure payment page. Try again in a minute, or reply to the email.</p>", 500);
  }
}
