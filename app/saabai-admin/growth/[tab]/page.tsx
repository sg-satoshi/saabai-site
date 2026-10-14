import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import AdminShell from "../../AdminSidebar";
import { Card, CardBody, CardHeader } from "../../ui/Card";
import { Badge } from "../../ui/Badge";
import { listDocs } from "@/lib/growth/store";
import {
  CONSENT_LABELS, DEFAULTS, computeAttribution, computeFunnel, computeHealth, recentEvents, referralUrl,
  type Referral, type ReferralCode, type Testimonial, type Upsell,
} from "@/lib/growth/growth2";
import { ActionButton, CopyButton, NewReferralForm } from "../Actions";
import "../growth.css";

export const dynamic = "force-dynamic";

const TABS = { funnel: "Funnel", attribution: "Attribution", upsells: "Upsells", testimonials: "Testimonials", health: "Client health", referrals: "Referrals" } as const;
type Tab = keyof typeof TABS;
const money = (c = 0) => `$${Math.round(c / 100).toLocaleString("en-AU")}`;
const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short" }) : "-");
const STATUS_TONE: Record<string, string> = { awaiting_approval: "warn", scheduled: "neutral", sent: "info", converted: "ok", cancelled: "neutral", received: "warn", approved: "info", published: "ok", hidden: "neutral", requested: "info", pending: "warn", qualified: "ok", paid: "ok", void: "bad", red: "bad", amber: "warn", green: "ok" };
const label = (s: string) => s.replace(/_/g, " ");

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }) {
  return { title: TABS[(await params).tab as Tab] ?? "Growth" };
}

export default async function GrowthPage({ params, searchParams }: { params: Promise<{ tab: string }>; searchParams: Promise<{ model?: string; days?: string; tier?: string }> }) {
  const tab = (await params).tab as Tab;
  if (!TABS[tab]) notFound();
  await requireAdmin(`/saabai-admin/growth/${tab}`);
  const sp = await searchParams;
  const days = [30, 90, 365].includes(Number(sp.days)) ? Number(sp.days) : 90;
  let body: React.ReactNode;
  try { body = await renderTab(tab, days, sp); } catch (e) { console.error("[growth page]", e); body = <Card><CardBody><p className="muted">Couldn&apos;t load this report. Try again shortly.</p></CardBody></Card>; }
  return (
    <AdminShell activePath={`/saabai-admin/growth/${tab}`}>
      <div className="pg gr">
        <div className="ph"><div><div className="crumb">Growth / <b>{TABS[tab]}</b></div><h1>{TABS[tab]}</h1></div></div>
        <nav className="tabs" aria-label="Growth reports">
          {(Object.keys(TABS) as Tab[]).map((t) => <a key={t} href={`/saabai-admin/growth/${t}`} className={t === tab ? "on" : ""}>{TABS[t]}</a>)}
        </nav>
        {body}
      </div>
    </AdminShell>
  );
}

function Range({ tab, days, extra = "" }: { tab: string; days: number; extra?: string }) {
  return <div className="chip-row gr-range">{[30, 90, 365].map((d) => <a key={d} className={`tag ${d === days ? "bp" : ""}`} href={`/saabai-admin/growth/${tab}?days=${d}${extra}`}>{d === 365 ? "12 months" : `${d} days`}</a>)}</div>;
}

const Empty = ({ children }: { children: React.ReactNode }) => <CardBody><p className="muted">{children}</p></CardBody>;

