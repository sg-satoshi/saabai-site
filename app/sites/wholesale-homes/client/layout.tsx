import type { ReactNode } from "react";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { wholesaleBasePath } from "../../../../lib/wholesale-paths";
import { WhBaseProvider } from "../_lib/base-context";

// Editorial "tear sheet" type system for the client portal:
// Fraunces (optical serif) carries monumental figures/headings, Manrope
// handles UI/labels. Exposed as CSS variables so any page under /client
// (calculators, resources, dashboard, account) can opt in via
// var(--font-fraunces) / var(--font-manrope).
const fraunces = localFont({ src: "../../../fonts/fraunces-latin-wght-normal.woff2", weight: "100 900", variable: "--font-fraunces", display: "swap" });
const manrope = localFont({ src: "../../../fonts/manrope-latin-wght-normal.woff2", weight: "200 800", variable: "--font-manrope", display: "swap" });

export default async function ClientLayout({ children }: { children: ReactNode }) {
  // Links inside the portal need the /sites/wholesale-homes prefix on saabai.ai
  // (e.g. a Saabai admin previewing it) and none on wholesalehomes.com.au.
  const base = wholesaleBasePath((await headers()).get("host"));
  // display:contents so the wrapper contributes no box — it only propagates
  // the font CSS variables down the tree.
  return (
    <div className={`${fraunces.variable} ${manrope.variable}`} style={{ display: "contents" }}>
      <WhBaseProvider base={base}>{children}</WhBaseProvider>
    </div>
  );
}
