import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { BRISBANE } from "../../lib/location-data";

export const metadata: Metadata = {
  title: BRISBANE.seo.title,
  description: BRISBANE.seo.description,
  alternates: { canonical: BRISBANE.seo.canonical },
  openGraph: {
    url: BRISBANE.seo.canonical,
    title: BRISBANE.seo.ogTitle,
    description: BRISBANE.seo.ogDescription,
  },
};

export default function BrisbanePage() {
  return <LocationPage config={BRISBANE} />;
}
