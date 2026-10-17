/**
 * Serve-time business schema for Site Factory sites that ship without any JSON-LD.
 * Only uses facts already visible in the page's own HTML (name, description, tel:/mailto: links)
 * plus a small per-site override for details the owner has already published. Never invents contact details.
 * Allowlisted slugs only, so other client sites are untouched.
 */
const ALLOW: Record<string, { type: string; address?: Record<string, string> }> = {
  nextinvestment: {
    type: "RealEstateAgent",
    // Taken from the site's own published meta description.
    address: { streetAddress: "Suite 39/422 Pulteney Street", addressLocality: "Adelaide", addressRegion: "SA", postalCode: "5000", addressCountry: "AU" },
  },
};

const meta = (html: string, key: string) => {
  const m = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=(?:"([^"]*)"|'([^']*)')`, "i"));
  return m ? (m[1] ?? m[2] ?? "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").trim() : "";
};

export function ensureSchema(slug: string, html: string): string {
  const cfg = ALLOW[slug];
  if (!cfg || !html.includes("</head>") || /application\/ld\+json/i.test(html)) return html;
  const title = (html.match(/<title>([^<]*)/i)?.[1] ?? "").split(/\s[|:\u2013-]\s|:\s/)[0].trim();
  const name = meta(html, "og:site_name") || title;
  if (!name) return html;
  const tel = html.match(/href=["']tel:([^"']+)["']/i)?.[1];
  const email = html.match(/href=["']mailto:([^"'?]+)/i)?.[1];
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": cfg.type,
    name,
    url: `https://www.saabai.ai/sites/${slug}`,
    description: meta(html, "description") || meta(html, "og:description") || undefined,
    image: meta(html, "og:image") || undefined,
    telephone: tel ? decodeURIComponent(tel) : undefined,
    email: email || undefined,
    address: cfg.address ? { "@type": "PostalAddress", ...cfg.address } : undefined,
    areaServed: { "@type": "AdministrativeArea", name: "South Australia" },
  };
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return html.replace("</head>", `<script type="application/ld+json">${json}</script>\n</head>`);
}
