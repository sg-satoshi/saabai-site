import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { DARWIN } from "../../lib/location-data";

export const metadata: Metadata = {
  title: DARWIN.seo.title,
  description: DARWIN.seo.description,
  alternates: { canonical: DARWIN.seo.canonical },
  openGraph: {
    url: DARWIN.seo.canonical,
    title: DARWIN.seo.ogTitle,
    description: DARWIN.seo.ogDescription,
  },
};

export default function DarwinPage() {
  return <LocationPage config={DARWIN} />;
}
