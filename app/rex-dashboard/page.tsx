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

  // Build a map: emailHash → lead timestamp
  // Start with all-time hash set (no timestamp for old leads), then overlay recent leads (with timestamps)
  const hashToLead = new Map<string, string>();
  for (const hash of stats.emailHashes) {
    hashToLead.set(hash, ""); // known Rex lead, timestamp unknown for older leads
  }
  for (const lead of stats.recentLeads) {
    if (lead.emailHash) hashToLead.set(lead.emailHash, lead.timestamp); // overlay with timestamp where available
  }

  // Build name-based lookup: normalizedName → lead timestamp (from recent leads with full data)
  const nameToLead = new Map<string, string>();
  for (const lead of stats.recentLeads) {
    if (lead.name) nameToLead.set(normName(lead.name), lead.timestamp);
  }
  // All-time name set for leads that have aged out of the recent list
  const allLeadNames = new Set<string>(stats.leadNames);

  // Match WooCommerce orders against Rex leads — email hash first, name fallback
  const allOrders = orders.map(o => toAttributedOrder(o));
  const attributed: AttributedOrder[] = [];

  for (const o of orders) {
    // Email hash match (high confidence)
    if (o.billing.email) {
      const hash = hashEmail(o.billing.email);
      const leadTs = hashToLead.get(hash);
      if (leadTs !== undefined) {
        attributed.push(toAttributedOrder(o, leadTs || undefined, "email"));
        continue;
      }
    }

    // Name match fallback (lower confidence — catches customers who used a different email)
    // Require both first + last name to avoid false positives on single-name entries
    const billing = [o.billing.first_name, o.billing.last_name].filter(Boolean).join(" ");
    const billingNorm = normName(billing);
    if (billingNorm.includes(" ")) {
      const leadTs = nameToLead.get(billingNorm);
      if (leadTs !== undefined || allLeadNames.has(billingNorm)) {
        attributed.push(toAttributedOrder(o, leadTs || undefined, "name"));
      }
    }
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
