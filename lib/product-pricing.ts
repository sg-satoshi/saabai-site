/**
 * Pure pricing + discount maths. NO server imports (Redis/Stripe) so this can be
 * used from client components AND server routes AND the future checkout — the
 * was/now/save numbers are then identical everywhere.
 *
 * A product may carry a SEPARATE discount per fee (setup vs recurring vs one-time),
 * stored in `discounts`. Older products carry a single `discount` (one value across
 * the ticked fees); `normalizeDiscounts` reads either.
 */

export type DiscountKind = "percent" | "fixed";
export type FeeKey = "setup" | "recurring" | "one_time";

/** A discount targeting exactly one fee. */
export interface FeeDiscount {
  appliesTo: FeeKey;
  kind: DiscountKind;
  value: number; // percent 1-100 · fixed: cents off
  endDate?: string; // YYYY-MM-DD; inclusive of that day
  label?: string;
}

/** Legacy single-discount shape (one value across `appliesTo` fees). Still read from old records. */
export interface ProductDiscount {
  kind: DiscountKind;
  value: number;
  appliesTo: FeeKey[];
  endDate?: string;
  label?: string;
}

/** Not past its end date? */
export function isActiveOn(endDate?: string): boolean {
  if (!endDate) return true;
  const end = new Date(endDate + "T23:59:59");
  if (!Number.isNaN(end.getTime()) && end.getTime() < Date.now()) return false;
  return true;
}

/** Apply a discount to a single amount (cents). Never below zero. */
export function applyDiscount(amountCents: number, kind: DiscountKind, value: number): number {
  if (kind === "percent") return Math.max(0, Math.round(amountCents * (1 - value / 100)));
  return Math.max(0, amountCents - Math.round(value));
}

/** Read a product's per-fee discounts, expanding a legacy single discount if needed. */
export function normalizeDiscounts(src: { discounts?: FeeDiscount[]; discount?: ProductDiscount | null }): FeeDiscount[] {
  if (src.discounts && src.discounts.length) return src.discounts;
  const d = src.discount;
  if (d && d.appliesTo && d.appliesTo.length) {
    return d.appliesTo.map((fee) => ({ appliesTo: fee, kind: d.kind, value: d.value, endDate: d.endDate, label: d.label }));
  }
  return [];
}

export interface FeeDisplay {
  original: number; // cents
  discounted: number; // cents (== original when not discounted)
  isDiscounted: boolean;
  saveCents: number;
  savePercent: number;
  label?: string;
  endDate?: string;
}

/** Compute was/now/save for one fee from a product's per-fee discount list. */
export function feeDisplay(key: FeeKey, original: number, discounts?: FeeDiscount[] | null): FeeDisplay {
  const d = (discounts || []).find((x) => x.appliesTo === key && x.value > 0 && isActiveOn(x.endDate));
  if (!d || original <= 0) {
    return { original, discounted: original, isDiscounted: false, saveCents: 0, savePercent: 0 };
  }
  const discounted = applyDiscount(original, d.kind, d.value);
  const saveCents = original - discounted;
  return {
    original,
    discounted,
    isDiscounted: saveCents > 0,
    saveCents,
    savePercent: Math.round((saveCents / original) * 100),
    label: d.label,
    endDate: d.endDate,
  };
}
