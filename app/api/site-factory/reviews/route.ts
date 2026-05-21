import { NextRequest } from "next/server";
import { getSiteBySlug, updateSite } from "../../../../lib/site-registry";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });
  try {
    const site = await getSiteBySlug(slug);
    if (!site) return Response.json({ error: "Site not found" }, { status: 404 });
    return Response.json({ ok: true, reviews: site.reviews ?? null });
  } catch (e: unknown) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { slug, reviews } = await req.json();
    if (!slug) return Response.json({ error: "slug required" }, { status: 400 });
    const site = await getSiteBySlug(slug);
    if (!site) return Response.json({ error: "Site not found" }, { status: 404 });
    await updateSite(site.id, { reviews });
    return Response.json({ ok: true });
  } catch (e: unknown) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
