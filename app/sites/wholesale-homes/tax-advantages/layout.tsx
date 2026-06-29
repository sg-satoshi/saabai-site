import type { Metadata } from "next";

const PAGE_URL = "https://www.wholesalehomes.com.au";

export const metadata: Metadata = {
  title: "2026 Tax Changes for Property Investors | New Build Advantages",
  description: "The 2026 Federal Budget rewrote the rules. Negative gearing limited to new builds. CGT advantages preserved. $47B in housing supply funding. Here's how investors benefit.",
  alternates: { canonical: `${PAGE_URL}/tax-advantages` },
  openGraph: {
    title: "2026 Tax Changes for Property Investors | New Build Advantages",
    url: `${PAGE_URL}/tax-advantages`,
  },
};

export default function TaxAdvantagesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
