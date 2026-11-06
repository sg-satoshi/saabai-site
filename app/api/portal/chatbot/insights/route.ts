/**
 * GET /api/portal/chatbot/insights?month=YYYY-MM  (portal_session)
 * The client's own funnel counts and, if the bot's transcripts toggle is on, the last 90 days
 * of transcripts. The slug always comes from the signed session's site. Read only.
 */
import { resolvePortalBilling } from "../../../../../lib/billing/portal-auth";
import { listSites } from "../../../../../lib/site-registry";
import { getConfig } from "../../../../../lib/chatbot/store";
import { decidePortalBot } from "../../../../../lib/chatbot/portal";
import { effectiveEngage } from "../../../../../lib/chatbot/engage";
import { isMonth, listTranscripts, readFunnel } from "../../../../../lib/chatbot/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const who = await resolvePortalBilling(req);
  if (!who) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const site = who.siteId ? (await listSites().catch(() => [])).find((s) => s.id === who.siteId) ?? null : null;
  const d = decidePortalBot({ site: site ? { slug: site.slug, name: site.name } : null });
  if (!d.ok) return Response.json({ error: d.error }, { status: d.status });
  const m = new URL(req.url).searchParams.get("month");
  const funnel = await readFunnel(d.slug, isMonth(m) ? m : undefined);
  const cfg = await getConfig(d.slug);
  const on = effectiveEngage(cfg.engage).transcripts;
  const t = on ? await listTranscripts(d.slug) : { transcripts: [], available: false };
  return Response.json({ funnel, transcriptsEnabled: on, transcriptsAvailable: t.available, transcripts: t.transcripts, retentionDays: 90 });
}
