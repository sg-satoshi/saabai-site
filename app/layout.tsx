import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConditionalWidgets from "./components/ConditionalWidgets";

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
  maximumScale: 1,
  userScalable: false,
};

const BASE_URL = "https://www.saabai.ai";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "AI Automation for Professional Firms Australia | Saabai",
    template: "%s | Saabai",
  },
  description:
    "Saabai builds AI systems that recover 20+ hours/week for law firms, accounting practices & professional firms across Australia. Free 30-min strategy call — no obligation.",
  keywords: [
    "AI automation professional firms Australia",
    "AI automation law firms",
    "AI automation accounting firms",
    "AI workflow automation",
    "business process automation professional services",
    "AI systems professional services Australia",
    "automate repetitive work",
    "AI audit Australia",
  ],
  authors: [{ name: "Shane Goldberg", url: BASE_URL }],
  creator: "Saabai",
  publisher: "Saabai",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
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
    title: "AI Automation for Professional Firms Australia | Saabai",
    description:
      "Saabai builds AI systems that recover 20+ hours/week for law firms, accounting practices & professional firms across Australia. Free 30-min strategy call.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Saabai — AI Automation for Professional Firms",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Automation for Professional Firms Australia | Saabai",
    description:
      "Saabai builds AI systems that recover 20+ hours/week for law firms, accounting practices & professional firms across Australia.",
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
    <html lang="en-AU">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <ConditionalWidgets />
      </body>
    </html>
  );
}
