/**
 * AI SEO (GEO) standard for every site the factory serves.
 * Each site gets: robots.txt (AI crawlers welcome), a sitemap with only real
 * pages, llms.txt and llms-full.txt. Everything is generated from a GeoProfile
 * built from facts the site already publishes. Never add invented facts or a
 * home address here.
 */

export const AI_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User",
  "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended",
  "CCBot", "Bingbot", "meta-externalagent", "xAI-Bot", "GrokBot",
];

export interface GeoProfile {
  name: string;
  /** Canonical origin, no trailing slash, e.g. https://www.example.com.au */
  url: string;
  summary: string;
  phone?: string;
  email?: string;
  serviceAreas?: string[];
  /** Public business address only (never a home address). */
  address?: string;
  facts?: string[];
  services?: Array<{ name: string; detail?: string }>;
  faqs?: Array<{ q: string; a: string }>;
  /** Real, working, indexable pages. */
  pages: Array<{ path: string; title: string; priority?: number }>;
}

export function robotsTxt(opts: { sitemapUrl: string; disallow?: string[] }): string {
  const dis = (opts.disallow ?? ["/api/"]).map((d) => `Disallow: ${d}`).join("\n");
  const block = (ua: string) => `User-agent: ${ua}\nAllow: /\n${dis}`;
  return `${["*", ...AI_BOTS].map(block).join("\n\n")}\n\nSitemap: ${opts.sitemapUrl}\n`;
}

export function sitemapXml(p: Pick<GeoProfile, "url" | "pages">, lastmod = new Date().toISOString().slice(0, 10)): string {
  const urls = p.pages
    .map((pg) => {
      const loc = pg.path === "/" || pg.path === "" ? `${p.url}/` : `${p.url}${pg.path}`;
      return `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><priority>${pg.priority ?? (pg.path === "/" ? 1 : 0.7)}</priority></url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function llmsTxt(p: GeoProfile): string {
  const lines: string[] = [`# ${p.name}`, "", `> ${p.summary}`, "", "## Key facts"];
  lines.push(`- Business: ${p.name}`);
  if (p.serviceAreas?.length) lines.push(`- Service area: ${p.serviceAreas.join("; ")}`);
  if (p.address) lines.push(`- Address: ${p.address}`);
  if (p.phone) lines.push(`- Phone: ${p.phone}`);
  if (p.email) lines.push(`- Email: ${p.email}`);
  lines.push(`- Website: ${p.url}`);
  for (const f of p.facts ?? []) lines.push(`- ${f}`);
  lines.push("", "## Pages");
  for (const pg of p.pages) lines.push(`- [${pg.title}](${p.url}${pg.path === "/" ? "/" : pg.path})`);
  lines.push(`- [Full details for AI assistants](${p.url}/llms-full.txt)`, "");
  return lines.join("\n");
}

export function llmsFullTxt(p: GeoProfile): string {
  let out = llmsTxt(p);
  if (p.services?.length) {
    out += `\n## Services\n${p.services.map((s) => `- ${s.name}${s.detail ? `: ${s.detail}` : ""}`).join("\n")}\n`;
  }
  if (p.faqs?.length) {
    out += `\n## FAQ\n${p.faqs.map((f) => `**${f.q}**\n${f.a}`).join("\n\n")}\n`;
  }
  return out;
}

/** Minimal JSON-LD for sites that have none; sites with their own keep it. */
export function localBusinessJsonLd(p: GeoProfile, type: string | string[] = "LocalBusiness") {
  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${p.url}/#business`,
    name: p.name,
    url: p.url,
    description: p.summary,
    ...(p.phone ? { telephone: p.phone } : {}),
    ...(p.email ? { email: p.email } : {}),
    ...(p.serviceAreas?.length ? { areaServed: p.serviceAreas.map((a) => ({ "@type": "Place", name: a })) } : {}),
  };
}

export function faqJsonLd(faqs: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}
