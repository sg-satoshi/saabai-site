import type { Metadata } from "next";

const DESC = "Mobile bike mechanic servicing all of the Gold Coast, QLD. Stu brings a fully equipped workshop to your home or work. Bronze, Silver and Gold services from $119.";

export const metadata: Metadata = {
  title: "Mobile Bike Repairs Gold Coast",
  description: DESC,
  alternates: { canonical: "https://stuscyclerepairs.com/gold-coast" },
  openGraph: { url: "https://stuscyclerepairs.com/gold-coast", siteName: "Stu's Cycle Repairs", title: "Mobile Bike Repairs Gold Coast | Stu's Cycle Repairs", description: DESC },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
