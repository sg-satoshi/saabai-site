import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get a Quote",
  description: "Request a quote for mobile bike servicing, wheel builds or e-bike work from Stu's Cycle Repairs, Gold Coast and Tweed Coast.",
  alternates: { canonical: "/quote" },
  openGraph: { url: "https://stuscyclerepairs.com/quote", siteName: "Stu's Cycle Repairs", title: "Get a Quote | Stu's Cycle Repairs", description: "Request a quote for mobile bike servicing, wheel builds or e-bike work from Stu's Cycle Repairs, Gold Coast and Tweed Coast." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
