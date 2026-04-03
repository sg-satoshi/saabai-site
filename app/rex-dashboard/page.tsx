import { createHash } from "crypto";
import { fetchRexStats } from "../../lib/rex-stats";
import { fetchRecentOrders } from "../../lib/woo-client";
import type { WooOrder } from "../../lib/woo-client";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface AttributedOrder {
  id: number;
  date: string;
  customerName: string;
  total: number;
  currency: string;
  items: string[];
  leadTimestamp?: string; // matched Rex lead timestamp
}

export interface AttributionStats {
  totalOrders: number;
  totalRevenue: number;
  attributedOrders: number;
  attributedRevenue: number;
  orders: AttributedOrder[];        // all recent WooCommerce orders
  attributed: AttributedOrder[];    // Rex-attributed subset
  trackingFrom: string | null;      // ISO — first lead with emailHash
}

function hashEmail(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

function toAttributedOrder(o: WooOrder, leadTimestamp?: string): AttributedOrder {
  return {
    id: o.id,
    date: o.date_created,
    customerName: [o.billing.first_name, o.billing.last_name].filter(Boolean).join(" ") || "Unknown",
    total: parseFloat(o.total) || 0,
    currency: o.currency,
    items: o.line_items.map(l => l.name),
    leadTimestamp,
  };
}

// Auth is handled by proxy.ts — if we reach this page, the user is authenticated.
export default async function RexDashboardPage() {
  const [stats, orders] = await Promise.all([
    fetchRexStats(),
    fetchRecentOrders(60),
  ]);

  // Build a map: emailHash → lead timestamp (for leads that have a hash)
  const hashToLead = new Map<string, string>();
  for (const lead of stats.recentLeads) {
    if (lead.emailHash) hashToLead.set(lead.emailHash, lead.timestamp);
  }

  // Match WooCommerce orders against Rex lead email hashes
  const allOrders = orders.map(o => toAttributedOrder(o));
  const attributed: AttributedOrder[] = [];

  for (const o of orders) {
    if (!o.billing.email) continue;
    const hash = hashEmail(o.billing.email);
    const leadTs = hashToLead.get(hash);
    if (leadTs) attributed.push(toAttributedOrder(o, leadTs));
  }

  // Find earliest lead with a hash (attribution tracking start date)
  const trackingFrom = stats.recentLeads.find(l => l.emailHash)?.timestamp ?? null;

  const attribution: AttributionStats = {
    totalOrders:       allOrders.length,
    totalRevenue:      allOrders.reduce((s, o) => s + o.total, 0),
    attributedOrders:  attributed.length,
    attributedRevenue: attributed.reduce((s, o) => s + o.total, 0),
    orders:            allOrders,
    attributed,
    trackingFrom,
  };

  return <DashboardClient stats={stats} attribution={attribution} />;
}
