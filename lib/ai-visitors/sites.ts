/**
 * Which hostname and path belongs to which client, and how a bot or referrer is labelled.
 * Pure: no Redis and no network.
 */
import { STATIC_DOMAIN_MAP } from "../client-site-surface";
import {
  SAABAI_SITE_KEY,
  type AiCategory,
  type AnalyticsSite,
  type SiteSource,
} from "./types";

const SAABAI_HOSTS = new Set(["saabai.ai", "www.saabai.ai"]);

const BOT_LABEL: Record<string, string> = {
  claudebot: "ClaudeBot",
  "claude-user": "Claude-User",
  "claude-searchbot": "Claude-SearchBot",
  amazonbot: "Amazonbot",
  gptbot: "GPTBot",
  "oai-searchbot": "OAI-SearchBot",
  "gpt-actions": "GPT-Actions",
  "chatgpt-user": "ChatGPT-User",
  "meta-webindexer": "Meta-WebIndexer",
  "meta-externalagent": "Meta-ExternalAgent",
  shapbot: "ShapBot",
  applebot: "Applebot",
  perplexitybot: "PerplexityBot",
  "perplexity-user": "Perplexity-User",
  duckassistbot: "DuckAssistBot",
  googlebot: "Googlebot",
  googleother: "GoogleOther",
  bingbot: "Bingbot",
};

const BOT_COMPANY: Record<string, string> = {
  claudebot: "Anthropic",
  "claude-user": "Anthropic",
  "claude-searchbot": "Anthropic",
  amazonbot: "Amazon",
  gptbot: "OpenAI",
  "oai-searchbot": "OpenAI",
  "gpt-actions": "OpenAI",
  "chatgpt-user": "OpenAI",
  "meta-webindexer": "Meta",
  "meta-externalagent": "Meta",
  facebookbot: "Meta",
  shapbot: "Other",
  applebot: "Apple",
  perplexitybot: "Perplexity",
  "perplexity-user": "Perplexity",
  duckassistbot: "DuckDuckGo",
};

/** User-triggered fetchers. PerplexityBot is an index, not someone asking. */
export const LIVE_BOTS = new Set(["chatgpt-user", "claude-user", "perplexity-user", "gpt-actions"]);

const AI_REFERRERS = new Set([
  "chatgpt.com",
  "chat.openai.com",
  "perplexity.ai",
  "claude.ai",
  "gemini.google.com",
  "copilot.microsoft.com",
  "grok.com",
  "grok.x.ai",
  "bard.google.com",
  "you.com",
  "phind.com",
  "meta.ai",
  "chat.mistral.ai",
  "poe.com",
]);

export const COMPANY_COLOR: Record<string, string> = {
  Anthropic: "#d4861a",
  OpenAI: "#1f4dc5",
  Amazon: "#2a9d6f",
  Meta: "#7b61c9",
  Apple: "#5f6580",
  Perplexity: "#3fa7d6",
  DuckDuckGo: "#9c6b30",
  Other: "#b9bed0",
};

export function normaliseHost(host: string | null | undefined): string {
  return (host ?? "").trim().toLowerCase().replace(/\.$/, "").split(":")[0];
}

export function bareHost(host: string): string {
  return normaliseHost(host).replace(/^www\./, "");
}

function unique(list: string[]): string[] {
  return [...new Set(list.filter(Boolean))];
}

/** Apex and www, dropping Saabai and preview hosts. */
export function hostVariants(host: string): string[] {
  const bare = bareHost(host);
  if (!bare || bare === "saabai.ai" || bare.endsWith(".saabai.ai") || bare.endsWith(".vercel.app") || bare === "localhost") return [];
  return [bare, `www.${bare}`];
}

function hostsFromUrl(url: string | undefined): string[] {
  if (!url) return [];
  try {
    return hostVariants(new URL(url).hostname);
  } catch {
    return [];
  }
}

function labelFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function claimHosts(site: AnalyticsSite, taken: Map<string, string>): string[] {
  const hosts: string[] = [];
  for (const host of site.hosts) {
    if (taken.has(host)) continue;
    taken.set(host, site.key);
    hosts.push(host);
  }
  return hosts;
}

/**
 * saabai.ai is its own row. Client custom domains come from the site record,
 * the Redis domain map and STATIC_DOMAIN_MAP. A site with no custom domain is
 * matched later by the /sites/<slug> prefix. analyticsHosts replaces inferred hosts.
 */
