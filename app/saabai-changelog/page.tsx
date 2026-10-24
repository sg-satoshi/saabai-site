import type { Metadata } from "next";
import SaabaiChangelogClient from "./SaabaiChangelogClient";
import { publicPageMeta } from "@/lib/seo-pages";

export const metadata: Metadata = publicPageMeta.changelog;

export default function SaabaiChangelog() {
  return <SaabaiChangelogClient />;
}
