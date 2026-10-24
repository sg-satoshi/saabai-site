import type { Metadata } from "next";
import localFont from "next/font/local";
import "../saabai-admin/admin.css";

const inter = localFont({ src: "../fonts/inter-latin-wght-normal.woff2", weight: "100 900", variable: "--font-admin-sans", display: "swap" });

const geistMono = localFont({ src: "../fonts/geist-mono-latin-wght-normal.woff2", weight: "100 900", variable: "--font-admin-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "AI Agent", template: "%s | Saabai Admin" },
  robots: { index: false, follow: false },
};

/**
 * /ai-agent/* sits outside /saabai-admin, so it does not inherit admin.css.
 * Import the same Mission Control tokens here so AdminShell renders correctly.
 */
export default function AiAgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`admin-root ${inter.variable} ${geistMono.variable}`}
      style={{ fontFamily: "var(--font-admin-sans), Inter, system-ui, sans-serif" }}
    >
      {children}
    </div>
  );
}
