/**
 * Experiment statistics, pure and dependency free (safe for tests and for the dashboard API).
 * Metric: a "conversion" is a visitor who sent an enquiry or tapped to call. Rate = converters / views.
 * Each variant gets a Beta(1 + conversions, 1 + non-conversions) posterior; P(best) and lift come from
 * Monte Carlo draws with a seeded RNG, so the same data always gives the same verdict (no jitter on refresh).
 */

export type VariantCounts = {
  id: string;
  label?: string;
  active?: boolean;
  isDefault?: boolean;
  impressions: number;
  ctaClicks: number;
  calls: number;
  enquiries: number;
  /** distinct visitors with an enquiry OR a call */
  converters: number;
};

/** Thresholds for declaring a winner. All must hold. */
export const WINNER_RULES = { probability: 0.95, minDays: 14, minViewsPerVariant: 300, minConversions: 10 } as const;
const DRAWS = 20000;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rng: () => number): number {
  const u = Math.max(rng(), 1e-12), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Marsaglia-Tsang gamma(shape, 1). */
function gamma(shape: number, rng: () => number): number {
  if (shape < 1) return gamma(shape + 1, rng) * Math.pow(Math.max(rng(), 1e-12), 1 / shape);
  const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do { x = normal(rng); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(Math.max(u, 1e-12)) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function betaSample(a: number, b: number, rng: () => number): number {
  const x = gamma(a, rng), y = gamma(b, rng);
  return x / (x + y);
}

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))];

export type VariantResult = VariantCounts & {
  rate: number;
  rateLow: number;
  rateHigh: number;
  probBest: number;
};

export type Verdict = {
  kind: "no_data" | "too_early" | "leading" | "winner";
  /** variant id of the leader (highest P(best)), when there is data */
  leaderId?: string;
  probBest: number;
  /** median relative lift of the leader over the control, with 90% interval */
  lift?: { median: number; low: number; high: number };
  /** reasons the winner rules are not yet met */
  missing: string[];
  headline: string;
  detail: string;
  /** true only when every winner rule holds and the leader is not already the control */
  canMakeWinner: boolean;
};

export type Analysis = { variants: VariantResult[]; verdict: Verdict };

const pct = (x: number, dp = 0) => `${(x * 100).toFixed(dp)}%`;
const nf = (n: number) => n.toLocaleString("en-AU");

