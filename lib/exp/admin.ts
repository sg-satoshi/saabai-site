import { expKey, ensureSeeded, getExperiments, writeExperiment } from "./config";
import { type Experiment } from "./core";
import { applyAction, variantRows, type Action, type MutationResult } from "./mutate";
import { analyse, daysSince, type Analysis, type VariantCounts } from "./stats";
import { serviceDb } from "./track";
import { SEED_EXPERIMENTS } from "./seed";

/** Sites the dashboard manages. Add a row when a client site joins split testing. */
export const EXP_SITES = [{ key: "saabai", label: "saabai.ai" }] as const;
export const isKnownSite = (k: string) => EXP_SITES.some((s) => s.key === k);
export { expKey };

type StatRow = { variant_key: string; impressions: number; cta_clicks: number; enquiries: number; calls: number; converters: number };
type DailyRow = { day: string; variant_key: string; impressions: number; converters: number };
type ByRow = { variant_key: string; bucket: string; impressions: number; cta_clicks: number; converters: number };

export type Breakdown = { dim: "channel" | "utm_source" | "utm_campaign"; rows: { bucket: string; views: number; ctaClicks: number; conversions: number; rate: number; perVariant: Record<string, { views: number; conversions: number }> }[] };

export type ExperimentView = {
  experiment: Experiment;
  analysis: Analysis;
  daysRunning: number;
  totals: { views: number; ctaClicks: number; calls: number; enquiries: number; conversions: number; rate: number };
  daily: { day: string; views: number; conversions: number }[];
  breakdowns: Breakdown[];
  dataAvailable: boolean;
};

const n = (x: unknown) => Number(x) || 0;

export async function listExperiments(siteKey: string): Promise<Experiment[]> {
  await ensureSeeded(siteKey);
  const list = await getExperiments(siteKey, { fresh: true });
  return list.map((e) => ({ ...e, name: e.name ?? SEED_EXPERIMENTS.find((s) => s.id === e.id)?.name ?? e.id }));
}

export async function loadView(exp: Experiment): Promise<ExperimentView> {
  const db = serviceDb();
  let stats: StatRow[] = [], daily: DailyRow[] = [];
  let by: Record<string, ByRow[]> = {};
  let dataAvailable = false;
  if (db) {
    const [s, d, c, u, k] = await Promise.all([
      db.rpc("exp_stats", { p_experiment: exp.id }),
      db.rpc("exp_stats_daily", { p_experiment: exp.id }),
      db.rpc("exp_stats_by", { p_experiment: exp.id, p_dim: "channel" }),
      db.rpc("exp_stats_by", { p_experiment: exp.id, p_dim: "utm_source" }),
      db.rpc("exp_stats_by", { p_experiment: exp.id, p_dim: "utm_campaign" }),
    ]);
    if (!s.error) { stats = (s.data ?? []) as StatRow[]; dataAvailable = true; }
    daily = (d.data ?? []) as DailyRow[];
    by = { channel: (c.data ?? []) as ByRow[], utm_source: (u.data ?? []) as ByRow[], utm_campaign: (k.data ?? []) as ByRow[] };
  }
  const byId = new Map(stats.map((r) => [r.variant_key, r]));
  const counts: VariantCounts[] = exp.variants.map((v) => {
    const r = byId.get(v.id);
    return { id: v.id, label: `${v.id.toUpperCase()}${v.id === exp.defaultVariantId ? " (control)" : ""}`, active: v.active, isDefault: v.id === exp.defaultVariantId,
      impressions: n(r?.impressions), ctaClicks: n(r?.cta_clicks), calls: n(r?.calls), enquiries: n(r?.enquiries), converters: n(r?.converters) };
  });
  const first = daily.map((r) => r.day).sort()[0];
  const daysRunning = daysSince(first);
  const analysis = analyse(counts, daysRunning, exp.defaultVariantId);
  const sum = (f: (v: VariantCounts) => number) => counts.reduce((s, v) => s + f(v), 0);
  const views = sum((v) => v.impressions), conversions = sum((v) => v.converters);
  const dayMap = new Map<string, { views: number; conversions: number }>();
  for (const r of daily) {
    const cur = dayMap.get(r.day) ?? { views: 0, conversions: 0 };
    cur.views += n(r.impressions); cur.conversions += n(r.converters);
    dayMap.set(r.day, cur);
  }
  const breakdowns: Breakdown[] = (["channel", "utm_source", "utm_campaign"] as const).map((dim) => {
    const m = new Map<string, Breakdown["rows"][number]>();
    for (const r of by[dim] ?? []) {
      const cur = m.get(r.bucket) ?? { bucket: r.bucket, views: 0, ctaClicks: 0, conversions: 0, rate: 0, perVariant: {} };
      cur.views += n(r.impressions); cur.ctaClicks += n(r.cta_clicks); cur.conversions += n(r.converters);
      cur.perVariant[r.variant_key] = { views: n(r.impressions), conversions: n(r.converters) };
      m.set(r.bucket, cur);
    }
    const rows = [...m.values()].map((x) => ({ ...x, rate: x.views ? x.conversions / x.views : 0 })).sort((a, b) => b.views - a.views).slice(0, 25);
    return { dim, rows };
  });
  return {
    experiment: exp, analysis, daysRunning, dataAvailable,
    totals: { views, ctaClicks: sum((v) => v.ctaClicks), calls: sum((v) => v.calls), enquiries: sum((v) => v.enquiries), conversions, rate: views ? conversions / views : 0 },
    daily: [...dayMap.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).slice(-30).map(([day, v]) => ({ day, ...v })),
    breakdowns,
  };
}

