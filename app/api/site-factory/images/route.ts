import { NextRequest } from "next/server";
import { list, del } from "@vercel/blob";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

  const { blobs } = await list({ prefix: `sites/${slug}/generated/` });
  const images = blobs
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .map(b => ({ url: b.url, ts: new Date(b.uploadedAt).getTime() }));

  return Response.json({ ok: true, images });
}

export async function DELETE(req: NextRequest) {
  const { slug, url } = await req.json();
  if (!slug || !url) return Response.json({ error: "slug and url required" }, { status: 400 });
  // Only allow deleting images that belong to this site
  if (!url.includes(`/sites/${slug}/`)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  await del(url);
  return Response.json({ ok: true });
}
