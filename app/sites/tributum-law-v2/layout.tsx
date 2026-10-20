import type { Metadata } from "next";
import { clientSiteMetadata } from "../../../lib/client-site";

// Tributum Law v2 is a redesign preview of tributumlaw.com served from the
// factory path, so it points canonical at the live firm site. It has no custom
// domain in the site registry, so /sites/tributum-law-v2 stays noindex.
const SITE_URL = "https://tributumlaw.com";
const DESCRIPTION =
  "Adelaide's dedicated tax and trust law firm. International tax, ATO disputes, trusts and family wealth, excise and duties.";

export const metadata: Metadata = clientSiteMetadata({
  siteUrl: SITE_URL,
  name: "Tributum Law",
  title: "Tributum Law | Tax & Trust Law, Adelaide",
  description: DESCRIPTION,
});

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LegalService",
  "@id": `${SITE_URL}/#firm`,
  name: "Tributum Law",
  description: DESCRIPTION,
  url: SITE_URL,
  telephone: "+61405014888",
  email: "contact@tributumlaw.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Level 1, 195 Victoria Square",
    addressLocality: "Adelaide",
    addressRegion: "SA",
    postalCode: "5000",
    addressCountry: "AU",
  },
  areaServed: { "@type": "Country", name: "Australia" },
};

export default function TributumV2Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      {children}
    </>
  );
}
