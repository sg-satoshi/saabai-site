/**
 * GET /api/admin/client-sites  (admin only)
 * Minimal site list for linking a client account to their website.
 */
import { requireAdminSession } from "../../../../lib/admin-guard";
import { listSites } from "../../../../lib/site-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const sites = await listSites();
  return Response.json({
    sites: sites
      .map((s) => ({ id: s.id, name: s.name, url: s.externalUrl || s.url, status: s.status }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
}
