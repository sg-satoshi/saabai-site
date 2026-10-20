import type { Metadata } from "next";

const DESC = "Mobile e-bike repair from the Northern Rivers to Coomera and Ormeau. Stu works on all e-bike brands at your home or work. Servicing from $149.";

export const metadata: Metadata = {
  title: "E-Bike Repair Gold Coast",
  description: DESC,
  alternates: { canonical: "https://stuscyclerepairs.com/e-bike-repair-gold-coast" },
  openGraph: {
    url: "https://stuscyclerepairs.com/e-bike-repair-gold-coast",
    siteName: "Stu's Cycle Repairs",
    title: "E-Bike Repair Gold Coast | Stu's Cycle Repairs",
    description: DESC,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
