import type { MetadataRoute } from "next";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

const redis = Redis.fromEnv();

export default async function sitemap({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<MetadataRoute.Sitemap> {
  const { slug } = await params;

  // Resolve canonical base URL — prefer custom domain over saabai.ai path
  const domainMap = await redis.hgetall<Record<string, string>>("saabai:domain-map").catch(() => null);
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
  ];
}
