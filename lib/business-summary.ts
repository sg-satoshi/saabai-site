/**
 * Pure helpers for the admin "Business health" panel. No I/O, unit tested.
 * The route (/api/admin/business-summary) gathers raw data and calls these.
 */

export interface SubLike {
  status: string;
  livemode: boolean;
  items: { unitAmount: number | null; quantity: number; interval: string | null; intervalCount: number }[];
}

/** Monthly value of one subscription in cents (yearly / 12, weekly * 52 / 12). */
export function monthlyCents(sub: SubLike): number {
  let total = 0;
  for (const it of sub.items) {
    const amt = (it.unitAmount ?? 0) * (it.quantity || 1);
    const n = it.intervalCount || 1;
    if (it.interval === "month") total += amt / n;
    else if (it.interval === "year") total += amt / (12 * n);
    else if (it.interval === "week") total += (amt * 52) / (12 * n);
    else if (it.interval === "day") total += (amt * 365) / (12 * n);
  }
  return Math.round(total);
}

const MRR_STATUSES = new Set(["active", "past_due", "trialing"]);
const PAST_DUE_STATUSES = new Set(["past_due", "unpaid"]);

export function summariseSubscriptions(subs: SubLike[]) {
  const live = subs.filter((s) => s.livemode);
  const paying = live.filter((s) => MRR_STATUSES.has(s.status));
  return {
    mrrCents: paying.reduce((s, x) => s + monthlyCents(x), 0),
    activeCount: paying.length,
    pastDueCount: live.filter((s) => PAST_DUE_STATUSES.has(s.status)).length,
    pastDueCents: live.filter((s) => PAST_DUE_STATUSES.has(s.status)).reduce((s, x) => s + monthlyCents(x), 0),
  };
}

export function summariseSiteBilling(records: { status: string }[]) {
  const count = (st: string[]) => records.filter((r) => st.includes(r.status)).length;
  return {
    paused: count(["paused"]),
    failing: count(["payment_failed", "past_due"]),
    pendingLinks: count(["pending", "link_expired"]),
  };
}

export function summariseInvoices(invoices: { status: string; total: number }[]) {
  const overdue = invoices.filter((i) => i.status === "overdue");
  const unpaid = invoices.filter((i) => i.status === "unpaid");
  const cents = (xs: { total: number }[]) => xs.reduce((s, i) => s + Math.round((i.total || 0) * 100), 0);
  return { overdueCount: overdue.length, overdueCents: cents(overdue), unpaidCount: unpaid.length, unpaidCents: cents(unpaid) };
}

export function countRecentLeads(leads: { createdAt?: unknown }[], now = Date.now(), days = 7): number {
  const since = now - days * 86400000;
  return leads.filter((l) => {
    const t = typeof l.createdAt === "number" ? l.createdAt : Date.parse(String(l.createdAt ?? ""));
    return Number.isFinite(t) && t >= since;
  }).length;
}

const CLOSED_REQUEST = new Set(["done"]);
export function countOpenRequests(reqs: { status: string }[]) {
  const open = reqs.filter((r) => !CLOSED_REQUEST.has(r.status));
  return {
    open: open.length,
    awaitingClient: open.filter((r) => r.status === "awaiting_client").length,
    isNew: open.filter((r) => r.status === "new" || r.status === "received").length,
  };
}
