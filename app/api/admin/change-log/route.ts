import { requireAdminSession } from "../../../../lib/admin-guard";
import { actorLabel } from "../../../../lib/auth-acl";
import { addChangeLogEntry, listChangeLog } from "../../../../lib/change-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const siteId = url.searchParams.get("siteId") || undefined;
  const entries = await listChangeLog({ siteId, limit: Number(url.searchParams.get("limit") || 100) });
  return Response.json({ entries });
}

export async function POST(req: Request) {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
  const siteName = typeof body.siteName === "string" ? body.siteName.trim() : siteId;
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  if (!siteId || summary.length < 3) {
    return Response.json({ error: "siteId and summary required" }, { status: 400 });
  }
  const entry = await addChangeLogEntry({
    siteId,
    siteName: siteName || siteId,
    summary,
    source: "manual",
    authorName: await actorLabel(), // signed-in actor, never client-supplied
  });
  return Response.json({ entry }, { status: 201 });
}
