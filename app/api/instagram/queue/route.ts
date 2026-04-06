import {
  getPendingInstagramPosts,
  getSentInstagramPosts,
  queueInstagramPost,
  getRedis,
  markInstagramPostSent,
} from "../../../../lib/redis";

export const runtime = "nodejs";

// GET — pending posts (?sent=true for history)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("sent") === "true") {
    const posts = await getSentInstagramPosts();
    return Response.json({ posts });
  }
  const posts = await getPendingInstagramPosts();
  posts.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  return Response.json({ posts });
}

// POST — queue a new post
export async function POST(req: Request) {
  let body: { caption?: string; imageUrl?: string; imageType?: string; scheduledFor?: string; scheduledTime?: string };
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.caption || !body.imageUrl || !body.scheduledFor) {
    return Response.json({ error: "caption, imageUrl and scheduledFor required" }, { status: 400 });
  }
  const id = await queueInstagramPost({
    caption: body.caption,
    imageUrl: body.imageUrl,
    imageType: body.imageType,
    scheduledFor: body.scheduledFor,
    scheduledTime: body.scheduledTime,
  });
  return Response.json({ ok: true, id });
}

// PATCH — edit queued post
export async function PATCH(req: Request) {
  const redis = getRedis();
  if (!redis) return Response.json({ error: "Redis not available" }, { status: 500 });

  let body: { id?: string; caption?: string; imageUrl?: string; scheduledFor?: string; scheduledTime?: string };
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.id) return Response.json({ error: "id required" }, { status: 400 });

  const updates: Record<string, string> = {};
  if (body.caption)       updates.caption       = body.caption;
  if (body.imageUrl)      updates.imageUrl      = body.imageUrl;
  if (body.scheduledFor)  updates.scheduledFor  = body.scheduledFor;
  if (body.scheduledTime) updates.scheduledTime = body.scheduledTime;

  if (!Object.keys(updates).length) return Response.json({ error: "Nothing to update" }, { status: 400 });

  await redis.hset(`igpost:${body.id}`, updates);
  return Response.json({ ok: true });
}

// DELETE — cancel / mark as sent to skip cron
export async function DELETE(req: Request) {
  let body: { id?: string };
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.id) return Response.json({ error: "id required" }, { status: 400 });
  await markInstagramPostSent(body.id);
  return Response.json({ ok: true });
}
