import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConditionalWidgets from "./components/ConditionalWidgets";
import ButtonFeedback from "./components/ui/ButtonFeedback";
import EmailCapturePopup from "./components/EmailCapturePopup";
import SaabaiJsonLd from "./components/SaabaiJsonLd";
import GoogleAnalytics from "./components/GoogleAnalytics";
import ExpOverlay from "./components/exp/ExpOverlay";
import AnnouncementBar from "./components/AnnouncementBar";
import { ANTI_FLICKER_SCRIPT } from "@/lib/exp/overlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0e0c2e",
  width: "device-width",
  initialScale: 1,
};

const BASE_URL = "https://www.saabai.ai";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Websites and AI Systems for Small Businesses | Saabai",
    template: "%s | Saabai",
  },
  description:
    "Saabai builds, hosts and manages small business websites on care plans from $100/month, and the Saabai Blueprint AI audit (from $497) shows exactly where AI saves you hours and dollars.",
  keywords: [
    "Saabai",
    "Saabai Blueprint",
    "website care plan",
    "AI readiness score",
  ],
  authors: [{ name: "Shane Goldberg", url: BASE_URL }],
  creator: "Saabai",
  publisher: "Saabai",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Saabai",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: BASE_URL,
    siteName: "Saabai",
    title: "Websites and AI Systems for Small Businesses | Saabai",
    description:
      "Website care plans from $100/month and the Saabai Blueprint AI audit from $497. Gold Coast, Brisbane and Queensland, with clients Australia-wide online.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Saabai, websites and AI systems for small businesses",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Websites and AI Systems for Small Businesses | Saabai",
    description:
      "Website care plans from $100/month and the Saabai Blueprint AI audit from $497. Gold Coast, Brisbane and Queensland, with clients Australia-wide online.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: BASE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: ANTI_FLICKER_SCRIPT }} /></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SaabaiJsonLd />
        <ButtonFeedback />
        {children}
        <ConditionalWidgets />
        <EmailCapturePopup />
        <GoogleAnalytics />
        <ExpOverlay />
        <AnnouncementBar />
      </body>
    </html>
  );
}
