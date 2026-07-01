import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NewsletterPopup } from "./_components/NewsletterPopup";

const SITE_URL = "https://www.wholesalehomes.com.au";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title:
    "House & Land Packages Below Market Price | Wholesale Homes Australia",
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
    icon: "/sites/wholesale-homes/favicon.png",
    apple: "/sites/wholesale-homes/favicon.png",
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

export default function WholesaleHomesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <NewsletterPopup />
    </>
  );
}
