/**
 * Per-site feature flags for shared add-on modules.
 * Set automatically by the billing webhook when an add-on is bought, cleared
 * when it ends. Redis set: saabai:site-features:<siteId>
 */
import { getRedis } from "../redis";

const key = (siteId: string) => `saabai:site-features:${siteId}`;

export async function getSiteFeatures(siteId: string): Promise<string[]> {
  const r = getRedis();
  if (!r) return [];
  return ((await r.smembers(key(siteId))) as string[]) || [];
}

export async function isFeatureEnabled(siteId: string, feature: string): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  return !!(await r.sismember(key(siteId), feature));
}

export async function enableFeature(siteId: string, feature: string) {
  const r = getRedis();
  if (r) await r.sadd(key(siteId), feature);
}

export async function disableFeature(siteId: string, feature: string) {
  const r = getRedis();
  if (r) await r.srem(key(siteId), feature);
}
