/**
 * Per-coupon reporting: READ-ONLY draft. Off by default via flag.
 * Aggregates Redemption records already parsed from completed sessions. No Stripe calls or writes.
 */
import type { Redemption } from "./core";

export const COUPON_REPORT_FLAG = "COUPON_REPORT_ENABLED";
export const couponReportEnabled = (env: Record<string, string | undefined> = process.env) => env[COUPON_REPORT_FLAG] === "1";

export interface CouponReportRow { code: string; uses: number; discountCents: number }

export function couponReport(rows: (Redemption | null | undefined)[]): CouponReportRow[] {
  const by = new Map<string, CouponReportRow>();
  for (const r of rows) {
    if (!r) continue;
    const code = (r.code || r.promotionCodeId || r.couponId || "unknown").toUpperCase();
    const row = by.get(code) ?? { code, uses: 0, discountCents: 0 };
    row.uses += 1;
    row.discountCents += Math.max(0, Math.round(r.discountCents || 0));
    by.set(code, row);
  }
  return [...by.values()].sort((a, b) => b.discountCents - a.discountCents || b.uses - a.uses || a.code.localeCompare(b.code));
}
