import type { Metadata } from "next";
import { publicPageMeta } from "@/lib/seo-pages";
import BreadcrumbLd from "../components/BreadcrumbLd";

export const metadata: Metadata = publicPageMeta.calculator;

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbLd name="Calculator" path="/calculator" />
      {children}
    </>
  );
}
