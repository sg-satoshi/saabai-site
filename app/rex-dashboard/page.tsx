import { createHash } from "crypto";
import { fetchRexStats } from "../../lib/rex-stats";
import { fetchRecentOrders } from "../../lib/woo-client";
import type { WooOrder } from "../../lib/woo-client";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface AttributedOrder {
  id: number;
  number: string;        // formatted e.g. "PLON-48376"
  date: string;
  customerName: string;
  total: number;
  currency: string;
  items: string[];
  leadTimestamp?: string; // matched Rex lead timestamp
  matchMethod?: "email" | "name"; // how the attribution was established
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

function normName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function toAttributedOrder(o: WooOrder, leadTimestamp?: string, matchMethod?: "email" | "name"): AttributedOrder {
  return {
    id:           o.id,
    number:       o.number || `#${o.id}`,
    date:         o.date_created,
    customerName: [o.billing.first_name, o.billing.last_name].filter(Boolean).join(" ") || "Unknown",
    total:        parseFloat(o.total) || 0,
    currency:     o.currency,
    items:        o.line_items.map(l => l.name),
    leadTimestamp,
    matchMethod,
  };
}

// Auth is handled by proxy.ts — if we reach this page, the user is authenticated.
export default async function RexDashboardPage() {
  const [stats, orders] = await Promise.all([
    fetchRexStats(),
    fetchRecentOrders(365),
  ]);

  // Attribution rules:
  // 1. Only match against verified Rex conversations from recentLeads (these have proven timestamps)
  // 2. Order must have been placed AFTER the Rex conversation — no retroactive credit
  // 3. Email hash match preferred; full-name match is fallback for different-email cases

  // Build lookups keyed by email hash and normalized full name → conversation timestamp
  const hashToTs = new Map<string, string>(); // emailHash → ISO timestamp
  const nameToTs = new Map<string, string>(); // normalizedName → ISO timestamp
  for (const lead of stats.recentLeads) {
    if (lead.emailHash) hashToTs.set(lead.emailHash, lead.timestamp);
    if (lead.name) {
      const n = normName(lead.name);
      // Only store full names (first + last) to avoid single-name false positives
      if (n.includes(" ")) nameToTs.set(n, lead.timestamp);
    }
  }

  const allOrders = orders.map(o => toAttributedOrder(o));
  const attributed: AttributedOrder[] = [];

  for (const o of orders) {
    const orderDate = new Date(o.date_created);

    // Email hash match (high confidence)
    if (o.billing.email) {
      const hash = hashEmail(o.billing.email);
      const leadTs = hashToTs.get(hash);
      if (leadTs && orderDate >= new Date(leadTs)) {
        attributed.push(toAttributedOrder(o, leadTs, "email"));
        continue;
      }
    }

    // Full-name match fallback — catches customers who used a different email at checkout
    const billing = [o.billing.first_name, o.billing.last_name].filter(Boolean).join(" ");
    const billingNorm = normName(billing);
    if (billingNorm.includes(" ")) {
      const leadTs = nameToTs.get(billingNorm);
      if (leadTs && orderDate >= new Date(leadTs)) {
        attributed.push(toAttributedOrder(o, leadTs, "name"));
      }
    }
  }

  // Tracking starts from the oldest recent lead with an email hash
  const trackingFrom = [...stats.recentLeads].reverse().find(l => l.emailHash)?.timestamp ?? null;

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
