/**
 * GET   /api/portal/blueprint/[id]  questions for the plan, answers, progress, version
 * PATCH /api/portal/blueprint/[id]  { answers: {qid: value}, version } autosave.
 *   409 version moved on (another tab or device), 423 locked after submit,
 *   422 invalid value, 503 busy.
 */
import { guardEngagement, snapshot } from "../../../../../lib/portal-blueprint/api";
import { answersOf, computeProgress } from "../../../../../lib/portal-blueprint/progress";
import { saveClientAnswers } from "../../../../../lib/portal-blueprint/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const g = await guardEngagement(req, id, false);
  if (!g.ok) return g.response;
  return g.refresh(Response.json(snapshot(g.engagement)));
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const g = await guardEngagement(req, id, true);
  if (!g.ok) return g.response;
  let body: { answers?: unknown; version?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.answers || typeof body.answers !== "object" || Array.isArray(body.answers) || Object.keys(body.answers).length > 60) {
    return Response.json({ error: "Invalid answers" }, { status: 400 });
  }
  const r = await saveClientAnswers(id, g.email, body.answers as Record<string, unknown>, body.version);
  switch (r.status) {
    case "ok":
      return g.refresh(Response.json({ saved: r.saved, version: r.engagement.portal?.version ?? 0, progress: computeProgress(r.engagement, answersOf(r.engagement)) }));
    case "locked":
      return Response.json({ error: "Your fact-find has been submitted and is locked. Reply to our email if you need a change." }, { status: 423 });
    case "conflict":
      return Response.json({ error: "conflict", version: r.engagement.portal?.version ?? 0, answers: answersOf(r.engagement) }, { status: 409 });
    case "invalid":
      return Response.json({ error: "Some answers were not valid", fields: r.fields }, { status: 422 });
    case "notfound":
      return Response.json({ error: "Not found" }, { status: 404 });
    default:
      return Response.json({ error: "Busy, please retry" }, { status: 503 });
  }
}
