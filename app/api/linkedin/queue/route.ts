import { getPendingLinkedInPosts, getRedis, markLinkedInPostSent } from "../../../../lib/redis";

export const runtime = "nodejs";

// GET — list all pending (unsent) posts
export async function GET() {
  const posts = await getPendingLinkedInPosts();
  // Sort by scheduledFor ascending
  posts.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  return Response.json({ posts });
}

// PATCH — edit content or scheduledFor of a queued post
export async function PATCH(req: Request) {
  const redis = getRedis();
  if (!redis) return Response.json({ error: "Redis not available" }, { status: 500 });

  let body: { id?: string; content?: string; scheduledFor?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.id) return Response.json({ error: "id required" }, { status: 400 });

  const updates: Record<string, string> = {};
  if (body.content) updates.content = body.content;
  if (body.scheduledFor) updates.scheduledFor = body.scheduledFor;

  if (Object.keys(updates).length === 0) return Response.json({ error: "Nothing to update" }, { status: 400 });

  await redis.hset(`lipost:${body.id}`, updates);
  return Response.json({ ok: true });
}

// DELETE — cancel a queued post (mark as sent so cron skips it)
export async function DELETE(req: Request) {
  let body: { id?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.id) return Response.json({ error: "id required" }, { status: 400 });
  await markLinkedInPostSent(body.id); // marks sentAt so cron skips it
  return Response.json({ ok: true });
}
