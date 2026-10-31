"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import OnOff from "../ui/OnOff";
import { Button } from "../ui/Button";
import { PageHeader } from "../ui/PageHeader";
import { combinedCopyNote } from "../../../lib/chatbot/combined-note";
import { PLAN_LABEL, type Plan } from "../../../lib/chatbot/core";
import { GOAL_LABEL, type GoalType } from "../../../lib/chatbot/goal";
import { brisbaneMonthRange, formatLastChat } from "../../../lib/chatbot/leads";
import {
  arrangeGroups, csvFor, filterRows, multiSiteClients, pageBots, parseListQuery, serialiseListQuery,
  sortRows, statusCounts, type BotListRow, type ListQuery, type ListSort,
} from "../../../lib/chatbot/list-view";
import { chatbotEditorPath, chatbotHistoryPath, chatbotPagePath } from "../../../lib/chatbot/paths";
import { installSnippet } from "../../../lib/chatbot/seed-shared";
import "./chatbots.css";

type Folded = { id: string; slug: string; name: string };
type ApiRow = {
  id?: string; slug: string; name: string; domains: string[]; folded?: Folded[];
  clientKey?: string; clientName?: string;
  engine: "platform" | "bespoke"; enabled: boolean | null; plan: string;
  goal?: { primary?: string } | null;
  resolved?: { botName?: string };
  usage: { conversations: number; messages: number };
  cap: { state: "ok" | "near" | "over"; cap: number; pct: number };
  leads?: number | null; lastChatAt?: string | null;
  botLock?: { locked?: boolean };
};
type PlanOpt = { key: string; label: string; cap: number };
type Col = "domain" | "status" | "plan" | "goal" | "chats" | "leads" | "last";

const COLS: { id: Col; label: string }[] = [
  { id: "domain", label: "Domain" }, { id: "status", label: "Status" }, { id: "plan", label: "Plan" },
  { id: "goal", label: "Goal" }, { id: "chats", label: "Chats this month" }, { id: "leads", label: "Leads" }, { id: "last", label: "Last chat" },
];

const goalName = (g?: string) => (g && g in GOAL_LABEL ? GOAL_LABEL[g as GoalType] : "No goal");
const goalShort = (g?: string) => {
  if (g === "capture_details") return "Capture details";
  if (g === "quote") return "Give a quote";
  if (g === "book_call") return "Book a call";
  if (g === "call_back") return "Call back";
  if (g === "sell_product") return "Sell a product";
  if (g === "custom") return "Custom";
  if (g === "none" || !g) return "No goal";
  return goalName(g);
};

function toList(r: ApiRow): BotListRow {
  return {
    slug: r.slug, name: r.name, domains: r.domains ?? [],
    aliases: (r.folded ?? []).flatMap((f) => [f.name, f.slug]),
    engine: r.engine, enabled: r.enabled, plan: r.plan, goal: r.goal?.primary ?? "none",
    chats: r.usage?.conversations ?? 0, cap: r.cap?.cap ?? 0, capState: r.cap?.state ?? "ok",
    leads: r.engine === "bespoke" ? null : (r.leads ?? 0),
    lastChatAt: r.lastChatAt ?? null, locked: !!r.botLock?.locked,
    clientKey: r.clientKey || `site:${r.id || r.slug}`, clientName: r.clientName || r.name,
  };
}

function monthCaption(now = new Date()) {
  const { key } = brisbaneMonthRange(now);
  const [y, m] = key.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const end = new Date(y, m, 0).getDate();
  return `1 to ${end} ${months[m - 1]}, Brisbane time`;
}

