import { revalidateTag } from "next/cache";
import { CAROUSELS } from "../../../../lib/reviews/catalog";
import { loadCarousel } from "../../../../lib/reviews/load";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily Google review sync. Vercel sends Authorization: Bearer CRON_SECRET.
 * With no GOOGLE_PLACES_API_KEY the stored carousels are left as they are.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sites = [];
  for (const site of CAROUSELS) {
    try { revalidateTag(`google-reviews:${site.slug}`, { expire: 0 }); } catch { /* no cache store outside Next */ }
    const body = await loadCarousel(site.slug);
    sites.push({
      slug: site.slug,
      sync: body?.sync ?? "stored",
      reviews: body?.reviews.length ?? 0,
      count: body?.count ?? 0,
    });
  }
  return Response.json({ ok: true, sites });
}
