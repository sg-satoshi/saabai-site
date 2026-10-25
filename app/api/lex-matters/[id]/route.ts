/**
 * GET   /api/lex-matters/:id  matter with its attached research, drafts and reviews
 * PATCH /api/lex-matters/:id  update name, client, area, status, urgency, description, deadline
 */
import { matterActor, json } from "../../../../lib/lex-matter-actor";
import { cleanMatterInput, getMatter, listItems, updateMatter } from "../../../../lib/lex-matters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const who = await matterActor(req);
  if (!who) return json(401, { error: "unauthorized" });
  const { id } = await ctx.params;
  const matter = await getMatter(who.firm, id);
  if (!matter) return json(404, { error: "Matter not found." });
  return json(200, { matter, items: await listItems(who.firm, id) });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const who = await matterActor(req);
  if (!who) return json(401, { error: "unauthorized" });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json(400, { error: "Invalid request." });
  const r = cleanMatterInput(body, false);
  if ("error" in r) return json(400, r);
  const matter = await updateMatter(who.firm, id, who.by, r.fields);
  return matter ? json(200, { matter }) : json(404, { error: "Matter not found." });
}
