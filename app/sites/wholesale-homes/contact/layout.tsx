import type { Metadata } from "next";

const PAGE_URL = "https://www.wholesalehomes.com.au";

export const metadata: Metadata = {
  title: "Book a Free Discovery Call | Wholesale House & Land Packages | Wholesale Homes Australia",
  description: "Speak with principal advisor Nick Foale about securing a below-market house and land package. 20-minute obligation-free conversation. Finance and real estate qualified.",
  alternates: { canonical: `${PAGE_URL}/contact` },
  openGraph: {
    title: "Book a Free Discovery Call | Wholesale House & Land",
    url: `${PAGE_URL}/contact`,
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
