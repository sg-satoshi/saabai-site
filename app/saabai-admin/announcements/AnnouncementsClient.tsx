"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { THEMES, LAYOUTS, DEVICES, RESHOW, GOALS, testIdFor, contrast, type Announcement } from "../../../lib/announce/core";

type Form = { id: string; name: string; layout: string; message: string; title: string; linkText: string; linkUrl: string; theme: string; status: string; startsAt: string; endsAt: string; include: string; exclude: string; device: string; reshow: string; reshowDays: number; delaySec: number; scrollPct: number };
const blank: Form = { id: "", name: "", layout: "top", message: "", title: "", linkText: "", linkUrl: "", theme: "surface", status: "draft", startsAt: "", endsAt: "", include: "", exclude: "", device: "all", reshow: "days", reshowDays: 7, delaySec: 0, scrollPct: 0 };

// Admin enters Australia/Brisbane (UTC+10, no DST); stored as UTC ISO.
const toUtc = (local: string) => (local ? new Date(local + ":00+10:00").toISOString() : "");
const toBrisbane = (iso?: string) => (iso ? new Date(Date.parse(iso) + 10 * 3600_000).toISOString().slice(0, 16) : "");
const lines = (s: string) => s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

export default function AnnouncementsClient() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [f, setF] = useState<Form>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [goal, setGoal] = useState<string>("call_click");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/announcements");
    if (r.ok) { const j = await r.json(); setItems(j.items); setEnabled(j.enabled); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function post(body: object) {
    const r = await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Saved." : j.error || "Something went wrong.");
    if (r.ok) await load();
    return r.ok;
  }
  async function save() {
    const data = { ...f, startsAt: toUtc(f.startsAt), endsAt: toUtc(f.endsAt), include: lines(f.include), exclude: lines(f.exclude) };
    if (await post({ action: "save", id: editing ?? undefined, data })) { setF(blank); setEditing(null); }
  }
  const edit = (a: Announcement) => { setEditing(a.id); setF({ id: a.id, name: a.name, layout: a.layout, message: a.message, title: a.title ?? "", linkText: a.linkText, linkUrl: a.linkUrl, theme: a.theme, status: a.status, startsAt: toBrisbane(a.startsAt), endsAt: toBrisbane(a.endsAt), include: a.include.join("\n"), exclude: a.exclude.join("\n"), device: a.device, reshow: a.reshow, reshowDays: a.reshowDays, delaySec: a.delaySec, scrollPct: a.scrollPct }); window.scrollTo({ top: 0 }); };
  const set = (k: keyof Form, v: string | number) => setF((p) => ({ ...p, [k]: v }));
  const th = THEMES[f.theme as keyof typeof THEMES] ?? THEMES.surface;
  const box = { background: "#14123a", border: "1px solid rgba(98,197,209,.22)", borderRadius: 12, padding: 20, marginBottom: 20 } as const;
  const inp = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #3b3a6b", background: "#0b092e", color: "#fff", marginTop: 4 } as const;
  const lab = { display: "block", fontSize: 13, color: "#a5b4fc", marginBottom: 12 } as const;

  return (
    <div style={{ maxWidth: 960, color: "#fff" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Announcements</h1>
      <p style={{ color: "#a5b4fc", marginTop: 0 }}>Top bar, bottom bar and slide-in card for saabai.ai. Saabai-owned sites only. Nothing shows until the site switch is on and an announcement is set to Live.</p>

      <div style={box}>
        <strong>Site switch (announcements_enabled)</strong>
        <p style={{ margin: "8px 0" }}>saabai.ai is currently <b>{enabled ? "ON" : "OFF"}</b>. Client sites cannot enable this.</p>
        <button onClick={() => { if (!enabled && !confirm("Turn announcements on for saabai.ai? Any announcement set to Live will show to visitors.")) return; void post({ action: "set_flag", enabled: !enabled }); }}>{enabled ? "Turn off" : "Turn on"}</button>
      </div>

      <div style={box}>
        <strong>{editing ? `Edit: ${editing}` : "New announcement"}</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <label style={lab}>Id (lowercase, dashes)<input style={inp} value={f.id} disabled={!!editing} onChange={(e) => set("id", e.target.value)} /></label>
          <label style={lab}>Name<input style={inp} value={f.name} onChange={(e) => set("name", e.target.value)} /></label>
          <label style={lab}>Layout<select style={inp} value={f.layout} onChange={(e) => set("layout", e.target.value)}>{LAYOUTS.map((l) => <option key={l} value={l}>{l === "top" ? "Top bar" : l === "bottom" ? "Bottom bar" : "Slide-in card"}</option>)}</select></label>
          <label style={lab}>Status<select style={inp} value={f.status} onChange={(e) => set("status", e.target.value)}><option>draft</option><option>scheduled</option><option>live</option><option>ended</option></select></label>
          {f.layout === "card" && <label style={{ ...lab, gridColumn: "1 / -1" }}>Title (max 60)<input style={inp} maxLength={60} value={f.title} onChange={(e) => set("title", e.target.value)} /></label>}
          <label style={{ ...lab, gridColumn: "1 / -1" }}>Message (max {f.layout === "card" ? 140 : 120})<input style={inp} maxLength={f.layout === "card" ? 140 : 120} value={f.message} onChange={(e) => set("message", e.target.value)} /></label>
          <label style={lab}>Link text<input style={inp} maxLength={40} value={f.linkText} onChange={(e) => set("linkText", e.target.value)} /></label>
          <label style={lab}>Link URL (/path, https, tel:, mailto:)<input style={inp} value={f.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} /></label>
          <label style={lab}>Theme (brand tokens)<select style={inp} value={f.theme} onChange={(e) => set("theme", e.target.value)}>{Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.label} ({contrast(v.fg, v.bg).toFixed(1)}:1)</option>)}</select></label>
          <label style={lab}>Device<select style={inp} value={f.device} onChange={(e) => set("device", e.target.value)}>{DEVICES.map((d) => <option key={d}>{d}</option>)}</select></label>
          <label style={lab}>Starts (Brisbane time)<input style={inp} type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></label>
          <label style={lab}>Ends (Brisbane time)<input style={inp} type="datetime-local" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></label>
          <label style={lab}>Only on these pages (one per line, * wildcard; blank = all)<textarea style={inp} rows={3} value={f.include} onChange={(e) => set("include", e.target.value)} /></label>
          <label style={lab}>Never on these pages (checkout, admin, privacy, terms, unsubscribe are always excluded)<textarea style={inp} rows={3} value={f.exclude} onChange={(e) => set("exclude", e.target.value)} /></label>
          <label style={lab}>Re-show<select style={inp} value={f.reshow} onChange={(e) => set("reshow", e.target.value)}>{RESHOW.map((d) => <option key={d} value={d}>{d === "days" ? "After N days" : d === "never" ? "Never again for this version" : "Every new session"}</option>)}</select></label>
          <label style={lab}>Days (if after N days)<input style={inp} type="number" min={1} value={f.reshowDays} onChange={(e) => set("reshowDays", Number(e.target.value))} /></label>
          {f.layout === "card" && <><label style={lab}>Show delay (seconds)<input style={inp} type="number" min={0} value={f.delaySec} onChange={(e) => set("delaySec", Number(e.target.value))} /></label>
          <label style={lab}>Or scroll depth (%)<input style={inp} type="number" min={0} max={100} value={f.scrollPct} onChange={(e) => set("scrollPct", Number(e.target.value))} /></label></>}
        </div>
        <div style={{ margin: "8px 0 16px", padding: "10px 16px", borderRadius: 8, background: th.bg, color: th.fg, border: `1px solid ${th.border}`, fontSize: 14 }}>Preview: {f.title ? <b>{f.title}. </b> : null}{f.message || "Your message"} {f.linkText && <u style={{ marginLeft: 8 }}>{f.linkText}</u>} <span style={{ opacity: .6 }}>(×)</span></div>
        <button onClick={save}>{editing ? "Save changes" : "Create"}</button>{editing && <button style={{ marginLeft: 8 }} onClick={() => { setEditing(null); setF(blank); }}>Cancel</button>}
        {msg && <p role="status" style={{ marginTop: 8 }}>{msg}</p>}
      </div>

      <h2 style={{ fontSize: 18 }}>Your announcements</h2>
      {items.length === 0 && <p style={{ color: "#a5b4fc" }}>None yet. Nothing is showing on the site.</p>}
      {items.map((a) => (
        <div key={a.id} style={box}>
          <strong>{a.name}</strong> <span style={{ color: "#8d9cc4" }}>({a.id}, {a.layout}, v{a.version}) status: {a.status}</span>
          <p style={{ margin: "8px 0" }}>{a.message}</p>
          <button onClick={() => edit(a)}>Edit</button>{" "}
          {a.status !== "live" && a.status !== "scheduled" && <button onClick={() => { if (confirm("Delete this announcement?")) void post({ action: "delete", id: a.id }); }}>Delete</button>}
          <div style={{ marginTop: 12, fontSize: 13 }}>
            {a.testId ? <>Split test: <Link href="/saabai-admin/experiments" style={{ color: "#62c5d1" }}>{a.testId}</Link> (start, pause and read results on the Experiments page; minimum 14 days)</> : (
              <>Split test: <select value={goal} onChange={(e) => setGoal(e.target.value)} style={{ background: "#0b092e", color: "#fff" }}>{GOALS.map((g) => <option key={g}>{g}</option>)}</select>{" "}
                <button onClick={() => void post({ action: "create_test", id: a.id, test: { kind: "bar_vs_none", goal } })}>Create draft test: bar vs no bar</button>
                <span style={{ color: "#8d9cc4" }}> (creates a draft only, {testIdFor(a.id)}. It does not start.)</span></>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
