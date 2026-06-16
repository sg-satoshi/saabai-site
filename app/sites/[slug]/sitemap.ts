import type { MetadataRoute } from "next";
import { headers } from "next/headers";
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

  // Resolve canonical base URL — prefer custom domain over saabai.ai path
  const domainMap = await redis
    .hgetall<Record<string, string>>("saabai:domain-map")
    .catch(() => null);
  const customDomain = domainMap
    ? Object.entries(domainMap).find(([, v]) => v === slug)?.[0] ?? null
    : null;

  const baseUrl = customDomain
    ? `https://${customDomain}`
    : `https://www.saabai.ai/sites/${slug}`;

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/sydney`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/melbourne`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/brisbane`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/gold-coast`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/perth`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/canberra`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/hobart`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
