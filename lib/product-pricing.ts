/**
 * Pure pricing + discount maths. NO server imports (Redis/Stripe) so this can be
 * used from client components AND server routes AND the future checkout — the
 * was/now/save numbers are then identical everywhere.
 */

export type DiscountKind = "percent" | "fixed";
export type FeeKey = "setup" | "recurring" | "one_time";

export interface ProductDiscount {
  kind: DiscountKind;
  value: number; // percent: 1-100 · fixed: cents off
  appliesTo: FeeKey[];
  endDate?: string; // YYYY-MM-DD; inclusive of that day
  label?: string;
}

/** Is the discount configured and not past its end date? */
export function isDiscountActive(d?: ProductDiscount | null): boolean {
  if (!d || !d.value || !d.appliesTo || d.appliesTo.length === 0) return false;
  if (d.endDate) {
    const end = new Date(d.endDate + "T23:59:59");
    if (!Number.isNaN(end.getTime()) && end.getTime() < Date.now()) return false;
  }
  return true;
}

/** Apply the discount to a single amount (cents). Never below zero. */
export function applyDiscount(amountCents: number, d: ProductDiscount): number {
  if (d.kind === "percent") {
    return Math.max(0, Math.round(amountCents * (1 - d.value / 100)));
  }
  return Math.max(0, amountCents - Math.round(d.value));
}

export interface FeeDisplay {
  original: number; // cents
  discounted: number; // cents (== original when not discounted)
  isDiscounted: boolean;
  saveCents: number;
  savePercent: number;
}

/** Compute was/now/save for one fee, honouring whether the discount applies to it. */
export function feeDisplay(key: FeeKey, original: number, d?: ProductDiscount | null): FeeDisplay {
  const active = isDiscountActive(d) && d!.appliesTo.includes(key);
  if (!active || original <= 0) {
    return { original, discounted: original, isDiscounted: false, saveCents: 0, savePercent: 0 };
  }
  const discounted = applyDiscount(original, d!);
  const saveCents = original - discounted;
  return {
    original,
    discounted,
    isDiscounted: saveCents > 0,
    saveCents,
    savePercent: Math.round((saveCents / original) * 100),
  };
}
