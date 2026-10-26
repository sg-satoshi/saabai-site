import { formatAud, WEBSITE_TIERS } from "./website-tiers";

export const SITE_URL = "https://www.saabai.ai";
/** Firm plan price published on /legal. AUD per month. */
export const LEX_FIRM_MONTHLY = 299;
export const ORG_ID = `${SITE_URL}/#organization`;
export const FOUNDER_ID = `${SITE_URL}/#shane-goldberg`;

/**
 * Public NAP. There is no published phone number, so telephone is omitted
 * everywhere rather than guessed. Address is locality and region only.
 */
export const NAP = {
  name: "Saabai",
  legalName: "Saabai",
  url: SITE_URL,
  email: "hello@saabai.ai",
  abn: "71 889 082 572",
  taxID: "ABN 71 889 082 572",
  addressLine: "Merrimac QLD 4226, Australia",
  logo: `${SITE_URL}/brand/saabai-logo.png`,
} as const;

/** The only social or directory profile linked in this repo. */
export const SAME_AS = ["https://www.linkedin.com/in/shanegoldberg-ai"] as const;

export const POSTAL_ADDRESS = {
  "@type": "PostalAddress" as const,
  addressLocality: "Merrimac",
  addressRegion: "QLD",
  postalCode: "4226",
  addressCountry: "AU",
};

export const AREA_SERVED = [
  { "@type": "City" as const, name: "Gold Coast" },
  { "@type": "City" as const, name: "Brisbane" },
  { "@type": "State" as const, name: "Queensland" },
  { "@type": "Country" as const, name: "Australia" },
];

export const founderSchema = {
  "@type": "Person",
  "@id": FOUNDER_ID,
  name: "Shane Goldberg",
  jobTitle: "Founder",
  worksFor: { "@id": ORG_ID },
  url: `${SITE_URL}/about`,
  sameAs: [...SAME_AS],
};

type Area = (typeof AREA_SERVED)[number] | Record<string, unknown>;

/** Service node. Pass offers only when that price is already published on the page. */
export function serviceSchema(o: {
  id: string;
  name: string;
  serviceType: string;
  description: string;
  url: string;
  areaServed?: Area | Area[];
  offers?: object | object[];
  hasOfferCatalog?: object;
}) {
  return {
    "@type": "Service",
    "@id": o.id,
    name: o.name,
    serviceType: o.serviceType,
    description: o.description,
    url: o.url,
    provider: { "@id": ORG_ID },
    areaServed: o.areaServed ?? AREA_SERVED,
    ...(o.offers ? { offers: o.offers } : {}),
    ...(o.hasOfferCatalog ? { hasOfferCatalog: o.hasOfferCatalog } : {}),
  };
}

export function withContext<T extends object>(node: T) {
  return { "@context": "https://schema.org", ...node };
}

export function schemaGraph(nodes: object[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.map((node) => {
      const copy = { ...(node as Record<string, unknown>) };
      delete copy["@context"];
      return copy;
    }),
  };
}

/** Mia, the on-site AI assistant. No price is published for Mia itself. */
export const miaServiceSchema = withContext(
  serviceSchema({
    id: `${SITE_URL}/#mia`,
    name: "Mia",
    serviceType: "AI receptionist and website chatbot",
    description:
      "Mia is Saabai's own AI assistant on saabai.ai. It answers website visitors, captures enquiry details and sends alerts by email, Telegram, WhatsApp or SMS.",
    url: SITE_URL,
  }),
);

/** Lex at /legal. The Firm price is the one published on that page. */
export const lexServiceSchema = withContext(
  serviceSchema({
    id: `${SITE_URL}/legal#service`,
    name: "Lex",
    serviceType: "AI legal research and drafting",
    description:
      "Lex is an AI legal assistant for research and drafting at Australian law firms. It searches public Australian government sources, including ATO rulings and Commonwealth legislation, and every answer cites its source.",
    url: `${SITE_URL}/legal`,
    offers: {
      "@type": "Offer",
      name: "Firm",
      price: String(LEX_FIRM_MONTHLY),
      priceCurrency: "AUD",
      description: "3 lawyer seats, unlimited research and 20 documents a month. AUD. GST not applicable.",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: String(LEX_FIRM_MONTHLY),
        priceCurrency: "AUD",
        unitText: "MONTH",
      },
    },
  }),
);

/**
 * Monthly care prices published on /websites.
 * Build prices stay in the description so the Offer price is the monthly figure.
 */
const WEBSITE_CARE = WEBSITE_TIERS.map((tier) => ({
  name: tier.name,
  monthly: String(tier.monthly),
  build: formatAud(tier.buildFrom),
}));

export const websitesServiceNode = serviceSchema({
  id: `${SITE_URL}/websites#service`,
  name: "Saabai website care plans",
  serviceType: "Website build, hosting and care plan",
  description:
    "Saabai builds, hosts and manages small business websites with a trained AI enquiry chatbot built in. Monthly care covers hosting, security, updates and keeping the AI trained.",
  url: `${SITE_URL}/websites`,
  areaServed: AREA_SERVED,
  offers: WEBSITE_CARE.map((t) => ({
    "@type": "Offer",
    name: `${t.name} care plan`,
    description: `${t.name} care is $${Number(t.monthly).toLocaleString("en-AU")} a month. Builds start from ${t.build}.`,
    price: t.monthly,
    priceCurrency: "AUD",
    availability: "https://schema.org/InStock",
    url: `${SITE_URL}/websites`,
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: t.monthly,
      priceCurrency: "AUD",
      unitCode: "MON",
      referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
    },
  })),
});

const entryTier = WEBSITE_TIERS[0];

