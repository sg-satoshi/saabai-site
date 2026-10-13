/**
 * Admin "Business health" summary: MRR, past due, paused sites, overdue
 * invoices, new leads (7d), open requests. Each section is computed on its own
 * so one failing source shows as unavailable instead of breaking the panel.
 */
import { requireAdminSession } from "../../../../lib/admin-guard";
import { getStripe } from "../../../../lib/stripe";
import { listSiteBilling } from "../../../../lib/billing/store";
import { listInvoices } from "../../../../lib/invoice-store";
import { listSites } from "../../../../lib/site-registry";
import { listSiteLeads } from "../../../../lib/site-leads";
import { listRequests } from "../../../../lib/client-requests";
import {
  summariseSubscriptions,
  summariseSiteBilling,
  summariseInvoices,
  countRecentLeads,
  countOpenRequests,
  type SubLike,
} from "../../../../lib/business-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function section<T>(name: string, errors: string[], fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[business-summary] ${name} failed:`, err instanceof Error ? err.message : err);
    errors.push(name);
    return null;
  }
}

export async function GET() {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const errors: string[] = [];

  const [subs, sites, invoices, leads, requests] = await Promise.all([
    section("subscriptions", errors, async () => {
      const stripe = getStripe();
      const out: SubLike[] = [];
      for await (const s of stripe.subscriptions.list({ status: "all", limit: 100 })) {
        if (s.status === "canceled" || s.status === "incomplete_expired") continue;
        out.push({
          status: s.status,
          livemode: s.livemode,
          items: s.items.data.map((it) => ({
            unitAmount: it.price?.unit_amount ?? null,
            quantity: it.quantity ?? 1,
            interval: it.price?.recurring?.interval ?? null,
            intervalCount: it.price?.recurring?.interval_count ?? 1,
          })),
        });
        if (out.length >= 500) break;
      }
      return summariseSubscriptions(out);
    }),
    section("siteBilling", errors, async () => summariseSiteBilling(await listSiteBilling())),
    section("invoices", errors, async () => summariseInvoices(await listInvoices())),
    section("leads", errors, async () => {
      const all = await listSites();
      const lists = await Promise.all(all.map((s) => listSiteLeads(s.slug).catch(() => [])));
      return { last7d: countRecentLeads(lists.flat() as { createdAt?: unknown }[]) };
    }),
    section("requests", errors, async () => countOpenRequests(await listRequests())),
  ]);

  return Response.json({ subs, sites, invoices, leads, requests, errors, generatedAt: new Date().toISOString() });
}
