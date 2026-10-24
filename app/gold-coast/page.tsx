import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { GOLD_COAST } from "../../lib/location-data";
import { publicPageMeta } from "@/lib/seo-pages";

export const metadata: Metadata = publicPageMeta.goldCoast;

export default function GoldCoastPage() {
  return <LocationPage config={GOLD_COAST} />;
}
