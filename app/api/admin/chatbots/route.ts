import { adminActor, readActor } from "@/lib/exp/actor";
import { APP_ROUTER_SITES, getSiteBySlug } from "@/lib/site-registry";
import { BESPOKE_SLUGS, canRemovePoweredBy, capState, isPlan, validateSkin, validateContent, toPublicConfig, effectiveGoal, PLAN_LABEL, PLANS, CAPS, type Plan } from "@/lib/chatbot/core";
import { getConfig, getMeta, getUsage, isEnabled, saveConfig, setEnabled } from "@/lib/chatbot/store";
import { validateGoal } from "@/lib/chatbot/goal";
import { effectiveEngage, validateEngage } from "@/lib/chatbot/engage";
import { addChangeLogEntry } from "@/lib/change-log";
import { listChatbotCanonical } from "@/lib/chatbot/admin-list";
import { sumUsage } from "@/lib/chatbot/canonical-rows";
import { loadChatActivity } from "@/lib/chatbot/activity";
import { clientIdentity } from "@/lib/chatbot/list-view";
import { leadCaptureEnabled } from "@/lib/chatbot/lead-capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin and Chief read-only: one row per client site that has (or is set up for) a chatbot. */
export async function GET() {
  if (!(await readActor())) return Response.json({ error: "Forbidden" }, { status: 403 });
  // Display only. Duplicate copies stay in Redis. Conversation and message counts are added across their slugs.
  const [groups, activity] = await Promise.all([listChatbotCanonical(), loadChatActivity()]);
  const rows = await Promise.all(
    groups.map(async ({ site: s, slugs, domains, folded }) => {
      const bespoke = BESPOKE_SLUGS.includes(s.slug);
      const [config, meta, parts, enabled] = await Promise.all([
        getConfig(s.slug),
        getMeta(s.slug),
        Promise.all(slugs.map((slug) => getUsage(slug))),
        isEnabled(s.slug, s.chatbot?.enabled),
      ]);
      const usage = sumUsage(parts);
      const client = clientIdentity(s);
      let leads = 0;
      let lastChatAt: string | null = null;
      for (const slug of slugs) {
        const stat = activity.get(slug);
        if (!stat) continue;
        leads += stat.leads;
        if (stat.lastChatAt && (!lastChatAt || Date.parse(stat.lastChatAt) > Date.parse(lastChatAt))) lastChatAt = stat.lastChatAt;
      }
      return {
        id: s.id,
        slug: s.slug,
        name: s.name,
        domains,
        folded,
        clientKey: client.key,
        clientName: client.name,
        engine: bespoke ? "bespoke" : "platform",
        enabled: bespoke ? null : enabled,
        plan: config.plan,
        skin: config.skin,
        resolved: toPublicConfig({ active: bespoke ? true : enabled, config, site: s }),
        tone: config.tone ?? "friendly",
        knowledge: config.knowledge ?? { facts: "", faqs: [] },
        goal: effectiveGoal(s.slug, config.goal) ?? null,
        engage: effectiveEngage(config.engage),
        goalSource: config.goal ? "saved" : effectiveGoal(s.slug, undefined) ? "default" : "none",
        canRemovePoweredBy: canRemovePoweredBy(config.plan),
        usage,
        cap: capState(usage.conversations, config.plan),
        leads: bespoke ? null : leads,
        lastChatAt,
        botLock: config.botLock ?? { locked: false },
        leadCapture: leadCaptureEnabled(),
        lastChange: meta,
      };
    })
  );
  const kill = process.env.CHATBOTS_KILL === "1";
  return Response.json({ rows: rows.sort((a, b) => a.name.localeCompare(b.name)), kill, plans: PLANS.map((p) => ({ key: p, label: PLAN_LABEL[p], cap: CAPS[p] })) });
}

type Body = { slug?: string; action?: string; enabled?: boolean; locked?: boolean; reason?: string; plan?: string; skin?: unknown; content?: unknown; goal?: unknown; engage?: unknown };

