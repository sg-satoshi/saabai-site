import type { ReactNode } from "react";
import { Fraunces, Manrope } from "next/font/google";

// Editorial "tear sheet" type system for the client calculators:
// Fraunces (optical serif) carries the monumental financial figures,
// Manrope handles UI/labels. Exposed as CSS variables so every calculator
// page can opt into them via var(--font-fraunces) / var(--font-manrope).
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export default function CalculatorsLayout({ children }: { children: ReactNode }) {
  // display:contents so the wrapper contributes no box — it only propagates
  // the font CSS variables down the tree.
  return (
    <div className={`${fraunces.variable} ${manrope.variable}`} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
