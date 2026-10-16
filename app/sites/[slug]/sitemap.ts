import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveGeoProfile } from "@/lib/geo/profiles";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();

  // Primary: extract slug from the rewritten path /sites/{slug}/sitemap.xml
  const matchedPath = h.get("x-matched-path") || h.get("x-invoke-path") || "";
  let slug = matchedPath.split("/")[2] || "";

  // Fallback: look up slug via the original host header + domain-map
  if (!slug || slug === "[slug]") {
    const host = h.get("x-forwarded-host") || h.get("host") || "";
    const cleanHost = host.startsWith("www.") ? host.slice(4) : host;
    slug =
      (await redis
        .hget<string>("saabai:domain-map", cleanHost)
        .catch(() => null)) ?? "";
  }

  if (!slug) {
    return [];
  }

  // Only real pages, on the site's canonical host (no template city leftovers).
  const profile = await resolveGeoProfile(slug);
  if (!profile) return [];
  return profile.pages.map((pg) => ({
    url: pg.path === "/" ? `${profile.url}/` : `${profile.url}${pg.path}`,
    lastModified: new Date(),
    changeFrequency: pg.path === "/" ? ("weekly" as const) : ("monthly" as const),
    priority: pg.priority ?? (pg.path === "/" ? 1 : 0.7),
  }));
}
