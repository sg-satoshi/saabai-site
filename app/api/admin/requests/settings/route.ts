import { requireAdminSession } from "../../../../../lib/admin-guard";
import { getClarifierEnabled, setClarifierEnabled } from "../../../../../lib/client-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const clientId = new URL(req.url).searchParams.get("clientId") || "";
  if (!clientId) return Response.json({ error: "clientId required" }, { status: 400 });
  return Response.json({ clientId, clarifierEnabled: await getClarifierEnabled(clientId) });
}

export async function POST(req: Request) {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const clientId = typeof body.clientId === "string" ? body.clientId : "";
  if (!clientId) return Response.json({ error: "clientId required" }, { status: 400 });
  await setClarifierEnabled(clientId, body.enabled !== false);
  return Response.json({ ok: true, clarifierEnabled: body.enabled !== false });
}
