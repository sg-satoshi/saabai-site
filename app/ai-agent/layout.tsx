import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "../saabai-admin/admin.css";

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
