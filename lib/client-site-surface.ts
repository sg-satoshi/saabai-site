/**
 * One rule for every client site, keyed off the site registry.
 *
 * Adding a site to CLIENT_SITE_DIRECTORY (slug + url or domains) is enough.
 * Do not add a per-site opt-in for redirects, noindex, or Saabai chrome.
 *
 * Production saabai.ai /sites/<slug> 301s to the client's canonical host.
 * Sites with no custom domain, and every preview host, are noindex, nofollow.
 * The custom domain itself stays index, follow. Static assets are left alone
 * so the custom-domain image rewrite to www.saabai.ai cannot loop.
 * Logged-in admin preview fetches keep the /sites URL and stay noindex.
 */
import { CLIENT_SITE_DIRECTORY, type ClientSiteDirectoryEntry } from "./client-site-directory";

export const NOINDEX_ROBOTS = "noindex, nofollow";

/** Request header read by app/sites/layout.tsx. Response header is X-Robots-Tag. */
export const ROBOTS_REQUEST_HEADER = "x-saabai-robots";

/**
 * Hosts mapped in code that are not App Router sites (static HTML).
 * Same map proxy.ts uses before the Redis domain map.
 */
export const STATIC_DOMAIN_MAP: Record<string, string> = {
  "lifestylemoneymanagement.com.au": "lmm-site",
};

const STATIC_ASSET = /\.(?:avif|css|eot|gif|ico|jpe?g|js|map|mjs|mp4|otf|pdf|png|svg|ttf|webm|webp|woff2?)$/i;

export type SiteSurface = ClientSiteDirectoryEntry;

export type SurfaceDecision =
  | { action: "redirect"; location: string; status: 301 }
  | { action: "noindex" }
  | { action: "index" }
  | { action: "pass" };

export function normaliseHost(hostname: string | null | undefined): string {
  return (hostname ?? "").split(",")[0].trim().toLowerCase().split(":")[0];
}

export function isSaabaiProductionHost(hostname: string | null | undefined): boolean {
  const host = normaliseHost(hostname);
  return host === "saabai.ai" || host === "www.saabai.ai";
}

/** /api and /api/* stay on the apex. /apiary and other page paths do not. */
function isApexApiPath(pathname: string): boolean {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return path === "/api" || path.startsWith("/api/");
}

/**
 * Permanent redirect for the bare apex only.
 * www.saabai.ai, client hosts, preview hosts, and other subdomains are left alone
 * so this cannot loop with the custom-domain rewrite below.
 * API routes are not redirected, so webhooks and MCP clients on saabai.ai keep working.
 */
export function apexWwwRedirect(
  host: string | null | undefined,
  pathname: string,
  search = "",
): { location: string; status: 308 } | null {
  if (normaliseHost(host) !== "saabai.ai") return null;
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (isApexApiPath(path)) return null;
  const query = !search ? "" : search.startsWith("?") ? search : `?${search}`;
  return { location: `https://www.saabai.ai${path}${query}`, status: 308 };
}

export function isPreviewHost(hostname: string | null | undefined): boolean {
  const host = normaliseHost(hostname);
  return host.endsWith(".vercel.app") || host === "localhost" || host.startsWith("127.");
}

function isSaabaiOwnedUrlHost(host: string): boolean {
  return host === "saabai.ai" || host === "www.saabai.ai" || host.endsWith(".saabai.ai") || host.endsWith(".vercel.app");
}

/** Apex host from the registry url, else the first non-www domain. Null when the site lives on saabai.ai. */
export function canonicalHost(site: SiteSurface): string | null {
  if (site.url) {
    try {
      const host = new URL(site.url).hostname.toLowerCase();
      if (host && !isSaabaiOwnedUrlHost(host)) return host;
    } catch { /* use domains */ }
  }
  const domains = (site.domains ?? []).map((d) => d.toLowerCase());
  return domains.find((d) => !d.startsWith("www.")) ?? domains[0] ?? null;
}

/** Invert a host -> slug map. Prefer the apex host when both www and apex exist. */
export function canonicalDomainsFromHostMap(map: Record<string, string> | null | undefined): Record<string, string> {
  const hostsBySlug = new Map<string, string[]>();
  for (const [host, slug] of Object.entries(map ?? {})) {
    if (typeof slug !== "string" || !slug) continue;
    const bare = host.toLowerCase().split(":")[0].replace(/^www\./, "");
    if (!bare) continue;
    const list = hostsBySlug.get(slug) ?? [];
    list.push(bare);
    hostsBySlug.set(slug, list);
  }
  const out: Record<string, string> = {};
  for (const [slug, hosts] of hostsBySlug) out[slug] = hosts[0];
  return out;
}

export function canonicalHostForSlug(
  slug: string,
  sites: SiteSurface[] = CLIENT_SITE_DIRECTORY,
  extraDomains?: Record<string, string>,
): string | null {
  const site = sites.find((s) => s.slug === slug);
  return (site ? canonicalHost(site) : null) ?? extraDomains?.[slug] ?? null;
}

