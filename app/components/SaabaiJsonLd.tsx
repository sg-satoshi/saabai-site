"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { organizationSchemaForSegment } from "../../lib/seo-entity";

/**
 * Saabai's Organization JSON-LD for saabai.ai pages only.
 * Client sites live under app/sites/* (served on their own domains via the
 * proxy rewrite) and must not carry Saabai's entity markup, or Google reads
 * them as duplicates of saabai.ai. The segment is resolved during SSR, so the
 * script is still in the initial HTML on Saabai pages.
 */
export default function SaabaiJsonLd() {
  const segment = useSelectedLayoutSegment();
  if (segment === "sites") return null;
  const data = organizationSchemaForSegment(segment);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
