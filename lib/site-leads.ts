/**
 * Read the lead list a Site Factory site has captured (newest first, max 100).
 * The Upstash client already JSON-decodes list items, so items may arrive as
 * objects or (older writes) strings; handle both and skip anything corrupt.
 */
import { Redis } from "@upstash/redis";

export async function listSiteLeads(siteSlug: string): Promise<Record<string, unknown>[]> {
  const redis = Redis.fromEnv();
  const raw = await redis.lrange<unknown>(`saabai:leads:${siteSlug}`, 0, 99);
  const out: Record<string, unknown>[] = [];
  for (const item of raw) {
    let v: unknown = item;
    if (typeof v === "string") {
      try { v = JSON.parse(v); } catch { continue; }
    }
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(v as Record<string, unknown>);
  }
  return out;
}
