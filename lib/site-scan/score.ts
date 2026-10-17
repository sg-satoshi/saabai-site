import { CHECKS } from "./checks";
import { FIX_COPY, NO_SITE_FIX } from "./copy";
import type { Area, CheckDef, CheckResult, Fix, Input, OfferId, Rating, ScanReport } from "./types";

export const AREAS: Area[] = ["seo", "ai", "local"];
export const AREA_LABEL: Record<Area, string> = { seo: "Classic SEO", ai: "AI search readiness", local: "Local and reviews" };
export const RATING_LABEL: Record<Rating, string> = { critical: "Critical", important: "Important", nice: "Nice to have" };
export const DISCLAIMER = "These are readiness signals based on public information, not a promise of rankings.";

/** Hand-set overrides: a fail here is Critical whatever the weight. */
const CRITICAL_FAILS = new Set(["https", "indexable", "mobile", "ai_bots", "title_meta"]);

export function rate(def: Pick<CheckDef, "id" | "weight">, status: "fail" | "partial"): Rating {
  if (status === "fail" && (def.weight >= 6 || CRITICAL_FAILS.has(def.id))) return "critical";
  if (def.weight >= 4) return "important";
  return "nice";
}
const QUICK_MAX_MINS = 120;
export const isQuickWin = (rating: Rating, mins: number, dev: boolean) => rating !== "nice" && mins <= QUICK_MAX_MINS && !dev;

const pct = (e: number, a: number) => (a > 0 ? Math.round((e / a) * 100) : null);
const ORDER: Record<Rating, number> = { critical: 0, important: 1, nice: 2 };

export function buildReport(args: { id: string; domain: string; url: string; results: { def: CheckDef; r: CheckResult }[]; input: Input; now?: Date }): ScanReport {
  const { results } = args;
  const earned: Record<Area, number> = { seo: 0, ai: 0, local: 0 }, avail: Record<Area, number> = { seo: 0, ai: 0, local: 0 };
  const fixes: Fix[] = []; const unverified: ScanReport["unverified"] = []; const passed: ScanReport["passed"] = [];
  for (const { def, r } of results) {
    if (r.status === "unknown") { unverified.push({ id: def.id, label: def.label, why: r.found }); continue; }
    avail[def.area] += def.weight;
    if (r.status === "pass") { earned[def.area] += def.weight; passed.push({ id: def.id, label: def.label }); continue; }
    const half = r.status === "partial";
    if (half) earned[def.area] += def.weight / 2;
    const c = FIX_COPY[def.id]; const rating = rate(def, r.status);
    fixes.push({ id: def.id, label: def.label, area: def.area, status: r.status, rating, quickWin: isQuickWin(rating, c.mins, c.dev), found: r.found, meaning: c.meaning, fix: c.fix, time: c.time, offer: c.offer, pointsLost: half ? def.weight / 2 : def.weight });
  }
  fixes.sort((a, b) => ORDER[a.rating] - ORDER[b.rating] || b.pointsLost - a.pointsLost);
  const E = AREAS.reduce((n, a) => n + earned[a], 0), A = AREAS.reduce((n, a) => n + avail[a], 0);
  const { offer, reason } = recommend(fixes, false);
  return {
    id: args.id, domain: args.domain, url: args.url, scannedAt: (args.now ?? new Date()).toISOString(), mode: "scan",
    overall: pct(E, A), areas: { seo: pct(earned.seo, avail.seo), ai: pct(earned.ai, avail.ai), local: pct(earned.local, avail.local) },
    checksUsed: results.length - unverified.length, checksTotal: results.length,
    fixes, quickWins: fixes.filter((f) => f.quickWin).sort((a, b) => FIX_COPY[a.id].mins - FIX_COPY[b.id].mins), unverified, passed, offer, offerReason: reason, input: args.input,
  };
}

export function recommend(fixes: Fix[], noSite: boolean): { offer: OfferId; reason: string } {
  if (noSite) return { offer: "build", reason: "You need a website first. A Saabai website build gives you one that Google and AI tools can read." };
  const crit = fixes.filter((f) => f.rating === "critical").length;
  if (fixes.length >= 8 || crit >= 4) return { offer: "blueprint", reason: "There is more here than a quick fix. A Blueprint ranks everything by hours and dollars saved." };
  if (fixes.some((f) => f.area !== "local" && f.rating === "critical" || f.id === "speed" || f.id === "mobile")) return { offer: "build", reason: "The biggest gaps are in the site itself. A new Saabai website fixes them all in one go." };
  if (fixes.length && fixes.every((f) => f.area === "local")) return { offer: "reviews", reason: "Your site basics are sound. Showing your reviews is the quickest gain." };
  return { offer: fixes.length ? "build" : "blueprint", reason: fixes.length ? "A Saabai website build covers the remaining gaps." : "Your site is in good shape. The Blueprint looks at what to automate next." };
}

/** Scored result for a business with no website, or none we can detect. A very low score and one Critical fix. */
export function noWebsiteReport(args: { id: string; domain?: string; url?: string; input: Input; reason?: string; now?: Date }): ScanReport {
  const fix: Fix = { id: NO_SITE_FIX.id, label: NO_SITE_FIX.label, area: "seo", status: "fail", rating: "critical", quickWin: false, found: args.reason ?? "No website was provided.", meaning: NO_SITE_FIX.meaning, fix: NO_SITE_FIX.fix, time: NO_SITE_FIX.time, offer: "build", pointsLost: 100 };
  const { offer, reason } = recommend([fix], true);
  return {
    id: args.id, domain: args.domain ?? "", url: args.url ?? "", scannedAt: (args.now ?? new Date()).toISOString(), mode: "no_website",
    overall: 0, areas: { seo: 0, ai: 0, local: 0 }, checksUsed: 0, checksTotal: CHECKS.length,
    fixes: [fix], quickWins: [], unverified: [], passed: [], offer, offerReason: reason, input: args.input,
  };
}
