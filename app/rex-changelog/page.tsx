import type { Metadata } from "next";
import ChangelogClient from "./ChangelogClient";

export const metadata: Metadata = {
  title: "Rex Changelog — PlasticOnline AI",
  description: "Full development history for Rex, the AI sales agent built for PlasticOnline by Saabai.",
};

export default function RexChangelog() {
  return <ChangelogClient />;
}
