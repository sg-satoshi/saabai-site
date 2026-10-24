import type { Metadata } from "next";
import { publicPageMeta } from "@/lib/seo-pages";

export const metadata: Metadata = publicPageMeta.score;

export default function ScoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
