import { NextRequest } from "next/server";
import { put, list } from "@vercel/blob";

export const runtime = "nodejs";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/svg+xml": "svg",
  "image/jpeg": "png",
  "image/webp": "png",
};

async function updateHtmlFavicon(pathname: string, faviconUrl: string, mimeType: string): Promise<boolean> {
  const { blobs } = await list({ prefix: pathname });
  const blob = blobs.find(b => b.pathname === pathname);
  if (!blob) return false;

  const res = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
  let html = await res.text();

  const tag = `<link rel="icon" type="${mimeType}" href="${faviconUrl}">`;

  if (/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*>/i.test(html)) {
    html = html.replace(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*>/gi, tag);
  } else {
    html = html.replace("</head>", `${tag}\n</head>`);
  }

  await put(pathname, html, {
    access: "public",
    contentType: "text/html",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return true;
}

// GET — return current favicon URL for a slug
export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

  const { blobs } = await list({ prefix: `sites/${slug}/favicon` });
  const favicon = blobs.find(b => /^sites\/[^/]+\/favicon\.(png|ico|svg)$/.test(b.pathname));
  return Response.json({ url: favicon?.url ?? null });
}

// PUT — upload favicon, update HTML
export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    const slug = formData.get("slug") as string;
    const file = formData.get("file") as File;

    if (!slug || !file) return Response.json({ error: "slug and file required" }, { status: 400 });

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) return Response.json({ error: "Invalid type. Use PNG, ICO, or SVG." }, { status: 400 });

    // Delete any existing favicon blobs for this site
    const { blobs: existing } = await list({ prefix: `sites/${slug}/favicon` });
    // (no bulk delete — just overwrite via allowOverwrite)

    const mimeType = file.type.startsWith("image/") ? file.type : "image/png";
    const finalMime = ["image/jpeg", "image/webp"].includes(file.type) ? "image/png" : mimeType;

    const buffer = await file.arrayBuffer();
    const stored = await put(`sites/${slug}/favicon.${ext}`, buffer, {
      access: "public",
      contentType: finalMime,
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // Update live + draft HTML in parallel
    await Promise.all([
      updateHtmlFavicon(`sites/${slug}/index.html`, stored.url, finalMime),
      updateHtmlFavicon(`sites/${slug}/draft.html`, stored.url, finalMime),
    ]);

    return Response.json({ ok: true, url: stored.url });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
