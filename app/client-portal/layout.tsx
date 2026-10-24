import type { Metadata } from "next";
import localFont from "next/font/local";
import "./admin-tokens.css";
import "./papp.css";

const inter = localFont({ src: "../fonts/inter-latin-wght-normal.woff2", weight: "100 900", variable: "--font-portal-sans", display: "swap" });

const geistMono = localFont({ src: "../fonts/geist-mono-latin-wght-normal.woff2", weight: "100 900", variable: "--font-portal-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Client Portal", template: "%s | Saabai" },
  robots: { index: false, follow: false },
};

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`portal-root ${inter.variable} ${geistMono.variable}`} style={{ fontFamily: "var(--font-portal-sans), Inter, system-ui, sans-serif" }}>
      {children}
    </div>
  );
}
