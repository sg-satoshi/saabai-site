import type { Metadata } from "next";
import localFont from "next/font/local";
import { OG_IMAGE, pageUrl } from "@/lib/seo-meta";
import "./lex.css";
import FeedbackButton from "./_components/FeedbackButton";
import HelpAssistantMount from "./_components/HelpAssistantMount";

const inter = localFont({ src: "../fonts/inter-latin-wght-normal.woff2", weight: "100 900", variable: "--font-lex-sans", display: "swap" });
const mono = localFont({ src: "../fonts/geist-mono-latin-wght-normal.woff2", weight: "100 900", variable: "--font-lex-mono", display: "swap" });
// Answer text and quoted extracts only (Shane's call, 19 Oct): interface text stays Inter.
const serif = localFont({ src: "../fonts/source-serif-4-latin-wght-normal.woff2", weight: "200 900", variable: "--font-lex-serif", display: "swap" });

const LEX_TITLE = "Lex, Australian Legal Research | Saabai";

export const metadata: Metadata = {
  title: { absolute: LEX_TITLE },
  alternates: { canonical: pageUrl("/lex") },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Saabai",
    url: pageUrl("/lex"),
    title: LEX_TITLE,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: LEX_TITLE,
    images: [OG_IMAGE.url],
  },
  // The Lex app (sign-in) is not for search. /legal is the indexed Lex page.
  robots: { index: false, follow: false },
};

export default function LexLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.variable} ${mono.variable} ${serif.variable}`}>{children}<FeedbackButton />
      <HelpAssistantMount /></div>;
}
