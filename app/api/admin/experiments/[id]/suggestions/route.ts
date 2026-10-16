import { adminActor } from "@/lib/exp/actor";
import { isKnownSite, listExperiments, loadAudit, loadView } from "@/lib/exp/admin";
import { approveSuggestion, generateSuggestions, listSuggestions, rejectSuggestion } from "@/lib/exp/suggest-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Admin only. Pending and recently decided AI suggestions for one experiment. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await adminActor())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  return Response.json({ suggestions: await listSuggestions(id) });
}

/**
 * Admin only. { op: "generate" } asks the AI for new headline ideas (stored as pending, never live).
 * { op: "approve", suggestionId, text?, emphasis? } adds one as a variant (the only way an AI idea can run).
 * { op: "reject", suggestionId } discards one.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await adminActor();
  if (!actor) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { site?: string; op?: string; suggestionId?: string; text?: string; emphasis?: string } | null;
  const site = body?.site || "saabai";
  if (!isKnownSite(site)) return Response.json({ error: "Unknown site" }, { status: 400 });
  if (!(await listExperiments(site)).some((e) => e.id === id)) return Response.json({ error: "Not found" }, { status: 404 });

  if (body?.op === "generate") {
    const r = await generateSuggestions(site, id, actor);
    if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
    return Response.json({ ok: true, added: r.added, suggestions: r.suggestions });
  }
  const sid = typeof body?.suggestionId === "string" && /^[0-9a-f-]{36}$/i.test(body.suggestionId) ? body.suggestionId : null;
  if (!sid) return Response.json({ error: "Invalid suggestion" }, { status: 400 });
  if (body?.op === "reject") {
    const r = await rejectSuggestion(id, sid, actor);
    if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
    return Response.json({ ok: true, suggestions: await listSuggestions(id) });
  }
  if (body?.op === "approve") {
    const r = await approveSuggestion(site, id, sid, body.text !== undefined ? { text: String(body.text), emphasis: String(body.emphasis ?? "") } : undefined, actor);
    if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
    const exp = (await listExperiments(site)).find((e) => e.id === id);
    const [view, audit, suggestions] = await Promise.all([exp ? loadView(exp) : null, loadAudit(id), listSuggestions(id)]);
    return Response.json({ ok: true, ...(view ?? {}), audit, suggestions });
  }
  return Response.json({ error: "Invalid action" }, { status: 400 });
}
