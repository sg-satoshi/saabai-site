import type { MapsProfile } from "./types";

export function writeReviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export function placeMapsUrl(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
}

export function directionsUrl(profile: MapsProfile): string | null {
  if (profile.mode !== "shopfront") return null;
  if (profile.placeId) {
    const dest = profile.mapsQuery || profile.name;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&destination_place_id=${encodeURIComponent(profile.placeId)}`;
  }
  const q = profile.mapsQuery || addressQuery(profile);
  if (!q) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

export function hasMapUrl(profile: MapsProfile): string | null {
  if (profile.gbpUrl) return profile.gbpUrl;
  if (profile.placeId) return placeMapsUrl(profile.placeId);
  const q = profile.mapsQuery || addressQuery(profile);
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function addressQuery(profile: MapsProfile): string | null {
  const a = profile.address;
  if (!a) return null;
  const parts = [
    a.streetAddress,
    a.addressLocality,
    a.addressRegion,
    a.postalCode,
    a.addressCountry === "AU" ? "Australia" : a.addressCountry,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** Official Embed API URL when a browser key is present. */
export function embedApiUrl(profile: MapsProfile, apiKey: string): string | null {
  if (profile.mode !== "shopfront") return null;
  if (profile.placeId) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=place_id:${encodeURIComponent(profile.placeId)}`;
  }
  const q = profile.mapsQuery || addressQuery(profile);
  if (!q) return null;
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(q)}`;
}

/**
 * Keyless fallback iframe. Works without a Maps Platform key.
 * Prefer Embed API once NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY is set.
 */
export function embedKeylessUrl(profile: MapsProfile): string | null {
  if (profile.mode !== "shopfront") return null;
  if (profile.placeId) {
    return `https://www.google.com/maps?q=place_id:${encodeURIComponent(profile.placeId)}&output=embed`;
  }
  const q = profile.mapsQuery || addressQuery(profile);
  if (!q) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
}

export function resolveEmbedSrc(profile: MapsProfile, apiKey?: string | null): string | null {
  if (apiKey) return embedApiUrl(profile, apiKey);
  return embedKeylessUrl(profile);
}
