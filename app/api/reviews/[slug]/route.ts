import { unstable_cache } from "next/cache";
import { carouselBySlug } from "../../../../lib/reviews/catalog";
import { loadCarousel } from "../../../../lib/reviews/load";
import { placesApiKey } from "../../../../lib/reviews/places";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public carousel feed. Stored reviews always. Places is merged when the key is set. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!carouselBySlug(slug)) return Response.json({ error: "No carousel for this site" }, { status: 404 });
  const keyed = placesApiKey() ? "1" : "0";
  const body = await unstable_cache(
    () => loadCarousel(slug),
    ["google-reviews", slug, keyed],
    { revalidate: keyed === "1" ? 86400 : 300, tags: [`google-reviews:${slug}`] },
  )();
  return Response.json(body, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" },
  });
}
