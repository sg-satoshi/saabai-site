export const SITE_URL = "https://www.saabai.ai";
export const ORG_ID = `${SITE_URL}/#organization`;
export const FOUNDER_ID = `${SITE_URL}/#shane-goldberg`;

export const founderSchema = {
  "@type": "Person",
  "@id": FOUNDER_ID,
  name: "Shane Goldberg",
  jobTitle: "Founder",
  worksFor: { "@id": ORG_ID },
  url: `${SITE_URL}/about`,
  image: `${SITE_URL}/shane-goldberg.png`,
  sameAs: ["https://www.linkedin.com/in/shanegoldberg-ai"],
};

export const organizationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "ProfessionalService"],
      "@id": ORG_ID,
      name: "Saabai",
      legalName: "Saabai",
      url: SITE_URL,
      logo: `${SITE_URL}/brand/saabai-logo.png`,
      image: `${SITE_URL}/og-image.png`,
      email: "hello@saabai.ai",
      taxID: "71 889 082 572",
      identifier: { "@type": "PropertyValue", propertyID: "ABN", value: "71889082572" },
      description:
        "Gold Coast based Saabai builds, hosts and manages websites for small businesses on monthly care plans, and delivers the Saabai Blueprint AI audit.",
      address: {
        "@type": "PostalAddress",
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
      priceRange: "$$",
      founder: { "@id": FOUNDER_ID },
      sameAs: ["https://www.linkedin.com/in/shanegoldberg-ai"],
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
      name: "Saabai",
      inLanguage: "en-AU",
      publisher: { "@id": ORG_ID },
    },
  ],
};
