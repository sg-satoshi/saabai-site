import { NextRequest } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; page: string }> }
) {
  const { slug, page } = await params;

  // Only serve known safe page names — no path traversal
  const allowed = ["privacy-policy", "terms-of-use"];
  if (!allowed.includes(page)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const { blobs } = await list({ prefix: `sites/${slug}/${page}.html` });
    const blob = blobs.find((b) => b.pathname === `sites/${slug}/${page}.html`);

    if (!blob) {
      return new Response("Page not found", { status: 404 });
    }

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
