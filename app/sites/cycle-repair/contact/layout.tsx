import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Stu",
  description: "Book a mobile bike service or ask Stu a question. Mobile bicycle repairs across the Gold Coast and Tweed Coast.",
  alternates: { canonical: "/contact" },
  openGraph: { url: "https://stuscyclerepairs.com/contact", siteName: "Stu's Cycle Repairs", title: "Contact Stu | Stu's Cycle Repairs", description: "Book a mobile bike service or ask Stu a question. Mobile bicycle repairs across the Gold Coast and Tweed Coast." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
