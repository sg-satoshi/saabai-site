import type { Metadata } from "next";
import { Inter, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./lex.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-lex-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-lex-mono", display: "swap" });
// Answer text and quoted extracts only (Shane's call, 19 Oct): interface text stays Inter.
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-lex-serif", display: "swap", weight: ["400", "600"] });

export const metadata: Metadata = {
  title: "Lex: Australian Legal Research",
  robots: { index: false, follow: false },
};

export default function LexLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.variable} ${mono.variable} ${serif.variable}`}>{children}</div>;
}
