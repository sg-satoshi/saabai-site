import type { Metadata } from "next";
import PoweredBySaabai from "../../../components/PoweredBySaabai";

export const metadata: Metadata = {
  title: "Get a Quote",
  description: "Request a quote for mobile bike servicing, wheel builds or e-bike work. Stu travels from the Northern Rivers to Coomera and Ormeau.",
  alternates: { canonical: "/quote" },
  openGraph: { url: "https://stuscyclerepairs.com/quote", siteName: "Stu's Cycle Repairs", title: "Get a Quote | Stu's Cycle Repairs", description: "Request a quote for mobile bike servicing, wheel builds or e-bike work. Stu travels from the Northern Rivers to Coomera and Ormeau." },
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
