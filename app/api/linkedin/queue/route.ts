import { getPendingLinkedInPosts, getSentLinkedInPosts, queueLinkedInPost, getRedis, markLinkedInPostSent } from "../../../../lib/redis";

export const runtime = "nodejs";

// GET — pending posts (?sent=true for history)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("sent") === "true") {
    const posts = await getSentLinkedInPosts();
    return Response.json({ posts });
  }
  const posts = await getPendingLinkedInPosts();
  posts.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  return Response.json({ posts });
}

// POST — add a new post to the queue
export async function POST(req: Request) {
  let body: { content?: string; scheduledFor?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.content || !body.scheduledFor) return Response.json({ error: "content and scheduledFor required" }, { status: 400 });
  const id = await queueLinkedInPost({ content: body.content, scheduledFor: body.scheduledFor });
  return Response.json({ ok: true, id });
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
