import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import "./cycle-repair.css";
import { clientSiteMetadata } from "../../../lib/client-site";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--cr-font-display",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--cr-font-sans",
  display: "swap",
});

const SITE_URL = "https://stuscyclerepairs.com";
const HOME_TITLE = "Mobile Bike Repairs Gold Coast | Stu's Cycle Repairs";
const HOME_DESCRIPTION =
  "Mobile bike mechanic for the Gold Coast and Tweed Coast. Servicing, repairs, wheel builds and e-bikes at your home or work. Services from $119.";

const homeMeta = clientSiteMetadata({
  siteUrl: SITE_URL,
  name: "Stu's Cycle Repairs",
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  keywords: [
    "mobile bike mechanic Gold Coast",
    "bike repairs Gold Coast",
    "bicycle servicing Tweed Coast",
    "e-bike repairs Gold Coast",
    "mobile bicycle repair",
  ],
  icon: "/sites/cycle-repair/favicon.png",
  ogImage: { url: "/sites/cycle-repair/stu.webp", width: 800, height: 1000, alt: "Stu, mobile bicycle mechanic" },
});

export const metadata: Metadata = {
  ...homeMeta,
  // Next strips a root canonical down to the origin, so the home page emits
  // the trailing-slash tag itself. Child routes set their own canonicals.
  alternates: { canonical: null },
  openGraph: { ...homeMeta.openGraph, url: "https://stuscyclerepairs.com/" },
};

export default function CycleRepairLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      id="cycle-repair-root"
      className={`${spaceGrotesk.variable} ${ibmPlexSans.variable}`}
    >
      {children}
      {/* Saabai chat widget. Installed but OFF: the site's switch is off by default (Admin > Chatbots), so nothing shows until it is turned on. */}
      <Script id="saabai-chat-v2" src="https://www.saabai.ai/embed/chat.v1.js" data-site="cycle-repair" strategy="lazyOnload" />
    </div>
  );
}
