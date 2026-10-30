/** GET /api/admin/chatbots/insights?slug=x&month=YYYY-MM  Admin read of one bot's funnel and transcripts. */
import { readActor } from "@/lib/exp/actor";
import { listChatbotCanonical } from "@/lib/chatbot/admin-list";
import { historyBotIds, slugBelongsToBots } from "@/lib/chatbot/paths";
import { isMonth, listTranscripts, mergeFunnels, readFunnel } from "@/lib/chatbot/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

export async function GET(req: Request) {
  if (!(await readActor())) return json({ error: "Forbidden" }, 403);
  const u = new URL(req.url);
  const slug = (u.searchParams.get("slug") ?? "").toLowerCase();
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return json({ error: "Bad slug" }, 400);
  const m = u.searchParams.get("month");
  const month = isMonth(m) ? m : undefined;
  let groups: Awaited<ReturnType<typeof listChatbotCanonical>> | null = null;
  try { groups = await listChatbotCanonical(); } catch { groups = null; }
  // Directory loaded: an unknown slug is 404, not an empty funnel. If the directory itself failed, keep going.
  if (groups && !slugBelongsToBots(slug, groups)) return json({ error: "Unknown bot" }, 404);
  const extra: string[] = [];
  const group = groups?.find((g) => slugBelongsToBots(slug, [g]));
  if (group) extra.push(group.site.slug, ...group.slugs, ...group.folded.map((f) => f.slug));
  const ids = historyBotIds(slug, extra);
  const funnels = await Promise.all(ids.map((id) => readFunnel(id, month)));
  const funnel = mergeFunnels(funnels);
  const t = await listTranscripts(slug, 50, ids.filter((id) => id !== slug));
  return json({ funnel, transcriptsEnabled: true, transcriptsAvailable: t.available, transcripts: t.transcripts, retentionDays: 90 });
}
