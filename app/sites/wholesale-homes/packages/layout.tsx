import type { Metadata } from "next";

const PAGE_URL = "https://www.wholesalehomes.com.au";

export const metadata: Metadata = {
  title: "House & Land Packages | VIC, NSW, QLD, SA | Wholesale Homes Australia",
  description: "Browse pre-market house and land packages in VIC, NSW, QLD and SA from Metricon and leading builders. Members see wholesale pricing after signing in.",
  alternates: { canonical: `${PAGE_URL}/packages` },
  openGraph: {
    title: "House & Land Packages | VIC, NSW, QLD, SA",
    description: "Browse pre-market house and land packages. Members see wholesale pricing after signing in.",
    url: `${PAGE_URL}/packages`,
    images: "/sites/wholesale-homes/hero-home.jpg",
  },
  twitter: {
    title: "House & Land Packages | VIC, NSW, QLD, SA",
    description: "Browse pre-market house and land packages. Members see wholesale pricing after signing in.",
    images: "/sites/wholesale-homes/hero-home.jpg",
  },
};

export default function PackagesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
