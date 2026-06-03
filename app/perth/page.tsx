import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { PERTH } from "../../lib/location-data";

export const metadata: Metadata = {
  title: PERTH.seo.title,
  description: PERTH.seo.description,
  alternates: { canonical: PERTH.seo.canonical },
  openGraph: {
    url: PERTH.seo.canonical,
    title: PERTH.seo.ogTitle,
    description: PERTH.seo.ogDescription,
  },
};

export default function PerthPage() {
  return <LocationPage config={PERTH} />;
}