/** Admin only (writes need a real admin session). */
export async function POST(req: Request) {
  const actor = await adminActor();
  if (!actor) return Response.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => null)) as Body | null;
  if (!b || typeof b.slug !== "string" || typeof b.action !== "string") return Response.json({ error: "Bad request" }, { status: 400 });
  // A hardcoded site can be the canonical row even when a stored copy shares its name. listSites hides that hardcoded row, so fall back to the app-router record.
  const site = (await getSiteBySlug(b.slug)) ?? APP_ROUTER_SITES.find((s) => s.slug === b.slug) ?? null;
  if (!site) return Response.json({ error: "Unknown site" }, { status: 404 });
  if (BESPOKE_SLUGS.includes(site.slug)) return Response.json({ error: "This site uses its own chat route. It moves to the platform in a later release." }, { status: 409 });

  try {
    switch (b.action) {
      case "set_enabled": {
        if (typeof b.enabled !== "boolean") return Response.json({ error: "enabled must be true or false" }, { status: 400 });
        const r = await setEnabled({ slug: site.slug, siteName: site.name, siteChatbotEnabled: site.chatbot?.enabled, on: b.enabled, actor, reason: b.reason });
        return Response.json({ ok: true, enabled: b.enabled, changed: r.changed });
      }
      case "set_plan": {
        if (!isPlan(b.plan)) return Response.json({ error: "Unknown plan" }, { status: 400 });
        const cur = await getConfig(site.slug);
        if (cur.plan === b.plan) return Response.json({ ok: true, plan: cur.plan, changed: false });
        const skin = { ...cur.skin };
        if (!canRemovePoweredBy(b.plan as Plan)) delete skin.showPoweredBy; // Presence always shows the line
        await saveConfig({ ...cur, plan: b.plan as Plan, skin, updatedBy: actor });
        await addChangeLogEntry({ siteId: site.slug, siteName: site.name, summary: `Chatbot plan changed from ${PLAN_LABEL[cur.plan]} to ${PLAN_LABEL[b.plan as Plan]}`, source: "manual", authorName: actor }).catch(() => {});
        return Response.json({ ok: true, plan: b.plan, changed: true });
      }
      case "save_skin": {
        const v = validateSkin(b.skin);
        if (!v.ok) return Response.json({ error: "Some fields need fixing.", fields: v.errors }, { status: 400 });
        const cur = await getConfig(site.slug);
        if (v.value.showPoweredBy === false && !canRemovePoweredBy(cur.plan)) {
          return Response.json({ error: "The Powered by Saabai line can only be removed on Growth and Signature.", fields: { showPoweredBy: "Growth or Signature only." } }, { status: 400 });
        }
        await saveConfig({ ...cur, skin: { ...cur.skin, ...v.value }, updatedBy: actor });
        await addChangeLogEntry({ siteId: site.slug, siteName: site.name, summary: `Chatbot skin updated (${Object.keys(v.value).join(", ") || "no changes"})`, source: "manual", authorName: actor }).catch(() => {});
        return Response.json({ ok: true });
      }
      case "save_content": {
        const v = validateContent(b.content);
        if (!v.ok) return Response.json({ error: "Some fields need fixing.", fields: v.errors }, { status: 400 });
        const cur = await getConfig(site.slug);
        await saveConfig({ ...cur, ...(v.value.tone ? { tone: v.value.tone } : {}), ...(v.value.knowledge ? { knowledge: v.value.knowledge } : {}), updatedBy: actor });
        await addChangeLogEntry({ siteId: site.slug, siteName: site.name, summary: `Chatbot knowledge and tone updated (${Object.keys(v.value).join(", ") || "no changes"})`, source: "manual", authorName: actor }).catch(() => {});
        return Response.json({ ok: true });
      }
      case "save_all": {
        // Skin and content together: both are validated before anything is written, so a mistake never saves half.
        const sk = validateSkin(b.skin);
        const ct = validateContent(b.content);
        if (!sk.ok || !ct.ok) return Response.json({ error: "Some fields need fixing. Nothing was saved.", fields: { ...(sk.ok ? {} : sk.errors), ...(ct.ok ? {} : ct.errors) } }, { status: 400 });
        const cur = await getConfig(site.slug);
        if (sk.value.showPoweredBy === false && !canRemovePoweredBy(cur.plan)) {
          return Response.json({ error: "The Powered by Saabai line can only be removed on Growth and Signature.", fields: { showPoweredBy: "Growth or Signature only." } }, { status: 400 });
        }
        await saveConfig({ ...cur, skin: { ...cur.skin, ...sk.value }, ...(ct.value.tone ? { tone: ct.value.tone } : {}), ...(ct.value.knowledge ? { knowledge: ct.value.knowledge } : {}), updatedBy: actor });
        const parts = [...Object.keys(sk.value), ...Object.keys(ct.value)];
        await addChangeLogEntry({ siteId: site.slug, siteName: site.name, summary: `Chatbot settings updated (${parts.join(", ") || "no changes"})`, source: "manual", authorName: actor }).catch(() => {});
        return Response.json({ ok: true });
      }
      case "save_goal": {
        // Admin can set every field and the lock list. Locked fields cannot be changed from the client portal.
        const g = validateGoal(b.goal);
        if (!g.ok) return Response.json({ error: "Some goal fields need fixing. Nothing was saved.", fields: g.errors }, { status: 400 });
        const cur = await getConfig(site.slug);
        await saveConfig({ ...cur, goal: g.value, updatedBy: actor });
        const locks = g.value.locked?.length ? `, locked: ${g.value.locked.join(", ")}` : "";
        await addChangeLogEntry({ siteId: site.slug, siteName: site.name, summary: `Chatbot goal updated (${g.value.primary}${locks})`, source: "manual", authorName: actor }).catch(() => {});
        return Response.json({ ok: true, goal: g.value });
      }
      case "save_engage": {
        const e = validateEngage(b.engage);
        if (!e.ok) return Response.json({ error: "Some playbook fields need fixing. Nothing was saved.", fields: e.errors }, { status: 400 });
        const cur = await getConfig(site.slug);
        await saveConfig({ ...cur, engage: e.value, updatedBy: actor });
        await addChangeLogEntry({ siteId: site.slug, siteName: site.name, summary: "Chatbot conversion playbook updated", source: "manual", authorName: actor }).catch(() => {});
        return Response.json({ ok: true, engage: e.value });
      }
      case "set_lock": {
        if (typeof b.locked !== "boolean") return Response.json({ error: "locked must be true or false" }, { status: 400 });
        const cur = await getConfig(site.slug);
        const botLock = { locked: b.locked, by: actor, at: new Date().toISOString() };
        await saveConfig({ ...cur, botLock, updatedBy: actor });
        await addChangeLogEntry({ siteId: site.slug, siteName: site.name, summary: b.locked ? "Chatbot locked for the client" : "Chatbot unlocked for the client", source: "manual", authorName: actor }).catch(() => {});
        return Response.json({ ok: true, botLock });
      }
      default:
        return Response.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    console.error("admin chatbots error:", e);
    return Response.json({ error: "Couldn't save. Nothing was changed. Try again." }, { status: 502 });
  }
}
