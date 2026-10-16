import { NextRequest } from "next/server";
import { list } from "@vercel/blob";
import { ensurePoweredBy } from "@/lib/client-site";
import { resolveGeoProfile } from "@/lib/geo/profiles";
import { llmsFullTxt, llmsTxt, robotsTxt, sitemapXml } from "@/lib/geo";
import { ensureFavicon, findSiteFavicon, SAABAI_FAVICON } from "@/lib/site-favicon";

export const runtime = "nodejs";

const HTML_PAGES = [
  "privacy-policy", "terms-of-use",
  "about", "services", "practice-areas", "contact",
  "menu", "team", "gallery", "faq", "blog",
  // Location pages
  "sydney", "melbourne", "brisbane", "perth", "canberra", "hobart", "gold-coast",
  // Content pages
  "faq",
  // Service pages
  "husband-experience",
  // Gift vouchers page
  "gift-vouchers",
  // Heaven Thai Massage location pages
  "mudgeeraba", "carrara", "merrimac", "robina", "clear-island-waters",
  "highland-park", "nerang", "tallai", "gilston", "varsity-lakes",
  "bonogin", "reedy-creek", "surfers-paradise", "main-beach", "labrador",
  "biggera-waters", "ashmore", "molendinar", "parkwood", "arundel",
  "helensvale", "runaway-bay", "bundall", "benowa",
];
const SEO_FILES: Record<string, { ext: string; contentType: string }> = {
  "sitemap.xml": { ext: "xml", contentType: "application/xml; charset=utf-8" },
  "robots.txt": { ext: "txt", contentType: "text/plain; charset=utf-8" },
  "llms.txt": { ext: "txt", contentType: "text/plain; charset=utf-8" },
  "llms-full.txt": { ext: "txt", contentType: "text/plain; charset=utf-8" },
};

/** AI SEO standard: every factory site gets these even when none was uploaded. */
async function generatedSeoFile(slug: string, page: string): Promise<string | null> {
  const profile = await resolveGeoProfile(slug);
  if (!profile) return null;
  if (page === "robots.txt") return robotsTxt({ sitemapUrl: `${profile.url}/sitemap.xml` });
  if (page === "sitemap.xml") return sitemapXml(profile);
  if (page === "llms.txt") return llmsTxt(profile);
  if (page === "llms-full.txt") return llmsFullTxt(profile);
  return null;
}
const FAVICON_EXTS: Record<string, string> = {
  "favicon.ico": "image/x-icon",
  "favicon.png": "image/png",
  "favicon.svg": "image/svg+xml",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; page: string }> }
) {
  const { slug, page } = await params;

  // Favicon files — served as binary from blob
  const faviconMime = FAVICON_EXTS[page];
  if (faviconMime) {
    try {
      const { blobs } = await list({ prefix: `sites/${slug}/${page}` });
      const blob = blobs.find((b) => b.pathname === `sites/${slug}/${page}`);
      // No exact match: use whatever favicon the site uploaded, else Saabai's.
      if (!blob) return Response.redirect((await findSiteFavicon(slug)) ?? SAABAI_FAVICON, 302);
      const res = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
      const buffer = await res.arrayBuffer();
      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": faviconMime,
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch (e) {
      console.error("Favicon serve error:", e);
      return new Response("Error", { status: 500 });
    }
  }

  // SEO files — served directly from blob
  const seoFile = SEO_FILES[page];
  if (seoFile) {
    try {
      const { blobs } = await list({ prefix: `sites/${slug}/${page}` });
      const blob = blobs.find((b) => b.pathname === `sites/${slug}/${page}`);
      if (!blob) {
        const generated = await generatedSeoFile(slug, page);
        if (generated === null) return new Response("Not found", { status: 404 });
        return new Response(generated, {
          status: 200,
          headers: { "Content-Type": seoFile.contentType, "Cache-Control": "public, s-maxage=3600" },
        });
      }
      const res = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
      const text = await res.text();
      return new Response(text, {
        status: 200,
        headers: {
          "Content-Type": seoFile.contentType,
          "Cache-Control": "public, s-maxage=3600",
        },
      });
    } catch (e) {
      console.error("SEO file serve error:", e);
      return new Response("Error", { status: 500 });
    }
  }

  // HTML sub-pages
  if (!HTML_PAGES.includes(page)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const { blobs } = await list({ prefix: `sites/${slug}/${page}.html` });
    const blob = blobs.find((b) => b.pathname === `sites/${slug}/${page}.html`);
    if (!blob) return new Response("Page not found", { status: 404 });

    const res = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
    const html = ensurePoweredBy(slug, await ensureFavicon(slug, await res.text()));
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Sub-page serve error:", e);
    return new Response("Error loading page", { status: 500 });
  }
}
