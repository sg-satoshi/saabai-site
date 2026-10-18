import { adminActor, readActor } from "@/lib/exp/actor";
import { listSites, getSiteBySlug } from "@/lib/site-registry";
import { BESPOKE_SLUGS, SEED_OFF, canRemovePoweredBy, capState, isPlan, validateSkin, PLAN_LABEL, PLANS, CAPS, type Plan } from "@/lib/chatbot/core";
import { getConfig, getMeta, getUsage, isEnabled, saveConfig, setEnabled } from "@/lib/chatbot/store";
import { addChangeLogEntry } from "@/lib/change-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin and Chief read-only: list every site that has (or is set up for) a chatbot. */
export async function GET() {
  if (!(await readActor())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const sites = (await listSites()).filter((s) => s.chatbot?.enabled || SEED_OFF.includes(s.slug) || BESPOKE_SLUGS.includes(s.slug));
  const rows = await Promise.all(
    sites.map(async (s) => {
      const bespoke = BESPOKE_SLUGS.includes(s.slug);
      const [config, meta, usage, enabled] = await Promise.all([getConfig(s.slug), getMeta(s.slug), getUsage(s.slug), isEnabled(s.slug, s.chatbot?.enabled)]);
      return {
        slug: s.slug,
        name: s.name,
        domains: s.domains ?? [],
        engine: bespoke ? "bespoke" : "platform",
        enabled: bespoke ? null : enabled,
        plan: config.plan,
        skin: config.skin,
        canRemovePoweredBy: canRemovePoweredBy(config.plan),
        usage,
        cap: capState(usage.conversations, config.plan),
        lastChange: meta,
      };
    })
  );
  const kill = process.env.CHATBOTS_KILL === "1";
  return Response.json({ rows: rows.sort((a, b) => a.name.localeCompare(b.name)), kill, plans: PLANS.map((p) => ({ key: p, label: PLAN_LABEL[p], cap: CAPS[p] })) });
}

type Body = { slug?: string; action?: string; enabled?: boolean; reason?: string; plan?: string; skin?: unknown };

/** Admin only (writes need a real admin session). */
export async function POST(req: Request) {
  const actor = await adminActor();
  if (!actor) return Response.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => null)) as Body | null;
  if (!b || typeof b.slug !== "string" || typeof b.action !== "string") return Response.json({ error: "Bad request" }, { status: 400 });
  const site = await getSiteBySlug(b.slug);
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
      default:
        return Response.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    console.error("admin chatbots error:", e);
    return Response.json({ error: "Couldn't save. Nothing was changed. Try again." }, { status: 502 });
  }
}
