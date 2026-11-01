import type { GeoProfile } from "./geo";
import type { SiteConfig } from "./site-registry";

/**
 * SUNDER factory seed.
 *
 * The live Redis hash `saabai:sites` and the Blob object `sites/sunder/index.html`
 * are not written by this file. The admin list reads the HTML from
 * `public/clients/sunder/` (legacy scan). Opening that row in Site Factory
 * runs POST /api/site-factory/migrate-legacy, which uploads the HTML and
 * calls createSite() with SUNDER_FACTORY_SEED.
 *
 * Do not POST that route, and do not add the domains in Vercel, from an agent.
 */

export const SUNDER_SLUG = "sunder";

export const SUNDER_CANONICAL_ORIGIN = "https://sunder.com.au";

/** Hosts that serve the shell. www is stripped before STATIC_DOMAIN_MAP lookup. */
export const SUNDER_HOSTS = ["sunder.com.au", "www.sunder.com.au"] as const;

/**
 * Former hosts. proxy 301s each of these to SUNDER_CANONICAL_ORIGIN.
 * www is listed so the redirect does not depend on a strip.
 */
export const SUNDER_ALIAS_HOSTS = [
  "sunderpickleball.com",
  "www.sunderpickleball.com",
  "sunderpickleball.com.au",
  "www.sunderpickleball.com.au",
] as const;

export const SUNDER_PLACEHOLDER = "SUNDER. Coming soon.";

/**
 * Headline copy for the waitlist shell.
 * lib/exp/seed.ts (CLIENT_SEEDS) defines both as a draft overlay test on site "sunder". Visitors only get a
 * variant once Shane starts that test AND switches split testing on for SUNDER in /saabai-admin/experiments
 * (off by default). Until then the page shows `control`.
 */
export const SUNDER_HEADLINE = {
  control: "Get first hit.",
  variant: "Feel the power. Keep the control.",
} as const;

/** Until launch, SUNDER host responses stay noindex. */
export const SUNDER_ROBOTS = "noindex, nofollow";

export function isSunderPrelaunch(slug: string): boolean {
  return slug === SUNDER_SLUG;
}

export function sunderRobotsHeaders(slug: string, headers: Record<string, string>): Record<string, string> {
  if (!isSunderPrelaunch(slug)) return headers;
  return { ...headers, "X-Robots-Tag": SUNDER_ROBOTS };
}

export type SunderFactorySeed = Omit<SiteConfig, "id" | "createdAt" | "updatedAt">;

/** Exact record migrate-legacy passes to createSite(). Status stays draft until launch. */
export const SUNDER_FACTORY_SEED: SunderFactorySeed = {
  slug: SUNDER_SLUG,
  name: "SUNDER",
  niche: "other",
  description: SUNDER_PLACEHOLDER,
  status: "draft",
  source: "factory",
  url: SUNDER_CANONICAL_ORIGIN,
  domains: [...SUNDER_HOSTS],
  business: {
    name: "SUNDER",
    tagline: "Coming soon.",
  },
  chatbot: {
    enabled: false,
    name: "",
    greeting: "",
    systemPrompt: "",
  },
};

export const SUNDER_LEGACY_META: Record<string, { name: string; niche: string; description?: string }> = {
  [SUNDER_SLUG]: {
    name: SUNDER_FACTORY_SEED.name,
    niche: SUNDER_FACTORY_SEED.niche ?? "other",
    description: SUNDER_FACTORY_SEED.description,
  },
};

/** Facts already on the shell. No origin claim and no approval claim. */
export function sunderGeoProfile(): GeoProfile {
  return {
    name: "SUNDER",
    url: SUNDER_CANONICAL_ORIGIN,
    summary: SUNDER_PLACEHOLDER,
    pages: [{ path: "/", title: "Home" }],
  };
}
