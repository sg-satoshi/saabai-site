/**
 * GET/POST /api/portal/chatbot  (portal_session; read-only while impersonating or logged in as)
 * The client's own chatbot goal settings. The slug always comes from the signed session's site.
 * Saves the goal only. No messages are sent and nothing is posted to a chat or lead endpoint.
 */
import { rejectIfImpersonatingReadOnly } from "../../../../lib/impersonation";
import { rejectIfLoginAs } from "../../../../lib/login-as";
import { resolvePortalBilling } from "../../../../lib/billing/portal-auth";
import { listSites } from "../../../../lib/site-registry";
import { getConfig, saveConfig } from "../../../../lib/chatbot/store";
import { clientSave, clientSaveEngage, decidePortalBot, portalView } from "../../../../lib/chatbot/portal";
import { addChangeLogEntry } from "../../../../lib/change-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function clientSite(req: Request) {
  const who = await resolvePortalBilling(req);
  if (!who) return { who: null, site: null };
  if (!who.siteId) return { who, site: null };
  const site = (await listSites().catch(() => [])).find((s) => s.id === who.siteId) ?? null;
  return { who, site: site ? { slug: site.slug, name: site.name } : null };
}

export async function GET(req: Request) {
  const { who, site } = await clientSite(req);
  if (!who) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const d = decidePortalBot({ site });
  if (!d.ok) return Response.json({ error: d.error }, { status: d.status });
  const cfg = await getConfig(d.slug);
  return Response.json({ site: { name: d.siteName }, ...portalView(d.slug, cfg.goal, cfg.engage) });
}

export async function POST(req: Request) {
  const blocked = rejectIfImpersonatingReadOnly(req) ?? rejectIfLoginAs(req);
  if (blocked) return blocked;
  const { who, site } = await clientSite(req);
  if (!who) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { slug?: unknown; goal?: unknown; engage?: unknown } | null;
  if (!body) return Response.json({ error: "Bad request" }, { status: 400 });
  const d = decidePortalBot({ site, requestedSlug: body.slug });
  if (!d.ok) return Response.json({ error: d.error }, { status: d.status });
  const cfg = await getConfig(d.slug);
  const r = clientSave(d.slug, cfg.goal, body.goal);
  if (!r.ok) return Response.json({ error: "Some fields need fixing. Nothing was saved.", fields: r.errors }, { status: 400 });
  const e = body.engage === undefined ? null : clientSaveEngage(cfg.engage, body.engage);
  if (e && !e.ok) return Response.json({ error: "Some fields need fixing. Nothing was saved.", fields: e.errors }, { status: 400 });
  await saveConfig({ ...cfg, goal: r.value, ...(e && e.ok ? { engage: e.value } : {}), updatedBy: `client:${who.email}` });
  await addChangeLogEntry({ siteId: d.slug, siteName: d.siteName, summary: `Chatbot goal updated by the client (${r.value.primary})`, source: "manual", authorName: who.email }).catch(() => {});
  return Response.json({ ok: true, ...portalView(d.slug, r.value, e && e.ok ? e.value : cfg.engage) });
}
