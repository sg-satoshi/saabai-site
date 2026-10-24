import type { Metadata } from "next";
import { publicPageMeta } from "@/lib/seo-pages";

export const metadata: Metadata = publicPageMeta.calculator;

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
