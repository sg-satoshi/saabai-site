import { NextRequest } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";

const HTML_PAGES = [
  "privacy-policy", "terms-of-use",
  "about", "services", "practice-areas", "contact",
  "menu", "team", "gallery", "faq", "blog",
  // Location pages
  "sydney", "melbourne", "brisbane", "perth", "canberra", "hobart",
];
const SEO_FILES: Record<string, { ext: string; contentType: string }> = {
  "sitemap.xml": { ext: "xml", contentType: "application/xml; charset=utf-8" },
  "robots.txt": { ext: "txt", contentType: "text/plain; charset=utf-8" },
};
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
      if (!blob) return new Response("Not found", { status: 404 });
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
      if (!blob) return new Response("Not found", { status: 404 });
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
    const html = await res.text();
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
