import { NextRequest } from "next/server";
import { list, del } from "@vercel/blob";
import { deleteSite, listSites } from "../../../../lib/site-registry";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";

export const runtime = "nodejs";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export async function DELETE(req: NextRequest) {
  // Defense-in-depth: middleware gates this, but it permanently deletes a
  // client's site, so verify the admin session here too.
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (session?.clientId !== ADMIN_ID) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

  try {
    // Delete all blobs for this site
    let cursor: string | undefined;
    let deleted = 0;
    do {
      const result = await list({ prefix: `sites/${slug}/`, cursor });
      if (result.blobs.length > 0) {
        await del(result.blobs.map((b) => b.url));
        deleted += result.blobs.length;
      }
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);

    // Remove from Redis
    const sites = await listSites();
    const site = sites.find((s) => s.slug === slug);
    if (site) await deleteSite(site.id);

    return Response.json({ ok: true, deleted });
  } catch (e) {
    console.error("Delete site error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
