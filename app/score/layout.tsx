import type { Metadata } from "next";
import { publicPageMeta } from "@/lib/seo-pages";
import BreadcrumbLd from "../components/BreadcrumbLd";

export const metadata: Metadata = publicPageMeta.score;

export default function ScoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbLd name="Free AI Readiness Score" path="/score" />
      {children}
    </>
  );
}
