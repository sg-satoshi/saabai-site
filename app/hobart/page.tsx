import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { HOBART } from "../../lib/location-data";

export const metadata: Metadata = {
  title: HOBART.seo.title,
  description: HOBART.seo.description,
  alternates: { canonical: HOBART.seo.canonical },
  openGraph: {
    url: HOBART.seo.canonical,
    title: HOBART.seo.ogTitle,
    description: HOBART.seo.ogDescription,
  },
};

export default function HobartPage() {
  return <LocationPage config={HOBART} />;
}
