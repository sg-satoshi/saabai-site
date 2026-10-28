import type { Metadata } from "next";
import { isTier } from "@/lib/blueprint";
import { OG_IMAGE } from "@/lib/seo-meta";
import CheckoutClient from "./CheckoutClient";

const CHECKOUT_URL = "https://www.saabai.ai/blueprint/checkout";

export const metadata: Metadata = {
  title: "Checkout: Saabai Blueprint",
  alternates: { canonical: CHECKOUT_URL },
  // A page openGraph object replaces the root one, so url has to be set here
  // or og:url stays on the homepage.
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Saabai",
    url: CHECKOUT_URL,
    images: [OG_IMAGE],
  },
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const t = typeof sp.tier === "string" ? sp.tier : "";
  return <CheckoutClient initialTier={isTier(t) ? t : "pro"} cancelled={sp.cancelled === "1"} />;
}
