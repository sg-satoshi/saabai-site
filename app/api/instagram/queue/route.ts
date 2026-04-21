import { getPendingInstagramPosts } from "../../../../lib/redis";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const posts = await getPendingInstagramPosts();

  posts.sort((a, b) =>
    (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? "")
  );

  return Response.json({ posts });
}