export function buildAnalyticsSites(input: {
  sites: SiteSource[];
  domainMap?: Record<string, string> | null;
  staticDomainMap?: Record<string, string>;
}): AnalyticsSite[] {
  const extra = new Map<string, string[]>();
  const addExtra = (host: string, slug: string) => {
    if (!slug) return;
    extra.set(slug, [...(extra.get(slug) ?? []), ...hostVariants(host)]);
  };
  for (const [host, slug] of Object.entries(input.domainMap ?? {})) addExtra(host, slug);
  for (const [host, slug] of Object.entries(input.staticDomainMap ?? STATIC_DOMAIN_MAP)) addExtra(host, slug);

  const drafted: AnalyticsSite[] = [];
  const seen = new Set<string>();
  for (const site of input.sites) {
    const key = (site.slug || "").trim();
    if (!key || key === SAABAI_SITE_KEY || seen.has(key)) continue;
    seen.add(key);
    const override = unique((site.analyticsHosts ?? []).flatMap(hostVariants));
    const inferred = unique([
      ...(site.domains ?? []).flatMap((host) => hostVariants(host)),
      ...hostsFromUrl(site.url),
      ...(extra.get(key) ?? []),
    ]);
    const hosts = override.length ? override : inferred;
    extra.delete(key);
    drafted.push({
      key,
      label: site.name?.trim() || labelFromSlug(key),
      hosts,
      pathPrefix: hosts.length ? null : `/sites/${key}`,
    });
  }

  for (const [slug, hosts] of extra) {
    if (seen.has(slug)) continue;
    const list = unique(hosts);
    drafted.push({
      key: slug,
      label: labelFromSlug(slug),
      hosts: list,
      pathPrefix: list.length ? null : `/sites/${slug}`,
    });
  }

  const taken = new Map<string, string>();
  const sites = drafted.map((site) => ({ ...site, hosts: claimHosts(site, taken) }));
  sites.unshift({
    key: SAABAI_SITE_KEY,
    label: "saabai.ai",
    hosts: ["saabai.ai", "www.saabai.ai"],
    pathPrefix: null,
  });
  return sites;
}

export async function listAnalyticsSites(): Promise<AnalyticsSite[]> {
  let sources: SiteSource[] = [];
  try {
    const { listSites } = await import("../site-registry");
    const rows = await listSites();
    sources = rows.map((site) => ({
      slug: site.slug,
      name: site.business?.name || site.name,
      url: site.url,
      domains: site.domains,
      analyticsHosts: site.analyticsHosts,
    }));
  } catch {
    sources = [];
  }

  let domainMap: Record<string, string> | null = null;
  try {
    const { getRedis } = await import("../redis");
    const redis = getRedis();
    if (redis) domainMap = await redis.hgetall<Record<string, string>>("saabai:domain-map");
  } catch {
    domainMap = null;
  }

  return buildAnalyticsSites({ sites: sources, domainMap, staticDomainMap: STATIC_DOMAIN_MAP });
}

/** Longest /sites/<slug> prefix wins. Custom hosts win over a path prefix. */
export function siteKeyForRequest(host: string, path: string, sites: AnalyticsSite[]): string | null {
  const hostname = normaliseHost(host);
  if (!hostname) return null;
  const owner = sites.find((site) => site.key !== SAABAI_SITE_KEY && site.hosts.includes(hostname));
  if (owner) return owner.key;

  const clean = (path || "/").split("?")[0];
  if (SAABAI_HOSTS.has(hostname)) {
    const prefixed = sites
      .filter((site) => site.pathPrefix && (clean === site.pathPrefix || clean.startsWith(`${site.pathPrefix}/`)))
      .sort((a, b) => (b.pathPrefix?.length ?? 0) - (a.pathPrefix?.length ?? 0));
    if (prefixed[0]) return prefixed[0].key;
    return SAABAI_SITE_KEY;
  }
  return null;
}

export function botKey(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

export function botLabel(name: string): string {
  if (!name) return "Unnamed";
  return BOT_LABEL[name] ?? name;
}

export function companyForBot(name: string): string {
  if (!name) return "Other";
  return BOT_COMPANY[name] ?? "Other";
}

export function isAiCategory(value: string | undefined): value is AiCategory {
  return value === "ai_crawler" || value === "ai_assistant";
}

export function isGoogleCrawler(name: string): boolean {
  const n = botKey(name);
  return n === "googlebot" || n.startsWith("googlebot-") || n === "googleother" || n.startsWith("googleother-") || n === "google-inspectiontool" || n === "storebot-google";
}

export function isBingCrawler(name: string): boolean {
  const n = botKey(name);
  return n === "bingbot" || n.startsWith("bingbot-");
}

/**
 * Search-result referrals only. ads.openai.com is an ads check, not someone
 * clicking an AI answer. Mail and internal Google hosts are not search.
 */
export function referralBucket(host: string | null | undefined): "ai" | "google" | "bing" | null {
  const bare = bareHost(host ?? "");
  if (!bare) return null;
  if (bare === "ads.openai.com" || bare.endsWith(".ads.openai.com")) return null;
  if (AI_REFERRERS.has(bare)) return "ai";
  if (bare === "com.google.android.googlequicksearchbox") return "google";
  if (/^google\.(com|com\.[a-z]{2}|[a-z]{2}|co\.[a-z]{2})$/.test(bare)) return "google";
  if (/^bing\.(com|com\.[a-z]{2}|[a-z]{2}|co\.[a-z]{2})$/.test(bare)) return "bing";
  return null;
}

const ASSET = /\.(?:avif|css|eot|gif|ico|jpe?g|js|map|mjs|mp4|otf|png|svg|ttf|webm|webp|woff2?)$/i;

export function isContentPath(path: string): boolean {
  const clean = path.split("?")[0];
  if (!clean || clean.startsWith("/_next/") || clean.startsWith("/api/")) return false;
  return !ASSET.test(clean);
}
