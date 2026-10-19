import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { BRISBANE } from "../../lib/location-data";
import { pageMeta } from "@/lib/seo-meta";

export const metadata: Metadata = pageMeta({
  path: "/brisbane",
  title: BRISBANE.seo.ogTitle,
  description: BRISBANE.seo.description,
});

export default function BrisbanePage() {
  return <LocationPage config={BRISBANE} />;
}
