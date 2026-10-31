import type { StoredReview } from "./types";

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Same reviewer, and the same text or the same opening of a longer copy. */
export function sameReview(a: { name: string; text: string }, b: { name: string; text: string }): boolean {
  if (norm(a.name) !== norm(b.name)) return false;
  const left = norm(a.text);
  const right = norm(b.text);
  if (left === right) return true;
  const n = Math.min(80, left.length, right.length);
  return n >= 40 && left.slice(0, n) === right.slice(0, n);
}

/**
 * Keep every stored review, in order. Append a new review only when it is 4 or 5
 * stars and not already in the list.
 */
export function mergeReviews(existing: readonly StoredReview[], incoming: readonly StoredReview[]): StoredReview[] {
  const out = existing.map((review) => ({ ...review }));
  for (const review of incoming) {
    const stars = Number(review.stars);
    if (!Number.isFinite(stars) || stars < 4 || stars > 5) continue;
    const name = review.name.trim();
    const text = review.text.trim();
    if (!name || !text) continue;
    const next: StoredReview = { name, stars: Math.round(stars), text, ...(review.date ? { date: review.date } : {}) };
    if (out.some((have) => sameReview(have, next))) continue;
    out.push(next);
  }
  return out;
}
