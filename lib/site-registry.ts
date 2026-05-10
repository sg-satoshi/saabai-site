import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export interface SiteConfig {
  id: string;
  slug: string;
  name: string;
  niche?: string;
  description?: string;
  status: "draft" | "live" | "archived";
  url: string;
  business: {
    name: string;
    tagline?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  chatbot: {
    enabled: boolean;
    name: string;
    greeting: string;
    systemPrompt: string;
  };
  createdAt: number;
  updatedAt: number;
}

export async function createSite(config: Omit<SiteConfig, "id" | "createdAt" | "updatedAt">): Promise<SiteConfig> {
  const id = `site_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const site: SiteConfig = { ...config, id, createdAt: Date.now(), updatedAt: Date.now() };
  await redis.hset("saabai:sites", { [id]: JSON.stringify(site) });
  return site;
}

export async function getSite(id: string): Promise<SiteConfig | null> {
  const data = await redis.hget<string>("saabai:sites", id);
  return data ? JSON.parse(data) : null;
}

export async function listSites(): Promise<SiteConfig[]> {
  const data = await redis.hgetall<Record<string, string>>("saabai:sites");
  return data ? Object.values(data).map(s => JSON.parse(s)) : [];
}

export async function updateSite(id: string, updates: Partial<SiteConfig>): Promise<void> {
  const site = await getSite(id);
  if (!site) throw new Error("Site not found");
  const updated = { ...site, ...updates, updatedAt: Date.now() };
  await redis.hset("saabai:sites", { [id]: JSON.stringify(updated) });
}

export async function deleteSite(id: string): Promise<void> {
  await redis.hdel("saabai:sites", id);
}
