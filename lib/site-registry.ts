import { Redis } from "@upstash/redis";
import { BO_SYSTEM_PROMPT, CHRISTINA_GREETING } from "./chatbot/platform-bot-seed";
import { CLIENT_SITE_DIRECTORY } from "./client-site-directory";

const redis = Redis.fromEnv();

export interface SiteBilling {
  /** Monthly fee in AUD cents */
  amount?: number;
  /** Status: active, paused, cancelled */
  status?: "active" | "paused" | "cancelled";
  /** Next billing date ISO string */
  nextBillingDate?: string;
  /** ID of linked invoice from invoice-store */
  linkedInvoiceId?: string;
  /** Payment notes */
  notes?: string;
}

export interface SiteConfig {
  id: string;
  slug: string;
  name: string;
  niche?: string;
  description?: string;
  status: "draft" | "live" | "archived";
  url: string;
  /** Where the site was built */
  source: "factory" | "external";
  /** For externally built sites — the live URL */
  externalUrl?: string;
  /** Platform used to build externally (Lovable, Replit, Webflow, etc.) */
  externalPlatform?: string;
  /** Billing info */
  billing?: SiteBilling;
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
    avatarUrl?: string;
  };
  domains?: string[];
  /** Hostnames counted for this site in AI visitors. When set, they replace inferred domains. */
  analyticsHosts?: string[];
  reviews?: {
    url: string;
    fetchedReviews: Array<{ name: string; rating: number; text: string; date?: string }>;
    manualReviews: Array<{ name: string; rating: number; text: string }>;
    rating?: number;
    totalReviews?: number;
    businessName: string;
    fetchTip: string;
  };
  createdAt: number;
  updatedAt: number;
}

// App Router sites (hardcoded in code, not in Redis/Blob).
// url and domains come from lib/client-site-directory.ts so routing rules cannot drift.
const APP_ROUTER_SITE_DETAILS: Array<Omit<SiteConfig, "url" | "domains">> = [
  {
    id: "cycle-repair",
    slug: "cycle-repair",
    name: "Stu's Cycle Repairs",
    niche: "trades",
    description: "Mobile bicycle mechanic, Gold Coast (App Router, ported from Lovable)",
    status: "live" as const,
    source: "external",
    externalPlatform: "Lovable",
    business: {
      name: "Stu's Cycle Repairs",
      tagline: "We Come To You",
      phone: "0405 225 721",
      email: "stuscyclerepairs@gmail.com",
      address: "Gold Coast, QLD",
    },
    chatbot: {
      enabled: false,
      name: "",
      greeting: "",
      systemPrompt: "",
    },
    createdAt: 1786354800000,
    updatedAt: 1786354800000,
  },
  {
    id: "tributum-law-v2",
    slug: "tributum-law-v2",
    name: "Tributum Law v2",
    niche: "legal",
    description: "Premium tax & trust law specialist site (Next.js App Router)",
    status: "live" as const,
    source: "factory",
    business: {
      name: "Tributum Law",
      tagline: "Tax & Trust Law. Resolved.",
      phone: "+61 405 014 888",
      email: "contact@tributumlaw.com",
      address: "Level 1, 195 Victoria Square, Adelaide SA 5000",
    },
    chatbot: {
      enabled: true,
      name: "Tributum Assistant",
      greeting: "Hello! How can we help with your tax or trust matter?",
      systemPrompt: "You are the Tributum Law assistant. Help visitors with tax and trust law inquiries.",
    },
    createdAt: 1749000000000,
    updatedAt: 1749000000000,
  },
  {
    id: "bo-consultancy",
    slug: "bo-consultancy",
    name: "BO Consulting",
    niche: "professional-services",
    description: "Blue-collar recruitment & labour hire specialist site (App Router, custom domain boconsulting.com.au)",
    status: "live" as const,
    source: "factory",
    business: {
      name: "BO Consulting",
      tagline: "Connecting Australia's Workforce",
      email: "info@boconsulting.com.au",
    },
    chatbot: {
      enabled: true,
      name: "Christina",
      greeting: CHRISTINA_GREETING,
      systemPrompt: BO_SYSTEM_PROMPT,
      avatarUrl: "/sites/bo-consultancy/christina-avatar.jpg",
    },
    createdAt: 1745000000000,
    updatedAt: 1745000000000,
  },
  {
    id: "wholesale-homes",
    slug: "wholesale-homes",
    name: "Wholesale Homes Australia",
    niche: "real-estate",
    description: "Pre-market house & land packages at wholesale pricing for Australian investors (App Router, custom domain wholesalehomes.com.au)",
    status: "live" as const,
    source: "factory",
    business: {
      name: "Wholesale Homes Australia",
      tagline: "House & Land Packages. Below Market Price.",
      email: "hello@wholesalehomes.com.au",
      phone: "0488 165 908",
    },
    chatbot: {
      enabled: true,
      name: "Wholesale Homes Assistant",
      greeting: "👋 Looking for house & land packages? Let me help match you.",
      systemPrompt: "You are the Wholesale Homes Australia assistant. Help visitors find house and land packages at wholesale pricing below market value. Pre-qualify their budget, location, and investor type before routing to the principal advisor.",
    },
    createdAt: 1749000000000,
    updatedAt: 1749000000000,
  },
];

