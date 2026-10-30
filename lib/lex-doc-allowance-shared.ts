/** Client-safe Lex document allowance helpers (no store access). */
export const FIRM_PLAN_MONTHLY_DOCS = 20;
export const DOC_WARN_AT = 16;
export type DocUsage = { used: number; cap: number; month: string; resetsOn: string; warnAt: number };

/** "1 December 2026" */
export function resetDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
