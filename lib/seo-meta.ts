import type { Metadata } from "next";
import { SITE_URL, ORG_ID } from "./seo-entity";

/** Shared Open Graph image (static copy of app/opengraph-image.tsx). */
export const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Saabai, websites and AI systems for small businesses",
};

export const pageUrl = (path: string) => (path === "/" || path === "" ? SITE_URL : `${SITE_URL}${path}`);

/**
 * Full metadata for one saabai.ai page: exact title, description, its own canonical,
 * and a complete Open Graph and Twitter set. Next replaces the parent openGraph object
 * when a page sets one, so every page needs the full set, not just url and title.
 */
export function pageMeta(o: {
  path: string;
  title: string;
  description?: string;
  ogTitle?: string;
  robots?: Metadata["robots"];
}): Metadata {
  const url = pageUrl(o.path);
  const ogTitle = o.ogTitle ?? o.title;
  return {
    title: { absolute: o.title },
    ...(o.description ? { description: o.description } : {}),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_AU",
      siteName: "Saabai",
      url,
      title: ogTitle,
      ...(o.description ? { description: o.description } : {}),
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      ...(o.description ? { description: o.description } : {}),
      images: [OG_IMAGE.url],
    },
    ...(o.robots ? { robots: o.robots } : {}),
  };
}

/** BreadcrumbList node, without @context, so it can sit inside a @graph. */
export function breadcrumbNode(crumbs: { name: string; path: string }[]) {
  const all = [{ name: "Home", path: "/" }, ...crumbs];
  return {
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: pageUrl(c.path) })),
  };
}

/** BreadcrumbList: Home first, then each crumb. */
export function breadcrumbSchema(crumbs: { name: string; path: string }[]) {
  return { "@context": "https://schema.org", ...breadcrumbNode(crumbs) };
}

/** FAQPage node from visible question and answer pairs. Text must match the page. */
export function faqNode(items: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}

/** FAQPage from visible question and answer pairs (text must match the page word for word). */
export function faqSchema(items: { q: string; a: string }[]) {
  return { "@context": "https://schema.org", ...faqNode(items) };
}

export const orgRef = { "@id": ORG_ID };
