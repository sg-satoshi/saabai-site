export type { MapsProfile, MapsMode, OpeningHoursSpec, PostalAddressParts } from "./types";
export { MAPS_PROFILES, getMapsProfile, activeMapsProfiles } from "./profiles";
export {
  writeReviewUrl,
  placeMapsUrl,
  directionsUrl,
  hasMapUrl,
  addressQuery,
  embedApiUrl,
  embedKeylessUrl,
  resolveEmbedSrc,
} from "./links";
export { localBusinessFromProfile } from "./schema";

/** Browser-exposed Embed API key. Empty means use keyless maps?q=&output=embed fallback. */
export function mapsEmbedKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY?.trim();
  return key || null;
}
