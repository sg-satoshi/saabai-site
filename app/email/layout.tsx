import type { Metadata } from "next";

// /email/* pages are SUNDER subscriber pages: use SUNDER's icon set (same files as
// public/clients/sunder/index.html), not the Saabai icons from the root layout.
export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/clients/sunder/favicon.ico?v=r1b", sizes: "32x32" },
      { url: "/clients/sunder/favicon-16.png?v=r1b", type: "image/png", sizes: "16x16" },
      { url: "/clients/sunder/favicon-48.png?v=r1b", type: "image/png", sizes: "48x48" },
    ],
    apple: "/clients/sunder/apple-touch-icon-180.png?v=r1b",
  },
};

export default function EmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
