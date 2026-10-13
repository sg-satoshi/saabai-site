import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./admin-tokens.css";
import "./papp.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-portal-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-portal-mono",
  display: "swap",
});

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
