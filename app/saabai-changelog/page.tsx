import type { Metadata } from "next";
import SaabaiChangelogClient from "./SaabaiChangelogClient";

export const metadata: Metadata = {
  title: "Saabai Changelog, AI Automation Platform",
  description: "Development history and changelog for Saabai.ai, the hub for Lex, Site Factory, and all client projects.",
};

export default function SaabaiChangelog() {
  return <SaabaiChangelogClient />;
}
