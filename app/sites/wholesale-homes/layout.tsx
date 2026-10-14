import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NewsletterPopup } from "./_components/NewsletterPopup";

const SITE_URL = "https://www.wholesalehomes.com.au";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Sub-page titles already carry "| Wholesale Homes Australia", so the template
  // is a pass-through (stops Saabai's "%s | Saabai" template leaking in).
  title: {
    absolute: "House & Land Packages Below Market Price | Wholesale Homes Australia",
    template: "%s",
  },
  manifest: null,
  appleWebApp: { capable: false, title: "Wholesale Homes Australia" },
  description:
    "Australia's exclusive pre-market access to house and land packages below bank valuation. Partnered with Metricon, Stockland, Mirvac & 12 leading builders. Speak with principal advisor Nick Foale.",
  keywords: [
    "wholesale homes Australia",
    "house and land packages below market price",
    "below valuation property Australia",
    "pre-market house and land deals",
    "Metricon house and land packages",
    "wholesale property investments",
    "house and land packages Melbourne",
    "house and land packages Sydney",
    "house and land packages Brisbane",
    "new build investment Australia",
    "below market house and land",
    "Nick Foale property advisor",
  ],
  authors: [{ name: "Nick Foale", url: SITE_URL }],
  creator: "Wholesale Homes Australia",
  publisher: "Wholesale Homes Australia",
  icons: {
    icon: "/sites/wholesale-homes/favicon.svg",
    apple: "/sites/wholesale-homes/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: SITE_URL,
    siteName: "Wholesale Homes Australia",
    title: "House & Land Packages Below Market Price | Wholesale Homes Australia",
    description:
      "Secure pre-market access to Australia's best house and land packages at wholesale pricing. Partnered with Metricon, Stockland, Mirvac & 12 leading builders. Below bank valuation from day one.",
    images: [
      {
        url: "/sites/wholesale-homes/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Wholesale Homes Australia - House & Land Packages Below Market Price",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "House & Land Packages Below Market Price | Wholesale Homes Australia",
    description:
      "Australia's pre-market access to house and land packages below bank valuation. Partnered with Metricon, Stockland, Mirvac & 12 builders.",
    images: ["/sites/wholesale-homes/og-image.jpg"],
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "@id": `${SITE_URL}/#organization`,
  name: "Wholesale Homes Australia",
  url: SITE_URL,
  logo: `${SITE_URL}/sites/wholesale-homes/favicon.svg`,
  image: `${SITE_URL}/sites/wholesale-homes/og-image.jpg`,
  telephone: "+61488165908",
  email: "hello@wholesalehomes.com.au",
  founder: { "@type": "Person", name: "Nick Foale" },
  areaServed: { "@type": "Country", name: "Australia" },
};

export default function WholesaleHomesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
      />
      {children}
      <NewsletterPopup />
    </>
  );
}
