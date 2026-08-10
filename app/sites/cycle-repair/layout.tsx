import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import "./cycle-repair.css";

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

export const metadata: Metadata = {
  title: "Stu's Cycle Repairs, Mobile Bicycle Mechanic, Gold Coast",
  description:
    "Mobile bike repairs across the Gold Coast. 37+ years experience. Bronze, Silver & Gold servicing, delivered to your driveway.",
  authors: [{ name: "Stu's Cycle Repairs" }],
  icons: { icon: "/sites/cycle-repair/favicon.png" },
  openGraph: {
    type: "website",
    title: "Stu's Cycle Repairs, Mobile Bicycle Mechanic",
    description:
      "Mobile bicycle repairs, servicing and upgrades across the Gold Coast. 37+ years of mechanical experience delivered to your driveway.",
  },
  twitter: {
    card: "summary_large_image",
  },
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
    </div>
  );
}
