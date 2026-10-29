import { getSubscribers, getSubscriberCount, deleteSubscribers, setSubscribersUnsubscribed } from "../../../lib/subscribers";
import { suppress, suppressedSet } from "../../../lib/growth/consent";
import { listForAdmin, markUnsubscribed } from "../../../lib/subscriber-admin";
import { requireAdminSession } from "../../../lib/admin-guard";

export const runtime = "nodejs";

// Hard delete stays available to the API only. The admin page no longer offers it (#345):
// it uses PATCH { action: "unsubscribe" } so the consent record is kept.
export async function DELETE(req: Request) {
  let body: { emails?: string[] };
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.emails?.length) return Response.json({ error: "emails array required" }, { status: 400 });

  const deleted = await deleteSubscribers(body.emails);
  return Response.json({ ok: true, deleted });
}

/** Mark unsubscribed: suppression list plus status, record kept. Admin-gated in proxy.ts and checked again here. */
export async function PATCH(req: Request) {
  if (!(await requireAdminSession())) return Response.json({ error: "Your session expired. Sign in again." }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const r = await markUnsubscribed(body, {
    suppress: (email) => suppress(email, "email", "admin_marked_unsubscribed"),
    setUnsubscribed: setSubscribersUnsubscribed,
  });
  return Response.json(r.body, { status: r.status });
}

export async function GET() {
  const [raw, count] = await Promise.all([
    getSubscribers(500),
    getSubscriberCount(),
  ]);
  // Most recent first
  raw.sort((a, b) => b.subscribedAt.localeCompare(a.subscribedAt));
  // Each row carries the same "can email" rule the broadcast route uses (one batched suppression read).
  const { subscribers, suppressionError } = await listForAdmin(raw, suppressedSet);
  return Response.json({ subscribers, count, suppressionError, cap: 500 });
}
