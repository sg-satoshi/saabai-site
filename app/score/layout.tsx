import type { Metadata } from "next";
import JsonLd from "../components/JsonLd";
import { pageMeta, breadcrumbSchema } from "@/lib/seo-meta";

export const metadata: Metadata = pageMeta({
  path: "/score",
  title: "Free AI Readiness Score for Small Businesses | Saabai",
  description: "12 quick questions, about 3 minutes. Get a free score out of 100 and three quick wins for your small business or practice. No credit card.",
});

export default function ScoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Free AI score", path: "/score" }])} />
      {children}
    </>
  );
}
