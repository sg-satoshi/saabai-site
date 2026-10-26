import { NextRequest } from "next/server";
import { list } from "@vercel/blob";
import { readFileSync } from "fs";
import path from "path";
import { ensurePoweredBy } from "@/lib/client-site";
import { prepareLmmHomeHtml } from "@/lib/lmm-legal";
import { ensureFavicon } from "@/lib/site-favicon";
import { ensureSchema } from "@/lib/site-schema";

export const runtime = "nodejs";

// Per-site CSS patches applied at serve time (small layout fixes to stored HTML).
const SITE_CSS_PATCHES: Record<string, string> = {
  // Tributum Law: stack contact cards on phones so they don't overflow.
  "tributum-law":
    "@media(max-width:600px){.contact-grid{grid-template-columns:1fr}.contact-card{padding:22px;min-width:0}.contact-value,.contact-value a{overflow-wrap:anywhere}}",
};

function applyCssPatch(slug: string, html: string): string {
  const css = SITE_CSS_PATCHES[slug];
  if (!css || !html.includes("</head>")) return html;
  return html.replace("</head>", `<style data-saabai-patch>${css}</style></head>`);
}

function prepareStoredHtml(slug: string, html: string): string {
  return slug === "lmm-site" ? prepareLmmHomeHtml(html) : html;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    // 1. Check Vercel Blob first (AI-generated sites). A missing token or a
    // blob outage must not hide the legacy file in public/clients/.
    let blobHtml: string | null = null;
    try {
      const { blobs } = await list({ prefix: `sites/${slug}/index.html` });
      const blob = blobs.find((b) => b.pathname === `sites/${slug}/index.html`);
      if (blob) {
        const res = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
        blobHtml = await res.text();
      }
    } catch (e) {
      console.error("Site blob lookup failed:", e);
    }

    if (blobHtml !== null) {
      const html = ensurePoweredBy(slug, ensureSchema(slug, await ensureFavicon(slug, applyCssPatch(slug, prepareStoredHtml(slug, blobHtml)))));
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    // 2. Fall back to legacy static sites in public/clients/
    try {
      const filePath = path.join(process.cwd(), "public", "clients", slug, "index.html");
      const html = ensurePoweredBy(slug, ensureSchema(slug, await ensureFavicon(slug, prepareStoredHtml(slug, readFileSync(filePath, "utf-8")))));
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, s-maxage=3600",
        },
      });
    } catch {
      // not a legacy site either
    }

    return new Response(
      `<!DOCTYPE html><html><head><title>Site not found</title></head><body style="font-family:sans-serif;text-align:center;padding:80px 20px"><h1>Site not found</h1><p>The site <strong>${slug}</strong> doesn't exist yet.</p></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (e) {
    console.error("Site serve error:", e);
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:80px"><h1>Error loading site</h1></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
