import { list } from "@vercel/blob";
import { getSiteBySlug, type SiteConfig } from "../site-registry";
import type { GeoProfile } from "./index";

/**
 * Hand-checked profiles for coded (App Router) sites. Facts come from each
 * site's own published copy and registry entry only.
 */
export const CODED_PROFILES: Record<string, GeoProfile> = {
  "bo-consultancy": {
    name: "BO Consulting",
    url: "https://www.boconsulting.com.au",
    summary:
      "BO Consulting is an Australian blue-collar workforce recruitment partner offering permanent placement, labour hire and workforce solutions across Construction, Mining, Manufacturing, Transport and more.",
    email: "info@boconsulting.com.au",
    serviceAreas: ["Australia"],
    facts: ["Site states 1,000+ placements, a 95% retention rate and a 48 hour average turnaround"],
    services: [
      { name: "Permanent placement" },
      { name: "Labour hire" },
      { name: "Workforce solutions" },
    ],
    pages: [
      { path: "/", title: "Home" },
      { path: "/privacy-policy", title: "Privacy policy", priority: 0.3 },
      { path: "/terms", title: "Terms", priority: 0.3 },
    ],
  },
  "wholesale-homes": {
    name: "Wholesale Homes Australia",
    url: "https://www.wholesalehomes.com.au",
    summary:
      "Wholesale Homes Australia offers pre-market house and land packages at wholesale pricing for Australian investors.",
    phone: "0488 165 908",
    email: "hello@wholesalehomes.com.au",
    serviceAreas: ["Australia"],
    facts: ["Principal: Nick Foale"],
    pages: [
      { path: "/", title: "Home" },
      { path: "/packages", title: "House and land packages" },
      { path: "/how-it-works", title: "How it works" },
      { path: "/tax-advantages", title: "Tax advantages" },
      { path: "/contact", title: "Contact" },
      { path: "/faq", title: "FAQ" },
      { path: "/about", title: "About" },
      { path: "/blog", title: "Blog" },
    ],
  },
};

function fromRegistry(site: SiteConfig, pages: GeoProfile["pages"]): GeoProfile {
  const url = (site.domains?.length ? `https://${site.domains[0]}` : site.url).replace(/\/$/, "");
  return {
    name: site.business.name || site.name,
    url,
    summary: site.description || `${site.business.name}${site.business.tagline ? `: ${site.business.tagline}` : ""}`,
    phone: site.business.phone,
    email: site.business.email,
    // Registry address is a business address entered by the owner; only used for non-home business listings.
    address: undefined,
    pages,
  };
}

/** Real pages of a stored-HTML factory site, read from blob storage. */
async function storedPages(slug: string): Promise<GeoProfile["pages"]> {
  const pages: GeoProfile["pages"] = [{ path: "/", title: "Home" }];
  try {
    const { blobs } = await list({ prefix: `sites/${slug}/` });
    for (const b of blobs) {
      const m = b.pathname.match(/^sites\/[^/]+\/([a-z0-9-]+)\.html$/);
      if (m && m[1] !== "index") pages.push({ path: `/${m[1]}`, title: m[1].replace(/-/g, " ") });
    }
  } catch {
    /* blob unavailable: home only */
  }
  return pages;
}

export async function resolveGeoProfile(slug: string): Promise<GeoProfile | null> {
  if (CODED_PROFILES[slug]) return CODED_PROFILES[slug];
  const site = await getSiteBySlug(slug).catch(() => null);
  if (!site || site.status === "archived") return null;
  return fromRegistry(site, await storedPages(slug));
}
