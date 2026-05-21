import { NextRequest } from "next/server";
import { list } from "@vercel/blob";
import { readFileSync } from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    // 1. Check Vercel Blob first (AI-generated sites)
    const { blobs } = await list({ prefix: `sites/${slug}/index.html` });
    const blob = blobs.find((b) => b.pathname === `sites/${slug}/index.html`);

    if (blob) {
      const res = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
      const html = await res.text();
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      });
    }

    // 2. Fall back to legacy static sites in public/clients/
    try {
      const filePath = path.join(process.cwd(), "public", "clients", slug, "index.html");
      const html = readFileSync(filePath, "utf-8");
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
