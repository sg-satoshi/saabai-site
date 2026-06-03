import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { SYDNEY } from "../../lib/location-data";

export const metadata: Metadata = {
  title: SYDNEY.seo.title,
  description: SYDNEY.seo.description,
  alternates: { canonical: SYDNEY.seo.canonical },
  openGraph: {
    url: SYDNEY.seo.canonical,
    title: SYDNEY.seo.ogTitle,
    description: SYDNEY.seo.ogDescription,
  },
};

export default function SydneyPage() {
  return <LocationPage config={SYDNEY} />;
}
