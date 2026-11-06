import lmm from "../../public/clients/lmm-site/assets/reviews.json";
import { googleBusinessUrl, googleRating, googleReviewCount, reviews as cycleReviews } from "../../app/sites/cycle-repair/reviews";
import type { StoredReview } from "./types";

export type CarouselSource = {
  slug: string;
  name: string;
  /** Set when we already know the ChIJ id. Otherwise the sync resolves textQuery. */
  placeId?: string;
  textQuery?: string;
  reviewsUrl: string;
  stored: () => { rating: number | null; count: number; updated: string; reviews: StoredReview[] };
};

const LMM_REVIEWS_URL = "https://www.google.com/search?kgmid=/g/11b6hyfwnh&q=Lifestyle+Money+Management#lrd=0x6ab0cedb64cd8233:0x43ddf01d057f2221,1,,,,";

/**
 * Every client carousel the daily sync feeds.
 * A site factory page with a baked-in carousel joins this list once it has a
 * stored review file and a Google place (id or text query).
 */
export const CAROUSELS: readonly CarouselSource[] = [
  {
    slug: "lmm-site",
    name: "Lifestyle Money Management",
    textQuery: "Lifestyle Money Management Adelaide",
    reviewsUrl: LMM_REVIEWS_URL,
    stored: () => ({
      rating: lmm.rating,
      count: lmm.count,
      updated: lmm.updated,
      reviews: lmm.reviews.map((review) => ({
        name: review.name,
        stars: review.stars,
        text: review.text,
        date: review.date,
      })),
    }),
  },
  {
    slug: "cycle-repair",
    name: "Stu's Cycle Repairs",
    textQuery: "Stu's Cycle Repairs Gold Coast",
    reviewsUrl: googleBusinessUrl,
    stored: () => ({
      rating: googleRating,
      count: googleReviewCount,
      updated: "",
      reviews: cycleReviews.map((review) => ({
        name: review.name,
        stars: review.stars,
        text: review.text,
        date: review.date,
      })),
    }),
  },
];

export function carouselBySlug(slug: string): CarouselSource | undefined {
  return CAROUSELS.find((site) => site.slug === slug);
}