export async function loadAudit(expId: string) {
  const db = serviceDb();
  if (!db) return [];
  const { data } = await db.rpc("exp_audit_list", { p_experiment: expId, p_limit: 30 });
  return (data ?? []) as { id: number; actor: string; action: string; detail: Record<string, unknown>; created_at: string }[];
}

export type ApplyOutcome = MutationResult | { ok: false; error: string; status: number };

/**
 * Applies a dashboard action. Order: validate, check revision, write Supabase (allow-list + audit, atomic), then Redis (what visitors see).
 * If Supabase fails nothing changes. If Redis fails after Supabase, the caller sees an error and can retry.
 */
export async function applyDashboardAction(siteKey: string, expId: string, action: Action, expectedRev: number | undefined, actor: string): Promise<ApplyOutcome> {
  const db = serviceDb();
  if (!db) return { ok: false, error: "The experiments database isn't configured.", status: 503 };
  const list = await listExperiments(siteKey);
  const cur = list.find((e) => e.id === expId);
  if (!cur) return { ok: false, error: "Experiment not found.", status: 404 };
  if (expectedRev !== undefined && (cur.rev ?? 0) !== expectedRev) return { ok: false, error: "Someone changed this test since you opened it. Refresh and try again.", status: 409 };
  let a = action;
  const res = applyAction(cur, a);
  if (!res.ok) return res;
  if (action.type === "make_winner") {
    const view = await loadView(cur);
    res.detail.evidence = { verdict: view.analysis.verdict.kind, probBest: Number(view.analysis.verdict.probBest.toFixed(3)), daysRunning: view.daysRunning, views: view.totals.views, conversions: view.totals.conversions };
  }
  const e = res.exp;
  const { error } = await db.rpc("exp_admin_apply", {
    p_key: e.id, p_site: e.siteKey, p_slot: e.slot, p_name: e.name ?? e.id, p_status: e.status, p_lead: e.leadValueAUD ?? null,
    p_variants: variantRows(e), p_actor: actor, p_action: res.action, p_detail: res.detail,
  });
  if (error) return { ok: false, error: "Couldn't save the change (database). Nothing was changed.", status: 502 };
  try { await writeExperiment(e); } catch { return { ok: false, error: "Saved to the log but couldn't publish to the live site. Please try again.", status: 502 }; }
  return res;
}
