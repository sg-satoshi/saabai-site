import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Lex, Australian Legal Research | Saabai" },
  alternates: { canonical: "https://www.saabai.ai/lex" },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Saabai",
    url: "https://www.saabai.ai/lex",
    title: "Lex, Australian Legal Research | Saabai",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Saabai, websites and AI systems for small businesses" }],
  },
  // The Lex app (sign-in) is not for search. /legal is the indexed Lex page.
  robots: { index: false, follow: true },
};

export default function LexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
