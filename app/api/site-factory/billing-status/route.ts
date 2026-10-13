/**
 * GET /api/site-factory/billing-status (admin only)
 * Compact Stripe subscription summaries used by the Site Factory list to derive
 * each site's billing status (see lib/site-billing-status.ts).
 */
import Stripe from "stripe";
import { requireAdminSession } from "../../../../lib/admin-guard";
import type { BillingSubSummary } from "../../../../lib/site-billing-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return Response.json({ subs: [], stripe: false });
  try {
    const stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
    const subs: BillingSubSummary[] = [];
    for await (const s of stripe.subscriptions.list({ status: "all", limit: 100, expand: ["data.customer"] })) {
      const c = s.customer && typeof s.customer === "object" && !("deleted" in s.customer && s.customer.deleted) ? (s.customer as Stripe.Customer) : null;
      const meta = (s.metadata || {}) as Record<string, string>;
      const price = s.items.data[0]?.price;
      subs.push({
        status: s.status,
        siteId: meta.siteId || meta.siteSlug || undefined,
        description: [meta.description, s.description].filter(Boolean).join(" "),
        customerName: c?.name || undefined,
        customerEmail: c?.email || undefined,
        amount: price?.unit_amount ?? undefined,
        interval: price?.recurring?.interval,
      });
      if (subs.length >= 500) break;
    }
    return Response.json({ subs, stripe: true });
  } catch (e) {
    console.error("[billing-status]", e);
    return Response.json({ subs: [], stripe: false, error: "Stripe lookup failed" });
  }
}
