import type { Metadata } from "next";

const DESC = "Answers about Stu's mobile bike servicing on the Gold Coast and Tweed Coast: where Stu travels, service prices, e-bikes, call-out fee and how to book.";

export const metadata: Metadata = {
  title: "FAQ",
  description: DESC,
  alternates: { canonical: "https://stuscyclerepairs.com/faq" },
  openGraph: { url: "https://stuscyclerepairs.com/faq", siteName: "Stu's Cycle Repairs", title: "FAQ | Stu's Cycle Repairs", description: DESC },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
