import type { MapsProfile, OpeningHoursSpec, PostalAddressParts } from "./types";
import { hasMapUrl } from "./links";

function postalAddress(a: PostalAddressParts) {
  return {
    "@type": "PostalAddress" as const,
    ...(a.streetAddress ? { streetAddress: a.streetAddress } : {}),
    ...(a.addressLocality ? { addressLocality: a.addressLocality } : {}),
    ...(a.addressRegion ? { addressRegion: a.addressRegion } : {}),
    ...(a.postalCode ? { postalCode: a.postalCode } : {}),
    ...(a.addressCountry ? { addressCountry: a.addressCountry } : {}),
  };
}

function hours(specs: OpeningHoursSpec[]) {
  return specs.map((s) => ({
    "@type": "OpeningHoursSpecification" as const,
    dayOfWeek: s.days,
    opens: s.opens,
    closes: s.closes,
  }));
}

/**
 * Build LocalBusiness / ProfessionalService JSON-LD from a verified MapsProfile.
 * Service-area profiles never get streetAddress, geo, or a pin embed.
 * Suspended / missing GBP must not appear in sameAs (caller sets gbpUrl).
 */
export function localBusinessFromProfile(profile: MapsProfile, extra: Record<string, unknown> = {}) {
  const sameAs = [...(profile.sameAs ?? [])];
  if (profile.gbpUrl && !sameAs.includes(profile.gbpUrl)) sameAs.push(profile.gbpUrl);

  const map = hasMapUrl(profile);

  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": profile.schemaType,
    "@id": `${profile.url.replace(/\/$/, "")}/#business`,
    name: profile.name,
    url: profile.url.endsWith("/") ? profile.url : `${profile.url}/`,
    ...(profile.description ? { description: profile.description } : {}),
    ...(profile.telephone ? { telephone: profile.telephone } : {}),
    ...(profile.email ? { email: profile.email } : {}),
    ...(profile.image ? { image: profile.image } : {}),
    ...(profile.logo ? { logo: profile.logo } : {}),
    ...(profile.priceRange ? { priceRange: profile.priceRange } : {}),
    ...(profile.areaServed ? { areaServed: profile.areaServed } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(map ? { hasMap: map } : {}),
    ...extra,
  };

  if (profile.mode === "shopfront" && profile.address) {
    node.address = postalAddress(profile.address);
    if (profile.geo) {
      node.geo = {
        "@type": "GeoCoordinates",
        latitude: profile.geo.latitude,
        longitude: profile.geo.longitude,
      };
    }
  } else if (profile.address && (profile.address.addressLocality || profile.address.addressRegion)) {
    // Locality-only NAP for service-area (no street pin).
    const { streetAddress: _drop, ...rest } = profile.address;
    void _drop;
    if (rest.addressLocality || rest.addressRegion || rest.postalCode) {
      node.address = postalAddress(rest);
    }
  }

  if (profile.openingHoursSpecification?.length) {
    node.openingHoursSpecification = hours(profile.openingHoursSpecification);
  }

  return node;
}
