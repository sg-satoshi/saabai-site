import { getPendingInstagramPosts, queueInstagramPost } from "../../../../lib/redis";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const posts = await getPendingInstagramPosts();

  posts.sort((a, b) =>
    (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? "")
  );

  return Response.json({ posts });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = await queueInstagramPost(body);
  if (!id) return Response.json({ error: "Redis unavailable" }, { status: 503 });

  return Response.json({ id }, { status: 201 });
}