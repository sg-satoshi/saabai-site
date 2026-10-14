import type { Metadata } from "next";
import BuyClient from "./BuyClient";

export const metadata: Metadata = {
  title: "Checkout: Presence website deposit | Saabai",
  robots: { index: false, follow: false },
};

export default async function BuyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return <BuyClient cancelled={sp.cancelled === "1"} />;
}