/** Slug for a custom host, from the directory and STATIC_DOMAIN_MAP. Null if only Redis knows it. */
export function slugForHost(hostname: string | null | undefined, sites: SiteSurface[] = CLIENT_SITE_DIRECTORY): string | null {
  const host = normaliseHost(hostname);
  if (!host || isSaabaiProductionHost(host) || isPreviewHost(host) || host.endsWith(".saabai.ai")) return null;
  const bare = host.replace(/^www\./, "");
  for (const site of sites) {
    if (site.domains?.some((d) => d.toLowerCase() === host)) return site.slug;
    const canonical = canonicalHost(site);
    if (canonical && (host === canonical || bare === canonical)) return site.slug;
  }
  return STATIC_DOMAIN_MAP[bare] ?? STATIC_DOMAIN_MAP[host] ?? null;
}

export function isRegisteredClientHost(
  hostname: string | null | undefined,
  sites: SiteSurface[] = CLIENT_SITE_DIRECTORY,
  extraDomains?: Record<string, string>,
): boolean {
  const host = normaliseHost(hostname);
  if (!host) return false;
  const bare = host.replace(/^www\./, "");
  for (const site of sites) {
    if (site.domains?.some((d) => d.toLowerCase() === host)) return true;
    const canonical = canonicalHost(site);
    if (canonical && (host === canonical || bare === canonical)) return true;
  }
  for (const domain of Object.values(extraDomains ?? {})) {
    if (host === domain || bare === domain) return true;
  }
  for (const mapped of Object.keys(STATIC_DOMAIN_MAP)) {
    if (host === mapped || bare === mapped) return true;
  }
  return false;
}

/** /sites/<slug> or /clients/<slug>. Query and hash are ignored. */
export function isClientSitePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split(/[?#]/)[0];
  return path === "/sites" || path.startsWith("/sites/") || path === "/clients" || path.startsWith("/clients/");
}

export function parseSitesPath(pathname: string): { slug: string; rest: string } | null {
  const path = pathname.split(/[?#]/)[0];
  const match = path.match(/^\/sites\/([^/]+)(\/.*)?$/);
  if (!match) return null;
  let rest = match[2] ?? "";
  if (rest.length > 1 && rest.endsWith("/")) rest = rest.slice(0, -1);
  if (rest === "/") rest = "";
  return { slug: decodeURIComponent(match[1]), rest };
}

export function isStaticAssetPath(pathname: string): boolean {
  return STATIC_ASSET.test(pathname.split(/[?#]/)[0]);
}

/**
 * Saabai marketing chrome (announcement bar, Mia, ticker, mobile CTA, email popup).
 * Hidden on client routes and on client custom domains. Saabai's own pages still show it.
 */
export function showsSaabaiChrome(
  hostname: string | null | undefined,
  pathname: string | null | undefined,
  sites: SiteSurface[] = CLIENT_SITE_DIRECTORY,
): boolean {
  if (isClientSitePath(pathname)) return false;
  if (isRegisteredClientHost(hostname, sites)) return false;
  return true;
}

/** Admin site-factory preview fetch. The HTML stays on /sites and is noindex. */
export function isAdminSitePreview(opts: { hasSessionCookie: boolean; referer: string | null | undefined }): boolean {
  if (opts.hasSessionCookie) return true;
  if (!opts.referer) return false;
  try {
    const path = new URL(opts.referer).pathname;
    return path === "/saabai-admin" || path.startsWith("/saabai-admin/");
  } catch {
    return false;
  }
}

export function clientSiteRequestDecision(opts: {
  host: string;
  pathname: string;
  search?: string;
  sites?: SiteSurface[];
  extraDomains?: Record<string, string>;
  adminPreview?: boolean;
}): SurfaceDecision {
  const sites = opts.sites ?? CLIENT_SITE_DIRECTORY;
  const parsed = parseSitesPath(opts.pathname);
  if (!parsed) return { action: "pass" };
  if (isStaticAssetPath(opts.pathname)) return { action: "pass" };

  const host = normaliseHost(opts.host);
  const domain = canonicalHostForSlug(parsed.slug, sites, opts.extraDomains);
  if (domain && (host === domain || host === `www.${domain}`)) return { action: "index" };
  if (isRegisteredClientHost(host, sites, opts.extraDomains)) return { action: "index" };

  const search = opts.search ?? "";
  if (isSaabaiProductionHost(host) && domain && !opts.adminPreview) {
    const path = parsed.rest || "/";
    const location = path === "/" ? `https://${domain}/${search}` : `https://${domain}${path}${search}`;
    return { action: "redirect", location, status: 301 };
  }

  if (isSaabaiProductionHost(host) || isPreviewHost(host) || !domain) return { action: "noindex" };
  return { action: "noindex" };
}

/**
 * Robots for pages rendered under app/sites. Client custom domains stay
 * index, follow. saabai.ai and preview hosts are noindex, nofollow.
 * A child page may still set a stricter robots export (admin, privacy).
 */
export function clientSiteRobots(
  hostname: string | null | undefined,
  headerValue?: string | null,
): { index: boolean; follow: boolean } {
  if (headerValue?.includes("noindex")) return { index: false, follow: false };
  if (isRegisteredClientHost(hostname)) return { index: true, follow: true };
  return { index: false, follow: false };
}
