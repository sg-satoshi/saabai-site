/**
 * POST   /api/lex-matters/:id/items        attach or update { ref, kind: research|draft|review, title, data }
 * DELETE /api/lex-matters/:id/items?ref=   detach one item
 * Items are snapshots, so everyone at the firm can open them.
 */
import { matterActor, json } from "../../../../../lib/lex-matter-actor";
import { putItem, removeItem } from "../../../../../lib/lex-matters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const who = await matterActor(req);
  if (!who) return json(401, { error: "unauthorized" });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json(400, { error: "Invalid request." });
  const r = await putItem(who.firm, id, who.by, body);
  if ("error" in r) return json(r.error === "not_found" ? 404 : 400, { error: r.error === "not_found" ? "Matter not found." : r.error });
  return json(200, r);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const who = await matterActor(req);
  if (!who) return json(401, { error: "unauthorized" });
  const { id } = await ctx.params;
  const ref = new URL(req.url).searchParams.get("ref") ?? "";
  return (await removeItem(who.firm, id, ref)) ? json(200, { ok: true }) : json(404, { error: "Matter not found." });
}