function seedFrom(vs: VariantCounts[]): number {
  let h = 2166136261;
  for (const v of vs) for (const n of [v.impressions, v.converters, v.id.length]) { h ^= n + 0x9e37; h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * Analyse counts. `daysRunning` is the number of calendar days since the first recorded event.
 * Variants that are inactive and have no views are ignored.
 */
export function analyse(input: VariantCounts[], daysRunning: number, controlId?: string): Analysis {
  const vs = input.filter((v) => v.active !== false || v.impressions > 0);
  const totalViews = vs.reduce((s, v) => s + v.impressions, 0);
  const totalConv = vs.reduce((s, v) => s + v.converters, 0);
  const rng = mulberry32(seedFrom(vs));
  const draws: number[][] = vs.map((v) => {
    const s = Math.min(v.converters, v.impressions);
    const a = 1 + s, b = 1 + Math.max(0, v.impressions - s);
    return Array.from({ length: DRAWS }, () => betaSample(a, b, rng));
  });
  const wins = vs.map(() => 0);
  for (let i = 0; i < DRAWS; i++) {
    let best = 0;
    for (let k = 1; k < vs.length; k++) if (draws[k][i] > draws[best][i]) best = k;
    if (vs.length) wins[best]++;
  }
  const variants: VariantResult[] = vs.map((v, k) => {
    const sorted = [...draws[k]].sort((x, y) => x - y);
    return { ...v, rate: v.impressions ? v.converters / v.impressions : 0, rateLow: quantile(sorted, 0.05), rateHigh: quantile(sorted, 0.95), probBest: wins[k] / DRAWS };
  });

  const empty: Verdict = { kind: "no_data", probBest: 0, missing: [], headline: "No data yet", detail: "Nobody has seen this test yet. Results appear after the first real visitors.", canMakeWinner: false };
  if (!vs.length || totalViews === 0) return { variants, verdict: empty };

  let li = 0;
  variants.forEach((v, k) => { if (v.probBest > variants[li].probBest) li = k; });
  const leader = variants[li];
  const control = variants.find((v) => v.id === controlId) ?? variants.find((v) => v.isDefault) ?? variants[0];
  const label = (v: VariantResult) => v.label ?? `Variant ${v.id.toUpperCase()}`;

  let lift: Verdict["lift"];
  if (leader.id !== control.id) {
    const ci = vs.findIndex((v) => v.id === control.id);
    const ratios = draws[li].map((x, i) => x / draws[ci][i] - 1).sort((x, y) => x - y);
    lift = { median: quantile(ratios, 0.5), low: quantile(ratios, 0.05), high: quantile(ratios, 0.95) };
  }

  const missing: string[] = [];
  if (leader.probBest < WINNER_RULES.probability) missing.push(`needs ${pct(WINNER_RULES.probability)} confidence (now ${pct(leader.probBest)})`);
  if (daysRunning < WINNER_RULES.minDays) missing.push(`needs ${WINNER_RULES.minDays} days of data (now ${Math.max(0, daysRunning)})`);
  const thin = variants.filter((v) => v.impressions < WINNER_RULES.minViewsPerVariant);
  if (thin.length) missing.push(`every variant needs ${WINNER_RULES.minViewsPerVariant} views (${thin.map((v) => `${label(v)} has ${nf(v.impressions)}`).join(", ")})`);
  if (totalConv < WINNER_RULES.minConversions) missing.push(`needs ${WINNER_RULES.minConversions} conversions in total (now ${totalConv})`);

  const liftText = lift ? `, with an expected ${lift.median >= 0 ? "lift" : "change"} of ${pct(lift.median)} over the current one (could be anywhere from ${pct(lift.low)} to ${pct(lift.high)})` : "";

  if (!missing.length) {
    if (leader.id === control.id) {
      return { variants, verdict: { kind: "winner", leaderId: leader.id, probBest: leader.probBest, missing, headline: `${label(leader)} is the clear winner`, detail: `${label(leader)} (the current headline) is ${pct(leader.probBest)} likely to be the best, so there is nothing to switch.`, canMakeWinner: false } };
    }
    return { variants, verdict: { kind: "winner", leaderId: leader.id, probBest: leader.probBest, lift, missing, headline: `${label(leader)} is the winner`, detail: `${label(leader)} is ${pct(leader.probBest)} likely to be the best${liftText}. You can make it the live headline.`, canMakeWinner: true } };
  }

  if (leader.probBest >= 0.8 && totalConv >= 3) {
    return { variants, verdict: { kind: "leading", leaderId: leader.id, probBest: leader.probBest, lift, missing, headline: `${label(leader)} is leading, but it is too early to call`, detail: `${label(leader)} is ${pct(leader.probBest)} likely to be the best${liftText}. Not a winner yet: ${missing.join("; ")}.`, canMakeWinner: false } };
  }
  return { variants, verdict: { kind: "too_early", leaderId: leader.id, probBest: leader.probBest, missing, headline: "Too early to call", detail: `${nf(totalViews)} view${totalViews === 1 ? "" : "s"} and ${totalConv} conversion${totalConv === 1 ? "" : "s"} so far. On a site this size expect several weeks for a clear answer. Still needed: ${missing.join("; ")}.`, canMakeWinner: false } };
}

/** Calendar days between an ISO day (YYYY-MM-DD) and today, inclusive of the first day. */
export function daysSince(firstDay: string | undefined, today: Date = new Date()): number {
  if (!firstDay) return 0;
  const a = Date.parse(firstDay + "T00:00:00Z");
  const b = Date.parse(today.toISOString().slice(0, 10) + "T00:00:00Z");
  if (!Number.isFinite(a)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000) + 1);
}
