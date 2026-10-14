import type { Metadata } from "next";

/**
 * Shared helpers for client sites served from the site factory (app/sites/*
 * and the stored-HTML sites behind app/sites/[slug]). Client sites must never
 * inherit Saabai's own SEO identity from the root layout.
 */

export const POWERED_BY_TEXT = "Powered by Saabai.ai";

/** Footer credit link, tagged so Saabai can see which client site sent the visit. */
export function poweredByUrl(site: string): string {
  return `https://www.saabai.ai/?utm_source=${encodeURIComponent(site)}&utm_medium=footer`;
}

/**
 * Baseline metadata for a client site's root layout. Every field the Saabai root
 * layout sets is overridden here so nothing leaks (title template, keywords,
 * canonical, authors, manifest, OG/Twitter, icons). Spread it first, then add
 * site-specific fields.
 */
export function clientSiteMetadata(opts: {
  siteUrl: string;
  name: string;
  title: string;
  description: string;
  keywords?: string[];
  icon?: string;
  ogImage?: { url: string; width?: number; height?: number; alt?: string };
}): Metadata {
  const { siteUrl, name, title, description } = opts;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s | ${name}` },
    description,
    keywords: opts.keywords ?? null,
    authors: [{ name, url: siteUrl }],
    creator: name,
    publisher: name,
    manifest: null,
    appleWebApp: { capable: false, title: name },
    icons: opts.icon ? { icon: opts.icon, apple: opts.icon } : null,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "en_AU",
      url: siteUrl,
      siteName: name,
      title,
      description,
      images: opts.ogImage ? [opts.ogImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: opts.ogImage ? [opts.ogImage.url] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

/**
 * Stored-HTML sites: make sure the footer credit exists and carries the UTM tag.
 * Existing "Powered by Saabai.ai" links get the tagged URL; pages without a
 * credit get a small one appended at the end of <body>.
 */
export function ensurePoweredBy(site: string, html: string): string {
  const url = poweredByUrl(site);
  const existing = /<a([^>]*?)href="https?:\/\/(?:www\.)?saabai\.ai\/?[^"]*"([^>]*)>\s*Powered by Saabai\.ai\s*<\/a>/i;
  if (existing.test(html)) {
    return html.replace(existing, `<a$1href="${url}"$2>${POWERED_BY_TEXT}</a>`);
  }
  if (!html.includes("</body>")) return html;
  const credit =
    `<div data-saabai-credit style="text-align:center;padding:12px 16px;font:12px/1.4 system-ui,sans-serif;opacity:.7">` +
    `<a href="${url}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">${POWERED_BY_TEXT}</a></div>`;
  return html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${credit}</body>`);
}
