/**
 * Routing record for every coded client site.
 *
 * This is the only list the redirect, noindex, and Saabai-chrome rules read.
 * APP_ROUTER_SITES in lib/site-registry.ts is built from these rows, so a new
 * site is covered as soon as it is registered here. Do not add a second
 * per-site opt-in for those rules.
 *
 * `url` is the canonical origin. A saabai.ai url means the site has no custom
 * domain yet, so /sites/<slug> stays on saabai.ai and is noindex.
 */
export type ClientSiteDirectoryEntry = {
  slug: string;
  url: string;
  domains?: string[];
};

export const CLIENT_SITE_DIRECTORY: ClientSiteDirectoryEntry[] = [
  {
    slug: "cycle-repair",
    url: "https://stuscyclerepairs.com",
    domains: ["stuscyclerepairs.com", "www.stuscyclerepairs.com"],
  },
  {
    slug: "tributum-law-v2",
    url: "https://www.saabai.ai/sites/tributum-law-v2",
  },
  {
    slug: "bo-consultancy",
    url: "https://boconsulting.com.au",
    domains: ["boconsulting.com.au", "www.boconsulting.com.au"],
  },
  {
    slug: "wholesale-homes",
    url: "https://wholesalehomes.com.au",
    domains: ["wholesalehomes.com.au", "www.wholesalehomes.com.au"],
  },
];
