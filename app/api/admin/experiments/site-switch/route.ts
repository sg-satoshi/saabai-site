import { adminActor } from "@/lib/exp/actor";
import { isKnownSite } from "@/lib/exp/admin";
import { SAABAI_SITE, isSiteEnabled, setSiteEnabled } from "@/lib/exp/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin only. Switches split testing on or off for one Site Factory client site. Every client site starts OFF, so
 * nothing changes for its visitors until this is flipped. saabai.ai is controlled by EXPERIMENTS_ENABLED_SITES only.
 */
export async function POST(req: Request) {
  const actor = await adminActor();
  if (!actor) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { site?: unknown; enabled?: unknown } | null;
  const site = typeof body?.site === "string" ? body.site : "";
  if (typeof body?.enabled !== "boolean") return Response.json({ error: "Say on or off." }, { status: 400 });
  if (site === SAABAI_SITE) return Response.json({ error: "saabai.ai is switched by its environment setting, not here." }, { status: 400 });
  if (!(await isKnownSite(site))) return Response.json({ error: "Unknown site" }, { status: 400 });
  try { await setSiteEnabled(site, body.enabled); } catch { return Response.json({ error: "Couldn't save the switch. Please try again." }, { status: 502 }); }
  console.log(`[exp] site ${site} split testing ${body.enabled ? "on" : "off"} by ${actor}`);
  return Response.json({ ok: true, site, enabled: await isSiteEnabled(site, { fresh: true }) });
}
