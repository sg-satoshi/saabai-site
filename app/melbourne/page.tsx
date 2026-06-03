import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { MELBOURNE } from "../../lib/location-data";

export const metadata: Metadata = {
  title: MELBOURNE.seo.title,
  description: MELBOURNE.seo.description,
  alternates: { canonical: MELBOURNE.seo.canonical },
  openGraph: {
    url: MELBOURNE.seo.canonical,
    title: MELBOURNE.seo.ogTitle,
    description: MELBOURNE.seo.ogDescription,
  },
};

export default function MelbournePage() {
  return <LocationPage config={MELBOURNE} />;
}
