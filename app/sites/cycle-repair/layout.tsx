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
const DESCRIPTION =
  "Mobile bike repairs across the Gold Coast and Tweed Coast. 37+ years experience. Bronze, Silver & Gold servicing, delivered to your driveway.";

export const metadata: Metadata = {
  ...clientSiteMetadata({
    siteUrl: SITE_URL,
    name: "Stu's Cycle Repairs",
    title: "Stu's Cycle Repairs, Mobile Bicycle Mechanic, Gold Coast",
    description: DESCRIPTION,
    keywords: [
      "mobile bike mechanic Gold Coast",
      "bike repairs Gold Coast",
      "bicycle servicing Tweed Coast",
      "e-bike repairs Gold Coast",
      "mobile bicycle repair",
    ],
    icon: "/sites/cycle-repair/favicon.png",
    ogImage: { url: "/sites/cycle-repair/stu.jpg", alt: "Stu, mobile bicycle mechanic" },
  }),
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
