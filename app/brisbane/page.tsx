import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { BRISBANE } from "../../lib/location-data";
import { publicPageMeta } from "@/lib/seo-pages";

export const metadata: Metadata = publicPageMeta.brisbane;

export default function BrisbanePage() {
  return <LocationPage config={BRISBANE} />;
}
