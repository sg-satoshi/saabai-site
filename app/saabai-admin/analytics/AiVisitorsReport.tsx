"use client";

import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, RadialBar, RadialBarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "../ui/Button";
import { DATA_NOTE, type SiteReport, type VisitorsView } from "@/lib/ai-visitors/types";
import "./ai-visitors.css";

const COMPANY_COLOR: Record<string, string> = {
  Anthropic: "#d4861a",
  OpenAI: "#1f4dc5",
  Amazon: "#2a9d6f",
  Meta: "#7b61c9",
  Apple: "#5f6580",
  Perplexity: "#3fa7d6",
  DuckDuckGo: "#9c6b30",
  Other: "#b9bed0",
};
const CRAWLER = "#1595a6";
const ASSISTANT = "#33307a";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Payload = VisitorsView & { lastRunAt: string | null; lastError?: string };
type SortKey = "crawlers" | "assistants" | "referrals" | "label";

function formatDay(iso: string): string {
  const parts = iso.split("-").map(Number);
  return `${parts[2]} ${MONTHS[(parts[1] ?? 1) - 1]}`;
}

function n(value: number): string {
  return value.toLocaleString("en-AU");
}

function formatUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function Delta({ pct, neutral }: { pct: number | null; neutral?: boolean }) {
  if (neutral) return <span className="aiv-pill flat">None yet</span>;
  if (pct === null) return <span className="aiv-pill flat">New</span>;
  if (pct === 0) return <span className="aiv-pill flat">No change</span>;
  const up = pct > 0;
  return <span className={`aiv-pill ${up ? "up" : "down"}`}>{up ? "+" : ""}{pct}%</span>;
}

function Tip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="aiv-tip">
      {label ? <b>{formatDay(String(label))}</b> : null}
      {payload.map((item) => (
        <div key={item.name}>{item.name}: {n(Number(item.value || 0))}</div>
      ))}
    </div>
  );
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const rows = values.map((value, index) => ({ index, value }));
  return (
    <div style={{ height: 32 }} aria-hidden>
      <ResponsiveContainer width="100%" height={32}>
        <AreaChart data={rows}>
          <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.16} strokeWidth={1.6} isAnimationActive={false} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Section({ no, title, sub, children }: { no: number; title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="card">
      <div className="hd">
        <div className="aiv-hd-title">
          <span className="aiv-sec-no">{no}</span>
          <div>
            <h2>{title}</h2>
            {sub ? <div className="sub">{sub}</div> : null}
          </div>
        </div>
      </div>
      <div className="bd">{children}</div>
    </div>
  );
}

function Kpi({ label, value, delta, sub, series, color, dashed, neutral }: {
  label: string; value: number; delta: number | null; sub: string; series: number[]; color: string; dashed?: boolean; neutral?: boolean;
}) {
  return (
    <div className="card kpi">
      <div className="aiv-kpi-top">
        <div className="l">{label}</div>
        <Delta pct={delta} neutral={neutral} />
      </div>
      <div className="v">{n(value)}</div>
      <div className="d muted">{sub}</div>
      {dashed ? <div className="aiv-zero-line"><span /></div> : <Spark values={series} color={color} />}
    </div>
  );
}

