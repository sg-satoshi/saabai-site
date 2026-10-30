/** Client-safe Lex document allowance helpers (no store access). */
export const FIRM_PLAN_MONTHLY_DOCS = 20;
export const DOC_WARN_AT = 16;
/** basis: "billing" = Stripe period, "trial" = 30-day trial window, "month" = fallback Brisbane calendar month. */
export type DocUsage = { used: number; cap: number; periodStart: string; resetsOn: string; warnAt: number; basis: "billing" | "trial" | "month" };

/** "1 December 2026", in Brisbane time. Accepts an ISO date or date-time. */
export function resetDateLabel(iso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + "T00:00:00+10:00") : new Date(iso);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" });
}
