/**
 * Google Maps pack types for Saabai and Site Factory client sites.
 * Never invent addresses, hours or place IDs. Leave unknowns as todos.
 */

export type MapsMode = "shopfront" | "service-area";

export interface PostalAddressParts {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
}

export interface OpeningHoursSpec {
  days: Array<
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday"
  >;
  opens: string; // HH:MM 24h
  closes: string;
}

export interface MapsProfile {
  slug: string;
  name: string;
  /** Canonical site origin, no trailing slash. */
  url: string;
  mode: MapsMode;
  schemaType: string | string[];
  telephone?: string;
  email?: string;
  description?: string;
  /** Public shopfront only. Omit for service-area businesses. */
  address?: PostalAddressParts;
  /** Decimal degrees. Only when verified for a public shopfront. */
  geo?: { latitude: number; longitude: number };
  /** Google Place ID (usually ChIJ...). Required for Review us + preferred Embed. */
  placeId?: string;
  /** Public GBP / Maps listing URL for sameAs and hasMap. */
  gbpUrl?: string;
  areaServed?: Array<{ "@type": string; name: string } | string>;
  openingHoursSpecification?: OpeningHoursSpec[];
  sameAs?: string[];
  priceRange?: string;
  image?: string | string[];
  logo?: string;
  /** Free-text query for keyless maps?q= embed / directions when no placeId. */
  mapsQuery?: string;
  /** Confidence and source notes for the audit table. */
  sources: string[];
  /** Fields we could not verify. Do not invent values for these. */
  todos: string[];
  /** Heaven Thai and any other excluded sites. */
  excluded?: boolean;
}
