/**
 * Monday business digest for Shane (Mon 7:00 AM Brisbane = Sun 21:00 UTC cron).
 * Sections light up as growth features land; empty sections say so plainly.
 */
import { listEventsSince, type ContactEvent } from "./events";
import { touchLabel, type Touch } from "./attribution";
import { listSiteBilling } from "../billing/store";
import { listEngagements } from "../audit-store";
import { escapeHtml } from "../html-escape";

const DAY = 864e5;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const money = (c: number) => `$${Math.round(c / 100).toLocaleString("en-AU")}`;

export type Digest = {
  weekLabel: string;
  leads: number; scores: number;
  sales: { label: string; count: number; cents: number }[]; salesCents: number;
  mrrCents: number; activePlans: number; newPlans: number; cancelledPlans: number;
  blueprintsDue: { firm: string; tier: string; status: string; overdue: boolean }[];
  failedPayments: { email: string; cents: number }[];
  topSources: { label: string; count: number }[];
};

export async function buildDigest(now = Date.now()): Promise<Digest> {
  const since = now - 7 * DAY;
  const [events, billing, audits] = await Promise.all([
    listEventsSince(since).catch(() => [] as ContactEvent[]),
    listSiteBilling().catch(() => []),
    listEngagements().catch(() => []),
  ]);
  const of = (t: ContactEvent["type"]) => events.filter((e) => e.type === t);
  const scores = of("score_taken");
  const purchases = [...of("blueprint_purchased"), ...of("purchase"), ...of("care_plan_started")];
  const salesMap = new Map<string, { count: number; cents: number }>();
  for (const e of purchases) {
    const label = e.type === "blueprint_purchased" ? `Blueprint ${cap(String(e.meta?.tier ?? ""))}`.trim() : e.type === "care_plan_started" ? "Care plan setup" : "Other";
    const cur = salesMap.get(label) ?? { count: 0, cents: 0 };
    salesMap.set(label, { count: cur.count + 1, cents: cur.cents + (e.amountCents ?? 0) });
  }
  const active = billing.filter((b) => ["active", "past_due", "payment_failed"].includes(b.status));
  const srcMap = new Map<string, number>();
  for (const e of [...scores, ...purchases]) {
    const l = touchLabel(e.meta?.source as Touch | undefined);
    srcMap.set(l, (srcMap.get(l) ?? 0) + 1);
  }
  // SLA per fulfilment plan: Starter 48h, Pro 3 business days (~5 calendar), Business 2-3 weeks.
  const DUE_DAYS: Record<string, number> = { starter: 2, pro: 5, business: 21 };
  const blueprintsDue = audits
    .filter((a) => !["delivered", "closed"].includes(a.status))
    .map((a) => {
      const due = Date.parse(a.createdAt) + (DUE_DAYS[String(a.tier).toLowerCase()] ?? 10) * DAY;
      return { firm: a.firmName || a.contactEmail, tier: String(a.tier), status: a.status, overdue: due < now, due };
    })
    .filter((a) => a.due < now + 7 * DAY)
    .sort((a, b) => a.due - b.due)
    .map(({ due: _d, ...rest }) => rest);
  const fmt = (t: number) => new Date(t).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short" });
  return {
    weekLabel: `${fmt(since)} to ${fmt(now)}`,
    leads: new Set(scores.map((e) => e.contactId)).size,
    scores: scores.length,
    sales: [...salesMap.entries()].map(([label, v]) => ({ label, ...v })),
    salesCents: purchases.reduce((n, e) => n + (e.amountCents ?? 0), 0),
    mrrCents: active.reduce((n, b) => n + (b.monthlyCents || 0), 0),
    activePlans: active.length,
    newPlans: of("care_plan_started").length,
    cancelledPlans: of("care_plan_cancelled").length,
    blueprintsDue,
    failedPayments: of("payment_failed").map((e) => ({ email: e.contactId, cents: e.amountCents ?? 0 })),
    topSources: [...srcMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, count]) => ({ label, count })),
  };
}

