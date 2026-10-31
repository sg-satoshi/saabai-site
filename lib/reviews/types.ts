/** One review as the carousels render it. */
export type StoredReview = {
  name: string;
  stars: number;
  text: string;
  date?: string;
};

/** JSON the LMM carousel already fetches. Extra fields are ignored by the page. */
export type CarouselPayload = {
  source: string;
  rating: number | null;
  count: number;
  reviews_url: string;
  updated: string;
  reviews: StoredReview[];
  /** True when a Places response was merged in. False when the stored list is returned unchanged. */
  synced: boolean;
  /** Why the list looks the way it does. No secrets. */
  sync: "places" | "missing-key" | "places-error" | "stored";
};
