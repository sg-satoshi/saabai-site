import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { GOLD_COAST } from "../../lib/location-data";

export const metadata: Metadata = {
  title: GOLD_COAST.seo.title,
  description: GOLD_COAST.seo.description,
  alternates: { canonical: GOLD_COAST.seo.canonical },
  openGraph: {
    url: GOLD_COAST.seo.canonical,
    title: GOLD_COAST.seo.ogTitle,
    description: GOLD_COAST.seo.ogDescription,
  },
};

export default function GoldCoastPage() {
  return <LocationPage config={GOLD_COAST} />;
}
