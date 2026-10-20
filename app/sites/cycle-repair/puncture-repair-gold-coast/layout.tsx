import type { Metadata } from "next";

const DESC = "Mobile puncture repair from the Northern Rivers to Coomera and Ormeau. Stu fits a tyre or tube at your home or work. $20 per wheel.";

export const metadata: Metadata = {
  title: "Puncture Repair Gold Coast",
  description: DESC,
  alternates: { canonical: "https://stuscyclerepairs.com/puncture-repair-gold-coast" },
  openGraph: {
    url: "https://stuscyclerepairs.com/puncture-repair-gold-coast",
    siteName: "Stu's Cycle Repairs",
    title: "Puncture Repair Gold Coast | Stu's Cycle Repairs",
    description: DESC,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
