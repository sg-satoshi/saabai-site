/**
 * GET/POST /api/portal/chatbot  (portal_session; read-only while impersonating or logged in as)
 * The client's own chatbot settings. The slug always comes from the signed session's site.
 * A whole-bot lock rejects every client write. Legacy per-field locks are ignored.
 * Clients may edit goal, conversation, features, knowledge, look and tone.
 * They cannot change the Powered by line. That toggle is admin-only.
 * Saves settings only. No messages are sent and nothing is posted to a chat or lead endpoint.
 */
import { rejectIfImpersonatingReadOnly } from "../../../../lib/impersonation";
import { rejectIfLoginAs } from "../../../../lib/login-as";
import { resolvePortalBilling } from "../../../../lib/billing/portal-auth";
import { listSites } from "../../../../lib/site-registry";
import { canRemovePoweredBy, toPublicConfig, validateContent, validateSkin } from "../../../../lib/chatbot/core";
import { getConfig, isEnabled, loadConfigForClientWrite, saveConfig } from "../../../../lib/chatbot/store";
import { clientSave, clientSaveEngage, decidePortalBot, portalView, portalWriteGuard } from "../../../../lib/chatbot/portal";
import { addChangeLogEntry } from "../../../../lib/change-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function clientSite(req: Request) {
  const who = await resolvePortalBilling(req);
  if (!who) return { who: null, site: null };
  if (!who.siteId) return { who, site: null };
  const site = (await listSites().catch(() => [])).find((s) => s.id === who.siteId) ?? null;
  return { who, site };
}

export async function GET(req: Request) {
  const { who, site } = await clientSite(req);
  if (!who) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const d = decidePortalBot({ site: site ? { slug: site.slug, name: site.name } : null });
  if (!d.ok) return Response.json({ error: d.error }, { status: d.status });
  const cfg = await getConfig(d.slug);
  const view = portalView(d.slug, cfg.goal, cfg.engage, cfg.botLock);
  const enabled = await isEnabled(d.slug, site?.chatbot?.enabled);
  return Response.json({
    site: { name: d.siteName, slug: d.slug, url: site?.url ?? "" },
    enabled,
    ...view,
    plan: cfg.plan,
    skin: cfg.skin,
    tone: cfg.tone ?? "friendly",
    knowledge: cfg.knowledge ?? { facts: "", faqs: [] },
    canRemovePoweredBy: canRemovePoweredBy(cfg.plan),
    resolved: site ? toPublicConfig({ slug: d.slug, active: true, config: cfg, site }) : null,
  });
}

export async function POST(req: Request) {
  const blocked = rejectIfImpersonatingReadOnly(req) ?? rejectIfLoginAs(req);
  if (blocked) return blocked;
  const { who, site } = await clientSite(req);
  if (!who) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { slug?: unknown; goal?: unknown; engage?: unknown; skin?: unknown; content?: unknown } | null;
  if (!body) return Response.json({ error: "Bad request" }, { status: 400 });
  const d = decidePortalBot({ site: site ? { slug: site.slug, name: site.name } : null, requestedSlug: body.slug });
  if (!d.ok) return Response.json({ error: d.error }, { status: d.status });
  const loaded = await loadConfigForClientWrite(d.slug);
  if (!loaded.ok) return Response.json({ error: loaded.error }, { status: loaded.status });
  const cfg = loaded.config;
  const guard = portalWriteGuard(cfg.botLock);
  if (!guard.ok) return Response.json({ error: guard.error }, { status: guard.status });

  const r = clientSave(d.slug, cfg.goal, body.goal);
  if (!r.ok) return Response.json({ error: "Some fields need fixing. Nothing was saved.", fields: r.errors }, { status: 400 });
  const e = body.engage === undefined ? null : clientSaveEngage(cfg.engage, body.engage);
  if (e && !e.ok) return Response.json({ error: "Some fields need fixing. Nothing was saved.", fields: e.errors }, { status: 400 });

  let skin = cfg.skin;
  let tone = cfg.tone;
  let knowledge = cfg.knowledge;
  if (body.skin !== undefined || body.content !== undefined) {
    const skinIn = body.skin && typeof body.skin === "object" ? { ...(body.skin as Record<string, unknown>) } : {};
    delete skinIn.showPoweredBy;
    const sk = validateSkin(skinIn);
    const ct = validateContent(body.content ?? {});
    if (!sk.ok || !ct.ok) return Response.json({ error: "Some fields need fixing. Nothing was saved.", fields: { ...(sk.ok ? {} : sk.errors), ...(ct.ok ? {} : ct.errors) } }, { status: 400 });
    if (sk.value.showPoweredBy === false && !canRemovePoweredBy(cfg.plan)) {
      return Response.json({ error: "The Powered by Saabai line can only be removed on Growth and Signature.", fields: { showPoweredBy: "Growth or Signature only." } }, { status: 400 });
    }
    skin = { ...cfg.skin, ...sk.value };
    if (ct.value.tone) tone = ct.value.tone;
    if (ct.value.knowledge) knowledge = ct.value.knowledge;
  }

  await saveConfig({ ...cfg, goal: r.value, ...(e && e.ok ? { engage: e.value } : {}), skin, ...(tone ? { tone } : {}), ...(knowledge ? { knowledge } : {}), updatedBy: `client:${who.email}` });
  await addChangeLogEntry({ siteId: d.slug, siteName: d.siteName, summary: `Chatbot settings updated by the client (${r.value.primary})`, source: "manual", authorName: who.email }).catch(() => {});
  const savedEngage = e && e.ok ? e.value : cfg.engage;
  const view = portalView(d.slug, r.value, savedEngage, cfg.botLock);
  return Response.json({
    ok: true,
    ...view,
    plan: cfg.plan,
    skin,
    tone: tone ?? "friendly",
    knowledge: knowledge ?? { facts: "", faqs: [] },
    canRemovePoweredBy: canRemovePoweredBy(cfg.plan),
    resolved: site ? toPublicConfig({ slug: d.slug, active: true, config: { ...cfg, skin, goal: r.value, engage: savedEngage }, site }) : null,
  });
}
