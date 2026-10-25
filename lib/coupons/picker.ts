/**
 * Payments coupon picker: pure helpers (no Stripe calls) that turn a Stripe promotion code
 * (coupon expanded) into the small, safe shape the admin Payments picker needs.
 */
import { codeStartsAt } from "./core";

export interface PickerPromo {
  id: string;
  code: string;
  active: boolean;
  expires_at?: number | null;
  max_redemptions?: number | null;
  times_redeemed: number;
  metadata?: Record<string, string> | null;
  promotion?: { coupon?: string | PickerCoupon | null } | null;
}
interface PickerCoupon {
  percent_off?: number | null;
  amount_off?: number | null;
  duration?: string | null;
  duration_in_months?: number | null;
  metadata?: Record<string, string> | null;
  applies_to?: { products?: string[] } | null;
}

export interface PickerItem {
  id: string;
  code: string;
  /** "20STARTER - 20% off, recurring" */
  label: string;
  /** Unix start (future = scheduled). */
  startsAt: number | null;
  /** selectable | scheduled (greyed, shows start) | product (greyed, only works via Sell) */
  state: "selectable" | "scheduled" | "product";
}

/** "20% off, recurring", "$50 off, once", "15% off for 3 months". */
export function couponSummary(c: PickerCoupon | null | undefined): string {
  const off = c?.percent_off != null ? `${+c.percent_off.toFixed(2)}% off` : c?.amount_off != null ? `$${(c.amount_off / 100).toFixed(2).replace(/\.00$/, "")} off` : "Discount";
  if (c?.duration === "forever") return `${off}, recurring`;
  if (c?.duration === "repeating" && c.duration_in_months) return `${off} for ${c.duration_in_months} month${c.duration_in_months === 1 ? "" : "s"}`;
  return `${off}, once`;
}

/** Picker entry for a promotion code, or null when it can't be used now or later (inactive, expired, used up). */
export function toPickerItem(pc: PickerPromo, nowMs = Date.now()): PickerItem | null {
  if (!pc.active) return null;
  if (pc.expires_at && pc.expires_at * 1000 < nowMs) return null;
  if (pc.max_redemptions && pc.times_redeemed >= pc.max_redemptions) return null;
  const c = pc.promotion?.coupon && typeof pc.promotion.coupon === "object" ? pc.promotion.coupon : null;
  const meta = { ...(c?.metadata ?? {}), ...(pc.metadata ?? {}) };
  const startsAt = codeStartsAt(meta);
  const scheduled = !!startsAt && startsAt * 1000 > nowMs;
  const restricted = c?.applies_to?.products ?? [];
  const scoped = restricted.length > 0; // same rule validate-coupon enforces for manual charges
  return {
    id: pc.id,
    code: pc.code,
    label: `${pc.code} - ${couponSummary(c)}`,
    startsAt: scheduled ? startsAt : null,
    state: scheduled ? "scheduled" : scoped ? "product" : "selectable",
  };
}

/** Selectable first, then scheduled, then product-only; alphabetical within each. */
export function pickerItems(promos: PickerPromo[], nowMs = Date.now()): PickerItem[] {
  const rank = { selectable: 0, scheduled: 1, product: 2 } as const;
  return promos
    .map((p) => toPickerItem(p, nowMs))
    .filter((x): x is PickerItem => !!x)
    .sort((a, b) => rank[a.state] - rank[b.state] || a.code.localeCompare(b.code));
}
