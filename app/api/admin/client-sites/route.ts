/**
 * GET /api/admin/client-sites  (admin only)
 * Minimal site list for linking a client account to their website.
 */
import { requireAdminSession } from "../../../../lib/admin-guard";
import { listSites } from "../../../../lib/site-registry";
import { listDirectoryUsers } from "../../../../lib/user-directory";
import { listSiteBilling } from "../../../../lib/billing/store";
import { canonicalOnly } from "../../../../lib/site-dedupe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hostOf(u?: string): string {
  try { return u ? new URL(u).host.replace(/^www\./, "") : ""; } catch { return ""; }
}

export async function GET() {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const all = await listSites();
  // One listing per client: duplicates fold into the canonical record (see lib/site-dedupe.ts).
  const users = await listDirectoryUsers().catch(() => []);
  const billed = new Set((await listSiteBilling().catch(() => [])).map((b) => b.siteId));
  const sites = canonicalOnly(all, (id) => ({ users: users.filter((u) => u.siteId === id).map((u) => u.id), billing: billed.has(id) }));
  return Response.json({
    sites: sites
      // Archived and test sites are not offered for linking (a user already linked to one keeps it; the form shows the raw id).
      .filter((s) => s.status !== "archived" && !/\b(test|demo|copy)\b/i.test(`${s.name} ${s.slug}`))
      .map((s) => ({ id: s.id, name: s.name, slug: s.slug, domain: hostOf(s.externalUrl || s.url), url: s.externalUrl || s.url, status: s.status, createdAt: s.createdAt }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
}
