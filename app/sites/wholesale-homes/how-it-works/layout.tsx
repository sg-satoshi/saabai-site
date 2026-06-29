import type { Metadata } from "next";

const PAGE_URL = "https://www.wholesalehomes.com.au";

export const metadata: Metadata = {
  title: "How Wholesale House & Land Packages Work | 4-Step Process | Wholesale Homes Australia",
  description: "From discovery to keys in four steps. Browse exclusive packages, chat with our principal advisor (finance & RE qualified), secure below market, and build with Metricon.",
  alternates: { canonical: `${PAGE_URL}/how-it-works` },
  openGraph: {
    title: "How Wholesale House & Land Packages Work | 4-Step Process",
    url: `${PAGE_URL}/how-it-works`,
  },
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
