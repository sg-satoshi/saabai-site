import { adminActor } from "@/lib/exp/actor";
import { applyDashboardAction, isKnownSite, listExperiments, loadAudit, loadView } from "@/lib/exp/admin";
import type { Action } from "@/lib/exp/mutate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = ["update_variant", "add_variant", "set_variant_active", "set_status", "make_winner", "set_lead_value"];

/** Admin only. Full detail: config, analytics, breakdowns, audit trail. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await adminActor())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const site = new URL(req.url).searchParams.get("site") || "saabai";
  if (!isKnownSite(site)) return Response.json({ error: "Unknown site" }, { status: 400 });
  const exp = (await listExperiments(site)).find((e) => e.id === id);
  if (!exp) return Response.json({ error: "Not found" }, { status: 404 });
  const [view, audit] = await Promise.all([loadView(exp), loadAudit(exp.id)]);
  return Response.json({ ...view, audit });
}

/** Admin only. Applies one action ({ action: {type, ...}, rev }). Every change is audit logged and live within about a minute. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await adminActor();
  if (!actor) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { site?: string; action?: Action; rev?: number } | null;
  const site = body?.site || "saabai";
  if (!body?.action || typeof body.action !== "object" || !ACTIONS.includes((body.action as { type: string }).type)) return Response.json({ error: "Invalid action" }, { status: 400 });
  if (!isKnownSite(site)) return Response.json({ error: "Unknown site" }, { status: 400 });
  const res = await applyDashboardAction(site, id, body.action, typeof body.rev === "number" ? body.rev : undefined, actor);
  if (!res.ok) return Response.json({ error: res.error }, { status: res.status });
  const exp = (await listExperiments(site)).find((e) => e.id === id);
  const [view, audit] = await Promise.all([exp ? loadView(exp) : null, loadAudit(id)]);
  return Response.json({ ok: true, ...(view ?? {}), audit });
}