export const receptionistServiceNode = serviceSchema({
  id: `${SITE_URL}/ai-receptionist-gold-coast#service`,
  name: "AI receptionist for Gold Coast businesses",
  serviceType: "Website AI chatbot",
  description:
    "A website chatbot for Gold Coast businesses. It answers visitors on the site and alerts you by email, SMS, WhatsApp or Telegram.",
  url: `${SITE_URL}/ai-receptionist-gold-coast`,
  areaServed: AREA_SERVED,
  offers: {
    "@type": "Offer",
    name: `${entryTier.name} website with chatbot`,
    price: String(entryTier.buildFrom),
    priceCurrency: "AUD",
    url: `${SITE_URL}/websites`,
    description: `${entryTier.name} starts from ${formatAud(entryTier.buildFrom)} plus ${formatAud(entryTier.monthly)} a month care. The chatbot is included in the website tiers.`,
  },
});

export const lawFirmChatbotServiceNode = serviceSchema({
  id: `${SITE_URL}/ai-chatbot-law-firms#service`,
  name: "AI chatbot and AI legal assistant for Australian law firms",
  serviceType: "AI chatbot for law firms",
  description:
    "Custom AI chatbots and Lex, an AI workspace for Australian law firms. Capture after-hours enquiries and get alerts by email, SMS or WhatsApp.",
  url: `${SITE_URL}/ai-chatbot-law-firms`,
  areaServed: AREA_SERVED,
  offers: {
    "@type": "Offer",
    name: "Lex Firm",
    price: String(LEX_FIRM_MONTHLY),
    priceCurrency: "AUD",
    url: `${SITE_URL}/legal`,
    description: `The Lex Firm plan is $${LEX_FIRM_MONTHLY} a month. A custom website chatbot is quoted on a call.`,
  },
});

/** Prices already published on /websites, /blueprint and /score. */
export const LOCATION_OFFER_CATALOG = {
  "@type": "OfferCatalog",
  name: "Saabai offers",
  itemListElement: [
    {
      "@type": "Offer",
      name: "Web Solutions",
      price: "2000",
      priceCurrency: "AUD",
      url: `${SITE_URL}/websites`,
      description: "Website build, hosting and management from $2,000 plus $100 per month.",
    },
    { "@type": "Offer", name: "Saabai Blueprint Starter", price: "497", priceCurrency: "AUD", url: `${SITE_URL}/blueprint` },
    { "@type": "Offer", name: "Saabai Blueprint Pro", price: "1497", priceCurrency: "AUD", url: `${SITE_URL}/blueprint` },
    { "@type": "Offer", name: "Saabai Blueprint Business", price: "3500", priceCurrency: "AUD", url: `${SITE_URL}/blueprint` },
    { "@type": "Offer", name: "AI Readiness Score", price: "0", priceCurrency: "AUD", url: `${SITE_URL}/score` },
  ],
};

export function locationServiceSchema(city: string, url: string, description: string, serviceName?: string) {
  return withContext(serviceSchema({
    id: `${url}#service`,
    name: serviceName ?? `Websites and AI automation in ${city}`,
    serviceType: "Website build, hosting and AI automation",
    description,
    url,
    areaServed: {
      "@type": "City",
      name: city,
      containedInPlace: { "@type": "AdministrativeArea", name: "Queensland, Australia" },
    },
    hasOfferCatalog: LOCATION_OFFER_CATALOG,
  }));
}

export const organizationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "ProfessionalService"],
      "@id": ORG_ID,
      name: NAP.name,
      legalName: NAP.legalName,
      url: NAP.url,
      logo: NAP.logo,
      image: `${SITE_URL}/og-image.png`,
      email: NAP.email,
      taxID: NAP.taxID,
      identifier: { "@type": "PropertyValue", propertyID: "ABN", value: "71889082572" },
      description:
        "Saabai builds, hosts and manages websites for small businesses, and delivers the Saabai Blueprint AI audit. Based in Merrimac on the Gold Coast, serving Brisbane, Queensland and Australia.",
      address: POSTAL_ADDRESS,
      areaServed: AREA_SERVED,
      priceRange: "$100-$3,500",
      founder: { "@id": FOUNDER_ID },
      sameAs: [...SAME_AS],
    },
    founderSchema,
    {
      "@type": "Service",
      "@id": `${SITE_URL}/#website-care-plans`,
      name: "Website care plans",
      serviceType: "Website design, hosting and management",
      provider: { "@id": ORG_ID },
      areaServed: { "@type": "Country", name: "Australia" },
      url: `${SITE_URL}/websites`,
      offers: [
        { name: "Presence", price: "100" },
        { name: "Growth", price: "200" },
        { name: "Signature", price: "300" },
      ].map((o) => ({
        "@type": "Offer",
        name: o.name,
        price: o.price,
        priceCurrency: "AUD",
        priceSpecification: { "@type": "UnitPriceSpecification", price: o.price, priceCurrency: "AUD", unitText: "MONTH" },
      })),
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/#blueprint`,
      name: "Saabai Blueprint AI audit",
      serviceType: "AI audit and planning",
      provider: { "@id": ORG_ID },
      areaServed: { "@type": "Country", name: "Australia" },
      url: `${SITE_URL}/blueprint`,
      offers: [
        { name: "Starter", price: "497" },
        { name: "Pro", price: "1497" },
        { name: "Business", price: "3500" },
      ].map((o) => ({ "@type": "Offer", name: o.name, price: o.price, priceCurrency: "AUD" })),
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: NAP.name,
      inLanguage: "en-AU",
      publisher: { "@id": ORG_ID },
    },
  ],
};
