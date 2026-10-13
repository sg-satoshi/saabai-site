/**
 * What counts as real revenue on the admin dashboard: money actually collected
 * in Stripe live mode. Test-mode sessions, manual drafts and unpaid or expired
 * subscriptions are never counted.
 */
export function isLiveCheckoutRef(ref: string | null | undefined): boolean {
  return typeof ref === "string" && ref.startsWith("cs_live_");
}

/** A Blueprint engagement counts only if it came from a live Stripe Checkout Session. */
export function isLiveBlueprintEngagement(e: { stripeRef?: string | null }): boolean {
  return isLiveCheckoutRef(e.stripeRef);
}

export type RevenueOrder = { kind: string; revenueCents?: number | null };

export const KIND_LABELS: Record<string, string> = {
  blueprint: "Blueprint",
  website_care: "Web/Care",
  lex_subscription: "Lex",
};

/** Sum live revenue and per-kind paid-order counts for the dashboard. Only kinds with sales appear. */
export function summariseRevenue(orders: RevenueOrder[]): {
  revenueCents: number;
  paidCount: number;
  byKind: { kind: string; label: string; count: number; cents: number }[];
} {
  const map = new Map<string, { count: number; cents: number }>();
  let revenueCents = 0;
  let paidCount = 0;
  for (const o of orders) {
    const cents = o.revenueCents || 0;
    if (cents <= 0) continue;
    revenueCents += cents;
    paidCount += 1;
    const m = map.get(o.kind) ?? { count: 0, cents: 0 };
    m.count += 1;
    m.cents += cents;
    map.set(o.kind, m);
  }
  const byKind = [...map.entries()]
    .map(([kind, v]) => ({ kind, label: KIND_LABELS[kind] ?? kind, ...v }))
    .sort((a, b) => b.cents - a.cents);
  return { revenueCents, paidCount, byKind };
}

/** "Web/Care $100 · Blueprint $500", or "No sales yet". */
export function revenueBreakdownLabel(byKind: { label: string; cents: number }[]): string {
  if (!byKind.length) return "No sales yet";
  return byKind.map((k) => `${k.label} $${(k.cents / 100).toLocaleString("en-AU")}`).join(" · ");
}
