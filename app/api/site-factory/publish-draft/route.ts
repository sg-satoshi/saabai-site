import { NextRequest } from "next/server";
import { list, put, del } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json();
    if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

    const { blobs } = await list({ prefix: `sites/${slug}/` });
    const draftBlob = blobs.find(b => b.pathname === `sites/${slug}/draft.html`);
    if (!draftBlob) return Response.json({ error: "No draft to publish" }, { status: 404 });

    const res = await fetch(`${draftBlob.url}?t=${Date.now()}`, { cache: "no-store" });
    const html = await res.text();

    await put(`sites/${slug}/index.html`, html, {
      access: "public",
      contentType: "text/html",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    await del(draftBlob.url);

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
