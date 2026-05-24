import { NextRequest } from "next/server";
import { list, put, del } from "@vercel/blob";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

const redis = Redis.fromEnv();

function buildSitemap(baseUrl: string, lastmod: string): string {
  const pages = [
    { path: "/", priority: "1.0", changefreq: "weekly" },
    { path: "/privacy-policy", priority: "0.3", changefreq: "monthly" },
    { path: "/terms-of-use", priority: "0.3", changefreq: "monthly" },
  ];
  const urls = pages.map(p => `  <url>
    <loc>${baseUrl}${p.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

function buildRobots(sitemapUrl: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fixCanonicals(html: string, oldBase: string, newBase: string): string {
  return html
    .replace(new RegExp(`(href|content|url)="(${escapeRe(oldBase)}[^"]*)"`, "g"),
      (_, attr, url) => `${attr}="${url.replace(oldBase, newBase)}"`)
    .replace(new RegExp(`(href|content|url)='(${escapeRe(oldBase)}[^']*)'`, "g"),
      (_, attr, url) => `${attr}='${url.replace(oldBase, newBase)}'`);
}

async function pingGoogle(sitemapUrl: string) {
  try {
    await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, {
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* non-fatal */ }
}

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json();
    if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

    const { blobs } = await list({ prefix: `sites/${slug}/` });
    const draftBlob = blobs.find(b => b.pathname === `sites/${slug}/draft.html`);
    if (!draftBlob) return Response.json({ error: "No draft to publish" }, { status: 404 });

    const res = await fetch(`${draftBlob.url}?t=${Date.now()}`, { cache: "no-store" });
    let html = await res.text();

    // Resolve canonical base — prefer custom domain over saabai.ai/sites/slug
    const domainMap = await redis.hgetall<Record<string, string>>("saabai:domain-map");
    const customDomain = domainMap
      ? Object.entries(domainMap).find(([, v]) => v === slug)?.[0] ?? null
      : null;

    const canonicalBase = customDomain
      ? `https://${customDomain}`
      : `https://www.saabai.ai/sites/${slug}`;

    // Rewrite any existing canonical/OG base URL to the correct one
    const canonicalMatch = html.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']|href=["']([^"']+)["'][^>]*rel=["']canonical["']/);
    const existingCanonical = canonicalMatch?.[1] ?? canonicalMatch?.[2] ?? "";
    if (existingCanonical) {
      try {
        const existingBase = new URL(existingCanonical).origin;
        if (existingBase !== canonicalBase) {
          html = fixCanonicals(html, existingBase, canonicalBase);
        }
      } catch { /* malformed URL — skip */ }
    }

    const lastmod = new Date().toISOString().split("T")[0];
    const sitemapUrl = `${canonicalBase}/sitemap.xml`;

    // Inject sitemap link tag if missing
    if (!/<link[^>]+rel=["']sitemap["']/i.test(html)) {
      html = html.replace(
        /(<link[^>]+rel=["']canonical["'][^>]*>)/i,
        `$1\n<link rel="sitemap" type="application/xml" title="Sitemap" href="${sitemapUrl}">`
      );
    }

    // Inject robots meta if missing
    if (!/<meta[^>]+name=["']robots["']/i.test(html)) {
      html = html.replace(
        /(<meta[^>]+name=["']viewport["'][^>]*>)/i,
        `$1\n<meta name="robots" content="index, follow">`
      );
    }

    await Promise.all([
      put(`sites/${slug}/index.html`, html, {
        access: "public", contentType: "text/html",
        addRandomSuffix: false, allowOverwrite: true,
      }),
      put(`sites/${slug}/sitemap.xml`, buildSitemap(canonicalBase, lastmod), {
        access: "public", contentType: "application/xml",
        addRandomSuffix: false, allowOverwrite: true,
      }),
      put(`sites/${slug}/robots.txt`, buildRobots(sitemapUrl), {
        access: "public", contentType: "text/plain",
        addRandomSuffix: false, allowOverwrite: true,
      }),
    ]);

    await del(draftBlob.url);
    pingGoogle(sitemapUrl); // fire-and-forget

    return Response.json({ ok: true, sitemapUrl, canonicalBase });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
