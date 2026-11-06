import type { MapsProfile } from "./types";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

/**
 * Verified Maps profiles. Heaven Thai is listed as excluded and must not be patched.
 * Place IDs only when confirmed (Stu Certain via feature-id conversion + Maps title check).
 */
export const MAPS_PROFILES: Record<string, MapsProfile> = {
  saabai: {
    slug: "saabai",
    name: "Saabai",
    url: "https://www.saabai.ai",
    mode: "service-area",
    schemaType: ["Organization", "ProfessionalService"],
    email: "hello@saabai.ai",
    description:
      "Saabai builds, hosts and manages websites for small businesses, and delivers the Saabai Blueprint AI audit. Based in Merrimac on the Gold Coast, serving Brisbane, Queensland and Australia.",
    address: {
      addressLocality: "Merrimac",
      addressRegion: "QLD",
      postalCode: "4226",
      addressCountry: "AU",
    },
    areaServed: [
      { "@type": "City", name: "Gold Coast" },
      { "@type": "City", name: "Brisbane" },
      { "@type": "State", name: "Queensland" },
      { "@type": "Country", name: "Australia" },
    ],
    sameAs: ["https://www.linkedin.com/in/shanegoldberg-ai"],
    // GBP suspended 15 Oct 2026. Do not add sameAs / gbpUrl until reinstated.
    sources: [
      "lib/seo-entity.ts NAP (Merrimac QLD 4226, no street, no phone)",
      "Memory: Saabai GBP suspended 15 Oct 2026, appeal rejected",
    ],
    todos: [
      "GBP suspended: no sameAs to Google, no placeId, no embed pin until reinstated",
      "No published street address or phone",
    ],
  },

  "cycle-repair": {
    slug: "cycle-repair",
    name: "Stu's Cycle Repairs",
    url: "https://stuscyclerepairs.com",
    mode: "service-area",
    schemaType: ["LocalBusiness", "BicycleStore"],
    telephone: "+61405225721",
    email: "stuscyclerepairs@gmail.com",
    description:
      "Mobile bike mechanic for the Gold Coast and Tweed Coast. Servicing, repairs, wheel builds and e-bikes at your home or work, from the Northern Rivers to Coomera and Ormeau. Services from $119.",
    address: { addressRegion: "QLD", addressCountry: "AU" },
    placeId: "ChIJMTybEAUCkWsRN6_ET-Nqjus",
    gbpUrl:
      "https://www.google.com/search?kgmid=/g/1v_sndg3&q=Stu%27s+Cycle+Repairs#lrd=0x6b910205109b3c31:0xeb8e6ae34fc4af37,1,,,,",
    areaServed: [
      { "@type": "Place", name: "Gold Coast, Queensland, Australia" },
      { "@type": "Place", name: "Tweed Coast, New South Wales, Australia" },
      { "@type": "Place", name: "Northern Rivers, NSW" },
    ],
    sameAs: ["https://www.facebook.com/140958506038130"],
    priceRange: "$$",
    image: "https://stuscyclerepairs.com/sites/cycle-repair/stu.webp",
    logo: "https://stuscyclerepairs.com/sites/cycle-repair/stus-logo.webp",
    sources: [
      "Live schema + reviews.ts GBP URL (Certain)",
      "Place ID converted from Maps feature id 0x6b910205109b3c31:0xeb8e6ae34fc4af37; Maps title confirmed Stus Cycle Repairs (Certain)",
    ],
    todos: ["No public shopfront pin (mobile service). Embed map omitted by design."],
  },

  "lmm-site": {
    slug: "lmm-site",
    name: "Lifestyle Money Management",
    url: "https://www.lifestylemoneymanagement.com.au",
    mode: "service-area",
    schemaType: ["FinancialService", "ProfessionalService"],
    telephone: "+611300799119",
    email: "nick@lifestylemoneymanagement.com.au",
    description:
      "Ethical, evidence-led property wealth strategy, financial analysis and portfolio management for Australians.",
    areaServed: [
      { "@type": "City", name: "Adelaide" },
      { "@type": "City", name: "Brisbane" },
      { "@type": "State", name: "Queensland" },
      { "@type": "Country", name: "Australia" },
    ],
    sources: [
      "Live LMM JSON-LD and privacy page (phone, email, ACL, areaServed) (Certain)",
      "Third-party directories list 39/422 Pulteney St Adelaide SA 5000 (Likely; not on LMM site)",
    ],
    todos: [
      "Confirm Google Place ID and whether the Pulteney St address is the public GBP pin before adding streetAddress, geo, embed or Review us",
      "Opening hours appear on directories (9:30-16:30 weekdays) but not on the live site: confirm before schema",
    ],
  },

  "wholesale-homes": {
    slug: "wholesale-homes",
    name: "Wholesale Homes Australia",
    url: "https://www.wholesalehomes.com.au",
    mode: "service-area",
    schemaType: "RealEstateAgent",
    telephone: "+61488165908",
    email: "hello@wholesalehomes.com.au",
    areaServed: [{ "@type": "Country", name: "Australia" }],
    sources: [
      "Live wholesalehomes.com.au schema (Certain)",
      "Memory: Wholesale GBP not created yet (Shane advised to wait, Oct 2026)",
    ],
    todos: ["No GBP yet: no placeId, sameAs Google, embed or Review us"],
  },

  "bo-consultancy": {
    slug: "bo-consultancy",
    name: "BO Consulting",
    url: "https://www.boconsulting.com.au",
    mode: "service-area",
    schemaType: "EmploymentAgency",
    email: "info@boconsulting.com.au",
    description:
      "Australia's specialist blue-collar workforce recruitment partner. Permanent placement, labour hire and workforce solutions across Construction, Mining, Manufacturing, Transport, Civil, Trades, Warehousing and Logistics.",
    areaServed: [{ "@type": "Country", name: "Australia" }],
    openingHoursSpecification: [
      { days: [...WEEKDAYS], opens: "09:00", closes: "17:00" },
    ],
    sources: [
      "Live boconsulting.com.au schema openingHours Mo-Fr 09:00-17:00 and contact copy (Certain)",
    ],
    todos: ["No published street address or Google Place ID", "No public phone in schema"],
  },

  "tributum-law-v2": {
    slug: "tributum-law-v2",
    name: "Tributum Law",
    url: "https://tributumlaw.com",
    mode: "shopfront",
    schemaType: "LegalService",
    telephone: "+61405014888",
    email: "contact@tributumlaw.com",
    description:
      "Adelaide's dedicated tax and trust law firm. International tax, ATO disputes, trusts and family wealth, excise and duties.",
    address: {
      streetAddress: "Level 1, 195 Victoria Square",
      addressLocality: "Adelaide",
      addressRegion: "SA",
      postalCode: "5000",
      addressCountry: "AU",
    },
    mapsQuery: "Level 1, 195 Victoria Square, Adelaide SA 5000, Australia",
    areaServed: [{ "@type": "Country", name: "Australia" }],
    openingHoursSpecification: [
      { days: [...WEEKDAYS], opens: "09:00", closes: "18:00" },
    ],
    sources: [
      "Live /sites/tributum-law-v2 schema + page copy Mon-Fri 9am-6pm and Level 1, 195 Victoria Square (Certain)",
    ],
    todos: ["Google Place ID not confirmed from Maps HTML (JS-rendered). Add when Shane pastes it."],
  },

  sunder: {
    slug: "sunder",
    name: "SUNDER",
    url: "https://sunder.com.au",
    mode: "service-area",
    schemaType: "Organization",
    email: "hello@sunder.com.au",
    areaServed: [{ "@type": "Country", name: "Australia" }],
    sources: [
      "Live sunder.com.au Organization schema (Certain)",
      "Memory: SUNDER has no GBP yet (Nov 2026 plan)",
    ],
    todos: ["No GBP, no public address, no placeId. Service-area only until GBP is set up safely."],
  },

  "nico-moretti": {
    slug: "nico-moretti",
    name: "Nico Moretti",
    url: "https://nicomoretti.au",
    mode: "service-area",
    schemaType: "Person",
    areaServed: [
      { "@type": "City", name: "Adelaide" },
      { "@type": "AdministrativeArea", name: "South Australia" },
      { "@type": "Country", name: "Australia" },
    ],
    sources: [
      "public/clients/nico-moretti/index.html Person + Service JSON-LD (Certain): Adelaide / South Australia, no street address",
    ],
    todos: [
      "Confirm whether a public GBP exists before adding placeId, Review us or embed",
      "City HTML pages (Brisbane/Sydney/etc) are marketing pages; keep service-area, no fake shop pins",
    ],
  },

  "inkfx-printing": {
    slug: "inkfx-printing",
    name: "InkFX Printing",
    url: "https://www.inkfxprinting.com",
    mode: "shopfront",
    schemaType: "PrintShop",
    telephone: "+611300903065",
    email: "info@inkfx.com.au",
    description: "Multi-award winning photographic printing on the Gold Coast",
    address: {
      streetAddress: "3/17 Indy Court",
      addressLocality: "Carrara",
      addressRegion: "QLD",
      postalCode: "4211",
      addressCountry: "AU",
    },
    // Coords from exa.ai place card for Indy Court Carrara listing (Likely).
    geo: { latitude: -28.012169, longitude: 153.347325 },
    mapsQuery: "InkFX Printing, 3/17 Indy Court, Carrara QLD 4211, Australia",
    areaServed: [{ "@type": "Country", name: "Australia" }],
    openingHoursSpecification: [
      { days: [...WEEKDAYS], opens: "09:00", closes: "17:00" },
    ],
    sameAs: [
      "https://www.instagram.com/inkfxprinting",
      "https://www.facebook.com/inkfxprinting",
    ],
    sources: [
      "inkfxprinting.com/pages/contact and FAQ pickup address 3/17 Indy Court Carrara (Certain)",
      "Site copy Monday to Friday 9am to 5pm AEST (Certain)",
      "exa.ai place coords for Indy Court (Likely)",
    ],
    todos: [
      "Google Place ID not confirmed. Review us button waits on placeId.",
      "Older directory still shows 6 Harry Mills Dr Worongary: confirm GBP pin is Indy Court before publish",
      "Blob HTML only: patch script prepared, do not upload until Shane approves",
    ],
  },

  "blue-sky-plumbing": {
    slug: "blue-sky-plumbing",
    name: "Blue Sky Plumbing",
    url: "https://www.saabai.ai/sites/blue-sky-plumbing",
    mode: "service-area",
    schemaType: "LocalBusiness",
    sources: [
      "Live page shows placeholder phone +61412345678 and Sydney CBD geo (Certain these look like demo values)",
    ],
    todos: [
      "Demo/placeholder NAP on live page. Do not promote maps pack until real phone, address and Place ID are confirmed with the client.",
      "Blob HTML only: patch script prepared but must stay off until NAP is real",
    ],
  },

  "heaven-thai-massage": {
    slug: "heaven-thai-massage",
    name: "Heaven Thai Massage",
    url: "https://www.saabai.ai/sites/heaven-thai-massage",
    mode: "shopfront",
    schemaType: "LocalBusiness",
    excluded: true,
    sources: ["Excluded until client pays (Shane, 5 Nov 2026)"],
    todos: ["No maps pack changes until payment"],
  },
};

export function getMapsProfile(slug: string): MapsProfile | undefined {
  return MAPS_PROFILES[slug];
}

export function activeMapsProfiles(): MapsProfile[] {
  return Object.values(MAPS_PROFILES).filter((p) => !p.excluded);
}
