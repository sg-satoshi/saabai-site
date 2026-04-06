import { getSubscribers, getSubscriberCount, deleteSubscribers } from "../../../lib/subscribers";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
  let body: { emails?: string[] };
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.emails?.length) return Response.json({ error: "emails array required" }, { status: 400 });

  const deleted = await deleteSubscribers(body.emails);
  return Response.json({ ok: true, deleted });
}

export async function GET() {
  const [subscribers, count] = await Promise.all([
    getSubscribers(500),
    getSubscriberCount(),
  ]);
  // Most recent first
  subscribers.sort((a, b) => b.subscribedAt.localeCompare(a.subscribedAt));
  return Response.json({ subscribers, count });
}
