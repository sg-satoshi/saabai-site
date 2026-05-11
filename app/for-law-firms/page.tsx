import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Automation for Law Firms Australia | Saabai",
  description:
    "Saabai builds AI systems that recover 20+ hours a week for law firms — automated client intake, matter tracking, and document workflows. Free strategy call.",
  alternates: { canonical: "https://www.saabai.ai/for-law-firms" },
  openGraph: {
    url: "https://www.saabai.ai/for-law-firms",
    title: "AI Automation for Law Firms Australia | Saabai",
    description:
      "Saabai builds AI systems that recover 20+ hours a week for law firms — automated client intake, matter tracking, and document workflows. Free strategy call.",
  },
};

import CounselContent from "./counsel-content";

export default function ForLawFirms() {
  return <CounselContent />;
}
