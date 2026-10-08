/**
 * GET /api/admin/requests?status=&clientId=  (admin only)
 * All client requests, newest first, plus the list of clients who have any.
 */
import { requireAdminSession } from "../../../../lib/admin-guard";
import { listRequests, REQUEST_STATUSES, type RequestStatus } from "../../../../lib/client-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status") || "";
  const clientId = url.searchParams.get("clientId") || "";
  const status = REQUEST_STATUSES.includes(statusParam as RequestStatus) ? (statusParam as RequestStatus) : undefined;

  try {
    const all = await listRequests();
    const clients = [...new Map(all.map((r) => [r.clientId, { clientId: r.clientId, name: r.clientName || r.clientEmail || r.clientId }])).values()];
    const counts = {
      all: all.length,
      received: all.filter((r) => r.status === "received").length,
      in_progress: all.filter((r) => r.status === "in_progress").length,
      done: all.filter((r) => r.status === "done").length,
    };
    const requests = all
      .filter((r) => (status ? r.status === status : true))
      .filter((r) => (clientId ? r.clientId === clientId : true));
    return Response.json({ requests, clients, counts });
  } catch (err) {
    console.error("[admin/requests] list", err);
    return Response.json({ error: "Could not load requests" }, { status: 500 });
  }
}
