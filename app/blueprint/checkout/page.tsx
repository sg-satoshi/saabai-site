import type { Metadata } from "next";
import { isTier } from "@/lib/blueprint";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout: Saabai Blueprint",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const t = typeof sp.tier === "string" ? sp.tier : "";
  return <CheckoutClient initialTier={isTier(t) ? t : "pro"} cancelled={sp.cancelled === "1"} />;
}
