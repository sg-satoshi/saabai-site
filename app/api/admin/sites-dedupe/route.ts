/**
 * /api/admin/sites-dedupe  (full admin only)
 *   GET  -> DRY RUN: for each client, the record kept, the duplicates merged, and the user links repointed.
 *   POST { confirm: "MERGE" } -> applies it: repoints users, deletes duplicate Redis records. Idempotent.
 * Hardcoded sites are never deleted (they are hidden from listings instead). Duplicates holding a billing
 * record are left in place and reported (billing is moved by hand).
 */
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySessionToken, isAdminSession } from "../../../../lib/auth";
import { APP_ROUTER_SITES, listRedisSites, deleteSite } from "../../../../lib/site-registry";
import { listDirectoryUsers, saveDirectoryUser } from "../../../../lib/user-directory";
import { listSiteBilling } from "../../../../lib/billing/store";
import { planDedupe, type SiteLinks } from "../../../../lib/site-dedupe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isFullAdmin(): Promise<boolean> {
  const t = (await cookies()).get(COOKIE_NAME)?.value;
  const s = t ? await verifySessionToken(t) : null;
  return !!s && (await isAdminSession(s.clientId));
}

async function buildPlan() {
  const redisSites = await listRedisSites();
  const ids = new Set(redisSites.map((s) => s.id));
  const hard = APP_ROUTER_SITES.filter((s) => !ids.has(s.id));
  const sites = [...redisSites, ...hard];
  const users = await listDirectoryUsers();
  const billed = new Set((await listSiteBilling().catch(() => [])).map((b) => b.siteId));
  const links = (id: string): SiteLinks => ({ users: users.filter((u) => u.siteId === id).map((u) => u.id), billing: billed.has(id) });
  return { plan: planDedupe(sites, links, new Set(hard.map((s) => s.id))), users, hardIds: new Set(hard.map((s) => s.id)), total: sites.length };
}

export async function GET() {
  if (!(await isFullAdmin())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { plan, total } = await buildPlan();
  return Response.json({ dryRun: true, sites: total, clientsWithDuplicates: plan.length, plan });
}

export async function POST(req: Request) {
  if (!(await isFullAdmin())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "MERGE") return Response.json({ error: 'Send { "confirm": "MERGE" } to apply. GET shows the dry run.' }, { status: 400 });
  const { plan, users, hardIds } = await buildPlan();
  const done = { usersRepointed: 0, sitesDeleted: [] as string[], keptForBilling: [] as string[], hardcodedHidden: [] as string[] };
  for (const g of plan) {
    for (const r of g.repointUsers) {
      const u = users.find((x) => x.id === r.userId);
      if (u && u.siteId === r.from) { await saveDirectoryUser({ ...u, siteId: r.to }); done.usersRepointed++; }
    }
    for (const m of g.merge) {
      if (hardIds.has(m.id)) { done.hardcodedHidden.push(m.id); continue; }
      if (g.billingHold.includes(m.id)) { done.keptForBilling.push(m.id); continue; }
      await deleteSite(m.id);
      done.sitesDeleted.push(m.id);
    }
  }
  return Response.json({ dryRun: false, ...done });
}
