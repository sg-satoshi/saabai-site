import type { Metadata } from "next";

const DESC = "Stu covers the Gold Coast from the Northern Rivers to Coomera and Ormeau. Mobile bike servicing and repairs at your home or work. Call 0405 225 721.";

export const metadata: Metadata = {
  title: "Gold Coast Suburbs for Mobile Bike Repairs",
  description: DESC,
  alternates: { canonical: "https://stuscyclerepairs.com/gold-coast" },
  openGraph: { url: "https://stuscyclerepairs.com/gold-coast", siteName: "Stu's Cycle Repairs", title: "Gold Coast Suburbs for Mobile Bike Repairs | Stu's Cycle Repairs", description: DESC },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
