import type { Metadata } from "next";

const PAGE_URL = "https://www.wholesalehomes.com.au";

export const metadata: Metadata = {
  title: "FAQ | Wholesale House & Land Packages | Pricing, Builds, Deposits | Wholesale Homes Australia",
  description: "Answers to 11 common questions about wholesale house and land packages. Pricing structure, build timelines, deposit requirements, tax benefits, and more.",
  alternates: { canonical: `${PAGE_URL}/faq` },
  openGraph: {
    title: "FAQ | Wholesale House & Land Packages",
    url: `${PAGE_URL}/faq`,
  },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
