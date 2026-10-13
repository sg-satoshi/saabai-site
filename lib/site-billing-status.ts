/**
 * Derive a per-site billing status for the Site Factory list from:
 *  - Stripe subscriptions (matched by metadata.siteId/slug, then custom domain or
 *    business name appearing in the description / customer name / email domain)
 *  - the site's own care-plan record (site.billing in Redis)
 * Pure functions so they run on the client and in tests.
 */

export type BillingState = "active" | "past_due" | "paused" | "cancelled" | "none";

export interface BillingSubSummary {
  status: string; // raw Stripe status
  siteId?: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  amount?: number; // cents per interval
  interval?: string;
}

export interface BillingSiteInput {
  id: string;
  slug: string;
  name?: string;
  domains?: string[];
  billing?: { amount?: number; status?: string };
}

export interface SiteBillingStatus {
  state: BillingState;
  source: "stripe" | "care-plan" | null;
  amount?: number;
  interval?: string;
}

export const BILLING_LABELS: Record<BillingState, string> = {
  active: "Active",
  past_due: "Past due",
  paused: "Paused",
  cancelled: "Cancelled",
  none: "No billing",
};

const RANK: Record<BillingState, number> = { active: 4, past_due: 3, paused: 2, cancelled: 1, none: 0 };

export function stripeToState(status: string): BillingState {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
    case "incomplete_expired":
      return "cancelled";
    default:
      return "none";
  }
}

const norm = (s: string) => s.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[^a-z0-9.]+/g, "");
const bare = (d: string) => norm(d).replace(/\/.*$/, "");

export function subMatchesSite(sub: BillingSubSummary, site: BillingSiteInput): boolean {
  const ids = [site.id, site.slug, site.id.replace(/^legacy_/, "")].map((x) => x.toLowerCase());
  if (sub.siteId && ids.includes(sub.siteId.toLowerCase())) return true;
  if (sub.siteId) return false; // explicitly linked to another site
  const hay = norm(`${sub.description || ""} ${sub.customerName || ""}`);
  const emailDomain = (sub.customerEmail || "").split("@")[1]?.toLowerCase() || "";
  for (const d of site.domains || []) {
    const b = bare(d);
    if (!b) continue;
    if (hay.includes(b) || emailDomain === b) return true;
  }
  const name = norm(site.name || "");
  return name.length >= 6 && hay.includes(name);
}

export function computeSiteBilling(site: BillingSiteInput, subs: BillingSubSummary[]): SiteBillingStatus {
  let best: SiteBillingStatus = { state: "none", source: null };
  for (const sub of subs) {
    if (!subMatchesSite(sub, site)) continue;
    const state = stripeToState(sub.status);
    if (RANK[state] > RANK[best.state]) best = { state, source: "stripe", amount: sub.amount, interval: sub.interval };
  }
  const care = site.billing;
  if (care?.amount && care.amount > 0) {
    const s = (care.status || "active").toLowerCase();
    const state: BillingState = s === "paused" ? "paused" : s === "cancelled" ? "cancelled" : "active";
    if (RANK[state] > RANK[best.state]) best = { state, source: "care-plan", amount: care.amount, interval: "month" };
  }
  return best;
}
