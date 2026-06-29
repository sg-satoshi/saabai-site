import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./styles.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-wh" });

const SITE_URL = "https://www.wholesalehomes.com.au";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Wholesale Homes Australia | House & Land Packages Below Market",
    template: "%s | Wholesale Homes Australia",
  },
  description: "Exclusive pre-market access to Australia's best new home builds, at wholesale pricing. Partnered with Metricon and 12 leading builders.",
  keywords: ["house and land packages Australia", "wholesale property Australia", "new home builds", "below market property", "house and land deals"],
  authors: [{ name: "Nick Foale" }],
  creator: "Wholesale Homes Australia",
  publisher: "Wholesale Homes Australia",
  icons: {
    icon: "/sites/wholesale-homes/favicon.svg",
  },
  robots: "index, follow",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: "Wholesale Homes Australia",
  url: SITE_URL,
  founder: {
    "@type": "Person",
    name: "Nick Foale",
    jobTitle: "Principal Advisor",
    knowsAbout: ["Real Estate", "Property Investment", "Australian Tax Law", "Mortgage Broking"],
  },
  description:
    "House & land packages below market price. Exclusive pre-market access to Australia's best new home builds in VIC, NSW, and QLD.",
  email: "hello@wholesalehomes.com.au",
  areaServed: [
    { "@type": "State", name: "Victoria" },
    { "@type": "State", name: "New South Wales" },
    { "@type": "State", name: "Queensland" },
  ],
  priceRange: "$550K - $800K",
  knowsAbout: ["House and Land Packages", "New Home Builds", "Property Investment", "Real Estate"],
};

export default function WholesaleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${inter.variable} bg-[#f8f6f2] text-[#1A2B3C] antialiased`}
      style={{
        fontFamily: "var(--font-wh), system-ui, -apple-system, sans-serif",
        fontFeatureSettings: "'ss01', 'cv11'",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      {children}
    </div>
  );
}
