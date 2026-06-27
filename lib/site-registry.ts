import { Redis } from "@upstash/redis";

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

// App Router sites (hardcoded in code, not in Redis/Blob)
const APP_ROUTER_SITES: SiteConfig[] = [
  {
    id: "tributum-law-v2",
    slug: "tributum-law-v2",
    name: "Tributum Law v2",
    niche: "legal",
    description: "Premium tax & trust law specialist site (Next.js App Router)",
    status: "live" as const,
    source: "factory",
    url: "https://www.saabai.ai/sites/tributum-law-v2",
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
    url: "https://boconsulting.com.au",
    domains: ["boconsulting.com.au", "www.boconsulting.com.au"],
    business: {
      name: "BO Consulting",
      tagline: "Connecting Australia's Workforce",
      email: "info@boconsulting.com.au",
    },
    chatbot: {
      enabled: true,
      name: "Christina",
      greeting: "G'day! I'm Christina, the BO Consulting assistant. Whether you're looking to hire skilled workers or searching for your next role, I can help point you in the right direction. What can I do for you?",
      systemPrompt: "You are Christina, the BO Consulting assistant. Help visitors with blue-collar recruitment and labour hire inquiries.",
      avatarUrl: "/sites/bo-consultancy/christina-avatar.jpg",
    },
    createdAt: 1745000000000,
    updatedAt: 1745000000000,
  },
];

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

export async function listSites(): Promise<SiteConfig[]> {
  try {
    const data = await redis.hgetall<Record<string, SiteConfig>>("saabai:sites");
    const redisSites: SiteConfig[] = data
      ? Object.values(data).map(v => (typeof v === "string" ? JSON.parse(v) : v))
      : [];

    // Merge App Router sites, preferring Redis data if same slug exists
    const seen = new Set(redisSites.map((s) => s.slug));
    const merged = [...redisSites, ...APP_ROUTER_SITES.filter((s) => !seen.has(s.slug))];

    return merged;
  } catch {
    return APP_ROUTER_SITES;
  }
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
