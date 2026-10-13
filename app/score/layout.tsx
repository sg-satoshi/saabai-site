import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free AI Readiness Score",
  description: "12 quick questions, an instant score out of 100 and three quick wins for your small business or professional practice.",
  alternates: { canonical: "/score" },
};

export default function ScoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
