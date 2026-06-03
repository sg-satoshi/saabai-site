import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { CANBERRA } from "../../lib/location-data";

export const metadata: Metadata = {
  title: CANBERRA.seo.title,
  description: CANBERRA.seo.description,
  alternates: { canonical: CANBERRA.seo.canonical },
  openGraph: {
    url: CANBERRA.seo.canonical,
    title: CANBERRA.seo.ogTitle,
    description: CANBERRA.seo.ogDescription,
  },
};

export default function CanberraPage() {
  return <LocationPage config={CANBERRA} />;
}
