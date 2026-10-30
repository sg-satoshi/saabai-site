/** GET /api/admin/chatbots/insights?slug=x&month=YYYY-MM  Admin read of one bot's funnel and transcripts. */
import { readActor } from "@/lib/exp/actor";
import { listChatbotCanonical } from "@/lib/chatbot/admin-list";
import { historyBotIds } from "@/lib/chatbot/paths";
import { isMonth, listTranscripts, mergeFunnels, readFunnel } from "@/lib/chatbot/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Site slug, folded copies, and legacy short log ids. Never taken from a second query param. */
async function historyIds(slug: string): Promise<string[]> {
  const extra: string[] = [];
  try {
    const groups = await listChatbotCanonical();
    const group = groups.find((g) => g.site.slug === slug || g.slugs.includes(slug) || g.folded.some((f) => f.slug === slug));
    if (group) extra.push(group.site.slug, ...group.slugs, ...group.folded.map((f) => f.slug));
  } catch { /* static aliases still apply */ }
  return historyBotIds(slug, extra);
}

export async function GET(req: Request) {
  if (!(await readActor())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const u = new URL(req.url);
  const slug = (u.searchParams.get("slug") ?? "").toLowerCase();
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return Response.json({ error: "Bad slug" }, { status: 400 });
  const m = u.searchParams.get("month");
  const month = isMonth(m) ? m : undefined;
  const ids = await historyIds(slug);
  const funnels = await Promise.all(ids.map((id) => readFunnel(id, month)));
  const funnel = mergeFunnels(funnels);
  const t = await listTranscripts(slug, 50, ids.filter((id) => id !== slug));
  return Response.json({ funnel, transcriptsEnabled: true, transcriptsAvailable: t.available, transcripts: t.transcripts, retentionDays: 90 });
}
