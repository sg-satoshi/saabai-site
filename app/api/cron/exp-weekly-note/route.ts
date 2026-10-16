import { Resend } from "resend";
import { listExperiments, loadView } from "@/lib/exp/admin";
import { serviceDb } from "@/lib/exp/track";
import { listSuggestions } from "@/lib/exp/suggest-server";
import { addDays, brisbaneDate, buildNote, renderNote, sumWeek, type WeekNote } from "@/lib/exp/weekly";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel cron "30 21 * * 0" = Monday 7:30 AM Brisbane (UTC+10, no DST). Sends to Shane only, and only when there was real traffic.
// ?dry=1 (with the cron secret) builds the note and returns it without sending.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (process.env.EXP_WEEKLY_ENABLED === "false") return Response.json({ ok: true, skipped: "disabled" });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const db = serviceDb();
  if (!db) return Response.json({ ok: true, skipped: "no database" });

  const end = addDays(brisbaneDate(new Date()), -1); // yesterday (Sunday): the last full day
  const since = addDays(end, -6);
  const notes: WeekNote[] = [];
  for (const exp of await listExperiments("saabai")) {
    if (exp.status === "draft") continue;
    const { data } = await db.rpc("exp_stats_daily", { p_experiment: exp.id });
    const week = sumWeek((data ?? []) as { day: string; variant_key: string; impressions: number; converters: number }[], since);
    const [view, sugg] = await Promise.all([loadView(exp), listSuggestions(exp.id)]);
    const note = buildNote({ exp, analysis: view.analysis, daysRunning: view.daysRunning, week, pendingSuggestions: sugg.filter((s) => s.status === "pending").length });
    if (note) notes.push(note);
  }
  if (!notes.length) return Response.json({ ok: true, skipped: "no meaningful traffic" });

  const mail = renderNote(notes, since, end);
  if (dry) return Response.json({ ok: true, dry: true, subject: mail.subject, text: mail.text, experiments: notes.length });

  // Once per week: the audit log is the memory, so a retried cron never double sends.
  const marker = notes[0].id;
  const { data: audit } = await db.rpc("exp_audit_list", { p_experiment: marker, p_limit: 20 });
  if (((audit ?? []) as { action: string; detail: { week?: string } }[]).some((a) => a.action === "weekly_note" && a.detail?.week === since)) return Response.json({ ok: true, skipped: "already sent" });

  const key = process.env.RESEND_API_KEY;
  if (!key) return Response.json({ error: "Email not configured" }, { status: 503 });
  const to = (process.env.EXP_WEEKLY_TO || "shanegoldberg@pm.me").split(",").map((s) => s.trim()).filter(Boolean);
  const r = await new Resend(key).emails.send({ from: "Saabai <noreply@saabai.ai>", to, subject: mail.subject, html: mail.html, text: mail.text });
  if (r.error) return Response.json({ error: "Send failed" }, { status: 502 });
  await db.rpc("exp_audit_add", { p_experiment: marker, p_actor: "cron", p_action: "weekly_note", p_detail: { week: since, experiments: notes.length } });
  return Response.json({ ok: true, sent: true, experiments: notes.length });
}
