import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Automation Cost Calculator",
  description:
    "Calculate how much repetitive manual work is costing your firm. Free instant estimate — hours lost and dollar cost per year. No sign-up required.",
  alternates: { canonical: "https://www.saabai.ai/calculator" },
  openGraph: {
    url: "https://www.saabai.ai/calculator",
    title: "Free Automation Cost Calculator | Saabai",
    description:
      "Calculate how much repetitive manual work is costing your firm. Free instant estimate — hours lost and dollar cost per year. No sign-up required.",
  },
};

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
