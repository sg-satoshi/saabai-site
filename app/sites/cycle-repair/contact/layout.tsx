import type { Metadata } from "next";
import PoweredBySaabai from "../../../components/PoweredBySaabai";

export const metadata: Metadata = {
  title: "Contact Stu",
  description: "Book a mobile bike service or ask Stu a question. Mobile bicycle repairs across the Gold Coast and Tweed Coast.",
  alternates: { canonical: "/contact" },
  openGraph: { url: "https://stuscyclerepairs.com/contact", siteName: "Stu's Cycle Repairs", title: "Contact Stu | Stu's Cycle Repairs", description: "Book a mobile bike service or ask Stu a question. Mobile bicycle repairs across the Gold Coast and Tweed Coast." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <footer className="bg-bg text-center pt-2 pb-28 md:pb-10">
        <PoweredBySaabai
          site="stuscyclerepairs"
          className="inline-block py-2 text-[11px] tracking-[0.08em] text-muted-foreground/80 hover:text-brand transition-colors"
        />
      </footer>
    </>
  );
}
