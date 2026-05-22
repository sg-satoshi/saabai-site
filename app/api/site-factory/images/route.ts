import { NextRequest } from "next/server";
import { list } from "@vercel/blob";

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
