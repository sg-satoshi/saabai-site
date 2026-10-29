"use client";
/**
 * Subscribers admin page (#345). Light mode, Mission Control layout, shared admin buttons.
 * - Every count uses the broadcast route's rule (active, opted in, not suppressed). The API
 *   returns each row's emailStatus, so "Can be emailed" is the number a send actually reaches.
 * - No hard delete in the UI. "Mark unsubscribed" adds people to the suppression list and sets
 *   their status, keeping the record and its consent history (PATCH /api/subscribers).
 * - IP shows only in the row detail drawer, never in the table.
 */
import "./subscribers.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { audienceCounts, SEGMENTS, type EmailStatus } from "../../../lib/subscriber-rules";
import type { AdminSubscriber } from "../../../lib/subscriber-admin";
import { notify } from "../ui/Feedback";
import AdminShell from "../AdminSidebar";
import Composer from "./Composer";
import { Avatar, Icon, Industry, StatusBadge, csvCell, fmtDateTime, fmtDay, useDrag, useIsMobile, useLayer, useStoredNumber } from "./ui";

const DAY = 86_400_000;
const PAGE = 12;
type Sort = "date" | "name" | "industry";
type StatusFilter = "all" | EmailStatus;

export default function SubscriberDashboard() {
  const mobile = useIsMobile();
  const [subs, setSubs] = useState<AdminSubscriber[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [suppressionError, setSuppressionError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("All");
  const [sort, setSort] = useState<Sort>("date");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<string | null>(null);
  const [markTarget, setMarkTarget] = useState<string[] | null>(null);
  const [marking, setMarking] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [composer, setComposer] = useState<string | null>(null);
  const [split, setSplit] = useStoredNumber("saabai-admin:subscribers:split", 61, 35, 75);
  const [tblH, setTblH] = useStoredNumber("saabai-admin:subscribers:table-h", 0, 0, 2400);
  const splitRef = useRef<HTMLDivElement>(null);
  const tblRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const r = await fetch("/api/subscribers");
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Could not load subscribers.");
      setSubs(Array.isArray(d.subscribers) ? d.subscribers : []);
      setCount(typeof d.count === "number" ? d.count : 0);
      setSuppressionError(!!d.suppressionError);
      setNow(Date.now());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load subscribers.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = audienceCounts(subs);
  const pct = counts.total ? Math.round((counts.canEmail / counts.total) * 100) : 0;
  const month = subs.filter((s) => now - Date.parse(s.subscribedAt) < 30 * DAY).length;
  const week = subs.filter((s) => now - Date.parse(s.subscribedAt) < 7 * DAY).length;
  const industries = useMemo(() => [...new Set(subs.map((s) => s.industry).filter(Boolean))].sort(), [subs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subs
      .filter((s) => (!q || s.email.toLowerCase().includes(q) || (s.firstName || "").toLowerCase().includes(q))
        && (industry === "All" || s.industry === industry)
        && (statusFilter === "all" || s.emailStatus === statusFilter))
      .sort((a, b) => sort === "date" ? b.subscribedAt.localeCompare(a.subscribedAt)
        : sort === "name" ? (a.firstName || a.email).localeCompare(b.firstName || b.email)
        : (a.industry || "~").localeCompare(b.industry || "~"));
  }, [subs, search, industry, statusFilter, sort]);
  const visible = showAll ? filtered : filtered.slice(0, PAGE);
  const selSubs = subs.filter((s) => selected.has(s.email));
  const selCounts = audienceCounts(selSubs);
  const allVisibleSelected = visible.length > 0 && visible.every((s) => selected.has(s.email));
  const someVisibleSelected = visible.some((s) => selected.has(s.email));

  function toggle(email: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(email)) n.delete(email); else n.add(email); return n; });
  }
  function toggleVisible() {
    setSelected((prev) => { const n = new Set(prev); visible.forEach((s) => (allVisibleSelected ? n.delete(s.email) : n.add(s.email))); return n; });
  }

  function exportCSV(rows: AdminSubscriber[]) {
    const head = ["First name", "Email", "Email status", "Industry", "Source", "Country", "City", "IP", "Subscribed at", "Consent at"];
    const csv = [head, ...rows.map((s) => [s.firstName, s.email, s.emailStatus, s.industry, s.source, s.country ?? "", s.city ?? "", s.ip ?? "", fmtDateTime(s.subscribedAt), fmtDateTime(s.consentAt)])]
      .map((r) => r.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `saabai-subscribers-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    notify.success(`${rows.length} ${rows.length === 1 ? "record" : "records"} exported.`);
  }

  // Mark unsubscribed: suppression list plus status. The record is kept. No hard delete from this page.
  async function markUnsubscribed(emails: string[]) {
    setMarking(true);
    try {
      const res = await fetch("/api/subscribers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails, action: "unsubscribe" }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(d.error || "Nobody was marked unsubscribed. Try again.");
      const done = new Set<string>(Array.isArray(d.marked) ? d.marked : []);
      setSubs((prev) => prev.map((s) => done.has(s.email) ? { ...s, status: "unsubscribed", emailStatus: "unsubscribed", canEmail: false } : s));
      setSelected((prev) => { const n = new Set(prev); done.forEach((e) => n.delete(e)); return n; });
      const failed = Array.isArray(d.failed) ? d.failed.length : 0;
      if (failed) notify.error(`${done.size} marked unsubscribed. ${failed} could not be updated.`);
      else notify.success(`${done.size} marked unsubscribed. Their records are kept.`);
      setMarkTarget(null);
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Nobody was marked unsubscribed.");
    } finally {
      setMarking(false);
    }
  }

  // Growth chart
  const bars = useMemo(() => {
    const days: { key: string; ok: number; no: number; t: number }[] = [];
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(start.getTime() - i * DAY);
      days.push({ key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, ok: 0, no: 0, t: d.getTime() });
    }
    const idx = new Map(days.map((d, i) => [d.key, i]));
    for (const s of subs) {
      const d = new Date(s.subscribedAt);
      const i = idx.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      if (i === undefined) continue;
      if (s.emailStatus === "can_email") days[i].ok++; else days[i].no++;
    }
    return days;
  }, [subs, range, now]);
  const maxBar = Math.max(1, ...bars.map((b) => b.ok + b.no));
  const rangeNew = bars.reduce((a, b) => a + b.ok + b.no, 0);
  const rangeOk = bars.reduce((a, b) => a + b.ok, 0);
  const topSources = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of subs) m.set(s.source || "/", (m.get(s.source || "/") ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [subs]);
  const chartH = mobile ? 110 : 300;
  const labelEvery = range === 7 ? 1 : range === 30 ? (mobile ? 10 : 5) : (mobile ? 30 : 15);

  const segRows = SEGMENTS.map((seg) => {
    const m = subs.filter((s) => seg.filter(s, now));
    return { seg, c: audienceCounts(m) };
  });
  const [segMore, setSegMore] = useState(false);
  const shownSegs = mobile && !segMore ? segRows.slice(0, 6) : segRows;

  const splitDrag = useDrag((dx) => {
    const w = splitRef.current?.clientWidth || 1;
    setSplit(split + (dx / w) * 100);
  });
  const tblDrag = useDrag((_dx, dy) => {
    const cur = tblH || tblRef.current?.clientHeight || 600;
    setTblH(cur + dy);
  });

  const detailSub = detail ? subs.find((s) => s.email === detail) ?? null : null;
  const closeDetail = useCallback(() => setDetail(null), []);
  const detailClose = useRef<HTMLButtonElement>(null);
  useLayer(!!detailSub && !markTarget, closeDetail, detailClose);
  const keepRef = useRef<HTMLButtonElement>(null);
  const closeMark = useCallback(() => { if (!marking) setMarkTarget(null); }, [marking]);
  useLayer(!!markTarget, closeMark, keepRef);

  const statusChips: { id: StatusFilter; label: string; n: number }[] = [
    { id: "all", label: "All", n: counts.total },
    { id: "can_email", label: "Can email", n: counts.canEmail },
    { id: "not_opted_in", label: "Not opted in", n: counts.notOptedIn },
    { id: "unsubscribed", label: "Unsubscribed", n: counts.unsubscribed },
  ];

  if (loading) return <AdminShell activePath="/saabai-admin/subscribers"><div className="subs"><div className="s-empty">Loading subscribers</div></div></AdminShell>;

  return (
    <AdminShell activePath="/saabai-admin/subscribers">
    <div className="subs" style={{ paddingBottom: selected.size ? (mobile ? 90 : 100) : 0 }}>
      <div className="s-head">
        <div>
          <h1 className="s-h1">Subscribers</h1>
          <div className="s-sub">{mobile ? "Who signed up and who you can email." : "Who signed up, who you can email, and your broadcasts."}</div>
        </div>
        <div className="s-actions">
          <button type="button" className={`btn ${mobile ? "sm" : "lg"}`} onClick={() => exportCSV(filtered)} disabled={!filtered.length}><Icon name="dl" />{mobile ? "CSV" : "Export CSV"}</button>
          {!mobile && <button type="button" className="btn pri lg" onClick={() => setComposer("all")}><Icon name="mail" />New broadcast</button>}
        </div>
      </div>
      {mobile && <button type="button" className="btn pri lg" style={{ width: "100%", marginBottom: 16 }} onClick={() => setComposer("all")}><Icon name="mail" />New broadcast</button>}

      {loadError && <div className="s-warn" role="alert"><span>{loadError}</span><button type="button" className="btn sm" onClick={load} style={{ marginLeft: "auto" }}>Try again</button></div>}
      {suppressionError && <div className="s-warn" role="alert">The unsubscribe list could not be read, so some people may show as Can email when they are not. Broadcasts still check it before sending.</div>}
      {count > subs.length && <div className="s-warn">Showing the newest {subs.length} of {count} subscribers. Counts and sends cover these {subs.length} only.</div>}

      <div className="s-kpis">
        <div className="card s-kpi hero">
          <div className="s-kl">Can be emailed</div>
          <div className="s-kv num">{counts.canEmail}</div>
          <div className="s-kn">Of {counts.total} subscribers ({pct}%).</div>
          <div className="s-share" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="card s-kpi"><div className="s-kl">Not opted in</div><div className="s-kv num">{counts.notOptedIn}</div><div className="s-kn">{mobile ? "Broadcasts skip them." : "Never ticked the email box. Broadcasts skip them."}</div></div>
        <div className="card s-kpi"><div className="s-kl">Unsubscribed</div><div className="s-kv num">{counts.unsubscribed}</div><div className="s-kn">{mobile ? "Never emailed." : "Unsubscribed or marked unsubscribed. Never emailed."}</div></div>
        <div className="card s-kpi"><div className="s-kl">New sign-ups</div><div className="s-kv num">{month}</div><div className="s-kn">{mobile ? `Last 30 days. ${week} this week.` : `Joined in the last 30 days. ${week} this week.`}</div></div>
      </div>

      <div className="s-split" ref={splitRef} style={{ gridTemplateColumns: mobile ? "1fr" : `minmax(0,${split}fr) 12px minmax(0,${100 - split}fr)` }}>
        <section className="card" aria-labelledby="growth-h">
          <div className="s-hd c">
            <div className="s-hdl">
              {!mobile && <span className="s-ico"><Icon name="chart" /></span>}
              <div><h2 id="growth-h" className="s-h2">Growth</h2><div className="s-sub">{mobile ? `Last ${range} days` : "New sign-ups per day, split by who can be emailed."}</div></div>
            </div>
            <div className="seg2" role="group" aria-label="Range">
              {([7, 30, 90] as const).filter((r) => !mobile || r !== 90).map((r) => <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{r}d</button>)}
            </div>
          </div>
          <div style={{ padding: mobile ? 14 : "20px 24px" }}>
            <div className="s-chart" style={{ height: chartH }} role="img" aria-label={`${rangeNew} new sign-ups in the last ${range} days, ${rangeOk} can be emailed`}>
              {bars.map((b) => {
                const a = Math.round((b.ok / maxBar) * (chartH - 20)), n = Math.round((b.no / maxBar) * (chartH - 20));
                return (
                  <div key={b.key} title={`${fmtDay(new Date(b.t).toISOString())}: ${b.ok} can be emailed, ${b.no} cannot`}>
                    {n > 0 && <div className="no" style={{ height: n, borderRadius: "3px 3px 0 0" }} />}
                    {a > 0 && <div className="ok" style={{ height: a, borderRadius: n ? 0 : "3px 3px 0 0" }} />}
                    {!a && !n && <div className="zero" />}
                  </div>
                );
              })}
            </div>
            <div className="s-xl" aria-hidden="true">{bars.map((b, i) => <div key={b.key}>{i % labelEvery === 0 ? fmtDay(new Date(b.t).toISOString()) : ""}</div>)}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {!mobile && <div className="s-legend"><span><i style={{ background: "#62c5d1" }} />Can be emailed</span><span><i style={{ background: "#9aa0b4", opacity: 0.6 }} />Not opted in or unsubscribed</span></div>}
              <span style={{ fontSize: 13 }}><b className="num">{rangeNew}</b> new, <b className="num">{rangeOk}</b> can be emailed</span>
            </div>
            {!mobile && topSources.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line2)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span className="s-lab" style={{ marginRight: 4 }}>Top sources</span>
                {topSources.map(([src, n]) => <span key={src} className="s-src"><span className="num" style={{ color: "var(--muted)" }}>{src}</span> <b className="num">{n}</b></span>)}
              </div>
            )}
          </div>
        </section>
        {!mobile && <button type="button" className="s-hv" aria-label="Resize Growth and Segments. Use left and right arrows." title="Drag to resize" {...splitDrag}
          onKeyDown={(e) => { if (e.key === "ArrowLeft") setSplit(split - 3); if (e.key === "ArrowRight") setSplit(split + 3); }} />}
        <section className="card" aria-labelledby="seg-h" style={mobile ? { marginTop: 12 } : undefined}>
          <div className="s-hd">
            <div className="s-hdl">
              <span className="s-ico"><Icon name="users" /></span>
              <div><h2 id="seg-h" className="s-h2">Segments</h2><div className="s-sub">Email a segment in one click.</div></div>
            </div>
          </div>
          <table>
            <thead><tr><th style={{ paddingLeft: mobile ? 14 : 20 }}>Segment</th><th style={{ textAlign: "right" }}>Can email / total</th><th><span className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Action</span></th></tr></thead>
            <tbody>
              {shownSegs.map(({ seg, c }) => (
                <tr key={seg.id}>
                  <td style={{ paddingLeft: mobile ? 14 : 20, fontWeight: 500, whiteSpace: "normal" }}>{seg.label}</td>
                  <td className="num" style={{ textAlign: "right" }}><b style={{ color: "var(--head)" }}>{c.canEmail}</b><span style={{ color: "var(--muted)" }}> / {c.total}</span></td>
                  <td style={{ textAlign: "right", paddingRight: mobile ? 14 : 20 }}>
                    {c.canEmail ? <button type="button" className="btn sm" onClick={() => setComposer(seg.id)} aria-label={`Email ${seg.label}, ${c.canEmail} can be emailed`}>{!mobile && <Icon name="mail" />}Email</button> : <span className="s-note">None to email</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {mobile && segRows.length > 6 && <div style={{ padding: "8px 14px" }}><button type="button" className="btn gh sm" onClick={() => setSegMore((v) => !v)}>{segMore ? "Show fewer segments" : `Show ${segRows.length - 6} more segments`}</button></div>}
        </section>
      </div>

      <section className="card" aria-labelledby="tbl-h">
        <div className="s-hd c" style={mobile ? { flexDirection: "column", alignItems: "stretch" } : undefined}>
          <div className="s-hdl">
            {!mobile && <span className="s-ico"><Icon name="list" /></span>}
            <div><h2 id="tbl-h" className="s-h2">All subscribers</h2><div className="s-sub">{counts.total} people. Tick rows to email, export or mark them unsubscribed.</div></div>
          </div>
          <div className="s-tools" style={mobile ? { justifyContent: "stretch" } : undefined}>
            <input className="s-inp" type="search" aria-label="Search name or email" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: mobile ? "100%" : 260 }} />
            <select className="s-inp" aria-label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} style={mobile ? { flex: 1 } : undefined}>
              <option value="All">All industries</option>
              {industries.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            <select className="s-inp" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} style={mobile ? { flex: 1 } : undefined}>
              <option value="date">Newest first</option>
              <option value="name">Name A to Z</option>
              <option value="industry">Industry</option>
            </select>
          </div>
        </div>
        <div className="s-bar2">
          <div className="seg2" role="group" aria-label="Email status" style={mobile ? { overflowX: "auto", maxWidth: "100%" } : undefined}>
            {statusChips.map((c) => <button key={c.id} type="button" aria-pressed={statusFilter === c.id} onClick={() => setStatusFilter(c.id)}>{c.label}<b className="num">{c.n}</b></button>)}
          </div>
          {!mobile && <span className="s-note">IP address shows in the row detail, not the table.</span>}
        </div>
        <div className="s-tblwrap" ref={tblRef} style={tblH && !mobile ? { height: tblH } : undefined}>
          {filtered.length === 0 ? (
            <div className="s-empty">{subs.length ? "Nobody matches these filters." : "No subscribers yet."}</div>
          ) : mobile ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {visible.map((s) => {
                const on = selected.has(s.email);
                const meta = [s.industry || null, s.city, fmtDay(s.subscribedAt)].filter(Boolean).join(". ");
                return (
                  <li key={s.email} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderTop: "1px solid var(--line2)", background: on ? "var(--sel)" : undefined }}>
                    <input type="checkbox" className="s-chk" checked={on} onChange={() => toggle(s.email)} aria-label={`Select ${s.firstName || s.email}`} />
                    <button type="button" onClick={() => setDetail(s.email)} style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: 0, background: "none", border: 0, padding: 0, textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer" }}>
                      <Avatar name={s.firstName} email={s.email} size={36} />
                      <span style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
                        <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <span style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.firstName || <span style={{ color: "var(--muted)", fontWeight: 500 }}>No name</span>}</span>
                          <StatusBadge status={s.emailStatus} />
                        </span>
                        <span style={{ display: "block", fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.email}</span>
                        <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)" }}>{meta}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 44, paddingLeft: 20 }}>
                    <input type="checkbox" className="s-chk" aria-label="Select all shown" checked={allVisibleSelected}
                      ref={(el) => { if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected; }} onChange={toggleVisible} />
                  </th>
                  <th>Subscriber</th><th>Email status</th><th>Industry</th><th>Source</th><th>Location</th><th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => {
                  const on = selected.has(s.email);
                  const loc = [s.city, s.countryCode].filter(Boolean).join(", ");
                  return (
                    <tr key={s.email} className={`row${on ? " sel" : ""}`} onClick={() => setDetail(s.email)}>
                      <td style={{ paddingLeft: 20 }} onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="s-chk" checked={on} onChange={() => toggle(s.email)} aria-label={`Select ${s.firstName || s.email}`} />
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <Avatar name={s.firstName} email={s.email} />
                          <div style={{ lineHeight: 1.35 }}>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setDetail(s.email); }} style={{ fontWeight: 600, background: "none", border: 0, padding: 0, font: "inherit", color: "inherit", cursor: "pointer", textAlign: "left" }}>
                              {s.firstName || <span style={{ color: "var(--muted)", fontWeight: 500 }}>No name</span>}
                            </button>
                            <div style={{ fontSize: 13, color: "var(--muted)" }}>{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><StatusBadge status={s.emailStatus} /></td>
                      <td><Industry value={s.industry} /></td>
                      <td className="num" style={{ fontSize: 13, color: "var(--muted)" }}>{s.source}</td>
                      <td style={{ fontSize: 13.5 }}>{loc || <span style={{ color: "var(--muted)" }}>Unknown</span>}</td>
                      <td className="num" style={{ fontSize: 13 }}>{fmtDay(s.subscribedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="s-foot">
          <span className="s-note">Showing {visible.length} of {filtered.length}</span>
          {filtered.length > PAGE && <button type="button" className="btn sm" onClick={() => setShowAll((v) => !v)}>{showAll ? `Show first ${PAGE}` : mobile ? "Show all" : `Show all ${filtered.length}`}</button>}
        </div>
        {!mobile && <button type="button" className="s-hh" aria-label="Resize the table height. Use up and down arrows." title="Drag to resize" {...tblDrag}
          onKeyDown={(e) => { const cur = tblH || tblRef.current?.clientHeight || 600; if (e.key === "ArrowUp") setTblH(cur - 40); if (e.key === "ArrowDown") setTblH(cur + 40); }} />}
      </section>

      {selected.size > 0 && (
        <div className="s-selbar" role="toolbar" aria-label="Selected subscribers">
          <button type="button" className={`btn gh ic ${mobile ? "md" : "sm"}`} aria-label="Clear selection" title="Clear selection" onClick={() => { setSelected(new Set()); setMoreOpen(false); }}><Icon name="x" /></button>
          <div style={{ marginRight: 6, flex: mobile ? 1 : undefined, minWidth: 0 }}>
            <div className="t1">{selected.size} selected</div>
            <div className="t2">{mobile ? `${selCounts.canEmail} can be emailed` : `${selCounts.canEmail} can be emailed, ${selCounts.leftOut} ${selCounts.unsubscribed && !selCounts.notOptedIn ? "unsubscribed" : selCounts.notOptedIn && !selCounts.unsubscribed ? "not opted in" : "left out"}`}</div>
          </div>
          {!mobile && <button type="button" className="btn dq sm" onClick={() => setMarkTarget([...selected])}><Icon name="off" />Mark unsubscribed</button>}
          {!mobile && <div className="s-grow" />}
          {!mobile && <button type="button" className="btn md" onClick={() => exportCSV(selSubs)}><Icon name="dl" />Export {selected.size}</button>}
          {mobile && (
            <div style={{ position: "relative" }}>
              <button type="button" className="btn ic md" aria-label="More: export or mark unsubscribed" title="More" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}><Icon name="more" /></button>
              {moreOpen && (
                <div className="s-menu" role="menu">
                  <button type="button" role="menuitem" className="btn gh md" onClick={() => { setMoreOpen(false); exportCSV(selSubs); }}><Icon name="dl" />Export {selected.size}</button>
                  <button type="button" role="menuitem" className="btn dq md" onClick={() => { setMoreOpen(false); setMarkTarget([...selected]); }}><Icon name="off" />Mark unsubscribed</button>
                </div>
              )}
            </div>
          )}
          <button type="button" className="btn pri md" onClick={() => setComposer("selected")} disabled={!selCounts.canEmail} title={selCounts.canEmail ? undefined : "Nobody selected can be emailed."}><Icon name="mail" />Email {selCounts.canEmail}</button>
        </div>
      )}

      {detailSub && (
        <div className="sx">
          <div className="s-ov" onClick={closeDetail} />
          <aside className="s-drawer" role="dialog" aria-modal="true" aria-labelledby="det-h">
            <div className="s-hd c">
              <div className="s-hdl" style={{ alignItems: "center", minWidth: 0 }}>
                <Avatar name={detailSub.firstName} email={detailSub.email} size={40} />
                <div style={{ minWidth: 0 }}>
                  <h2 id="det-h" className="s-h2" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{detailSub.firstName || "No name"}</h2>
                  <div className="s-sub" style={{ overflowWrap: "anywhere" }}>{detailSub.email}</div>
                </div>
              </div>
              <button type="button" ref={detailClose} className="btn gh ic md" aria-label="Close" title="Close" onClick={closeDetail}><Icon name="x" /></button>
            </div>
            <dl className="s-dl">
              <dt>Email status</dt><dd><StatusBadge status={detailSub.emailStatus} /></dd>
              <dt>Marketing consent</dt><dd>{detailSub.marketingConsent === "yes" ? `Yes${detailSub.consentAt ? `, ${fmtDateTime(detailSub.consentAt)}` : ""}` : detailSub.marketingConsent === "no" ? "No, did not tick the box" : "Not recorded (older sign-up)"}</dd>
              <dt>Industry</dt><dd><Industry value={detailSub.industry} /></dd>
              <dt>Source</dt><dd className="num" style={{ fontSize: 13 }}>{detailSub.source || "Unknown"}</dd>
              <dt>Offer</dt><dd>{detailSub.offer === "score_link" ? "Exit pop-up (score link)" : detailSub.offer || "None"}</dd>
              <dt>Location</dt><dd>{[detailSub.city, detailSub.region, detailSub.country].filter(Boolean).join(", ") || "Unknown"}</dd>
              <dt>IP address</dt><dd className="num" style={{ fontSize: 13 }}>{detailSub.ip || "Not recorded"}</dd>
              <dt>Joined</dt><dd>{fmtDateTime(detailSub.subscribedAt)}</dd>
            </dl>
            <div style={{ marginTop: "auto", padding: "16px 24px", borderTop: "1px solid var(--line2)", display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
              {detailSub.emailStatus !== "unsubscribed" ? <button type="button" className="btn dq md" onClick={() => setMarkTarget([detailSub.email])}><Icon name="off" />Mark unsubscribed</button> : <span className="s-note">Unsubscribed. Broadcasts never reach them.</span>}
              {detailSub.emailStatus === "can_email" && <button type="button" className="btn pri md" onClick={() => { setSelected(new Set([detailSub.email])); setDetail(null); setComposer("selected"); }}><Icon name="mail" />Email</button>}
            </div>
          </aside>
        </div>
      )}

      {markTarget && (
        <div className="sx">
          <div className="s-ov" style={{ zIndex: 110 }} onClick={closeMark} />
          <div className="s-dialog" role="alertdialog" aria-modal="true" aria-labelledby="mark-h" aria-describedby="mark-d">
            <h2 id="mark-h" className="s-h2">Mark {markTarget.length === 1 ? "this person" : `${markTarget.length} people`} unsubscribed?</h2>
            <p id="mark-d" className="s-sub" style={{ margin: "8px 0 0", lineHeight: 1.5 }}>
              They go on the unsubscribe list and no broadcast will reach them again. Their records and consent history are kept. Nothing is deleted.
            </p>
            <div className="s-dbtns">
              <button type="button" ref={keepRef} className="btn md" onClick={closeMark} disabled={marking}>Keep them</button>
              <button type="button" className={`btn ds md${marking ? " loading" : ""}`} onClick={() => markUnsubscribed(markTarget)} aria-busy={marking || undefined}>
                {marking ? "Marking" : `Mark ${markTarget.length} unsubscribed`}
              </button>
            </div>
          </div>
        </div>
      )}

      {composer && (
        <Composer subs={subs} selectedEmails={[...selected]} initialAudience={composer} now={now}
          onClose={() => setComposer(null)} onSent={() => { setComposer(null); setSelected(new Set()); }} />
      )}
    </div>
    </AdminShell>
  );
}
