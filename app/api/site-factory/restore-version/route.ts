import { NextRequest } from "next/server";
import { listVersions, snapshotVersion } from "../../../../lib/site-versions";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { slug, v } = await req.json();
  if (!slug || typeof v !== "number") {
    return Response.json({ error: "slug and v required" }, { status: 400 });
  }

  const versions = await listVersions(slug);
  const target = versions.find((ver) => ver.v === v);
  if (!target) return Response.json({ error: "version not found" }, { status: 404 });

  // Fetch snapshot HTML
  const res = await fetch(`${target.url}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return Response.json({ error: "snapshot not accessible" }, { status: 502 });
  const html = await res.text();

  // Snapshot current live before overwriting so it's not lost
  try {
    const liveRes = await fetch(
      `https://www.saabai.ai/sites/${slug}/?t=${Date.now()}`,
      { cache: "no-store" },
    );
    if (liveRes.ok) {
      const liveHtml = await liveRes.text();
      await snapshotVersion(slug, liveHtml, `Before restore to v${v}`);
    }
  } catch { /* non-fatal */ }

  await put(`sites/${slug}/index.html`, html, {
    access: "public",
    contentType: "text/html",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return Response.json({ ok: true, restoredTo: v });
}
