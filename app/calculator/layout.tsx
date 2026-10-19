import type { Metadata } from "next";
import JsonLd from "../components/JsonLd";
import { pageMeta, breadcrumbSchema } from "@/lib/seo-meta";

export const metadata: Metadata = pageMeta({
  path: "/calculator",
  title: "Free Automation Cost Calculator | Saabai",
  description: "Estimate how many hours and dollars repetitive admin costs your business each year. Free, instant, no sign-up. Built for Australian small businesses.",
});

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Cost calculator", path: "/calculator" }])} />
      {children}
    </>
  );
}
