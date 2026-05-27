import { getRedis } from "./redis";
import { put, del } from "@vercel/blob";

const MAX_VERSIONS = 20;

export interface SiteVersion {
  v: number;       // sequential version number, 1-based
  ts: number;      // unix ms
  label: string;   // e.g. "Generated", "Published", "Chatbot updated"
  url: string;     // blob CDN URL for snapshot HTML
  sizeKb: number;
}

function vKey(slug: string) {
  return `saabai:site-versions:${slug}`;
}

export async function snapshotVersion(
  slug: string,
  html: string,
  label: string,
): Promise<SiteVersion> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis not configured");

  const raw = await redis.get<SiteVersion[]>(vKey(slug));
  const versions: SiteVersion[] = Array.isArray(raw) ? raw : [];
  const nextV = (versions[versions.length - 1]?.v ?? 0) + 1;

  const { url } = await put(`sites/${slug}/history/v${nextV}.html`, html, {
    access: "public",
    contentType: "text/html",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  const entry: SiteVersion = {
    v: nextV,
    ts: Date.now(),
    label,
    url,
    sizeKb: Math.round(html.length / 1024),
  };

  const updated = [...versions, entry];

  if (updated.length > MAX_VERSIONS) {
    const pruned = updated.splice(0, updated.length - MAX_VERSIONS);
    for (const old of pruned) {
      del(old.url).catch(() => {});
    }
  }

  await redis.set(vKey(slug), updated);
  return entry;
}

export async function listVersions(slug: string): Promise<SiteVersion[]> {
  const redis = getRedis();
  if (!redis) return [];
  const raw = await redis.get<SiteVersion[]>(vKey(slug));
  return Array.isArray(raw) ? [...raw].reverse() : [];
}