export default function AiVisitorsReport() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [siteKey, setSiteKey] = useState("saabai");
  const [clientView, setClientView] = useState(false);
  const [busy, setBusy] = useState<"refresh" | "backfill" | null>(null);
  const [progress, setProgress] = useState("");
  const [sort, setSort] = useState<SortKey>("crawlers");
  const [open, setOpen] = useState<string | null>(null);
  const started = useRef(false);
  const daysRef = useRef(days);
  useEffect(() => {
    daysRef.current = days;
  }, [days]);

  const reload = useCallback(async (nextDays = daysRef.current) => {
    const response = await fetch(`/api/admin/ai-visitors?days=${nextDays}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Couldn't load AI visitor data");
    setPayload(body);
    setError("");
    setLoading(false);
    return body as Payload;
  }, []);

  const run = useCallback(async (action: "refresh" | "backfill") => {
    setBusy(action);
    setError("");
    let from: string | undefined;
    try {
      for (let step = 0; step < 40; step++) {
        const response = await fetch("/api/admin/ai-visitors", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, from }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Couldn't refresh AI visitor data");
        const through = Array.isArray(body.stored) && body.stored.length ? body.stored[body.stored.length - 1] : "";
        setProgress(through ? `Saved through ${formatDay(through)}` : "Saving…");
        if (action === "refresh" || body.done || !body.next) break;
        from = body.next;
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load AI visitor data. Try Refresh now.");
    } finally {
      setBusy(null);
      setProgress("");
    }
  }, [reload]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/ai-visitors?days=${days}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as Payload & { error?: string };
        if (!response.ok) throw new Error(body.error || "Couldn't load AI visitor data");
        setPayload(body);
        setError("");
        setLoading(false);
        if (!started.current && body.partialDays === 0 && !body.lastRunAt) {
          started.current = true;
          void run("backfill");
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Couldn't load AI visitor data. Try Refresh now.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [days, run]);

  const report = useMemo(() => {
    const reports = payload?.reports ?? [];
    return reports.find((item) => item.key === siteKey) ?? reports.find((item) => item.key === "saabai") ?? reports[0] ?? null;
  }, [payload, siteKey]);

  const rows = useMemo(() => {
    const list = (payload?.reports ?? []).filter((item) => item.key !== "all");
    const dir = sort === "label" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sort === "label") return a.label.localeCompare(b.label);
      if (sort === "referrals") return (a.referrals.ai - b.referrals.ai) * dir;
      return (a[sort] - b[sort]) * dir;
    });
  }, [payload, sort]);

  function choose(key: string) {
    setSiteKey(key);
    setClientView(false);
    document.getElementById("ai-visitors")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="aiv" id="ai-visitors" aria-label="AI visitors">
      <div className="aiv-head">
        <div>
          <div className="aiv-kicker">AI visitors</div>
          <h2>What AI is reading</h2>
          <div className="sub">AI requests, not visitors. Sales above stays as it is.</div>
        </div>
        <div className="aiv-controls">
          <div className="aiv-seg" role="group" aria-label="Date range">
            {([7, 30, 90] as const).map((option) => (
              <button key={option} type="button" className={days === option ? "on" : ""} onClick={() => setDays(option)}>{option}d</button>
            ))}
          </div>
          {!clientView ? (
            <select className="aiv-select" aria-label="Site" value={report?.key ?? "saabai"} onChange={(event) => setSiteKey(event.target.value)}>
              <option value="all">All sites</option>
              {rows.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          ) : null}
          <button type="button" className={`aiv-toggle ${clientView ? "on" : ""}`} aria-pressed={clientView} onClick={() => {
            setClientView((value) => !value);
            if (siteKey === "all") setSiteKey("saabai");
          }}>Client view</button>
          {payload?.lastRunAt ? <span className="aiv-updated">Last updated {formatUpdated(payload.lastRunAt)}</span> : null}
          {!clientView ? (
            <Button variant="pri" className={busy ? "loading" : ""} disabled={!!busy} onClick={() => void run("refresh")}>
              {busy === "refresh" ? "Refreshing…" : "Refresh now"}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <div className="aiv-error" role="alert">Couldn&apos;t load AI visitor data. {error}</div> : null}
      {!error && payload?.lastError ? <div className="aiv-error" role="alert">Last snapshot failed. {payload.lastError}</div> : null}
      {progress ? <div className="aiv-banner">{progress}. History is saved a couple of days at a time.</div> : null}
      {payload?.partial && payload.partialDays > 0 ? (
        <div className="aiv-banner">Showing {payload.partialDays} days, the data available so far.</div>
      ) : null}

      {loading && !payload ? <Skeleton /> : null}

      {report ? (
        <div className={busy ? "aiv-busy" : ""}>
          <ReportView report={report} clientView={clientView} compareNote={payload?.compareNote ?? ""} />
        </div>
      ) : null}

      {!clientView && payload ? (
        <Portfolio rows={rows} sort={sort} setSort={setSort} open={open} setOpen={setOpen} onOpen={choose} active={report?.key ?? ""} onBackfill={() => void run("backfill")} busy={busy === "backfill"} />
      ) : null}

      <p className="aiv-note">{DATA_NOTE}</p>
    </section>
  );
}

function ReportView({ report, clientView, compareNote }: { report: SiteReport; clientView: boolean; compareNote: string }) {
  const gid = useId().replace(/:/g, "");
  const peak = [
    report.peakCrawler ? `Busiest crawler day ${formatDay(report.peakCrawler.date)} (${n(report.peakCrawler.count)} requests)` : "",
    report.peakAssistant ? `busiest assistant day ${formatDay(report.peakAssistant.date)} (${n(report.peakAssistant.count)})` : "",
  ].filter(Boolean).join(". ");
  const referralRows = [
    { name: "AI", value: report.referrals.ai, fill: CRAWLER },
    { name: "Google", value: report.referrals.google, fill: ASSISTANT },
    { name: "Bing", value: report.referrals.bing, fill: "#9aa0b4" },
  ];
  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="aiv-hero">
          <div className="aiv-kicker">Report · {report.periodLabel} · Brisbane time</div>
          <h3>{report.headline}</h3>
          <p>{report.summary}</p>
          {report.empty ? <p className="aiv-empty">No AI bots have visited this site in this period. Most sites see their first AI crawlers within a few weeks of launch.</p> : null}
        </div>
        <div className="bd" style={{ paddingTop: 0 }}>
          <div className="kpis">
            <Kpi label="AI crawler requests" value={report.crawlers} delta={report.crawlerDelta} sub="Training and indexing bots" series={report.daily.map((day) => day.crawlers)} color={CRAWLER} />
            <Kpi label="AI assistant requests" value={report.assistants} delta={report.assistantDelta} sub="Search and live fetches" series={report.daily.map((day) => day.assistants)} color={ASSISTANT} />
            <Kpi label="AI referral requests" value={report.referrals.ai} delta={null} neutral={report.referrals.ai === 0} sub={`Google ${n(report.referrals.google)} · Bing ${n(report.referrals.bing)}`} series={report.daily.map((day) => day.aiReferrals)} color={CRAWLER} dashed={report.referrals.ai === 0} />
            <Kpi label="Google and Bing crawlers" value={report.googleCrawlers + report.bingCrawlers} delta={report.searchDelta} sub={`Google ${n(report.googleCrawlers)} · Bing ${n(report.bingCrawlers)}`} series={report.daily.map((day) => day.searchCrawlers)} color={ASSISTANT} />
          </div>
          <p className="aiv-foot">{compareNote}</p>
        </div>
      </div>

      <div className="aiv-grid">
        <Section no={1} title="Who's reading" sub="Share of AI requests">
          {report.companies.length === 0 ? <p className="aiv-empty">No AI bots in this period.</p> : (
            <div style={{ height: Math.max(report.companies.length, 1) * 32 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={report.companies} margin={{ left: 4, right: 12, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="company" width={92} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#13152a" }} />
                  <Tooltip cursor={{ fill: "rgba(21,149,166,.08)" }} formatter={(value) => [n(Number(value)), "AI requests"]} />
                  <Bar dataKey="total" barSize={12} radius={4}>
                    {report.companies.map((company) => <Cell key={company.company} fill={COMPANY_COLOR[company.company] || "#b9bed0"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {!clientView && report.bots.length > 0 ? (
            <div className="aiv-bots">
              {report.bots.slice(0, 8).map((bot) => (
                <div className="aiv-bot" key={bot.name || "unnamed"}>
                  <i className="aiv-dot" style={{ background: COMPANY_COLOR[bot.company] || "#b9bed0" }} />
                  <span>{bot.label} <span className="muted">{bot.company}</span></span>
                  <b className="num">{n(bot.count)}</b>
                </div>
              ))}
            </div>
          ) : null}
        </Section>
        <Section no={2} title="How it's trending" sub={peak || "Daily AI requests"}>
          {report.empty ? <p className="aiv-empty">No AI bots have visited this site in this period. The line stays flat until the first crawler arrives.</p> : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.daily} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`${gid}-c`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CRAWLER} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={CRAWLER} stopOpacity={0.12} />
                    </linearGradient>
                    <linearGradient id={`${gid}-a`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ASSISTANT} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={ASSISTANT} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#eceef4" />
                  <XAxis dataKey="date" tickFormatter={formatDay} minTickGap={24} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#5f6580" }} />
                  <YAxis allowDecimals={false} width={36} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#5f6580" }} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" name="AI crawlers" dataKey="crawlers" stackId="1" stroke={CRAWLER} fill={`url(#${gid}-c)`} strokeWidth={2} />
                  <Area type="monotone" name="AI assistants" dataKey="assistants" stackId="1" stroke={ASSISTANT} fill={`url(#${gid}-a)`} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
      </div>

      <div className="aiv-grid">
        <Section no={3} title="What they read" sub="Top pages, scripts left out">
          {report.paths.length === 0 ? <p className="aiv-empty">No page reads in this period.</p> : (
            <div style={{ height: Math.max(report.paths.length, 1) * 32 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={report.paths} margin={{ left: 8, right: 12 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="path" width={128} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#13152a", fontFamily: "ui-monospace, monospace" }} tickFormatter={(value) => String(value).length > 18 ? `${String(value).slice(0, 17)}…` : String(value)} />
                  <Tooltip formatter={(value) => [n(Number(value)), "AI requests"]} />
                  <Bar dataKey="count" fill={CRAWLER} barSize={12} radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
        <Section no={4} title="Clicks back to the site" sub="Requests that arrived with a referrer">
          {(
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={referralRows} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="#eceef4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#13152a" }} />
                  <YAxis allowDecimals={false} width={32} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#5f6580" }} />
                  <Tooltip formatter={(value) => [n(Number(value)), "Requests"]} />
                  <Bar dataKey="value" radius={6} minPointSize={3} barSize={36}>
                    {referralRows.map((row) => <Cell key={row.name} fill={row.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {report.referrals.ai === 0 ? <div className="aiv-callout">AI is reading, not yet sending clicks.</div> : null}
        </Section>
      </div>

      <div className="aiv-grid">
        <Section no={5} title="Asked about you" sub="Pages opened because someone asked">
          {report.live.length === 0 ? <p className="aiv-empty">No live assistant fetches in this period. ChatGPT-User, Claude-User, Perplexity-User and GPT-Actions show up here.</p> : (
            <div>
              {report.live.map((row) => (
                <div className="aiv-stat" key={`${row.bot}-${row.path}`}>
                  <span>{row.label}<div className="aiv-path muted">{row.path}</div></span>
                  <b className="num">{n(row.count)}</b>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section no={6} title="Errors served to AI" sub={report.errors.total ? `${report.errors.okPct}% came back as a normal page` : "No AI responses in this period"}>
          {report.errors.total === 0 ? <p className="aiv-empty">Nothing to score until an AI bot requests a page.</p> : (
            <div className="aiv-split">
              <div className="aiv-ring">
                {(
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="68%" outerRadius="100%" data={[{ name: "Served OK", value: report.errors.okPct, fill: CRAWLER }]} startAngle={90} endAngle={-270}>
                      <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "#eceef4" }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                )}
                <div className="aiv-ring-label"><div><b className="num">{report.errors.okPct}%</b><span>served OK</span></div></div>
              </div>
              <div>
                <div className="aiv-stat"><span>Not found and other 4xx</span><b className="num">{n(report.errors.s4xx)}</b></div>
                <div className="aiv-stat"><span>Server errors</span><b className="num">{n(report.errors.s5xx)}</b></div>
                <div className="aiv-stat"><span>Redirects</span><b className="num">{n(report.errors.redirected)}</b></div>
                {report.errors.failing.map((row) => (
                  <div className="aiv-fail" key={`${row.status}-${row.path}`}>
                    <span className="aiv-path">{row.path}</span>
                    <span className="num">{row.status} · {n(row.count)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>

      <Section no={7} title="What's next" sub={clientView ? "For this site" : "From this period's numbers"}>
        <div className="aiv-next">
          {report.next.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </Section>
      <div style={{ height: 16 }} />
    </>
  );
}

function Portfolio({ rows, sort, setSort, open, setOpen, onOpen, active, onBackfill, busy }: {
  rows: SiteReport[];
  sort: SortKey;
  setSort: (key: SortKey) => void;
  open: string | null;
  setOpen: (key: string | null) => void;
  onOpen: (key: string) => void;
  active: string;
  onBackfill: () => void;
  busy: boolean;
}) {
  const header = (key: SortKey, label: string) => (
    <th scope="col" onClick={() => setSort(key)}>{label}{sort === key ? " ·" : ""}</th>
  );
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="hd">
        <div>
          <h2>Across all sites</h2>
          <div className="sub">Admin only. Open a row for that site&apos;s report.</div>
        </div>
        <Button variant="sec" size="sm" disabled={busy} className={busy ? "loading" : ""} onClick={onBackfill}>
          {busy ? "Loading…" : "Load 35 days"}
        </Button>
      </div>
      <div className="bd aiv-table-wrap">
        <div className="tbl-scroll">
          <table className="aiv-table">
            <thead>
              <tr>
                {header("label", "Site")}
                <th>Trend</th>
                {header("crawlers", "AI crawlers")}
                {header("assistants", "AI assistants")}
                <th>By company</th>
                {header("referrals", "AI referrals")}
                <th>Google / Bing</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const mix = row.companies.reduce((sum, company) => sum + company.total, 0) || 1;
                return (
                  <Fragment key={row.key}>
                    <tr className={active === row.key ? "hot" : ""}>
                      <td>
                        <button type="button" className="aiv-name" onClick={() => setOpen(open === row.key ? null : row.key)}>{row.label}</button>
                      </td>
                      <td style={{ width: 120 }}><Spark values={row.daily.map((day) => day.crawlers + day.assistants)} color={CRAWLER} /></td>
                      <td className="num">{n(row.crawlers)} <Delta pct={row.crawlerDelta} /></td>
                      <td className="num">{n(row.assistants)} <Delta pct={row.assistantDelta} /></td>
                      <td>
                        <div className="aiv-mix" title={row.companies.map((company) => `${company.company} ${company.total}`).join(", ")}>
                          {row.companies.map((company) => <i key={company.company} style={{ width: `${(company.total / mix) * 100}%`, background: COMPANY_COLOR[company.company] || "#b9bed0" }} />)}
                        </div>
                      </td>
                      <td className="num">{n(row.referrals.ai)}</td>
                      <td className="num">{n(row.referrals.google)} / {n(row.referrals.bing)}</td>
                    </tr>
                    {open === row.key ? (
                      <tr key={`${row.key}-open`} className="aiv-expand">
                        <td colSpan={7}>
                          <div style={{ margin: "4px 8px 10px" }}>
                            <button type="button" className="btn sm" onClick={() => onOpen(row.key)}>Open report</button>
                          </div>
                          <div className="aiv-expand-grid">
                            <div>
                              <div className="muted" style={{ marginBottom: 6 }}>Top pages</div>
                              {row.paths.length === 0 ? <div className="aiv-empty">No page reads yet.</div> : row.paths.slice(0, 5).map((path) => (
                                <div className="aiv-stat" key={path.path}><span className="aiv-path">{path.path}</span><b className="num">{n(path.count)}</b></div>
                              ))}
                            </div>
                            <div>
                              <div className="muted" style={{ marginBottom: 6 }}>AI requests that failed</div>
                              {row.errors.failing.length === 0 ? <div className="aiv-empty">No 4xx or 5xx responses.</div> : row.errors.failing.slice(0, 4).map((fail) => (
                                <div className="aiv-fail" key={`${fail.status}${fail.path}`}><span className="aiv-path">{fail.path}</span><span>{fail.status}</span></div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bd aiv-cards">
        {rows.map((row) => {
          const mix = row.companies.reduce((sum, company) => sum + company.total, 0) || 1;
          return (
            <article key={row.key} className="aiv-card-site">
              <button type="button" className="aiv-name" onClick={() => onOpen(row.key)}>{row.label}</button>
              <div className="aiv-card-nums">
                <div><span>Crawlers</span><b className="num">{n(row.crawlers)}</b></div>
                <div><span>Assistants</span><b className="num">{n(row.assistants)}</b></div>
                <div><span>AI referrals</span><b className="num">{n(row.referrals.ai)}</b></div>
              </div>
              <Spark values={row.daily.map((day) => day.crawlers + day.assistants)} color={CRAWLER} />
              <div className="aiv-mix" style={{ marginTop: 8, width: "100%" }}>
                {row.companies.map((company) => <i key={company.company} style={{ width: `${(company.total / mix) * 100}%`, background: COMPANY_COLOR[company.company] || "#b9bed0" }} />)}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="bd">
        <div className="aiv-skel" style={{ height: 28, width: "70%", marginBottom: 16 }} />
        <div className="kpis">
          {[0, 1, 2, 3].map((item) => <div key={item} className="card kpi"><div className="aiv-skel" style={{ height: 14, width: "50%" }} /><div className="aiv-skel" style={{ height: 28, width: "40%", marginTop: 10 }} /></div>)}
        </div>
        <div className="aiv-skel" style={{ height: 220 }} />
      </div>
    </div>
  );
}
