/** Number fields that can be empty or partial ("", "1.", ".5") while typing. */

/** The number a typed value stands for. Empty or partial input counts as 0 until it is finished. */
export function numFromText(text: string): number {
  const n = parseFloat(text);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Text to show for a stored number when the field is not being edited. 0 shows as empty. */
export function textFromNum(n: number | undefined): string {
  return n ? String(n) : "";
}

/**
 * What the field shows: the typed text while it still means the stored number, otherwise the stored
 * number (it was changed elsewhere, e.g. switching line type or loading an invoice).
 */
export function numFieldText(typed: string | undefined, stored: number | undefined): string {
  return typed !== undefined && numFromText(typed) === (stored || 0) ? typed : textFromNum(stored);
}

/** Line total: fixed lines use their own total, hourly lines hours x rate, rounded to cents. */
export function lineTotal(item: { type?: string; hours?: number; rate?: number; total?: number }): number {
  if (item.type === "fixed") return item.total || 0;
  return parseFloat(((item.hours || 0) * (item.rate || 0)).toFixed(2));
}
