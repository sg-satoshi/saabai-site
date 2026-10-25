import type { Metadata } from "next";
import localFont from "next/font/local";
import "./admin.css";

const inter = localFont({ src: "../fonts/inter-latin-wght-normal.woff2", weight: "100 900", variable: "--font-admin-sans", display: "swap" });

const geistMono = localFont({ src: "../fonts/geist-mono-latin-wght-normal.woff2", weight: "100 900", variable: "--font-admin-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Mission Control", template: "%s | Saabai Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`admin-root ${inter.variable} ${geistMono.variable}`} style={{ fontFamily: "var(--font-admin-sans), Inter, system-ui, sans-serif" }}>
      {children}
    </div>
  );
}
