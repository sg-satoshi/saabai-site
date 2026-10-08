/**
 * PATCH /api/admin/requests/:id  { status?, adminNote?, notifyClient? }  (admin only)
 * Updates status and/or note. When the status changes, the client gets a
 * polite update email (unless notifyClient is false).
 */
import { requireAdminSession } from "../../../../../lib/admin-guard";
import { updateRequest } from "../../../../../lib/client-requests";
import { sendStatusUpdate } from "../../../../../lib/client-request-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const result = await updateRequest(id, { status: body.status, adminNote: body.adminNote });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.code });

    let emailed = false;
    if (result.statusChanged && body.notifyClient !== false) {
      emailed = await sendStatusUpdate(result.request);
    }
    return Response.json({ request: result.request, statusChanged: result.statusChanged, emailed });
  } catch (err) {
    console.error("[admin/requests] update", err);
    return Response.json({ error: "Could not update the request" }, { status: 500 });
  }
}
