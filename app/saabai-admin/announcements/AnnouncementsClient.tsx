"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AnnouncementTimer, { TIMER_CSS } from "../../components/AnnouncementTimer";
import { shadowCss, SHADOWS, THEMES, LAYOUTS, DEVICES, RESHOW, GOALS, testIdFor, contrast, resolveTheme, TIMER_STYLES, DEFAULT_END_SHOW_HOURS, LIMITS, checkColors, normHex, bestText, DEFAULT_CUSTOM, MIN_BLOCK, MIN_WARN, type Announcement } from "../../../lib/announce/core";

type Form = { id: string; name: string; layout: string; message: string; title: string; linkText: string; linkUrl: string; theme: string; status: string; startsAt: string; endsAt: string; include: string; exclude: string; device: string; reshow: string; reshowDays: number; delaySec: number; scrollPct: number; cBg: string; cFg: string; cCta: string; cClose: string; shadow: string; shadowColor: string; tOn: boolean; tEnd: string; tStyle: string; tMode: string; tMsg: string; tLinkText: string; tLinkUrl: string; tAuto: boolean; tHours: number };
const blank: Form = { id: "", name: "", layout: "top", message: "", title: "", linkText: "", linkUrl: "", theme: "surface", status: "draft", startsAt: "", endsAt: "", include: "", exclude: "", device: "all", reshow: "days", reshowDays: 7, delaySec: 0, scrollPct: 0, cBg: DEFAULT_CUSTOM.bg, cFg: DEFAULT_CUSTOM.fg, cCta: DEFAULT_CUSTOM.cta, cClose: DEFAULT_CUSTOM.close, shadow: "none", shadowColor: "", tOn: false, tEnd: "", tStyle: "boxed", tMode: "hide", tMsg: "", tLinkText: "", tLinkUrl: "", tAuto: false, tHours: DEFAULT_END_SHOW_HOURS };

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
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const [endPrev, setEndPrev] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNowMs(Date.now()), 30_000); return () => clearInterval(id); }, []);

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
    if (f.shadowColor && !normHex(f.shadowColor)) { setMsg("Shadow colour must be a hex value like #000000."); return; }
    if (blocked) { setMsg("Fix the colours first: some contrast is below 3:1 so it can't be read."); return; }
    if (f.tOn) {
      if (!f.tEnd) { setMsg("Pick the timer end date and time (Brisbane)."); return; }
      if (f.status === "live" && Date.parse(toUtc(f.tEnd)) <= Date.now()) { setMsg("The timer end is in the past. Pick a future date and time before setting it Live."); return; }
    }
    const timer = f.tOn ? { style: f.tStyle, endAt: toUtc(f.tEnd), endMode: f.tMode, ...(f.tMode === "message" ? { endMessage: f.tMsg, endLinkText: f.tLinkText, endLinkUrl: f.tLinkUrl, autoEnd: f.tAuto, endShowHours: f.tHours } : {}) } : null;
    const data = { ...f, timer, ...(f.theme === "custom" ? { colors: { bg: f.cBg, fg: f.cFg, cta: f.cCta, close: f.cClose } } : {}), startsAt: toUtc(f.startsAt), endsAt: toUtc(f.endsAt), include: lines(f.include), exclude: lines(f.exclude) };
    if (await post({ action: "save", id: editing ?? undefined, data })) { setF(blank); setEditing(null); }
  }
  const edit = (a: Announcement) => { setEditing(a.id); setF({ id: a.id, name: a.name, layout: a.layout, message: a.message, title: a.title ?? "", linkText: a.linkText, linkUrl: a.linkUrl, theme: a.theme, status: a.status, startsAt: toBrisbane(a.startsAt), endsAt: toBrisbane(a.endsAt), include: a.include.join("\n"), exclude: a.exclude.join("\n"), device: a.device, reshow: a.reshow, reshowDays: a.reshowDays, delaySec: a.delaySec, scrollPct: a.scrollPct, cBg: a.colors?.bg ?? DEFAULT_CUSTOM.bg, cFg: a.colors?.fg ?? DEFAULT_CUSTOM.fg, cCta: a.colors?.cta ?? DEFAULT_CUSTOM.cta, cClose: a.colors?.close ?? DEFAULT_CUSTOM.close, shadow: a.shadow ?? "none", shadowColor: a.shadowColor ?? "", tOn: !!a.timer, tEnd: toBrisbane(a.timer?.endAt), tStyle: a.timer?.style ?? "boxed", tMode: a.timer?.endMode ?? "hide", tMsg: a.timer?.endMessage ?? "", tLinkText: a.timer?.endLinkText ?? "", tLinkUrl: a.timer?.endLinkUrl ?? "", tAuto: !!a.timer?.autoEnd, tHours: a.timer?.endShowHours ?? DEFAULT_END_SHOW_HOURS }); setEndPrev(false); window.scrollTo({ top: 0 }); };
  const set = (k: keyof Form, v: string | number | boolean) => setF((p) => ({ ...p, [k]: v }));
  const custom = f.theme === "custom";
  const hexOk = [f.cBg, f.cFg, f.cCta, f.cClose].every((h) => normHex(h));
  const th = resolveTheme(f.theme, custom && hexOk ? { bg: f.cBg, fg: f.cFg, cta: f.cCta, close: f.cClose } : undefined);
  const checks = custom && !hexOk ? [] : checkColors(th);
  const blocked = (custom && !hexOk) || checks.some((c) => c.level === "block");
  const fixText = (k: "cFg" | "cClose", bgv: string) => { const h = normHex(bgv); if (h) set(k, bestText(h)); };
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
          <label style={lab}>Theme<select style={inp} value={f.theme} onChange={(e) => set("theme", e.target.value)}>
            <optgroup label="Brand (blends with the site)">{Object.entries(THEMES).filter(([, v]) => v.group === "brand").map(([k, v]) => <option key={k} value={k}>{v.label} ({contrast(v.fg, v.bg).toFixed(1)}:1)</option>)}</optgroup>
            <optgroup label="Alert (stands out from the site)">{Object.entries(THEMES).filter(([, v]) => v.group === "alert").map(([k, v]) => <option key={k} value={k}>{v.label} ({contrast(v.fg, v.bg).toFixed(1)}:1)</option>)}</optgroup>
            <optgroup label="Your own"><option value="custom">Custom colours</option></optgroup>
          </select></label>
          <label style={lab}>Drop shadow<select data-testid="shadow-select" style={inp} value={f.shadow} onChange={(e) => set("shadow", e.target.value)}>{SHADOWS.map((x) => <option key={x} value={x}>{x === "none" ? "None" : x === "soft" ? "Soft" : "Strong"}</option>)}</select></label>
          {f.shadow !== "none" && <label style={lab}>Shadow colour (optional, hex, blank = black)<input data-testid="hex-shadow" style={{ ...inp, borderColor: !f.shadowColor || normHex(f.shadowColor) ? "#3b3a6b" : "#f87171" }} maxLength={7} value={f.shadowColor} placeholder="#000000" onChange={(e) => set("shadowColor", e.target.value)} /></label>}
          <label style={lab}>Device<select style={inp} value={f.device} onChange={(e) => set("device", e.target.value)}>{DEVICES.map((d) => <option key={d}>{d}</option>)}</select></label>
          <label style={lab}>Starts (Brisbane time)<input style={inp} type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></label>
          <label style={lab}>Ends (Brisbane time)<input style={inp} type="datetime-local" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></label>
          <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #3b3a6b", paddingTop: 12 }}>
            <label style={{ ...lab, marginBottom: 4 }}><input data-testid="timer-on" type="checkbox" checked={f.tOn} onChange={(e) => set("tOn", e.target.checked)} /> Countdown timer (fixed deadline)</label>
            <div style={{ fontSize: 12, color: "#8d9cc4" }}>Everyone sees the same real deadline. Per-visitor or restarting timers are not offered (misleading offers can breach Australian consumer law).</div>
          </div>
          {f.tOn && (<>
            <label style={lab}>Timer ends (Brisbane time, stored as UTC)<input data-testid="timer-end" style={inp} type="datetime-local" value={f.tEnd} onChange={(e) => set("tEnd", e.target.value)} /></label>
            <label style={lab}>Timer style<select data-testid="timer-style" style={inp} value={f.tStyle} onChange={(e) => set("tStyle", e.target.value)}>{TIMER_STYLES.map((x) => <option key={x} value={x}>{x === "text" ? "Plain text line" : x === "boxed" ? "Boxed digits" : x === "flip" ? "Flip clock" : "Compact pill"}</option>)}</select></label>
            <label style={{ ...lab, gridColumn: "1 / -1" }}>When the timer ends
              <select data-testid="timer-mode" style={inp} value={f.tMode} onChange={(e) => set("tMode", e.target.value)}><option value="hide">Hide the bar</option><option value="message">Swap to an end message</option></select>
            </label>
            {f.tMode === "message" && (<>
              <label style={{ ...lab, gridColumn: "1 / -1" }}>End message (max {f.layout === "card" ? LIMITS.cardBody : LIMITS.message})<input data-testid="timer-msg" style={inp} maxLength={f.layout === "card" ? LIMITS.cardBody : LIMITS.message} value={f.tMsg} onChange={(e) => set("tMsg", e.target.value)} /></label>
              <label style={lab}>End button text (blank = no button)<input data-testid="timer-link-text" style={inp} maxLength={40} value={f.tLinkText} onChange={(e) => set("tLinkText", e.target.value)} /></label>
              <label style={lab}>End button URL<input data-testid="timer-link-url" style={inp} value={f.tLinkUrl} onChange={(e) => set("tLinkUrl", e.target.value)} /></label>
              <label style={{ ...lab, gridColumn: "1 / -1" }}><input data-testid="timer-auto" type="checkbox" checked={f.tAuto} onChange={(e) => set("tAuto", e.target.checked)} /> Auto-end the announcement after the end message has shown for{" "}
                <input style={{ ...inp, width: 80, display: "inline-block", marginTop: 0 }} type="number" min={1} max={720} value={f.tHours} disabled={!f.tAuto} onChange={(e) => set("tHours", Number(e.target.value))} /> hours</label>
            </>)}
          </>)}
          <label style={lab}>Only on these pages (one per line, * wildcard; blank = all)<textarea style={inp} rows={3} value={f.include} onChange={(e) => set("include", e.target.value)} /></label>
          <label style={lab}>Never on these pages (checkout, admin, privacy, terms, unsubscribe are always excluded)<textarea style={inp} rows={3} value={f.exclude} onChange={(e) => set("exclude", e.target.value)} /></label>
          <label style={lab}>Re-show<select style={inp} value={f.reshow} onChange={(e) => set("reshow", e.target.value)}>{RESHOW.map((d) => <option key={d} value={d}>{d === "days" ? "After N days" : d === "never" ? "Never again for this version" : "Every new session"}</option>)}</select></label>
          <label style={lab}>Days (if after N days)<input style={inp} type="number" min={1} value={f.reshowDays} onChange={(e) => set("reshowDays", Number(e.target.value))} /></label>
          {f.layout === "card" && <><label style={lab}>Show delay (seconds)<input style={inp} type="number" min={0} value={f.delaySec} onChange={(e) => set("delaySec", Number(e.target.value))} /></label>
          <label style={lab}>Or scroll depth (%)<input style={inp} type="number" min={0} max={100} value={f.scrollPct} onChange={(e) => set("scrollPct", Number(e.target.value))} /></label></>}
        </div>
        {custom && (
          <div data-testid="custom-colours" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "8px 0" }}>
            {([["cBg", "Background"], ["cFg", "Text"], ["cCta", "Link / button"], ["cClose", "Close icon"]] as const).map(([k, l]) => {
              const valid = !!normHex(f[k]);
              return (
                <label key={k} style={lab}>{l}
                  <span style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                    <input type="color" aria-label={`${l} colour picker`} value={normHex(f[k]) ?? "#000000"} onChange={(e) => set(k, e.target.value)} style={{ width: 44, height: 36, padding: 0, border: "1px solid #3b3a6b", background: "none" }} />
                    <input aria-label={`${l} hex`} data-testid={`hex-${k}`} style={{ ...inp, marginTop: 0, borderColor: valid ? "#3b3a6b" : "#f87171" }} value={f[k]} maxLength={7} onChange={(e) => set(k, e.target.value)} placeholder="#rrggbb" />
                  </span>
                  {!valid && <span style={{ color: "#f87171" }}>Enter a hex colour like #dc2626</span>}
                </label>
              );
            })}
          </div>
        )}
        <div data-testid="contrast-panel" style={{ margin: "8px 0", fontSize: 13 }}>
          {custom && !hexOk && <div style={{ color: "#f87171" }}>Enter valid hex colours to check contrast.</div>}
          {checks.map((c) => (
            <div key={c.key} role={c.level === "ok" ? undefined : "alert"} style={{ color: c.level === "block" ? "#f87171" : c.level === "warn" ? "#fbbf24" : "#86efac" }}>
              {c.level === "ok" ? "✓" : c.level === "warn" ? "⚠" : "✕"} {c.label}: {c.ratio.toFixed(1)}:1{" "}
              {c.level === "warn" && `is under ${MIN_WARN}:1 (hard to read for some people).`}
              {c.level === "block" && `is under ${MIN_BLOCK}:1. Saving is blocked.`}
              {c.level !== "ok" && custom && (c.key === "fg" || c.key === "close") && (
                <button type="button" style={{ marginLeft: 8 }} onClick={() => fixText(c.key === "fg" ? "cFg" : "cClose", f.cBg)}>Use {c.suggest === "#000000" ? "black" : "white"} {c.key === "fg" ? "text" : "icon"}</button>
              )}
            </div>
          ))}
        </div>
        <div style={{ margin: "8px 0" }}>
          Preview:{" "}
          <button type="button" aria-pressed={view === "desktop"} onClick={() => setView("desktop")}>Desktop 1440</button>{" "}
          <button type="button" aria-pressed={view === "mobile"} onClick={() => setView("mobile")}>Mobile 390</button>
          {f.tOn && <>{" "}<button type="button" data-testid="end-toggle" aria-pressed={endPrev} onClick={() => setEndPrev((v) => !v)}>{endPrev ? "Showing: end state" : "Showing: counting down"}</button></>}
        </div>
        <style>{TIMER_CSS}</style>
        {(() => {
          const endMs = f.tEnd ? Date.parse(toUtc(f.tEnd)) : NaN;
          const sample = (2 * 86400 + 4 * 3600 + 15 * 60 + 9) * 1000;
          const live = Number.isFinite(endMs) && endMs > nowMs;
          const hideEnd = f.tOn && endPrev && f.tMode === "hide";
          const swap = f.tOn && endPrev && f.tMode === "message";
          const text = swap ? (f.tMsg || "Your end message") : (f.message || "Your message");
          const lt = swap ? f.tLinkText : f.linkText;
          return (
            <div data-testid="ann-preview" data-view={view} data-state={f.tOn && endPrev ? "ended" : "running"} style={{ width: view === "mobile" ? 390 : "100%", maxWidth: "100%", margin: "0 0 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: view === "mobile" ? 8 : 16, flexWrap: view === "mobile" || f.tOn ? "wrap" : "nowrap", padding: view === "mobile" ? "6px 4px 6px 16px" : "6px 8px 6px 32px", minHeight: 56, borderRadius: f.layout === "card" ? 16 : 0, background: hideEnd ? "transparent" : th.bg, color: th.fg, border: hideEnd ? "1px dashed #3b3a6b" : `1px solid ${th.border}`, fontSize: view === "mobile" ? 14 : 15, boxShadow: hideEnd ? "none" : shadowCss(f.layout, f.shadow, normHex(f.shadowColor) ?? undefined) }}>
              {hideEnd ? <span style={{ color: "#a5b4fc" }}>The bar disappears when the timer ends.</span> : (<>
                <span>{!swap && f.title ? <b>{f.title}. </b> : null}{text}</span>
                {f.tOn && !endPrev && <AnnouncementTimer endAt={live ? new Date(endMs).toISOString() : new Date(nowMs + sample).toISOString()} offset={0} style={f.tStyle as never} colors={th} fixedMs={live ? undefined : sample} />}
                {lt && <span style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 16px", borderRadius: 8, fontWeight: 600, background: th.cta, color: th.ctaFg }}>{lt}</span>}
                <span aria-hidden="true" style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: th.close }}>×</span>
              </>)}
            </div>
          );
        })()}
        <button onClick={save} disabled={blocked}>{editing ? "Save changes" : "Create"}</button>{editing && <button style={{ marginLeft: 8 }} onClick={() => { setEditing(null); setF(blank); }}>Cancel</button>}
        {msg && <p role="status" style={{ marginTop: 8 }}>{msg}</p>}
      </div>

      <h2 style={{ fontSize: 18 }}>Your announcements</h2>
      {items.length === 0 && <p style={{ color: "#a5b4fc" }}>None yet. Nothing is showing on the site.</p>}
      {items.map((a) => (
        <div key={a.id} style={box}>
          <strong>{a.name}</strong> <span style={{ color: "#8d9cc4" }}>({a.id}, {a.layout}, v{a.version}) status: {a.status}</span>
          <p style={{ margin: "8px 0" }}>{a.message}</p>
          {a.timer && <p style={{ margin: "4px 0", fontSize: 13, color: "#a5b4fc" }}>Timer ({a.timer.style}) ends {toBrisbane(a.timer.endAt).replace("T", " ")} Brisbane. At the end: {a.timer.endMode === "hide" ? "hide the bar" : `show "${a.timer.endMessage}"${a.timer.autoEnd ? `, then auto-end after ${a.timer.endShowHours}h` : ""}`}.</p>}
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
