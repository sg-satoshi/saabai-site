/** GET /api/admin/chatbots/insights?slug=x&month=YYYY-MM  Admin read of one bot's funnel and transcripts. */
import { readActor } from "@/lib/exp/actor";
import { isMonth, listTranscripts, readFunnel } from "@/lib/chatbot/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await readActor())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const u = new URL(req.url);
  const slug = (u.searchParams.get("slug") ?? "").toLowerCase();
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return Response.json({ error: "Bad slug" }, { status: 400 });
  const m = u.searchParams.get("month");
  const funnel = await readFunnel(slug, isMonth(m) ? m : undefined);
  const t = await listTranscripts(slug);
  return Response.json({ funnel, transcriptsEnabled: true, transcriptsAvailable: t.available, transcripts: t.transcripts, retentionDays: 90 });
}
