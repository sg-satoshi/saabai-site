import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Wholesale Homes Australia · House & Land Packages Below Market",
  description: "Exclusive pre-market access to Australia's best new home builds, at wholesale pricing. Partnered with Metricon and 12 leading builders.",
  openGraph: {
    title: "Wholesale Homes Australia · House & Land Below Market",
    description: "Pre-market access to Australia's best new house and land packages, secured at wholesale pricing.",
    siteName: "Wholesale Homes Australia",
    type: "website",
  },
};

export default function WholesaleHomesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-sans bg-[#f8f6f2] text-[#1A2B3C] antialiased" style={{ fontFeatureSettings: "'ss01', 'cv11'" }}>
      {children}
    </div>
  );
}
