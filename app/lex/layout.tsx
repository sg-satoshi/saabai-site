import type { Metadata } from "next";
import localFont from "next/font/local";
import "./lex.css";

const inter = localFont({ src: "../fonts/inter-latin-wght-normal.woff2", weight: "100 900", variable: "--font-lex-sans", display: "swap" });
const mono = localFont({ src: "../fonts/geist-mono-latin-wght-normal.woff2", weight: "100 900", variable: "--font-lex-mono", display: "swap" });
// Answer text and quoted extracts only (Shane's call, 19 Oct): interface text stays Inter.
const serif = localFont({ src: "../fonts/source-serif-4-latin-wght-normal.woff2", weight: "200 900", variable: "--font-lex-serif", display: "swap" });

export const metadata: Metadata = {
  title: { absolute: "Lex, Australian Legal Research | Saabai" },
  robots: { index: false, follow: false },
};

export default function LexLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.variable} ${mono.variable} ${serif.variable}`}>{children}</div>;
}
