import { NextRequest } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

  try {
    const { blobs } = await list({ prefix: `sites/${slug}/` });
    const draft = blobs.find(b => b.pathname === `sites/${slug}/draft.html`);
    const live  = blobs.find(b => b.pathname === `sites/${slug}/index.html`);
    const blob = draft ?? live;
    if (!blob) return Response.json({ error: "Site not found" }, { status: 404 });

    const res = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
    const html = await res.text();
    return Response.json({ html, hasDraft: !!draft });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
