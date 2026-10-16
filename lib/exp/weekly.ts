/**
 * Weekly "what we learned" note, pure logic. Plain templates over our own numbers (no AI, so nothing can be invented).
 * Sent to Shane only. Skipped quietly when there was no meaningful traffic.
 */
import type { Experiment } from "./core";
import type { Analysis } from "./stats";

/** An experiment needs at least this many views in the last 7 days to be worth a note. */
export const WEEKLY_MIN_VIEWS = 50;

export type WeekVariant = { id: string; label: string; copy: string; views: number; conversions: number; rate: number };
export type WeekInput = {
  exp: Experiment;
  analysis: Analysis;
  daysRunning: number;
  week: { views: number; conversions: number; perVariant: Record<string, { views: number; conversions: number }> };
  pendingSuggestions: number;
};
export type WeekNote = { id: string; name: string; views: number; conversions: number; rate: number; variants: WeekVariant[]; verdictLine: string; next: string; adminUrl: string };

const pct = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const nf = (n: number) => n.toLocaleString("en-AU");
const copyOf = (v: { text: string; emphasis?: string }) => [v.text, v.emphasis].filter(Boolean).join(" ").replace(/\u00a0/g, " ");

/** Week sums from exp_stats_daily rows (Brisbane days). `since` is the first day included, YYYY-MM-DD. */
export function sumWeek(rows: { day: string; variant_key: string; impressions: number; converters: number }[], since: string) {
  const perVariant: Record<string, { views: number; conversions: number }> = {};
  let views = 0, conversions = 0;
  for (const r of rows) {
    if (String(r.day).slice(0, 10) < since) continue;
    const cur = (perVariant[r.variant_key] ??= { views: 0, conversions: 0 });
    cur.views += Number(r.impressions) || 0; cur.conversions += Number(r.converters) || 0;
    views += Number(r.impressions) || 0; conversions += Number(r.converters) || 0;
  }
  return { views, conversions, perVariant };
}

/** What to try next, in plain words. Never tells Shane to go live on weak data. */
export function nextStep(i: WeekInput): string {
  const v = i.analysis.verdict;
  const lead = v.leaderId ? v.leaderId.toUpperCase() : "";
  const control = i.exp.defaultVariantId.toUpperCase();
  const pend = i.pendingSuggestions ? ` ${i.pendingSuggestions} AI suggestion${i.pendingSuggestions === 1 ? " is" : "s are"} waiting for your approval in the dashboard.` : "";
  if (v.kind === "winner" && v.canMakeWinner) return `Variant ${lead} has met every rule to be called the winner. Open the dashboard and decide whether to make it the live headline. It is your click.${pend}`;
  if (v.kind === "winner") return `The control (${control}) is the clear winner, so there is nothing to switch. Use "Suggest variants" to bring in a fresh challenger.${pend}`;
  if (v.kind === "leading") return `${lead} is ahead but the result isn't proven yet. Leave the test running, don't switch anything yet. ${v.missing[0] ? `Still needed: ${v.missing[0]}` : ""}${pend}`.trim();
  return `It is too early to tell. Keep it running and let the numbers build.${i.pendingSuggestions ? pend : ""}`.trim();
}

export function buildNote(i: WeekInput, baseUrl = "https://www.saabai.ai"): WeekNote | null {
  if (i.week.views < WEEKLY_MIN_VIEWS) return null;
  const variants: WeekVariant[] = i.exp.variants.filter((v) => v.active || (i.week.perVariant[v.id]?.views ?? 0) > 0).map((v) => {
    const w = i.week.perVariant[v.id] ?? { views: 0, conversions: 0 };
    return { id: v.id.toUpperCase(), label: v.id === i.exp.defaultVariantId ? "control" : v.source === "ai" ? "AI idea you approved" : "", copy: copyOf(v), views: w.views, conversions: w.conversions, rate: w.views ? w.conversions / w.views : 0 };
  });
  return {
    id: i.exp.id, name: i.exp.name ?? i.exp.id,
    views: i.week.views, conversions: i.week.conversions, rate: i.week.views ? i.week.conversions / i.week.views : 0,
    variants,
    verdictLine: `${i.analysis.verdict.headline} ${i.analysis.verdict.detail}`.trim(),
    next: nextStep(i),
    adminUrl: `${baseUrl}/saabai-admin/experiments?id=${encodeURIComponent(i.exp.id)}`,
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Monday-to-Sunday label for the 7 days ending `end` (YYYY-MM-DD, Brisbane). */
export function weekLabel(since: string, end: string): string {
  const f = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${f(since)} to ${f(end)}`;
}

export function renderNote(notes: WeekNote[], since: string, end: string): { subject: string; html: string; text: string } {
  const label = weekLabel(since, end);
  const subject = `Draft: Saabai testing, what we learned (${label})`;
  const blocks = notes.map((n) => {
    const rows = n.variants.map((v) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee"><b>${esc(v.id)}</b>${v.label ? ` <span style="color:#777">(${esc(v.label)})</span>` : ""}<br><span style="color:#444">${esc(v.copy)}</span></td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${nf(v.views)} views<br>${nf(v.conversions)} enquiries or calls (${pct(v.rate)})</td></tr>`).join("");
    return `<h2 style="margin:24px 0 4px;font-size:17px">${esc(n.name)}</h2>
<p style="margin:0 0 8px">This week: <b>${nf(n.views)}</b> views, <b>${nf(n.conversions)}</b> enquiries or calls (${pct(n.rate)}).</p>
<table style="border-collapse:collapse;width:100%;font-size:14px">${rows}</table>
<p style="margin:12px 0 4px"><b>Where it stands.</b> ${esc(n.verdictLine)}</p>
<p style="margin:4px 0"><b>What to try next.</b> ${esc(n.next)}</p>
<p style="margin:8px 0"><a href="${esc(n.adminUrl)}">Open this test in the dashboard</a></p>`;
  }).join("");
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:620px;color:#111;line-height:1.5">
<p style="margin:0 0 8px;color:#777;font-size:13px">DRAFT for Shane only. Nothing here goes to anyone else.</p>
<h1 style="font-size:20px;margin:0 0 4px">What we learned this week</h1>
<p style="margin:0;color:#555">${esc(label)} on saabai.ai. Your own visits are not counted.</p>${blocks}
<p style="margin:24px 0 0;color:#777;font-size:12px">Small sites need weeks of traffic before a winner is clear, so treat early leads as hints. A winner only goes live when you click.</p></div>`;
  const text = [`DRAFT for Shane only. What we learned this week (${label}).`, ...notes.map((n) =>
    [`\n${n.name}`, `This week: ${n.views} views, ${n.conversions} enquiries or calls (${pct(n.rate)}).`, ...n.variants.map((v) => `  ${v.id}${v.label ? ` (${v.label})` : ""}: ${v.copy} | ${v.views} views, ${v.conversions} conversions (${pct(v.rate)})`), `Where it stands: ${n.verdictLine}`, `What to try next: ${n.next}`, n.adminUrl].join("\n"))].join("\n");
  return { subject, html, text };
}

/** Brisbane calendar date (UTC+10, no DST) for a given instant, YYYY-MM-DD. */
export function brisbaneDate(d: Date): string { return new Date(d.getTime() + 10 * 3600_000).toISOString().slice(0, 10); }
export function addDays(day: string, n: number): string { return new Date(Date.parse(day + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10); }
