import { carouselBySlug } from "./catalog";
import { mergeReviews } from "./merge";
import { fetchPlaceReviews, placesApiKey } from "./places";
import type { CarouselPayload } from "./types";

export type LoadDeps = {
  /** Pass null to force the stored list. Omit to read GOOGLE_PLACES_API_KEY. */
  key?: string | null;
  fetchImpl?: typeof fetch;
  now?: Date;
};

/** Stored reviews, plus any new 4 and 5 star Places reviews when the key is set. */
export async function loadCarousel(slug: string, deps: LoadDeps = {}): Promise<CarouselPayload | null> {
  const source = carouselBySlug(slug);
  if (!source) return null;
  const stored = source.stored();
  const base = {
    source: "Google Business Profile",
    reviews_url: source.reviewsUrl,
    updated: stored.updated,
    rating: stored.rating,
    count: stored.count,
    reviews: stored.reviews,
  };
  const key = "key" in deps ? (deps.key ?? null) : placesApiKey();
  if (!key) return { ...base, synced: false, sync: "missing-key" };
  const pull = await fetchPlaceReviews({
    key,
    placeId: source.placeId,
    textQuery: source.textQuery,
    fetchImpl: deps.fetchImpl,
  });
  if (!pull.ok) {
    console.error("[google-reviews]", slug, pull.error);
    return { ...base, synced: false, sync: "places-error" };
  }
  const reviews = mergeReviews(stored.reviews, pull.reviews);
  const now = deps.now ?? new Date();
  return {
    ...base,
    rating: pull.rating ?? stored.rating,
    count: Math.max(stored.count, pull.count ?? 0, reviews.length),
    reviews,
    updated: now.toISOString().slice(0, 10),
    synced: true,
    sync: "places",
  };
}
