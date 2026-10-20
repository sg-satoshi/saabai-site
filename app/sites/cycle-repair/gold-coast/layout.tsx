import type { Metadata } from "next";

const DESC = "Mobile bike mechanic from the Northern Rivers to Coomera and Ormeau. Suburb coverage across the Gold Coast, Tweed Coast and Northern Rivers. Services from $119.";

export const metadata: Metadata = {
  title: "Mobile Bike Repairs Gold Coast",
  description: DESC,
  alternates: { canonical: "https://stuscyclerepairs.com/gold-coast" },
  openGraph: { url: "https://stuscyclerepairs.com/gold-coast", siteName: "Stu's Cycle Repairs", title: "Mobile Bike Repairs Gold Coast | Stu's Cycle Repairs", description: DESC },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
