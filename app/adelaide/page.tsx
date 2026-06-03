import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { ADELAIDE } from "../../lib/location-data";

export const metadata: Metadata = {
  title: ADELAIDE.seo.title,
  description: ADELAIDE.seo.description,
  alternates: { canonical: ADELAIDE.seo.canonical },
  openGraph: {
    url: ADELAIDE.seo.canonical,
    title: ADELAIDE.seo.ogTitle,
    description: ADELAIDE.seo.ogDescription,
  },
};

export default function AdelaidePage() {
  return <LocationPage config={ADELAIDE} />;
}
