import type { Metadata } from "next";

const PAGE_URL = "https://www.wholesalehomes.com.au";

export const metadata: Metadata = {
  title: "House & Land Packages | Below Market Pricing | VIC, NSW, QLD",
  description: "Browse 6 exclusive house and land packages at wholesale pricing in VIC, NSW, and QLD. Pre-market access before they hit the public market. Partnered with Metricon and 12 leading builders.",
  alternates: { canonical: `${PAGE_URL}/packages` },
  openGraph: {
    title: "House & Land Packages | Below Market Pricing | VIC, NSW, QLD",
    description: "Browse 6 exclusive house and land packages at wholesale pricing. Pre-market access via builder partnerships.",
    url: `${PAGE_URL}/packages`,
    images: "/sites/wholesale-homes/hero-home.jpg",
  },
  twitter: {
    title: "House & Land Packages | Below Market Pricing | VIC, NSW, QLD",
    description: "Browse 6 exclusive house and land packages at wholesale pricing.",
    images: "/sites/wholesale-homes/hero-home.jpg",
  },
};

export default function PackagesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
