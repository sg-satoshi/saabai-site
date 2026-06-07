/**
 * GET /api/admin/customers
 * Unified customer directory — aggregates Lex, Site Factory, Stripe, and Portal clients.
 * Admin-only — requires valid saabai_session cookie.
 */

import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";
import { getLexClients } from "../../../../lib/lex-config";
import { listSites } from "../../../../lib/site-registry";
import { loadClients } from "../../../../lib/clients";
import { listClients as listLeadGenClients } from "../../../../lib/leadgen-config";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export interface UnifiedCustomer {
  id: string;
  name: string;
  email: string;
  type: "lex" | "site-factory" | "stripe" | "portal" | "leadgen";
  project: string;
  status: string;
  revenue: number; // cents
  mrr: number; // cents
  createdAt: number;
  detailUrl: string;
  metadata: Record<string, unknown>;
}

async function fetchStripeCustomers(): Promise<UnifiedCustomer[]> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as any });

  try {
    const subs = await stripe.subscriptions.list({ limit: 100 });
    const customerIds = [...new Set(
      subs.data.map(s => typeof s.customer === "string" ? s.customer : (s.customer as Stripe.Customer | null)?.id ?? "").filter(Boolean)
    )];

    const customerMap: Record<string, Stripe.Customer> = {};
    await Promise.all(customerIds.map(async id => {
      try {
        const c = await stripe.customers.retrieve(id);
        if (c && !("deleted" in c)) customerMap[id] = c as Stripe.Customer;
      } catch { /* skip */ }
    }));

    const invoices = await stripe.invoices.list({ limit: 100 });
    const paidByCustomer: Record<string, number> = {};
    const mrrByCustomer: Record<string, number> = {};

    for (const inv of invoices.data) {
      if (inv.status !== "paid") continue;
      const cid = typeof inv.customer === "string" ? inv.customer : "";
      if (!cid) continue;
      paidByCustomer[cid] = (paidByCustomer[cid] ?? 0) + inv.amount_paid;
    }

    return subs.data.map(sub => {
      const cid = typeof sub.customer === "string" ? sub.customer : "";
      const customer = customerMap[cid];
      const monthlyItem = sub.items.data.find(item => item.price?.recurring?.interval === "month");
      const monthlyAmount = monthlyItem?.price?.unit_amount ?? 0;

      return {
        id: `stripe_${cid}`,
        name: customer?.name ?? customer?.email ?? "Unknown",
        email: customer?.email ?? "",
        type: "stripe" as const,
        project: "Lex",
        status: sub.status,
        revenue: paidByCustomer[cid] ?? 0,
        mrr: sub.status === "active" ? monthlyAmount : 0,
        createdAt: sub.created * 1000,
        detailUrl: `/saabai-admin/orders`,
          metadata: {
            customerId: cid,
            plan: monthlyAmount >= 49900 ? "Growth" : "Starter",
            currentPeriodEnd: (sub as any).current_period_end ?? null,
          },
      };
    });
  } catch {
    return [];
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const session = await verifySessionToken(token);
  if (!session || session.clientId !== ADMIN_ID) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Aggregate from all sources
  const customers: UnifiedCustomer[] = [];

  // 1. Lex clients
  const lexClients = getLexClients();
  for (const c of lexClients) {
    customers.push({
      id: `lex_${c.id}`,
      name: c.firmName,
      email: c.email?.teamEmail ?? "",
      type: "lex",
      project: "Lex",
      status: "active",
      revenue: 0,
      mrr: 0,
      createdAt: 0,
      detailUrl: `/saabai-admin/lex-clients`,
      metadata: {
        agentName: c.agentName,
        mode: c.mode,
        practiceAreas: c.practiceAreas,
        tools: c.tools,
      },
    });
  }

  // 2. Site Factory sites
  try {
    const sites = await listSites();
    for (const s of sites) {
      customers.push({
        id: `site_${s.id}`,
        name: s.name,
        email: s.business?.email ?? "",
        type: "site-factory",
        project: "Site Factory",
        status: s.status,
        revenue: 0,
        mrr: 0,
        createdAt: s.createdAt,
        detailUrl: s.url,
        metadata: {
          slug: s.slug,
          niche: s.niche,
          description: s.description,
          phone: s.business?.phone,
          address: s.business?.address,
        },
      });
    }
  } catch { /* skip */ }

  // 3. Stripe subscriptions
  try {
    const stripeCustomers = await fetchStripeCustomers();
    customers.push(...stripeCustomers);
  } catch { /* skip */ }

  // 4. Portal clients (Rex, etc.)
  try {
    const portalClients = loadClients();
    for (const c of portalClients) {
      customers.push({
        id: `portal_${c.id}`,
        name: c.name,
        email: c.email,
        type: "portal",
        project: c.id === "plasticonline" ? "Rex" : "Portal",
        status: "active",
        revenue: 0,
        mrr: 0,
        createdAt: 0,
        detailUrl: c.dashboardUrl,
        metadata: {
          clientId: c.id,
          dashboardUrl: c.dashboardUrl,
        },
      });
    }
  } catch { /* skip */ }

  // 5. LeadGen clients (Jack widget subscriptions)
  try {
    const leadGenClients = await listLeadGenClients();
    for (const c of leadGenClients) {
      customers.push({
        id: `leadgen_${c.id}`,
        name: c.businessName,
        email: c.email,
        type: "leadgen",
        project: "LeadGen",
        status: c.status === "active" ? "live" : c.status,
        revenue: 0,
        mrr: 0,
        createdAt: c.createdAt,
        detailUrl: `/saabai-admin/leadgen-clients?id=${c.id}`,
        metadata: {
          slug: c.slug,
          niche: c.niche,
          phone: c.phone,
          tier: c.subscription?.tier ?? "",
          description: c.description,
        },
      });
    }
  } catch { /* skip */ }

  // Sort by createdAt desc, then by name
  customers.sort((a, b) => {
    if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
    return a.name.localeCompare(b.name);
  });

  return Response.json({ customers, total: customers.length });
}
