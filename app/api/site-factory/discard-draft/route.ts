import { NextRequest } from "next/server";
import { list, del } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json();
    if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

    const { blobs } = await list({ prefix: `sites/${slug}/` });
    const draftBlob = blobs.find(b => b.pathname === `sites/${slug}/draft.html`);
    if (!draftBlob) return Response.json({ error: "No draft to discard" }, { status: 404 });

    await del(draftBlob.url);

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