async function renderTab(tab: Tab, days: number, sp: { model?: string; tier?: string }): Promise<React.ReactNode> {
  if (tab === "funnel") {
    const tier = ["starter", "pro", "business"].includes(sp.tier ?? "") ? sp.tier : undefined;
    const rows = computeFunnel(await recentEvents(days), { tier });
    const max = Math.max(1, rows[0]?.count ?? 1);
    return (
      <>
        <Range tab="funnel" days={days} extra={tier ? `&tier=${tier}` : ""} />
        <div className="chip-row gr-range">{["all", "starter", "pro", "business"].map((t) => <a key={t} className={`tag ${(tier ?? "all") === t ? "bp" : ""}`} href={`/saabai-admin/growth/funnel?days=${days}${t === "all" ? "" : `&tier=${t}`}`}>{t === "all" ? "All tiers" : t[0].toUpperCase() + t.slice(1)}</a>)}</div>
        <Card>
          <CardHeader title="Score to care plan" />
          {!rows[0]?.count ? <Empty>No journey events in this range yet. Tracking started with the phase 1 release.</Empty> : (
            <ol className="gr-funnel">
              {rows.map((r, i) => (
                <li key={r.label}>
                  <div className="gr-f1"><b>{r.label}</b><span className="num">{r.count}</span></div>
                  <div className="gr-bar"><span style={{ width: `${Math.max(2, (r.count / max) * 100)}%` }} /></div>
                  <div className="muted gr-f2">{i ? `${r.pctOfPrev}% of previous · ${r.pctOfFirst}% overall` : "Top of funnel"}{r.medianDaysFromPrev != null ? ` · median ${r.medianDaysFromPrev} days` : ""}</div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </>
    );
  }
  if (tab === "attribution") {
    const model = sp.model === "first" ? "first" : "last";
    const rows = computeAttribution(await recentEvents(days), model);
    return (
      <>
        <Range tab="attribution" days={days} extra={`&model=${model}`} />
        <div className="chip-row gr-range">{(["last", "first"] as const).map((m) => <a key={m} className={`tag ${m === model ? "bp" : ""}`} href={`/saabai-admin/growth/attribution?days=${days}&model=${m}`}>{m === "last" ? "Last touch (default)" : "First touch"}</a>)}</div>
        <Card>
          <CardHeader title="Leads and revenue by source" />
          {!rows.length ? <Empty>No sourced leads or sales yet. The sb_attr cookie fills this in from now on.</Empty> : (
            <div className="tbl-scroll"><table><thead><tr><th>Source</th><th className="r">Leads</th><th className="r">Sales</th><th className="r">Revenue</th></tr></thead>
              <tbody>{rows.map((r) => <tr key={r.source}><td>{r.source}</td><td className="r">{r.leads}</td><td className="r">{r.sales}</td><td className="r">{money(r.revenueCents)}</td></tr>)}</tbody></table></div>
          )}
        </Card>
      </>
    );
  }
  if (tab === "upsells") {
    const ups = await listDocs<Upsell>("upsells", 300);
    const open = ups.filter((u) => ["awaiting_approval", "scheduled"].includes(u.status));
    return (
      <>
        <div className="kpis k3">
          <div className="card kpi"><div className="l">Awaiting your OK</div><div className="v">{ups.filter((u) => u.status === "awaiting_approval").length}</div></div>
          <div className="card kpi"><div className="l">Sent</div><div className="v">{ups.filter((u) => u.status === "sent").length}</div></div>
          <div className="card kpi"><div className="l">Converted</div><div className="v">{ups.filter((u) => u.status === "converted").length}</div></div>
        </div>
        <Card>
          <CardHeader title={`Queue (${open.length} open)`} />
          {!ups.length && <Empty>Upsells are scheduled automatically {DEFAULTS.upsellDelayDays} days after a Blueprint report is delivered. Every one waits for your approval before sending.</Empty>}
          {ups.map((u) => (
            <div className="oc" key={u.id}>
              <div className="r1"><b>{u.name || u.email}</b><Badge tone={STATUS_TONE[u.status]}>{label(u.status)}</Badge></div>
              <div className="muted gr-meta">{u.tier} Blueprint · offer {u.plan} · {money(u.creditCents)} credit until {date(u.creditExpiresAt)} · due {date(u.dueAt)}</div>
              <details className="gr-preview"><summary>Preview email</summary><p><b>{u.subject}</b></p><pre>{u.body}</pre><p className="muted">Sent as marketing with an unsubscribe link.</p></details>
              {["awaiting_approval", "scheduled"].includes(u.status) && (
                <div className="r2 gr-acts">
                  <ActionButton url={`/api/admin/growth/upsells/${u.id}`} body={{ action: "approve" }} label="Approve and send" variant="acc" confirm={`Send this upsell to ${u.email} now?`} done="Upsell sent" />
                  <ActionButton url={`/api/admin/growth/upsells/${u.id}`} body={{ action: "cancel" }} label="Cancel" variant="gh" done="Cancelled" />
                </div>
              )}
            </div>
          ))}
        </Card>
      </>
    );
  }
  if (tab === "testimonials") {
    const ts = await listDocs<Testimonial>("testimonials", 300);
    return (
      <Card>
        <CardHeader title={`Testimonials (${ts.length})`} />
        {!ts.length && <Empty>Requests are queued {DEFAULTS.testimonialDelayDays} days after delivery and wait for your OK. 1 to 3 star replies alert you privately.</Empty>}
        {ts.map((t) => (
          <div className="oc" key={t.id}>
            <div className="r1"><b>{t.name || t.email}</b><Badge tone={STATUS_TONE[t.status]}>{label(t.status)}</Badge></div>
            {t.rating != null && <p className="gr-quote"><span className="gr-stars" aria-label={`${t.rating} of 5`}>{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</span> {t.quote ? `“${t.quote}”` : <span className="muted">No comment</span>}</p>}
            <div className="muted gr-meta">{t.consent ? `Consent: ${CONSENT_LABELS[t.consent]} (${date(t.consentAt)})` : `Ask due ${date(t.dueAt)}`}</div>
            <div className="r2 gr-acts">
              {["scheduled", "awaiting_approval"].includes(t.status) && <ActionButton url={`/api/admin/growth/testimonials/${t.id}`} body={{ action: "request" }} label="Send request" variant="acc" confirm={`Email ${t.email} the feedback request now?`} done="Request sent" />}
              {t.status === "received" && <ActionButton url={`/api/admin/growth/testimonials/${t.id}`} body={{ action: "approve" }} label="Approve" variant="pri" />}
              {["received", "approved"].includes(t.status) && t.consent && t.consent !== "internal" && <ActionButton url={`/api/admin/growth/testimonials/${t.id}`} body={{ action: "publish" }} label="Publish" variant="acc" />}
              {!["hidden", "scheduled", "awaiting_approval"].includes(t.status) && <ActionButton url={`/api/admin/growth/testimonials/${t.id}`} body={{ action: "hide" }} label="Hide" variant="gh" />}
            </div>
          </div>
        ))}
      </Card>
    );
  }
  if (tab === "health") {
    const hs = await computeHealth();
    return (
      <>
        <div className="kpis k3">
          {(["red", "amber", "green"] as const).map((l) => <div className="card kpi" key={l}><div className="l">{l === "red" ? "At risk" : l === "amber" ? "Watch" : "Healthy"}</div><div className="v">{hs.filter((h) => h.level === l).length}</div></div>)}
        </div>
        <Card>
          <CardHeader title="Care plan clients" />
          {!hs.length && <Empty>No active care plans yet.</Empty>}
          {hs.map((h) => (
            <div className="oc" key={h.siteId}>
              <div className="r1"><b>{h.name}</b><Badge tone={STATUS_TONE[h.level]}>{h.level}</Badge></div>
              <div className="muted gr-meta">{h.plan} · {money(h.monthlyCents)}/mo · {h.reasons.length ? h.reasons.join(", ") : "No issues"}{h.lastActivity ? ` · last activity ${date(h.lastActivity)}` : ""}</div>
              {h.level !== "green" && (
                <details className="gr-preview"><summary>Drafted check-in (not sent)</summary><pre>{h.checkIn}</pre>
                  <div className="gr-acts"><CopyButton text={h.checkIn} label="Copy draft" />{h.email && <a className="btn sm gh" href={`/saabai-admin/journey?email=${encodeURIComponent(h.email)}`}>Journey</a>}</div>
                </details>
              )}
            </div>
          ))}
          <CardBody><p className="muted gr-meta">Amber after {DEFAULTS.amberDays} quiet days, red after {DEFAULTS.redDays} or on a failed payment or cancellation. Check-ins are drafts only.</p></CardBody>
        </Card>
      </>
    );
  }
  // referrals
  const [codes, refs] = await Promise.all([listDocs<ReferralCode>("referral_codes", 500), listDocs<Referral>("referrals", 500)]);
  return (
    <>
      <Card>
        <CardHeader title="Create a referral link" />
        <CardBody>
          <NewReferralForm />
          <p className="muted gr-meta">Referrer gets {money(DEFAULTS.referrerRewardCents)} credit once the referred purchase passes {DEFAULTS.referralQualifyDays} days without a refund. The new client gets {DEFAULTS.refereeDiscountPct}% off. Self and same-domain referrals are voided.</p>
        </CardBody>
      </Card>
      <div style={{ height: 16 }} />
      <Card>
        <CardHeader title={`Referrals (${refs.length})`} />
        {!refs.length && <Empty>No referred purchases yet.</Empty>}
        {refs.map((r) => (
          <div className="oc" key={r.id}>
            <div className="r1"><b>{r.referrerEmail} → {r.referredEmail}</b><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></div>
            <div className="muted gr-meta">Code {r.code} · purchase {money(r.amountCents)} · reward {money(r.rewardCents)} · qualifies {date(r.qualifiesAt)}{r.voidReason ? ` · ${r.voidReason}` : ""}</div>
            {r.status === "qualified" && <div className="r2 gr-acts"><ActionButton url="/api/admin/growth/referrals" body={{ action: "paid", id: r.id }} label="Mark credit applied" variant="pri" /></div>}
            {r.status === "pending" && <div className="r2 gr-acts"><ActionButton url="/api/admin/growth/referrals" body={{ action: "void", id: r.id }} label="Void" variant="dg" confirm="Void this referral?" /></div>}
          </div>
        ))}
      </Card>
      <div style={{ height: 16 }} />
      <Card>
        <CardHeader title={`Links (${codes.length})`} />
        {!codes.length && <Empty>No links yet.</Empty>}
        {codes.map((c) => (
          <div className="oc" key={c.id}><div className="r1"><b>{c.name || c.email}</b><CopyButton text={referralUrl(c.id)} label="Copy link" /></div><div className="muted gr-meta">{referralUrl(c.id)}</div></div>
        ))}
      </Card>
    </>
  );
}
