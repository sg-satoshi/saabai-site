import { createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchRexStats, fetchLeadTimestamps } from "../../lib/rex-stats";
import { fetchRecentOrders } from "../../lib/woo-client";
import type { WooOrder } from "../../lib/woo-client";
import { verifySessionToken, COOKIE_NAME } from "../../lib/auth";
import { loadClients } from "../../lib/clients";
import { listDirectoryUsers } from "../../lib/user-directory";
import { productsFromDashboardUrl, ALL_PRODUCTS } from "../../lib/user-products";
import SaabaiAppShell from "../components/SaabaiAppShell";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface AttributedOrder {
  id: number;
  number: string;
  date: string;
  customerName: string;
  total: number;
  currency: string;
  items: string[];
  leadTimestamp?: string;
  matchMethod?: "email" | "name" | "account";
}

export interface AttributionStats {
  totalOrders: number;
  totalRevenue: number;
  attributedOrders: number;
  attributedRevenue: number;
  orders: AttributedOrder[];
  attributed: AttributedOrder[];
  trackingFrom: string | null;
}

function hashEmail(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

function normName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function toAttributedOrder(o: WooOrder, leadTimestamp?: string, matchMethod?: "email" | "name" | "account"): AttributedOrder {
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

export default async function RexDashboardPage() {
  // Auth check + user info for the shell
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login?redirect=/rex-dashboard");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/rex-dashboard");

  const { clientId } = session;

  let userName = "User";
  let userEmail = "";
  let userProducts: ReturnType<typeof productsFromDashboardUrl> = [];

  const envClient = loadClients().find((c) => c.id === clientId);
  if (envClient) {
    userName = envClient.name;
    userEmail = envClient.email;
    userProducts = productsFromDashboardUrl(envClient.dashboardUrl);
  } else {
    const allUsers = await listDirectoryUsers();
    const dirUser = allUsers.find((u) => u.id === clientId);
    if (dirUser) {
      userName = dirUser.name;
      userEmail = dirUser.email;
      userProducts = productsFromDashboardUrl(dirUser.dashboardUrl);
    }
  }

  const productInfos = userProducts.map((id) => ALL_PRODUCTS[id]);

  async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      p,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
    ]);
  }

  // Each source gets its own timeout. WooCommerce paginates many pages so
  // it gets a longer window; Redis calls are fast so 10s is plenty.
  const [statsResult, ordersResult, leadTsResult] = await Promise.allSettled([
    withTimeout(fetchRexStats(), 10_000),
    withTimeout(fetchRecentOrders(365), 28_000),
    withTimeout(fetchLeadTimestamps(), 10_000),
  ]);

  const { buildEmptyRexStats } = await import("./empty-fallback");
  const stats = statsResult.status === "fulfilled" ? statsResult.value : buildEmptyRexStats();
  const orders = ordersResult.status === "fulfilled" ? ordersResult.value : [];
  const leadTs = leadTsResult.status === "fulfilled" ? leadTsResult.value : { byEmailHash: {}, byName: {}, byWooCustomerId: {} };

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

    if (o.billing.email) {
      const hash = hashEmail(o.billing.email);
      const ts = emailTsMap[hash];
      if (ts && orderDate >= new Date(ts)) {
        attributed.push(toAttributedOrder(o, ts, "email"));
        continue;
      }
    }

    const billing = [o.billing.first_name, o.billing.last_name].filter(Boolean).join(" ");
    const billingNorm = normName(billing);
    if (billingNorm.includes(" ")) {
      const ts = nameTsMap[billingNorm];
      if (ts && orderDate >= new Date(ts)) {
        attributed.push(toAttributedOrder(o, ts, "name"));
        continue;
      }
    }

    if (o.customer_id > 0) {
      const ts = leadTs.byWooCustomerId[String(o.customer_id)];
      if (ts && orderDate >= new Date(ts)) {
        attributed.push(toAttributedOrder(o, ts, "account"));
      }
    }
  }

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

  return (
    <SaabaiAppShell
      userName={userName}
      userEmail={userEmail}
      products={productInfos}
    >
      <DashboardClient stats={stats} attribution={attribution} />
    </SaabaiAppShell>
  );
}