export const APP_ROUTER_SITES: SiteConfig[] = CLIENT_SITE_DIRECTORY.map((entry) => {
  const details = APP_ROUTER_SITE_DETAILS.find((site) => site.slug === entry.slug);
  if (!details) throw new Error(`APP_ROUTER_SITES is missing details for "${entry.slug}". Add them in lib/site-registry.ts.`);
  return { ...details, url: entry.url, ...(entry.domains ? { domains: entry.domains } : {}) };
});

for (const site of APP_ROUTER_SITE_DETAILS) {
  if (!CLIENT_SITE_DIRECTORY.some((entry) => entry.slug === site.slug)) {
    throw new Error(`Register "${site.slug}" in lib/client-site-directory.ts so redirects, noindex and Saabai chrome follow the site registry.`);
  }
}

export async function createSite(config: Omit<SiteConfig, "id" | "createdAt" | "updatedAt">): Promise<SiteConfig> {
  const id = `site_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const site: SiteConfig = { ...config, id, createdAt: Date.now(), updatedAt: Date.now() };
  await redis.hset("saabai:sites", { [id]: JSON.stringify(site) });
  return site;
}

export async function getSite(id: string): Promise<SiteConfig | null> {
  const data = await redis.hget<SiteConfig>("saabai:sites", id);
  return data ?? null;
}

export async function getSiteBySlug(slug: string): Promise<SiteConfig | null> {
  const sites = await listSites();
  return sites.find(s => s.slug === slug) ?? null;
}

/** Raw Redis site records (no hardcoded merge). Used by the dedupe tool. */
export async function listRedisSites(): Promise<SiteConfig[]> {
  const data = await redis.hgetall<Record<string, SiteConfig>>("saabai:sites");
  return data ? Object.values(data).map(parseSiteValue).filter((s): s is SiteConfig => s !== null) : [];
}

export async function listSites(): Promise<SiteConfig[]> {
  try {
    const data = await redis.hgetall<Record<string, SiteConfig>>("saabai:sites");
    const redisSites: SiteConfig[] = data
      ? Object.values(data).map(parseSiteValue).filter((s): s is SiteConfig => s !== null)
      : [];

    // Merge App Router sites, preferring Redis data for the same client (same slug, business name or custom domain).
    const { nameKey, customDomains } = await import("./site-dedupe");
    const seen = new Set(redisSites.map((s) => s.slug));
    const names = new Set(redisSites.map((s) => nameKey(s)).filter(Boolean));
    const doms = new Set(redisSites.flatMap((s) => customDomains(s)));
    const merged = [...redisSites, ...APP_ROUTER_SITES.filter((s) => !seen.has(s.slug) && !names.has(nameKey(s)) && !customDomains(s).some((d) => doms.has(d)))];

    return merged;
  } catch {
    return APP_ROUTER_SITES;
  }
}

/**
 * Normalize a raw value read from the `saabai:sites` Redis hash into a usable
 * SiteConfig, or null if it can't be made valid.
 *
 * Handles the double-encode bug where a field was stored as a JSON array
 * wrapping a single JSON object string, e.g. `["{\"id\":...,\"name\":...}"]`.
 * @upstash/redis auto-deserializes such a value into a JS array for hgetall,
 * so naive code (`typeof v === "string" ? JSON.parse(v) : v`) would pass the
 * array through verbatim and the client would crash on `.name.toLowerCase()`.
 */
function parseSiteValue(v: unknown): SiteConfig | null {
  if (v == null) return null;
  let obj: unknown = v;
  // If the stored value is a JSON string, parse it.
  if (typeof v === "string") {
    try {
      obj = JSON.parse(v);
    } catch {
      return null;
    }
  }
  // A JSON array wrapping a single object/string (the double-encode / list bug).
  if (Array.isArray(obj)) {
    if (obj.length === 0) return null;
    obj = obj[0];
    if (typeof obj === "string") {
      try {
        obj = JSON.parse(obj);
      } catch {
        return null;
      }
    }
  }
  if (!obj || typeof obj !== "object") return null;
  const site = obj as Partial<SiteConfig>;
  // Only accept records that are actually usable — a slug AND a non-empty name.
  if (!site.slug || !site.name || !site.name.trim()) return null;
  return site as SiteConfig;
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
