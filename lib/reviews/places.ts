import type { StoredReview } from "./types";

/** Read at runtime. Not set in this repo. Place Details with the reviews field. */
export const GOOGLE_PLACES_API_KEY_ENV = "GOOGLE_PLACES_API_KEY";

export const PLACES_API = "https://places.googleapis.com/v1";
/** IDs only, so resolving a name does not bill the reviews SKU. */
export const TEXT_SEARCH_FIELD_MASK = "places.id";
/**
 * `reviews` selects Place Details Enterprise + Atmosphere.
 * rating and userRatingCount ride on that same request. No other fields.
 */
export const PLACE_DETAILS_FIELD_MASK = "reviews,rating,userRatingCount";

export function placesApiKey(): string | null {
  const value = process.env[GOOGLE_PLACES_API_KEY_ENV];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type PlacesReview = {
  rating?: number;
  relativePublishTimeDescription?: string;
  publishTime?: string;
  text?: { text?: string };
  originalText?: { text?: string };
  authorAttribution?: { displayName?: string };
};

type PlacesDetails = {
  id?: string;
  rating?: number;
  userRatingCount?: number;
  reviews?: PlacesReview[];
};

export type PlacesPull =
  | { ok: true; placeId: string; reviews: StoredReview[]; rating?: number; count?: number }
  | { ok: false; error: string };

function clip(message: string, key: string): string {
  const stripped = key ? message.split(key).join("[redacted]") : message;
  return stripped.replace(/\s+/g, " ").trim().slice(0, 180) || "Places request failed";
}

function asReview(review: PlacesReview): StoredReview | null {
  const stars = Number(review.rating);
  const text = (review.originalText?.text || review.text?.text || "").trim();
  const name = (review.authorAttribution?.displayName || "").trim();
  if (!name || !text || !Number.isFinite(stars) || stars < 4 || stars > 5) return null;
  const date = review.relativePublishTimeDescription || (review.publishTime ? review.publishTime.slice(0, 10) : "");
  return { name, stars: Math.round(stars), text: text.slice(0, 2000), ...(date ? { date } : {}) };
}

async function readJson(res: Response, key: string): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const text = await res.text();
  if (!res.ok) return { ok: false, error: clip(text || `HTTP ${res.status}`, key) };
  try {
    return { ok: true, data: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, error: "Places response was not JSON" };
  }
}

/** Place Details returns at most five reviews, chosen by Google, with no next page. */
export async function fetchPlaceReviews(input: {
  key: string;
  placeId?: string;
  textQuery?: string;
  fetchImpl?: typeof fetch;
}): Promise<PlacesPull> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const key = input.key;
  let placeId = (input.placeId || "").trim().replace(/^places\//, "");
  if (!placeId) {
    const query = (input.textQuery || "").trim();
    if (!query) return { ok: false, error: "No place id" };
    const found = await fetchImpl(`${PLACES_API}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": TEXT_SEARCH_FIELD_MASK,
      },
      body: JSON.stringify({ textQuery: query, pageSize: 1 }),
    });
    const parsed = await readJson(found, key);
    if (!parsed.ok) return parsed;
    const id = ((parsed.data as { places?: { id?: string }[] }).places?.[0]?.id || "").replace(/^places\//, "");
    if (!id) return { ok: false, error: "No place matched" };
    placeId = id;
  }
  const details = await fetchImpl(`${PLACES_API}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK,
    },
  });
  const parsed = await readJson(details, key);
  if (!parsed.ok) return parsed;
  const data = parsed.data as PlacesDetails;
  const reviews = (data.reviews ?? []).map(asReview).filter((review): review is StoredReview => review !== null);
  return {
    ok: true,
    placeId,
    reviews,
    ...(typeof data.rating === "number" ? { rating: data.rating } : {}),
    ...(typeof data.userRatingCount === "number" ? { count: data.userRatingCount } : {}),
  };
}
