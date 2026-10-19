import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { GOLD_COAST } from "../../lib/location-data";
import { pageMeta } from "@/lib/seo-meta";

export const metadata: Metadata = pageMeta({
  path: "/gold-coast",
  title: GOLD_COAST.seo.ogTitle,
  description: GOLD_COAST.seo.description,
});

export default function GoldCoastPage() {
  return <LocationPage config={GOLD_COAST} />;
}