export function renderDigest(d: Digest): { subject: string; html: string } {
  const kpi = (l: string, v: string, sub = "") => `<td style="padding:12px;border:1px solid #dfe2ea;border-radius:10px;width:50%;vertical-align:top"><div style="font-size:12px;color:#5f6580">${l}</div><div style="font-size:22px;font-weight:600;font-family:ui-monospace,monospace;margin-top:4px">${v}</div>${sub ? `<div style="font-size:12px;color:#5f6580">${sub}</div>` : ""}</td>`;
  const sec = (t: string, body: string) => `<h2 style="font-size:15px;margin:24px 0 8px">${t}</h2>${body}`;
  const empty = (t: string) => `<p style="color:#5f6580;font-size:13px;margin:0">${t}</p>`;
  const list = (rows: string[]) => `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows.join("")}</table>`;
  const row = (a: string, b: string, red = false) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eceef4;${red ? "color:#c2261d" : ""}">${a}</td><td style="padding:8px 0;border-bottom:1px solid #eceef4;text-align:right;font-family:ui-monospace,monospace">${b}</td></tr>`;
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;color:#13152a;background:#fff">
<div style="background:#0b092e;padding:24px;border-radius:12px 12px 0 0"><p style="color:#62c5d1;font-size:11px;letter-spacing:.18em;text-transform:uppercase;margin:0">Monday digest</p><h1 style="color:#fff;font-size:22px;margin:6px 0 0">Your week at Saabai</h1><p style="color:#c9cde8;font-size:13px;margin:4px 0 0">${escapeHtml(d.weekLabel)}</p></div>
<div style="padding:20px 24px;border:1px solid #dfe2ea;border-top:0;border-radius:0 0 12px 12px">
<table style="width:100%;border-collapse:separate;border-spacing:8px"><tr>${kpi("New leads", String(d.leads), `${d.scores} score${d.scores === 1 ? "" : "s"} taken`)}${kpi("Sales", money(d.salesCents), `${d.sales.reduce((n, s) => n + s.count, 0)} order${d.sales.reduce((n, s) => n + s.count, 0) === 1 ? "" : "s"}`)}</tr><tr>${kpi("Care plan MRR", money(d.mrrCents), `${d.activePlans} active`)}${kpi("Plans", `+${d.newPlans} / -${d.cancelledPlans}`, "started / cancelled")}</tr></table>
${sec("Sales by product", d.sales.length ? list(d.sales.map((s) => row(`${escapeHtml(s.label)} × ${s.count}`, money(s.cents)))) : empty("No sales this week."))}
${sec("Blueprints due this week", d.blueprintsDue.length ? list(d.blueprintsDue.map((b) => row(`${escapeHtml(b.firm)} · ${escapeHtml(b.tier)}`, b.overdue ? "Overdue" : escapeHtml(b.status), b.overdue))) : empty("Nothing due. Nice."))}
${sec("At-risk clients", d.failedPayments.length ? list(d.failedPayments.map((f) => row(`Payment failed: ${escapeHtml(f.email)}`, money(f.cents), true))) : empty("No failed payments this week."))}
${sec("Top sources", d.topSources.length ? list(d.topSources.map((s) => row(escapeHtml(s.label), String(s.count)))) : empty("Source tracking started recently, so this fills in as leads arrive."))}
${sec("Upsells, testimonials and referrals", empty("These sections switch on with the Phase 2 growth features."))}
<p style="margin-top:24px"><a href="https://saabai.ai/saabai-admin" style="display:inline-block;background:#62c5d1;color:#0b092e;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open Mission Control</a></p>
</div></div>`;
  return { subject: `Saabai week: ${d.leads} leads, ${money(d.salesCents)} sales, ${money(d.mrrCents)} MRR`, html };
}
