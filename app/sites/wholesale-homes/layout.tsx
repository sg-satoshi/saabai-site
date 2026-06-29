import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./styles.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-wh" });

const SITE_URL = "https://www.wholesalehomes.com.au";

export const metadata: Metadata = {
  title: {
    absolute: "Wholesale Homes Australia · House & Land Packages Below Market",
  },
  description: "Exclusive pre-market access to Australia's best new home builds, at wholesale pricing. Partnered with Metricon and 12 leading builders.",
  keywords: ["house and land packages Australia", "wholesale property Australia", "new home builds", "below market property", "house and land deals"],
  authors: [{ name: "Nick Foale" }],
  creator: "Wholesale Homes Australia",
  publisher: "Wholesale Homes Australia",
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/sites/wholesale-homes/favicon.svg",
  },
  openGraph: {
    title: "Wholesale Homes Australia · House & Land Below Market",
    description: "Pre-market access to Australia's best new house and land packages, secured at wholesale pricing.",
    siteName: "Wholesale Homes Australia",
    type: "website",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Wholesale Homes Australia · House & Land Below Market",
    description: "Pre-market access to Australia's best new house and land packages, secured at wholesale pricing.",
    images: "/sites/wholesale-homes/hero-home.jpg",
  },
  robots: "index, follow",
  alternates: {
    canonical: SITE_URL,
  },
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
      {children}
    </div>
  );
}
