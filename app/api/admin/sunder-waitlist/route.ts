import { NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../../lib/auth";
import { EXPORT_COLUMNS, toCsv } from "../../../../lib/sunder-waitlist";

// CSV export of SUNDER waitlist subscribers. /api/admin is admin-gated in proxy.ts; checked again here.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdminSession(session.clientId))) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { serviceClient } = await import("../../../../lib/agent-supabase");
  const db = serviceClient();
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("sunder_subscribers").select(EXPORT_COLUMNS.join(",")).order("created_at", { ascending: true }).range(from, from + 999);
    if (error) return Response.json({ error: "Export failed" }, { status: 500 });
    rows.push(...((data ?? []) as unknown as Record<string, unknown>[]));
    if (!data || data.length < 1000) break;
  }
  const day = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="sunder-waitlist-${day}.csv"`, "Cache-Control": "no-store" },
  });
}
