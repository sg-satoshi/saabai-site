import { adminActor } from "@/lib/exp/actor";
import { EXP_SITES, isKnownSite, listExperiments, loadView } from "@/lib/exp/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin only. Lists experiments with a one-line verdict each. */
export async function GET(req: Request) {
  if (!(await adminActor())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const site = new URL(req.url).searchParams.get("site") || "saabai";
  if (!isKnownSite(site)) return Response.json({ error: "Unknown site" }, { status: 400 });
  const exps = await listExperiments(site);
  const items = await Promise.all(exps.map(async (e) => {
    const v = await loadView(e);
    return { id: e.id, name: e.name ?? e.id, slot: e.slot, path: e.path, status: e.status, variants: e.variants.length, activeVariants: e.variants.filter((x) => x.active).length,
      views: v.totals.views, conversions: v.totals.conversions, rate: v.totals.rate, daysRunning: v.daysRunning, verdict: { kind: v.analysis.verdict.kind, headline: v.analysis.verdict.headline, leaderId: v.analysis.verdict.leaderId } };
  }));
  return Response.json({ sites: EXP_SITES, site, items });
}
