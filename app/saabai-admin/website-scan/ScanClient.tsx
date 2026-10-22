"use client";
import { useEffect, useState } from "react";
import ReportView from "../../components/scan/ReportView";
import type { ScanReport } from "@/lib/site-scan/types";

type Row = { slug: string; name: string; url: string; kind?: "live" | "preview"; report?: ScanReport; error?: string };
type Point = { id: string; at: string; overall: number | null; critical: number; quick: number; mode: string };
const post = async (b: Record<string, unknown>) => { const r = await fetch("/api/admin/site-scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }); return { ok: r.ok, j: await r.json().catch(() => ({})) }; };
const fmt = (iso: string) => new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const inp: React.CSSProperties = { height: 40, padding: "0 12px", borderRadius: 8, border: "1px solid #6a6ec9", background: "#0b092e", color: "#fff", fontSize: 15, width: "100%" };
const btn: React.CSSProperties = { height: 40, padding: "0 18px", borderRadius: 8, border: 0, background: "#ffd23f", color: "#0b092e", fontWeight: 700, cursor: "pointer" };

export default function ScanClient() {
  const [url, setUrl] = useState(""); const [name, setName] = useState(""); const [industry, setIndustry] = useState(""); const [suburb, setSuburb] = useState("");
  const [rating, setRating] = useState(""); const [reviews, setReviews] = useState(""); const [days, setDays] = useState("");
  const [report, setReport] = useState<ScanReport | null>(null); const [busy, setBusy] = useState(""); const [err, setErr] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null); const [domains, setDomains] = useState<string[]>([]); const [pub, setPub] = useState(false);
  const [hist, setHist] = useState<Point[]>([]); const [histDomain, setHistDomain] = useState("");

  const loadMeta = async () => { const { j } = await post({ action: "domains" }); setDomains(j.domains ?? []); setPub(j.publicEnabled === true); };
  useEffect(() => { let on = true; post({ action: "domains" }).then(({ j }) => { if (on) { setDomains(j.domains ?? []); setPub(j.publicEnabled === true); } }); return () => { on = false; }; }, []);
  const loadHist = async (d: string) => { setHistDomain(d); const { j } = await post({ action: "history", domain: d }); setHist(j.points ?? []); };

  const scan = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy("scan"); setReport(null);
    const { ok, j } = await post({ action: "scan", url, name, industry, suburb, gbp: { rating, reviews, newestDaysAgo: days } });
    setBusy(""); if (!ok) { setErr(j.error ?? "Scan failed"); return; }
    setReport(j.report); void loadMeta(); void loadHist(j.report.domain);
  };
  const factory = async () => { setBusy("factory"); setErr(""); const { ok, j } = await post({ action: "factory" }); setBusy(""); if (!ok) { setErr(j.error ?? "Failed"); return; } setRows(j.rows); void loadMeta(); };
  const open = async (id: string) => { const { j } = await post({ action: "report", id }); if (j.report) { setReport(j.report); window.scrollTo({ top: 0, behavior: "smooth" }); } };
  const [clean, setClean] = useState("");
  const cleanup = async (apply: boolean) => {
    if (apply && !confirm("Merge duplicate history keys and drop invalid ones? Run the dry run first.")) return;
    const { ok, j } = await post({ action: "cleanup", apply });
    if (!ok) { setErr(j.error ?? "Cleanup failed"); return; }
    setClean(`${apply ? "Done" : "Dry run"}: ${j.total} saved sites, ${j.keep} fine, ${j.merge.length} duplicates to merge${j.merge.length ? ` (${j.merge.map((m: { from: string; to: string }) => `${m.from} to ${m.to}`).join(", ")})` : ""}, ${j.drop.length} invalid to drop${j.drop.length ? ` (${j.drop.map((d: { domain: string }) => d.domain).join(", ")})` : ""}.`);
    if (apply) void loadMeta();
  };
  const flag = async () => { if (!confirm(pub ? "Turn the public scan step OFF on /score?" : "Turn the public scan step ON for all /score visitors?")) return; await post({ action: "flag", on: !pub }); void loadMeta(); };

  return (
    <div style={{ margin: 20, padding: 24, maxWidth: 1100, color: "#fff", background: "#0b092e", borderRadius: 16 }}>
      <h1 style={{ fontSize: 26, margin: 0 }}>Website scanner</h1>
      <p style={{ color: "#a5b4fc", marginTop: 6 }}>Internal tool. Public data only, read-only: nothing is changed on any scanned site.</p>
      <form onSubmit={scan} style={{ display: "grid", gap: 10, background: "#14123a", border: "1px solid #62c5d138", borderRadius: 14, padding: 18, marginTop: 14 }}>
        <input aria-label="Website address" style={inp} placeholder="Website address, e.g. saabai.ai" value={url} onChange={(e) => setUrl(e.target.value)} required />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
          <input aria-label="Business name" style={inp} placeholder="Business name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <input aria-label="Industry" style={inp} placeholder="Industry (optional)" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          <input aria-label="Suburb" style={inp} placeholder="Suburb (optional)" value={suburb} onChange={(e) => setSuburb(e.target.value)} />
        </div>
        <div style={{ color: "#8d9cc4", fontSize: 13 }}>Google Business Profile, typed by hand from public Maps (optional):</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
          <input aria-label="GBP rating" style={inp} placeholder="Rating, e.g. 4.8" value={rating} onChange={(e) => setRating(e.target.value)} />
          <input aria-label="GBP review count" style={inp} placeholder="Review count" value={reviews} onChange={(e) => setReviews(e.target.value)} />
          <input aria-label="Days since newest review" style={inp} placeholder="Newest review, days ago" value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button style={btn} disabled={!!busy} type="submit">{busy === "scan" ? "Scanning..." : "Run scan"}</button>
          <button style={{ ...btn, background: "#62c5d1" }} disabled={!!busy} type="button" onClick={factory}>{busy === "factory" ? "Scanning all sites (about a minute)..." : "Scan all factory and client sites"}</button>
          <span role="alert" style={{ color: "#fca5a5" }}>{err}</span>
        </div>
      </form>

      {rows && (
        <div style={{ marginTop: 20, overflowX: "auto" }}>
          <h2 style={{ fontSize: 20 }}>Factory and client sites (lowest score first)</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr style={{ textAlign: "left", color: "#8d9cc4", background: "#14123a" }}><th style={{ background: "#14123a" }}>Site</th><th style={{ background: "#14123a" }}>Overall</th><th style={{ background: "#14123a" }}>SEO</th><th style={{ background: "#14123a" }}>AI</th><th style={{ background: "#14123a" }}>Local</th><th style={{ background: "#14123a" }}>Critical</th><th style={{ background: "#14123a" }}>Quick wins</th><th style={{ background: "#14123a" }} /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.url} style={{ borderTop: "1px solid #ffffff18" }}>
                <td style={{ padding: "8px 6px" }}>{r.name} {r.kind && <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 6, background: r.kind === "live" ? "#14532d" : "#3f3f46", color: "#fff" }}>{r.kind === "live" ? "Live" : "Preview"}</span>}<div style={{ color: "#8d9cc4", fontSize: 12 }}>{r.url}</div></td>
                {r.report ? <><td><b>{r.report.overall ?? "n/a"}</b></td><td>{r.report.areas.seo ?? "-"}</td><td>{r.report.areas.ai ?? "-"}</td><td>{r.report.areas.local ?? "-"}</td><td>{r.report.fixes.filter((f) => f.rating === "critical").length}</td><td>{r.report.quickWins.length}</td><td><button style={{ ...btn, height: 32, padding: "0 12px" }} onClick={() => setReport(r.report!)}>View</button></td></> : <td colSpan={7} style={{ color: "#fca5a5" }}>{r.error ?? "failed"}</td>}
              </tr>))}</tbody>
          </table>
        </div>
      )}

      {report && <div style={{ marginTop: 24, background: "#0b092e", border: "1px solid #62c5d138", borderRadius: 16, padding: 24 }}><ReportView report={report} showLogo /></div>}

      <h2 style={{ fontSize: 20, marginTop: 28 }}>Score history</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "6px 0 10px" }}>
        <button style={{ ...btn, height: 32, padding: "0 12px", background: "#2a2870", color: "#fff" }} onClick={() => cleanup(false)}>Check for duplicates (dry run)</button>
        <button style={{ ...btn, height: 32, padding: "0 12px", background: "#7f1d1d", color: "#fff" }} onClick={() => cleanup(true)}>Fix duplicates</button>
        {clean && <span style={{ color: "#a5b4fc", fontSize: 13 }}>{clean}</span>}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {domains.length === 0 && <span style={{ color: "#8d9cc4" }}>No scans saved yet.</span>}
        {domains.map((d) => <button key={d} onClick={() => loadHist(d)} style={{ ...btn, height: 32, padding: "0 12px", background: d === histDomain ? "#ffd23f" : "#2a2870", color: d === histDomain ? "#0b092e" : "#fff" }}>{d}</button>)}
      </div>
      {hist.length > 0 && (
        <table style={{ marginTop: 12, borderCollapse: "collapse", fontSize: 14 }}>
          <thead><tr style={{ textAlign: "left", color: "#8d9cc4", background: "#14123a" }}><th style={{ paddingRight: 24, background: "#14123a" }}>Scanned (Brisbane)</th><th style={{ paddingRight: 24, background: "#14123a" }}>Score</th><th style={{ paddingRight: 24, background: "#14123a" }}>Critical</th><th style={{ paddingRight: 24, background: "#14123a" }}>Quick wins</th><th style={{ background: "#14123a" }} /></tr></thead>
          <tbody>{hist.map((p) => <tr key={p.id} style={{ borderTop: "1px solid #ffffff18" }}><td>{fmt(p.at)}</td><td><b>{p.overall ?? "n/a"}</b></td><td>{p.critical}</td><td>{p.quick}</td><td><button style={{ ...btn, height: 28, padding: "0 10px" }} onClick={() => open(p.id)}>Open</button></td></tr>)}</tbody>
        </table>
      )}

      <div style={{ marginTop: 32, padding: 16, border: "1px solid #ffffff22", borderRadius: 12 }}>
        <b>Public scan step on /score:</b> {pub ? "ON for all visitors" : "OFF (admins only see it)"}{" "}
        <button style={{ ...btn, height: 32, padding: "0 12px", marginLeft: 8 }} onClick={flag}>{pub ? "Turn off" : "Turn on"}</button>
        <div style={{ color: "#8d9cc4", fontSize: 13, marginTop: 6 }}>Default is off. Env SITE_SCAN_KILL=1 forces it off. Signed-in admins always see the scan step on /score for testing.</div>
      </div>
    </div>
  );
}
