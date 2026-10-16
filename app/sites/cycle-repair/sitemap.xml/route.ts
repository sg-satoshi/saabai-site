import { SITE_URL, SITEMAP_PATHS } from "../seo";

export const dynamic = "force-static";

export function GET() {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = SITEMAP_PATHS.map(
    (p) =>
      `<url><loc>${SITE_URL}${p.path === "/" ? "/" : p.path}</loc><lastmod>${lastmod}</lastmod><changefreq>${p.changeFrequency}</changefreq><priority>${p.priority}</priority></url>`,
  ).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
