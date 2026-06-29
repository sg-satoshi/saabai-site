import type { Metadata } from "next";

const PAGE_URL = "https://www.wholesalehomes.com.au";

export const metadata: Metadata = {
  title: "Property Market Insights & Investor Guides | Wholesale Homes Australia Blog",
  description: "Expert analysis on Australian property market, 2026 tax reforms, new build investment strategies, and house and land package insights from principal advisor Nick Foale.",
  alternates: { canonical: `${PAGE_URL}/blog` },
  openGraph: {
    title: "Property Market Insights & Investor Guides | Blog",
    url: `${PAGE_URL}/blog`,
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
