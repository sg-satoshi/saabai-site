import { NextRequest } from "next/server";
import { list, put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { slug, imageUrl } = await req.json();
    if (!slug || !imageUrl) {
      return Response.json({ error: "slug and imageUrl required" }, { status: 400 });
    }

    const { blobs } = await list({ prefix: `sites/${slug}/index.html` });
    const blob = blobs.find(b => b.pathname === `sites/${slug}/index.html`);
    if (!blob) return Response.json({ error: "Site HTML not found" }, { status: 404 });

    const res = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
    let html = await res.text();
    const before = html;

    // Strategy 1: .hero-bg { ... background-image: url(...) } in CSS
    html = html.replace(
      /\.hero-bg\s*\{([^}]*?)background-image\s*:\s*url\(['"]?[^'")\s]+['"]?\)/,
      (_, pre) => `.hero-bg {${pre}background-image: url('${imageUrl}')`
    );

    // Strategy 2: any CSS rule with "hero" in the selector containing background-image
    if (html === before) {
      html = html.replace(
        /((?:#hero|\.hero|\.hero-section|\.hero-wrapper|\.hero-inner|section\.hero)[^{]*\{[^}]*?)background-image\s*:\s*url\(['"]?[^'")\s]+['"]?\)/,
        (_, pre) => `${pre}background-image: url('${imageUrl}')`
      );
    }

    // Strategy 3: first background-image using an Unsplash or blob URL (likely the hero)
    if (html === before) {
      html = html.replace(
        /background-image\s*:\s*url\(['"]?https?:\/\/(?:images\.unsplash\.com|[^'")\s]+\.public\.blob\.vercel-storage\.com)[^'")\s]*['"]?\)/,
        `background-image: url('${imageUrl}')`
      );
    }

    // Strategy 4: first ANY background-image url in the whole document
    if (html === before) {
      html = html.replace(
        /background-image\s*:\s*url\(['"]?(?!data:)[^'")\s]+['"]?\)/,
        `background-image: url('${imageUrl}')`
      );
    }

    if (html === before) {
      return Response.json({ error: "Could not find a hero background image to replace — no background-image found in site CSS" }, { status: 422 });
    }

    await put(`sites/${slug}/index.html`, html, {
      access: "public",
      contentType: "text/html",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return Response.json({ ok: true, html });
  } catch (e) {
    console.error("set-hero-image error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
