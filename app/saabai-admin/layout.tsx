import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./admin.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-admin-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-admin-mono",
  display: "swap",
});

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