function LockIcon() {
  return (
    <svg className="lock" width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function ChatbotsClient() {
  const [rows, setRows] = useState<ApiRow[]>([]);
  const [plans, setPlans] = useState<PlanOpt[]>([]);
  const [kill, setKill] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState<ListQuery>({ q: "", status: "all", plan: "", client: "", goal: "", sort: "last", dir: "desc", page: 1, per: 25 });
  const [draftQ, setDraftQ] = useState("");
  const [hidden, setHidden] = useState<Col[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [menu, setMenu] = useState<{ slug: string; top: number; left: number } | null>(null);
  const [planFor, setPlanFor] = useState<string | null>(null);
  const [bulkOff, setBulkOff] = useState(false);
  const [bulkPlan, setBulkPlan] = useState(false);
  const [reason, setReason] = useState("");
  const [colsOpen, setColsOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileMore, setMobileMore] = useState(25);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/chatbots");
    if (r.ok) {
      const j = await r.json();
      setRows(j.rows ?? []);
      setPlans(j.plans ?? []);
      setKill(!!j.kill);
    }
    setLoaded(true);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const q = parseListQuery(new URLSearchParams(window.location.search));
    setQuery(q);
    setDraftQ(q.q);
    setReady(true);
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        document.getElementById("chatbots-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery((q) => (q.q === draftQ ? q : { ...q, q: draftQ, page: 1 }));
    }, 150);
    return () => clearTimeout(t);
  }, [draftQ]);

  useEffect(() => {
    if (!ready) return;
    const s = serialiseListQuery(query);
    const next = s ? `${window.location.pathname}?${s}` : window.location.pathname;
    if (`${window.location.pathname}${window.location.search}` !== next) window.history.replaceState(null, "", next);
  }, [query, ready]);

  async function post(slug: string, body: Record<string, unknown>) {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/chatbots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(j.error || "Couldn't save.");
    await load();
    setBusy(false);
  }

  async function postMany(slugs: string[], body: Record<string, unknown>) {
    setBusy(true); setMsg("");
    for (const slug of slugs) {
      const r = await fetch("/api/admin/chatbots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, ...body }) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); setMsg(j.error || "Couldn't save."); break; }
    }
    await load();
    setBusy(false);
    setPicked([]);
    setBulkOff(false);
    setBulkPlan(false);
    setReason("");
  }

  const list = useMemo(() => rows.map(toList), [rows]);
  const counts = statusCounts(list, kill);
  const clients = multiSiteClients(list);
  const filtered = sortRows(filterRows(list, query, kill), query.sort, query.dir);
  const paged = pageBots(arrangeGroups(filtered), query.page, query.per);
  const bySlug = useMemo(() => new Map(rows.map((r) => [r.slug, r])), [rows]);
  const hide = (c: Col) => hidden.includes(c);
  const pageSlugs = paged.groups.flatMap((g) => g.rows.map((r) => r.slug));
  const selectable = (slug: string) => bySlug.get(slug)?.engine !== "bespoke";
  const selected = picked.filter((s) => filtered.some((r) => r.slug === s));
  const allPage = pageSlugs.filter(selectable).every((s) => selected.includes(s)) && pageSlugs.some(selectable);
  const somePage = pageSlugs.some((s) => selected.includes(s));

  function toggleSort(sort: ListSort) {
    setQuery((q) => ({ ...q, sort, dir: q.sort === sort ? (q.dir === "asc" ? "desc" : "asc") : sort === "name" ? "asc" : "desc", page: 1 }));
  }
  function setQ(patch: Partial<ListQuery>) {
    setQuery((q) => ({ ...q, ...patch, page: patch.page ?? 1 }));
  }
  function togglePick(slug: string) {
    setPicked((cur) => cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]);
  }
  function exportRows(which: BotListRow[]) {
    const blob = new Blob([csvFor(which)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "chatbots.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const leadsTotal = list.reduce((n, r) => n + (r.leads ?? 0), 0);
  const chatsTotal = list.reduce((n, r) => n + r.chats, 0);
  const near = list.filter((r) => r.capState === "near" || r.capState === "over").length;
  const filteredOn = query.status !== "all" || query.plan || query.client || query.goal || query.q;
  const killTitle = "Emergency switch is on. Every platform chatbot is off until it is removed in Vercel.";

  const sortBtn = (id: ListSort, label: string, className: string, right = false) => (
    <th className={className} aria-sort={query.sort === id ? (query.dir === "asc" ? "ascending" : "descending") : "none"} scope="col">
      <button type="button" className="tip" onClick={() => toggleSort(id)} style={right ? { marginLeft: "auto" } : undefined}>
        {label}{query.sort === id ? (query.dir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  const menuRow = menu ? bySlug.get(menu.slug) : null;
  const menuList = menu ? list.find((r) => r.slug === menu.slug) : null;

  return (
    <div className={`cblist${hidden.map((c) => ` hide-${c}`).join("")}`}>
      <PageHeader
        title="Chatbots"
        meta="One row per site. When a bot is off, visitors get a polite break message and no AI is used, so it costs nothing and does not count towards the monthly limit."
        actions={
          <>
            <Button variant="sec" onClick={() => exportRows(filtered)}><DownloadIcon /> Export CSV</Button>
            <Button variant="pri" onClick={() => setCreateOpen(true)}><PlusIcon /> New chatbot</Button>
          </>
        }
      />
      {kill && <div role="alert" className="cb-alert" style={{ background: "#fff", border: "1px solid #f6c4bf", color: "#b42318", borderRadius: 10, padding: "12px 16px", margin: "8px 0 12px" }}><strong>Emergency switch is on (CHATBOTS_KILL).</strong> Every platform chatbot is off until it is removed in Vercel.</div>}
      {msg && <div role="alert" data-testid="chatbots-error" style={{ color: "var(--bad)", marginBottom: 8 }}>{msg}</div>}

      <div className="kpis">
        <div className="card kpi"><div className="l">Chatbots</div><div className="v num">{loaded ? counts.all.toLocaleString("en-AU") : "…"}</div><div className="d">{loaded ? `${counts.on} on, ${counts.off} off, ${counts.own} own route` : "Loading"}</div></div>
        <div className="card kpi"><div className="l">Chats this month</div><div className="v num">{loaded ? chatsTotal.toLocaleString("en-AU") : "…"}</div><div className="d">{monthCaption()}</div></div>
        <div className="card kpi"><div className="l">Leads this month</div><div className="v num">{loaded ? leadsTotal.toLocaleString("en-AU") : "…"}</div><div className="d">Leads: chats that went past hello</div></div>
        <div className="card kpi"><div className="l">Near or over plan limit</div><div className="v num" style={{ color: near ? "var(--warn)" : undefined }}>{loaded ? near : "…"}</div><div className="d">Limits are not enforced yet</div></div>
      </div>

      <div className="card cblist-card" style={{ overflow: "visible" }}>
        <div className="fbar">
          <label className="searchbox">
            <SearchIcon />
            <input id="chatbots-search" data-testid="chatbots-search" type="search" placeholder="Search client, slug or domain" aria-label="Search client, slug or domain" value={draftQ} onChange={(e) => setDraftQ(e.target.value)} />
            <kbd>/</kbd>
          </label>
          <div className="seg chip-row" role="tablist" aria-label="Status">
            {(["all", "on", "off", "attention", "locked"] as const).map((s) => (
              <button key={s} type="button" role="tab" aria-selected={query.status === s} className={query.status === s ? "on" : ""} onClick={() => setQ({ status: s })}>
                {s === "all" ? "All" : s === "on" ? "On" : s === "off" ? "Off" : s === "attention" ? "Needs attention" : "Locked"} {loaded ? (s === "all" ? counts.all : s === "on" ? counts.on : s === "off" ? counts.off : s === "attention" ? counts.attention : counts.locked) : "…"}
              </button>
            ))}
          </div>
          <select className={`ctl desk${query.plan ? " set" : ""}`} aria-label="Plan" value={query.plan} onChange={(e) => setQ({ plan: e.target.value })}>
            <option value="">Plan</option>
            {plans.map((p) => <option key={p.key} value={p.key}>{query.plan === p.key ? `Plan: ${p.label}` : p.label}</option>)}
          </select>
          {clients.length > 0 && (
            <select className={`ctl desk${query.client ? " set" : ""}`} aria-label="Client" value={query.client} onChange={(e) => setQ({ client: e.target.value })}>
              <option value="">Client</option>
              {clients.map((c) => <option key={c.key} value={c.key}>{query.client === c.key ? `Client: ${c.name}` : `${c.name} (${c.count})`}</option>)}
            </select>
          )}
          <select className={`ctl desk${query.goal ? " set" : ""}`} aria-label="Goal" value={query.goal} onChange={(e) => setQ({ goal: e.target.value })}>
            <option value="">Goal</option>
            {(Object.keys(GOAL_LABEL) as GoalType[]).map((g) => <option key={g} value={g}>{query.goal === g ? `Goal: ${goalShort(g)}` : goalShort(g)}</option>)}
          </select>
          <div className="fbar-right desk">
            <select className="ctl" aria-label="Sort" value={query.sort} onChange={(e) => setQ({ sort: e.target.value as ListSort, dir: e.target.value === "name" ? "asc" : "desc" })}>
              <option value="last">Sort: Last chat</option>
              <option value="name">Sort: Client A to Z</option>
              <option value="chats">Sort: Chats this month</option>
              <option value="leads">Sort: Leads</option>
              <option value="plan">Sort: Plan</option>
            </select>
            <Button variant="gh" size="sm" aria-label="Choose columns" onClick={() => setColsOpen((v) => !v)}>Columns</Button>
            {colsOpen && (
              <div className="menu" style={{ top: 120, right: 24 }} role="menu">
                {COLS.map((c) => (
                  <label key={c.id} className="mi" style={{ display: "flex", gap: 8, alignItems: "center", height: 34, padding: "0 8px" }}>
                    <input type="checkbox" checked={!hide(c.id)} onChange={() => setHidden((h) => h.includes(c.id) ? h.filter((x) => x !== c.id) : [...h, c.id])} />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <Button variant="sec" className="sheet-btn" onClick={() => setSheet(true)}>Filter and sort</Button>
        </div>

        {filteredOn && (
          <div className="chips">
            {query.q && <span className="chip">Search “{query.q}” <button type="button" aria-label="Remove search" onClick={() => { setDraftQ(""); setQ({ q: "" }); }}>×</button></span>}
            {query.plan && <span className="chip">Plan {plans.find((p) => p.key === query.plan)?.label ?? query.plan} <button type="button" aria-label="Remove plan filter" onClick={() => setQ({ plan: "" })}>×</button></span>}
            {query.status !== "all" && <span className="chip">Status {query.status} <button type="button" aria-label="Remove status filter" onClick={() => setQ({ status: "all" })}>×</button></span>}
            {query.client && <span className="chip">Client {clients.find((c) => c.key === query.client)?.name ?? "client"} <button type="button" aria-label="Remove client filter" onClick={() => setQ({ client: "" })}>×</button></span>}
            {query.goal && <span className="chip">Goal {goalShort(query.goal)} <button type="button" aria-label="Remove goal filter" onClick={() => setQ({ goal: "" })}>×</button></span>}
            <button type="button" className="clear" onClick={() => { setDraftQ(""); setQuery((q) => ({ ...q, q: "", status: "all", plan: "", client: "", goal: "", page: 1 })); }}>Clear all</button>
          </div>
        )}

        {selected.length > 0 && (
          <div className="bulk">
            <input className="chk" type="checkbox" aria-label="Select rows on this page" checked={allPage} ref={(el) => { if (el) el.indeterminate = somePage && !allPage; }} onChange={() => {
              const ids = pageSlugs.filter(selectable);
              setPicked((cur) => allPage ? cur.filter((s) => !ids.includes(s)) : [...new Set([...cur, ...ids])]);
            }} />
            <span>{selected.length} selected</span>
            <Button size="sm" disabled={kill || busy} title={kill ? killTitle : undefined} onClick={() => void postMany(selected, { action: "set_enabled", enabled: true })}>Turn on</Button>
            <Button size="sm" disabled={kill || busy} title={kill ? killTitle : undefined} onClick={() => { setBulkOff((v) => !v); setReason(""); }}>Turn off</Button>
            <Button size="sm" disabled={kill || busy} title={kill ? killTitle : undefined} onClick={() => setBulkPlan((v) => !v)}>Change plan</Button>
            <Button size="sm" onClick={() => exportRows(filtered.filter((r) => selected.includes(r.slug)))}>Export</Button>
            <button type="button" className="selall" onClick={() => setPicked(filtered.filter((r) => r.engine !== "bespoke").map((r) => r.slug))}>Select all {filtered.length}</button>
            <button type="button" className="clearsel" onClick={() => { setPicked([]); setBulkOff(false); }}>Clear selection</button>
            {bulkOff && (
              <div className="confirm" role="dialog" aria-label={`Turn off ${selected.length} chatbots?`}>
                <h6>Turn off {selected.length} chatbots?</h6>
                <p>Visitors on these sites get the break message. No AI is used. You can turn them back on at any time.</p>
                <label>Reason (shown in the change log)
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example, client paused for winter" />
                </label>
                <div className="bt">
                  <Button variant="sec" size="sm" onClick={() => setBulkOff(false)}>Keep them on</Button>
                  <Button variant="pri" size="sm" disabled={busy} onClick={() => void postMany(selected, { action: "set_enabled", enabled: false, reason })}>Turn off {selected.length}</Button>
                </div>
              </div>
            )}
            {bulkPlan && (
              <div className="confirm" role="dialog" aria-label="Change plan">
                <h6>Change plan for {selected.length} chatbots</h6>
                <div className="bt" style={{ justifyContent: "flex-start" }}>
                  {plans.map((p) => <Button key={p.key} size="sm" onClick={() => void postMany(selected, { action: "set_plan", plan: p.key })}>{p.label}</Button>)}
                </div>
              </div>
            )}
          </div>
        )}

        {!loaded && (
          <div>
            <table><tbody>{Array.from({ length: 10 }, (_, i) => (
              <tr key={i}><td><div className="skel" style={{ width: `${40 + (i % 5) * 10}%` }} /></td></tr>
            ))}</tbody></table>
            <div className="pfoot">Loading chatbots</div>
          </div>
        )}

        {loaded && rows.length === 0 && (
          <div className="empty" data-testid="chatbots-empty">
            <div className="tile" aria-hidden="true"><PlusIcon /></div>
            <h2>No chatbots yet</h2>
            <p>Chatbots are added with a client site. When a site is ready, its bot shows up here.</p>
            <Button variant="pri" onClick={() => setCreateOpen(true)}>New chatbot</Button>
          </div>
        )}

        {loaded && rows.length > 0 && filtered.length === 0 && (
          <div>
            <div className="empty" data-testid="chatbots-empty">
              <div className="tile" aria-hidden="true"><SearchIcon /></div>
              <h2>No chatbots match</h2>
              <p>{query.q ? `Nothing matches “${query.q}”.` : "Nothing matches these filters."}</p>
              <Button variant="sec" onClick={() => { setDraftQ(""); setQuery((q) => ({ ...q, q: "", status: "all", plan: "", client: "", goal: "", page: 1 })); }}>Clear filters</Button>
            </div>
          </div>
        )}

        {loaded && filtered.length > 0 && (
          <>
            <table className="desk">
              <colgroup>
                <col style={{ width: 38 }} /><col style={{ width: 224 }} /><col className="col-domain" style={{ width: 174 }} />
                <col className="col-status" style={{ width: 124 }} /><col className="col-plan" style={{ width: 96 }} /><col className="col-goal" style={{ width: 140 }} />
                <col className="col-chats" style={{ width: 124 }} /><col className="col-leads" style={{ width: 62 }} /><col className="col-last" style={{ width: 88 }} /><col style={{ width: 72 }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col"><input className="chk" type="checkbox" aria-label="Select rows on this page" checked={allPage} ref={(el) => { if (el) el.indeterminate = somePage && !allPage; }} onChange={() => {
                    const ids = pageSlugs.filter(selectable);
                    setPicked((cur) => allPage ? cur.filter((s) => !ids.includes(s)) : [...new Set([...cur, ...ids])]);
                  }} /></th>
                  {sortBtn("name", "Client and bot", "")}
                  <th className="col-domain" scope="col">Domain</th>
                  <th className="col-status" scope="col">Status</th>
                  {sortBtn("plan", "Plan", "col-plan")}
                  <th className="col-goal" scope="col">Goal</th>
                  {sortBtn("chats", "Chats this month", "col-chats")}
                  <th className="col-leads r" scope="col">
                    <span className="tipwrap">
                      <button type="button" className="tip" aria-describedby="leads-tip" onClick={() => toggleSort("leads")}>Leads{query.sort === "leads" ? (query.dir === "asc" ? " ↑" : " ↓") : ""}</button>
                      <span role="tooltip" id="leads-tip" className="tipbox">Leads. Chats that went past hello: the visitor sent more than a greeting before the chat ended.</span>
                    </span>
                  </th>
                  {sortBtn("last", "Last chat", "col-last r", true)}
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {paged.groups.map((g) => (
                  <Fragment key={g.key}>
                    {g.multi && (
                      <tr key={`${g.key}-g`} className="group">
                        <td><input className="chk" type="checkbox" aria-label={`Select ${g.name}`} checked={g.rows.every((r) => selected.includes(r.slug))} onChange={() => {
                          const ids = g.rows.map((r) => r.slug).filter(selectable);
                          const on = ids.every((s) => selected.includes(s));
                          setPicked((cur) => on ? cur.filter((s) => !ids.includes(s)) : [...new Set([...cur, ...ids])]);
                        }} /></td>
                        <td colSpan={9}>{g.name} <span className="tag">Multi-site client · {g.sites} sites</span><span className="tot">{g.chats} chats, {g.leads} leads this month across {g.sites === 2 ? "both sites" : "these sites"}</span></td>
                      </tr>
                    )}
                    {g.rows.map((r) => {
                      const api = bySlug.get(r.slug);
                      const bespoke = r.engine === "bespoke";
                      const folded = combinedCopyNote(r.slug, api?.folded ?? []);
                      const botName = api?.resolved?.botName || r.slug;
                      const domain = r.domains[0] ?? "";
                      const capCls = r.capState === "over" ? "over" : r.capState === "near" ? "warn" : "";
                      const pct = r.cap ? Math.min(100, Math.round((r.chats / r.cap) * 100)) : 0;
                      return (
                        <tr key={r.slug} className={`${selected.includes(r.slug) ? "sel" : ""} ${g.multi ? "child" : ""}`} data-testid={`row-${r.slug}`} onClick={(e) => {
                          if ((e.target as HTMLElement).closest("a,button,input,label,.menu")) return;
                          window.location.href = chatbotPagePath(r.slug);
                        }}>
                          <td><input className="chk" type="checkbox" aria-label={`Select ${r.name}`} disabled={bespoke} checked={selected.includes(r.slug)} onChange={() => togglePick(r.slug)} /></td>
                          <td>
                            <div className="name">
                              <Link href={chatbotPagePath(r.slug)} data-testid={`open-${r.slug}`} title={r.name}>{r.name}</Link>
                              {r.locked && <span title="Locked: the client can view but not edit" aria-label="Locked: the client can view but not edit"><LockIcon /></span>}
                            </div>
                            <div className="sub" title={`Bot: ${botName} · ${r.slug}`}>Bot: {botName} · {r.slug}</div>
                            {folded && <div className="sub" data-testid={`folded-${r.slug}`}>{folded}</div>}
                            <div className="dom-under" title={r.domains.join(", ")}>{domain}</div>
                            <Link href={chatbotPagePath(r.slug)} data-testid={`view-${r.slug}`} className="sr-only">View</Link>
                          </td>
                          <td className="col-domain" title={r.domains.join(", ") || domain}>{domain}</td>
                          <td className="col-status">
                            {bespoke ? <span className="own">Own route</span> : <span className={`onoff ${r.enabled ? "on" : "off"}`}><i />{r.enabled ? "ON" : "OFF"}</span>}
                          </td>
                          <td className="col-plan"><span className="tag">{PLAN_LABEL[r.plan as Plan] ?? r.plan}</span></td>
                          <td className="col-goal">{goalShort(r.goal)}</td>
                          <td className="col-chats">
                            {bespoke ? <span className="usage">n/a</span> : (
                              <>
                                <span className={`usage ${capCls}`}>{r.chats.toLocaleString("en-AU")} / {r.cap.toLocaleString("en-AU")}</span>
                                <span className={`bar ${capCls}`} title={r.capState === "over" ? "Over" : r.capState === "near" ? "Near" : "Within plan"}><i style={{ width: `${pct}%` }} /></span>
                              </>
                            )}
                          </td>
                          <td className="col-leads r num">{r.leads === null ? "n/a" : r.leads}</td>
                          <td className="col-last r">{formatLastChat(r.lastChatAt) || ""}</td>
                          <td>
                            <div className="acts">
                              <Link href={chatbotEditorPath(r.slug)} className="btn gh ic sm" aria-label={`Edit ${r.name}`} data-testid={`edit-${r.slug}`}><PencilIcon /></Link>
                              <button type="button" className="btn gh ic sm" aria-label={`Actions for ${r.name}`} onClick={(e) => {
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setMenu(menu?.slug === r.slug ? null : { slug: r.slug, top: rect.bottom + 6, left: Math.max(8, rect.right - 236) });
                                setPlanFor(null);
                              }}>···</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>

            <div className="cards">
              {filtered.slice(0, mobileMore).map((r) => {
                const capCls = r.capState === "over" ? "over" : r.capState === "near" ? "near" : "";
                return (
                  <Link key={r.slug} href={chatbotPagePath(r.slug)} className={`mcard ${capCls}`}>
                    <div className="top">
                      <b>{r.name}</b>
                      {r.locked && <LockIcon />}
                      {r.engine === "bespoke" ? <span className="own">Own route</span> : <span className={`onoff ${r.enabled ? "on" : "off"}`}><i />{r.enabled ? "ON" : "OFF"}</span>}
                    </div>
                    <div className="dom">{r.domains[0]}</div>
                    <div className="meta">
                      <span className="tag">{PLAN_LABEL[r.plan as Plan] ?? r.plan}</span>
                      <span className={r.capState === "over" ? "num over" : r.capState === "near" ? "num warn" : "num"}>{r.chats} / {r.cap} chats{r.capState === "near" ? " (near)" : r.capState === "over" ? " (over)" : ""}</span>
                      <span>{r.leads === null ? "n/a" : `${r.leads} leads`}</span>
                      <span>{formatLastChat(r.lastChatAt)}</span>
                    </div>
                  </Link>
                );
              })}
              {mobileMore < filtered.length && <button type="button" className="btn more" style={{ width: "100%" }} onClick={() => setMobileMore((n) => n + 25)}>Load 25 more</button>}
            </div>

            <div className="pfoot desk">
              <span>Showing {paged.from} to {paged.to} of {paged.total} chatbots</span>
              <label> <select aria-label="Rows per page" value={query.per} onChange={(e) => setQ({ per: Number(e.target.value), page: 1 })}>
                {[25, 50, 100].map((n) => <option key={n} value={n}>{n} per page</option>)}
              </select></label>
              <div className="pager">
                <button type="button" aria-label="Previous page" disabled={paged.page <= 1} onClick={() => setQ({ page: paged.page - 1 })}>‹</button>
                {Array.from({ length: paged.pages }, (_, i) => i + 1).filter((n) => n === 1 || n === paged.pages || Math.abs(n - paged.page) <= 1).map((n) => (
                  <button key={n} type="button" className={n === paged.page ? "on" : ""} aria-current={n === paged.page ? "page" : undefined} onClick={() => setQ({ page: n })}>{n}</button>
                ))}
                <button type="button" aria-label="Next page" disabled={paged.page >= paged.pages} onClick={() => setQ({ page: paged.page + 1 })}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {menu && menuRow && menuList && (
        <div className="menu rowmenu" style={{ top: menu.top, left: menu.left }} role="menu">
          <h6>{menuRow.name}</h6>
          <Link href={chatbotEditorPath(menuRow.slug)}>Edit chatbot</Link>
          <Link href={chatbotHistoryPath(menuRow.slug)}>Chat history</Link>
          <Link href={`${chatbotPagePath(menuRow.slug)}#results`}>Funnel and leads</Link>
          {menuList.domains[0] && <a href={menuList.domains[0].startsWith("http") ? menuList.domains[0] : `https://${menuList.domains[0]}`} target="_blank" rel="noreferrer">Open site</a>}
          <button type="button" className="mi" onClick={() => { void navigator.clipboard?.writeText(installSnippet(menuRow.slug)); setMenu(null); }}>Copy install line</button>
          {menuRow.engine !== "bespoke" && (
            <>
              <hr />
              <button type="button" className="mi" onClick={() => setPlanFor(planFor ? null : menuRow.slug)}>Change plan <span className="muted">{PLAN_LABEL[menuRow.plan as Plan] ?? menuRow.plan}</span></button>
              {planFor === menuRow.slug && (
                <div className="subm">
                  {plans.map((p) => <button key={p.key} type="button" className="mi" onClick={() => { void post(menuRow.slug, { action: "set_plan", plan: p.key }); setMenu(null); }}>{p.label}{p.key === menuRow.plan ? " (current)" : ""}</button>)}
                </div>
              )}
              <OnOff testId={`toggle-${menuRow.slug}`} on={!!menuRow.enabled} label={`${menuRow.name} chatbot`} disabled={kill} disabledReason="Emergency switch is on"
                confirmOff={{ title: `Turn off ${menuRow.name}?`, body: "Visitors get the break message. No AI is used. You can turn them back on at any time.", reasonField: true }}
                onToggle={(why) => { void post(menuRow.slug, { action: "set_enabled", enabled: !menuRow.enabled, reason: why ?? "" }); setMenu(null); }} />
            </>
          )}
        </div>
      )}

      {sheet && (
        <div className="sheet" role="dialog" aria-label="Filter and sort">
          <div className="panel">
            <strong>Filter and sort</strong>
            <select className="ctl" aria-label="Plan" value={query.plan} onChange={(e) => setQ({ plan: e.target.value })}><option value="">Plan</option>{plans.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
            <select className="ctl" aria-label="Goal" value={query.goal} onChange={(e) => setQ({ goal: e.target.value })}><option value="">Goal</option>{(Object.keys(GOAL_LABEL) as GoalType[]).map((g) => <option key={g} value={g}>{goalShort(g)}</option>)}</select>
            <select className="ctl" aria-label="Sort" value={query.sort} onChange={(e) => setQ({ sort: e.target.value as ListSort })}>
              <option value="last">Last chat</option><option value="name">Client A to Z</option><option value="chats">Chats this month</option><option value="leads">Leads</option><option value="plan">Plan</option>
            </select>
            <Button variant="pri" onClick={() => setSheet(false)}>Show chatbots</Button>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="sheet" role="dialog" aria-label="New chatbot" style={{ alignItems: "center", justifyContent: "center" }}>
          <div className="panel" style={{ maxWidth: 420, borderRadius: 12 }}>
            <h2>New chatbot</h2>
            <p className="hint">Chatbots are created with the client site. There is no separate new-bot form in this release. Add the site, and the bot appears in this list.</p>
            <div className="bt" style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}><Button variant="pri" onClick={() => setCreateOpen(false)}>Close</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function DownloadIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8M5 7l3 3 3-3M3 13h10" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
}
function PlusIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
}
function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" /></svg>;
}
function PencilIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9 3l4 4L6 14H2v-4L9 3z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
}
