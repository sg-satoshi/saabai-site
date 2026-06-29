import type { Metadata } from "next";

const PAGE_URL = "https://www.wholesalehomes.com.au";

export const metadata: Metadata = {
  title: "About Wholesale Homes Australia | Principal Advisor Nick Foale",
  description: "Wholesale Homes Australia provides pre-market access to house and land packages below market price. Principal Advisor Nick Foale — 25+ years in banking, mortgage broking, and property.",
  alternates: { canonical: `${PAGE_URL}/about` },
  openGraph: {
    title: "About Wholesale Homes Australia | Nick Foale",
    url: `${PAGE_URL}/about`,
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
