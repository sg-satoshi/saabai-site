/**
 * Per-coupon reporting. Read only. Off unless COUPON_REPORT_ENABLED is "1" or "true".
 * Aggregates Redemption records already saved from completed checkouts. No Stripe calls or writes.
 */
import type { Redemption } from "./core";

export const COUPON_REPORT_FLAG = "COUPON_REPORT_ENABLED";

export function couponReportEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = (env[COUPON_REPORT_FLAG] ?? "").trim().toLowerCase();
  return v === "1" || v === "true";
}

export interface CouponReportRow { code: string; uses: number; discountCents: number }

export interface CouponReportPayload {
  rows: CouponReportRow[];
  codes: number;
  uses: number;
  discountCents: number;
}

export function couponReport(rows: (Redemption | null | undefined)[]): CouponReportRow[] {
  const by = new Map<string, CouponReportRow>();
  for (const r of rows) {
    if (!r) continue;
    const code = (r.code || r.promotionCodeId || r.couponId || "unknown").trim().toUpperCase() || "UNKNOWN";
    const row = by.get(code) ?? { code, uses: 0, discountCents: 0 };
    row.uses += 1;
    row.discountCents += Math.max(0, Math.round(Number(r.discountCents) || 0));
    by.set(code, row);
  }
  return [...by.values()].sort((a, b) => b.discountCents - a.discountCents || b.uses - a.uses || a.code.localeCompare(b.code));
}

export function summariseCouponReport(rows: CouponReportRow[]): CouponReportPayload {
  return {
    rows,
    codes: rows.length,
    uses: rows.reduce((n, r) => n + r.uses, 0),
    discountCents: rows.reduce((n, r) => n + r.discountCents, 0),
  };
}

/** Case-insensitive code filter. Blank query returns every row. */
export function filterCouponReport(rows: CouponReportRow[], query: string): CouponReportRow[] {
  const q = query.trim().toUpperCase();
  if (!q) return rows;
  return rows.filter((r) => r.code.includes(q));
}

/** Checkout event that already stored a parsed redemption (meta.coupon / meta.discountCents). */
export interface StoredCouponEvent {
  refId?: string;
  contactId?: string;
  meta?: Record<string, unknown> | null;
}

/** Blueprint order that already stored couponCode / discountCents. */
export interface StoredCouponOrder {
  stripeRef?: string;
  contactEmail?: string;
  couponCode?: string;
  discountCents?: number;
}

/** Care plan site record. Only the latest code is stored. */
export interface StoredCouponBilling {
  contactEmail?: string;
  couponCode?: string;
  discountCents?: number;
  checkoutSessionId?: string;
}

function text(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function email(v: unknown): string {
  return text(v).toLowerCase();
}

function cents(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function looseKey(addr: string, code: string, discount: number): string {
  return `${addr}|${code.toUpperCase()}|${discount}`;
}

/**
 * One Redemption per checkout. The same session saved on an event and a Blueprint
 * order is kept once (the event). A care plan row is skipped when that email,
 * code and discount were already counted.
 */
export function collectStoredRedemptions(src: {
  events?: StoredCouponEvent[];
  engagements?: StoredCouponOrder[];
  billing?: StoredCouponBilling[];
}): Redemption[] {
  const out: Redemption[] = [];
  const seenRef = new Set<string>();
  const seenLoose = new Set<string>();

  const remember = (ref: string, addr: string, code: string, discount: number) => {
    if (ref) seenRef.add(ref);
    if (addr && code) seenLoose.add(looseKey(addr, code, discount));
  };

  for (const e of src.events ?? []) {
    const code = text(e.meta?.coupon);
    const discount = cents(e.meta?.discountCents);
    if (!code && discount <= 0) continue;
    const ref = text(e.refId);
    if (ref && seenRef.has(ref)) continue;
    remember(ref, email(e.contactId), code, discount);
    out.push({ code: code || undefined, discountCents: discount });
  }

  for (const o of src.engagements ?? []) {
    const code = text(o.couponCode);
    const discount = cents(o.discountCents);
    if (!code && discount <= 0) continue;
    const ref = text(o.stripeRef);
    if (ref && seenRef.has(ref)) continue;
    const addr = email(o.contactEmail);
    if (!ref && addr && code && seenLoose.has(looseKey(addr, code, discount))) continue;
    remember(ref, addr, code, discount);
    out.push({ code: code || undefined, discountCents: discount });
  }

  for (const b of src.billing ?? []) {
    const code = text(b.couponCode);
    const discount = cents(b.discountCents);
    if (!code && discount <= 0) continue;
    const ref = text(b.checkoutSessionId);
    if (ref && seenRef.has(ref)) continue;
    const addr = email(b.contactEmail);
    if (addr && code && seenLoose.has(looseKey(addr, code, discount))) continue;
    remember(ref, addr, code, discount);
    out.push({ code: code || undefined, discountCents: discount });
  }

  return out;
}

/**
 * Gate for the report API. Flag off and signed-out callers get no rows.
 * Check auth before the flag so a signed-out caller cannot tell the flag state from a 404.
 */
export function couponReportHttp(input: { authed: boolean; enabled: boolean; rows: CouponReportRow[] }): { status: number; body: { error: string } | CouponReportPayload } {
  if (!input.authed) return { status: 403, body: { error: "Forbidden" } };
  if (!input.enabled) return { status: 404, body: { error: "Not found" } };
  return { status: 200, body: summariseCouponReport(input.rows) };
}
