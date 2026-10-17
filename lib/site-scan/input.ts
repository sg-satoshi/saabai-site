import type { Input } from "./types";
const s = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[<>]/g, "").trim().slice(0, n) : "");
const num = (v: unknown, lo: number, hi: number) => { const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN; return Number.isFinite(n) && n >= lo && n <= hi ? n : undefined; };
export function cleanInput(b: Record<string, unknown>, admin: boolean): Input {
  const i: Input = { name: s(b.name, 80) || undefined, industry: s(b.industry, 60) || undefined, suburb: s(b.suburb, 60) || undefined, goal: s(b.goal, 40) || undefined };
  const g = b.gbp as Record<string, unknown> | undefined;
  if (admin && g && typeof g === "object") {
    const gbp = { rating: num(g.rating, 1, 5), reviews: num(g.reviews, 0, 100000), newestDaysAgo: num(g.newestDaysAgo, 0, 3650) };
    if (gbp.rating !== undefined || gbp.reviews !== undefined) i.gbp = gbp;
  }
  return i;
}
