/**
 * GET  /api/lex-matters  list the caller's firm matters (firm = email domain)
 * POST /api/lex-matters  create a matter { name, client?, area, urgency?, description?, deadline?, deadlineLabel? }
 */
import { matterActor, json } from "../../../lib/lex-matter-actor";
import { cleanMatterInput, createMatter, listMatters } from "../../../lib/lex-matters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const who = await matterActor(req);
  if (!who) return json(401, { error: "unauthorized" });
  try { return json(200, { matters: await listMatters(who.firm) }); }
  catch (err) { console.error("[lex-matters GET]", err instanceof Error ? err.name : err); return json(500, { error: "Could not load matters." }); }
}

export async function POST(req: Request) {
  const who = await matterActor(req);
  if (!who) return json(401, { error: "unauthorized" });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json(400, { error: "Invalid request." });
  const r = cleanMatterInput(body, true);
  if ("error" in r) return json(400, r);
  try { return json(201, { matter: await createMatter(who.firm, who.by, r.fields) }); }
  catch (err) { console.error("[lex-matters POST]", err instanceof Error ? err.name : err); return json(500, { error: "Could not create the matter." }); }
}
