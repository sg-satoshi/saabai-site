import { createHash } from "crypto";
import { fetchRexStats, fetchLeadTimestamps } from "../../lib/rex-stats";
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
  matchMethod?: "email" | "name" | "account"; // how the attribution was established
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
  const [stats, orders, leadTs] = await Promise.all([
    fetchRexStats(),
    fetchRecentOrders(365),
    fetchLeadTimestamps(),
  ]);

  // Attribution rules:
  // 1. Match against the timestamp maps (populated from actual Rex conversations via trackLead + Pipedrive sync)
  // 2. Overlay with recentLeads for the freshest data (Redis hashes are the source of truth)
  // 3. Order must be placed AFTER the Rex conversation — no retroactive credit
  // 4. Email hash first; full-name fallback for customers who used a different email at checkout

  // Overlay recentLeads data (fresher, more accurate) on top of the persisted timestamp maps
  const emailTsMap = { ...leadTs.byEmailHash };
  const nameTsMap  = { ...leadTs.byName };
  for (const lead of stats.recentLeads) {
    if (lead.emailHash) emailTsMap[lead.emailHash] = lead.timestamp;
    if (lead.name) {
      const n = normName(lead.name);
      if (n.includes(" ")) nameTsMap[n] = lead.timestamp;
    }
  }

  const allOrders = orders.map(o => toAttributedOrder(o));
  const attributed: AttributedOrder[] = [];

  for (const o of orders) {
    const orderDate = new Date(o.date_created);

    // Email hash match (high confidence)
    if (o.billing.email) {
      const hash = hashEmail(o.billing.email);
      const ts = emailTsMap[hash];
      if (ts && orderDate >= new Date(ts)) {
        attributed.push(toAttributedOrder(o, ts, "email"));
        continue;
      }
    }

    // Full-name fallback — catches customers who used a different email at checkout
    const billing = [o.billing.first_name, o.billing.last_name].filter(Boolean).join(" ");
    const billingNorm = normName(billing);
    if (billingNorm.includes(" ")) {
      const ts = nameTsMap[billingNorm];
      if (ts && orderDate >= new Date(ts)) {
        attributed.push(toAttributedOrder(o, ts, "name"));
        continue;
      }
    }

    // WooCommerce account match — links via customer_id (survives email changes, most reliable for repeat B2B buyers)
    if (o.customer_id > 0) {
      const ts = leadTs.byWooCustomerId[String(o.customer_id)];
      if (ts && orderDate >= new Date(ts)) {
        attributed.push(toAttributedOrder(o, ts, "account"));
      }
    }
  }

  // Tracking starts from the oldest entry in the timestamp maps
  const allTimestamps = Object.values(emailTsMap);
  const trackingFrom = allTimestamps.length > 0
    ? allTimestamps.reduce((oldest, ts) => ts < oldest ? ts : oldest)
    : null;

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
