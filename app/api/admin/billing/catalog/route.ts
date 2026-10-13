import { requireAdminSession } from "../../../../../lib/admin-guard";
import { getCatalog, saveCatalog, type Catalog } from "../../../../../lib/billing/catalog";
import { listSiteBilling } from "../../../../../lib/billing/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function counts() {
  const recs = await listSiteBilling().catch(() => []);
  const plans: Record<string, number> = {}, addons: Record<string, number> = {};
  for (const r of recs) {
    if (["active", "payment_failed", "past_due", "cancelling"].includes(r.status)) plans[r.planId] = (plans[r.planId] || 0) + 1;
    for (const a of r.addons || []) if (a.status !== "pending") addons[a.addonId] = (addons[a.addonId] || 0) + 1;
  }
  return { plans, addons };
}

export async function GET() {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json({ catalog: await getCatalog(), counts: await counts() });
}

export async function PUT(req: Request) {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  let body: { catalog?: Catalog };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.catalog || !Array.isArray(body.catalog.plans) || !Array.isArray(body.catalog.addons)) return Response.json({ error: "Invalid catalogue" }, { status: 400 });
  const saved = await saveCatalog(body.catalog);
  return Response.json({ catalog: saved, counts: await counts() });
}
