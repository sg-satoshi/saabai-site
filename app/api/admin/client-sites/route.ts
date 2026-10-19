/**
 * GET /api/admin/client-sites  (admin only)
 * Minimal site list for linking a client account to their website.
 */
import { requireAdminSession } from "../../../../lib/admin-guard";
import { listSites } from "../../../../lib/site-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hostOf(u?: string): string {
  try { return u ? new URL(u).host.replace(/^www\./, "") : ""; } catch { return ""; }
}

export async function GET() {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const sites = await listSites();
  return Response.json({
    sites: sites
      // Archived and test sites are not offered for linking (a user already linked to one keeps it; the form shows the raw id).
      .filter((s) => s.status !== "archived" && !/\b(test|demo|copy)\b/i.test(`${s.name} ${s.slug}`))
      .map((s) => ({ id: s.id, name: s.name, slug: s.slug, domain: hostOf(s.externalUrl || s.url), url: s.externalUrl || s.url, status: s.status, createdAt: s.createdAt }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
}
