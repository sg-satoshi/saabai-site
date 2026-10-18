"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import RichEditor from "./RichEditor";
import OnOff from "../ui/OnOff";
import AnnouncementView from "../../components/AnnouncementView";
import { shadowCss, SHADOWS, THEMES, LAYOUTS, DEVICES, AFTER_CLICK, GOALS, describeRules, targetPathOf, testIdFor, contrast, resolveTheme, TIMER_STYLES, DEFAULT_END_SHOW_HOURS, LIMITS, checkColors, normHex, bestText, DEFAULT_CUSTOM, MIN_BLOCK, MIN_WARN, sanitizeRich, visibleText, type Announcement, type PublicAnnouncement, type PublicTimer, type TimerStyle, type ThemeKey } from "../../../lib/announce/core";

type Form = { id: string; name: string; layout: string; message: string; title: string; linkText: string; linkUrl: string; theme: string; status: string; startsAt: string; endsAt: string; include: string; exclude: string; pageMode: string; afterClick: string; maxShows: number; priority: number; requiresClickOf: string; device: string; reshow: string; reshowDays: number; delaySec: number; scrollPct: number; cBg: string; cFg: string; cCta: string; cClose: string; shadow: string; shadowColor: string; tOn: boolean; tEnd: string; tStyle: string; tMode: string; tMsg: string; tLinkText: string; tLinkUrl: string; tAuto: boolean; tHours: number };
const ERROR_ORDER = ["id", "name", "layout", "status", "title", "message", "linkText", "linkUrl", "theme", "cBg", "cFg", "cCta", "cClose", "shadow", "shadowColor", "device", "startsAt", "endsAt", "tEnd", "tStyle", "tMode", "tMsg", "tLinkText", "tLinkUrl", "tHours", "pageMode", "include", "exclude", "afterClick", "reshow", "reshowDays", "maxShows", "priority", "requiresClickOf", "delaySec", "scrollPct"];
const FIELD_LABEL: Record<string, string> = { id: "Id", name: "Name", layout: "Layout", status: "Status", title: "Title", message: "Message", linkText: "Link text", linkUrl: "Link URL", theme: "Theme", cBg: "Background colour", cFg: "Text colour", cCta: "Button colour", cClose: "Close icon colour", shadow: "Drop shadow", shadowColor: "Shadow colour", device: "Device", startsAt: "Starts", endsAt: "Ends", tEnd: "Timer end", tStyle: "Timer style", tMode: "When the timer ends", tMsg: "End message", tLinkText: "End button text", tLinkUrl: "End button URL", tHours: "Auto-end hours", include: "Pages to show on", exclude: "Pages to leave out", pageMode: "Where it shows", afterClick: "After a click", maxShows: "Show limit", priority: "Priority", requiresClickOf: "Only after a click on", reshow: "After the X", reshowDays: "Days until it returns", delaySec: "Show delay", scrollPct: "Scroll depth", form: "Save" };
const blank: Form = { id: "", name: "", layout: "top", message: "", title: "", linkText: "", linkUrl: "", theme: "surface", status: "draft", startsAt: "", endsAt: "", include: "", exclude: "", pageMode: "all", afterClick: "keep", maxShows: 0, priority: 0, requiresClickOf: "", device: "all", reshow: "days", reshowDays: 7, delaySec: 0, scrollPct: 0, cBg: THEMES.surface.bg, cFg: THEMES.surface.fg, cCta: THEMES.surface.cta, cClose: THEMES.surface.close, shadow: "none", shadowColor: "", tOn: false, tEnd: "", tStyle: "boxed", tMode: "hide", tMsg: "", tLinkText: "", tLinkUrl: "", tAuto: false, tHours: DEFAULT_END_SHOW_HOURS };

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [frameReady, setFrameReady] = useState(false);
  const [sampleEnd] = useState(() => Date.now() + (2 * 86400 + 4 * 3600 + 15 * 60 + 9) * 1000);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const [holderW, setHolderW] = useState(900);
  const [pinH, setPinH] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNowMs(Date.now()), 30_000); return () => clearInterval(id); }, []);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/announcements");
    if (r.ok) { const j = await r.json(); setItems(j.items); setEnabled(j.enabled); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (window.innerWidth < 768) setView("mobile"); }, []);

  async function post(body: object) {
    setBusy(true);
    let r: Response | null = null; let j: { error?: string; fields?: Record<string, string> } = {};
    try { r = await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); j = await r.json().catch(() => ({})); } catch { /* network */ }
    setBusy(false);
    if (r?.ok) { setErrors({}); setMsg("Saved."); await load(); return true; }
    const fields = j.fields && Object.keys(j.fields).length ? j.fields : { form: j.error || "Something went wrong. Nothing was saved." };
    fail(fields, j.error || "Something went wrong. Nothing was saved.");
    return false;
  }
  /** Shows every faulty field (red border, message under the field), a summary banner, and focuses the first one. */
  function fail(fields: Record<string, string>, summary: string) {
    setErrors(fields); setMsg(summary);
    window.setTimeout(() => {
      const first = ERROR_ORDER.find((k) => fields[k] && document.getElementById(`f-${k}`));
      const el = first ? document.getElementById(`f-${first}`) : document.getElementById("ann-banner");
      el?.scrollIntoView({ block: "center", behavior: "smooth" }); (el as HTMLElement | null)?.focus({ preventScroll: true });
    }, 50);
  }
  async function save() {
    const local: Record<string, string> = {};
    if (f.shadow !== "none" && f.shadowColor && !normHex(f.shadowColor)) local.shadowColor = "Shadow colour must be a hex value like #000000.";
    if (f.tOn && !f.tEnd) local.tEnd = "Pick the timer end date and time (Brisbane).";
    if (Object.keys(local).length) { fail(local, `${Object.keys(local).length} thing${Object.keys(local).length > 1 ? "s" : ""} to fix before saving.`); return; }
    const timer = f.tOn ? { style: f.tStyle, endAt: toUtc(f.tEnd), endMode: f.tMode, ...(f.tMode === "message" ? { endMessage: f.tMsg, endLinkText: f.tLinkText, endLinkUrl: f.tLinkUrl, autoEnd: f.tAuto, endShowHours: f.tHours } : {}) } : null;
    const data = { ...f, timer, ...(f.theme === "custom" ? { colors: { bg: f.cBg, fg: f.cFg, cta: f.cCta, close: f.cClose } } : {}), startsAt: toUtc(f.startsAt), endsAt: toUtc(f.endsAt), include: f.pageMode === "include" ? lines(f.include) : [], exclude: f.pageMode === "exclude" ? lines(f.exclude) : [] };
    if (await post({ action: "save", id: editing ?? undefined, data })) { setF(blank); setEditing(null); }
  }
  const edit = (a: Announcement) => { setEditing(a.id); setF({ id: a.id, name: a.name, layout: a.layout, message: a.message, title: a.title ?? "", linkText: a.linkText, linkUrl: a.linkUrl, theme: a.theme, status: a.status, startsAt: toBrisbane(a.startsAt), endsAt: toBrisbane(a.endsAt), include: a.include.join("\n"), exclude: a.exclude.join("\n"), pageMode: a.pageMode ?? (a.include.length ? "include" : a.exclude.length ? "exclude" : "all"), afterClick: a.afterClick ?? "keep", maxShows: a.maxShows ?? 0, priority: a.priority ?? 0, requiresClickOf: a.requiresClickOf ?? "", device: a.device, reshow: a.reshow, reshowDays: a.reshowDays, delaySec: a.delaySec, scrollPct: a.scrollPct, cBg: a.colors?.bg ?? resolveTheme(a.theme).bg, cFg: a.colors?.fg ?? resolveTheme(a.theme).fg, cCta: a.colors?.cta ?? resolveTheme(a.theme).cta, cClose: a.colors?.close ?? resolveTheme(a.theme).close, shadow: a.shadow ?? "none", shadowColor: a.shadowColor ?? "", tOn: !!a.timer, tEnd: toBrisbane(a.timer?.endAt), tStyle: a.timer?.style ?? "boxed", tMode: a.timer?.endMode ?? "hide", tMsg: a.timer?.endMessage ?? "", tLinkText: a.timer?.endLinkText ?? "", tLinkUrl: a.timer?.endLinkUrl ?? "", tAuto: !!a.timer?.autoEnd, tHours: a.timer?.endShowHours ?? DEFAULT_END_SHOW_HOURS }); setEndPrev(false); window.scrollTo({ top: 0 }); };
  const COLOUR_KEYS = ["cBg", "cFg", "cCta", "cClose"];
  const pickTheme = (t: string) => {
    const pre = (THEMES as Record<string, { bg: string; fg: string; cta: string; close: string }>)[t];
    setF((p) => ({ ...p, theme: t, ...(pre ? { cBg: pre.bg, cFg: pre.fg, cCta: pre.cta, cClose: pre.close } : {}) }));
    setErrors((e) => { const n = { ...e }; for (const k of ["theme", ...COLOUR_KEYS]) delete n[k]; return n; });
  };
  const set = (k: keyof Form, v: string | number | boolean) => { setF((p) => ({ ...p, [k]: v, ...(COLOUR_KEYS.includes(k) && p.theme !== "custom" ? { theme: "custom" } : {}) })); if (errors[k]) setErrors((e) => { const n = { ...e }; delete n[k]; return n; }); };
  const ip = (k: string) => ({ id: `f-${k}`, "aria-invalid": errors[k] ? (true as const) : undefined, "aria-describedby": errors[k] ? `e-${k}` : undefined });
  const inpS = (k: string) => ({ ...inp, ...(errors[k] ? { borderColor: "var(--bad)", boxShadow: "0 0 0 1px var(--bad)", background: "var(--bad-bg)" } : {}) });
  const Err = ({ k }: { k: string }) => (errors[k] ? <span id={`e-${k}`} role="alert" style={{ display: "block", color: "var(--bad)", fontSize: 12.5, marginTop: 4 }}>{errors[k]}</span> : null);
  const custom = f.theme === "custom";
  const hexOk = [f.cBg, f.cFg, f.cCta, f.cClose].every((h) => normHex(h));
  const th = resolveTheme(f.theme, custom && hexOk ? { bg: f.cBg, fg: f.cFg, cta: f.cCta, close: f.cClose } : undefined);
  const checks = custom && !hexOk ? [] : checkColors(th);
  const blocked = (custom && !hexOk) || checks.some((c) => c.level === "block");
  const fixText = (k: "cFg" | "cClose", bgv: string) => { const h = normHex(bgv); if (h) set(k, bestText(h)); };
  const box = { background: "#fff", border: "1px solid var(--n-200)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: 20, marginBottom: 20 } as const;
  const inp = { width: "100%", padding: "8px 10px", borderRadius: "var(--r-md)", border: "1px solid var(--n-300)", background: "#fff", color: "var(--n-900)", fontSize: 13.5, marginTop: 4 } as const;
  const lab = { display: "block", fontSize: 13, color: "var(--n-600)", marginBottom: 12 } as const;

  // ---- Live preview: the real announcement component, driven by the form as you type (admin only, no side effects) ----
  const endMsT = f.tEnd ? Date.parse(toUtc(f.tEnd)) : NaN;
  const liveEnd = Number.isFinite(endMsT) && endMsT > nowMs;
  const isCard = f.layout === "card";
  const pTimer: PublicTimer | undefined = f.tOn ? { style: (f.tStyle as TimerStyle), endAt: new Date(liveEnd ? endMsT : sampleEnd).toISOString(), endMode: f.tMode === "message" ? "message" : "hide", ...(f.tMode === "message" ? { endMessage: sanitizeRich(f.tMsg) || "Your end message", ...(f.tLinkText ? { endLinkText: f.tLinkText, endLinkUrl: f.tLinkUrl || "#" } : {}) } : {}), expired: false, serverNow: 0 } : undefined;
  const hideEnd = !!pTimer && endPrev && f.tMode === "hide";
  const previewAnn: PublicAnnouncement | null = hideEnd ? null : {
    id: "preview", layout: f.layout as Announcement["layout"], message: sanitizeRich(f.message) || "Your message", ...(isCard ? { title: f.title || "Title" } : {}),
    linkText: f.linkText && f.linkUrl ? f.linkText : "", linkUrl: f.linkText && f.linkUrl ? f.linkUrl : "",
    theme: ((custom && !hexOk) ? "surface" : f.theme) as ThemeKey, ...(custom && hexOk ? { colors: { bg: f.cBg, fg: f.cFg, cta: f.cCta, close: f.cClose } } : {}),
    shadow: f.shadow as never, ...(normHex(f.shadowColor) ? { shadowColor: normHex(f.shadowColor) as string } : {}),
    device: "all", reshow: "days", reshowDays: 7, delaySec: 0, scrollPct: 0, version: 1, include: [], exclude: [],
    ...(pTimer ? { timer: pTimer } : {}),
  };
  const previewKey = JSON.stringify([previewAnn, f.tOn && endPrev]);
  useEffect(() => {
    const send = () => frameRef.current?.contentWindow?.postMessage({ type: "ann-preview", ann: previewAnn ? { ...previewAnn, ...(previewAnn.timer ? { timer: { ...previewAnn.timer, serverNow: Date.now() } } : {}) } : null, ended: !!pTimer && endPrev }, window.location.origin);
    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, frameReady, showPanel, view]);
  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.origin === window.location.origin && e.data?.type === "ann-preview-ready") { setFrameReady(true); frameRef.current?.contentWindow?.postMessage({ type: "ann-preview", ann: previewAnn, ended: !!pTimer && endPrev }, window.location.origin); } };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);
  useEffect(() => {
    if (!holderRef.current) return;
    const ro = new ResizeObserver(() => setHolderW(holderRef.current?.clientWidth ?? 900)); ro.observe(holderRef.current);
    return () => ro.disconnect();
  }, [showPanel]);
  // Pinned: the same component as a real bar at the very top of this admin page (pushes the page down). Admin only.
  const pinned = pin && !!previewAnn;
  useEffect(() => {
    const body = document.body;
    if (!pinned || previewAnn?.layout !== "top" || !pinRef.current) { body.style.removeProperty("padding-top"); setPinH(0); return; }
    const set = () => { const h = pinRef.current?.offsetHeight ?? 0; body.style.paddingTop = `${h}px`; setPinH(h); };
    set(); const ro = new ResizeObserver(set); ro.observe(pinRef.current);
    return () => { ro.disconnect(); body.style.removeProperty("padding-top"); };
  }, [pinned, previewKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const scale = Math.min(1, holderW / (view === "desktop" ? 1440 : 390));
  const vh = view === "desktop" ? 300 : 520;
  const panel = (
    <div className="ann-panel" data-testid="ann-preview" data-view={view} data-state={f.tOn && endPrev ? "ended" : "running"} style={{ position: "sticky", top: 8 + pinH, zIndex: 30, background: "#fff", border: "1px solid var(--n-200)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-2)", padding: 12, margin: "8px 0 16px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: showPanel ? 8 : 0 }}>
        <strong style={{ fontSize: 13 }}>Live preview</strong>
        <span style={{ color: "var(--n-500)", fontSize: 12 }}>Updates as you type. Admin only, never shown to visitors.</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
          <button className="btn sm" type="button" aria-pressed={view === "desktop"} onClick={() => setView("desktop")}>Desktop 1440</button>
          <button className="btn sm" type="button" aria-pressed={view === "mobile"} onClick={() => setView("mobile")}>Mobile 390</button>
          {f.tOn && <button className="btn sm" type="button" data-testid="end-toggle" aria-pressed={endPrev} onClick={() => setEndPrev((v) => !v)}>{endPrev ? "End state" : "Counting down"}</button>}
          <button className="btn sm" type="button" data-testid="pin-toggle" aria-pressed={pin} onClick={() => setPin((v) => !v)}>Pin as live bar at top of this page</button>
          <button className="btn sm" type="button" aria-pressed={!showPanel} onClick={() => setShowPanel((v) => !v)}>{showPanel ? "Hide" : "Show"}</button>
        </span>
      </div>
      {showPanel && (
        <div ref={holderRef} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <div style={{ width: (view === "desktop" ? 1440 : 390) * scale, height: vh * scale, border: "1px solid var(--n-200)", borderRadius: 8, overflow: "hidden", background: "#f4f5f9" }}>
            <iframe ref={frameRef} data-testid="ann-frame" title="Announcement preview" src="/saabai-admin/announcements/preview" onLoad={() => setFrameReady(true)} style={{ width: view === "desktop" ? 1440 : 390, height: vh, border: 0, transform: `scale(${scale})`, transformOrigin: "0 0", display: "block" }} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 960, color: "var(--n-900)" }}>
      {pinned && previewAnn && <AnnouncementView ann={previewAnn} ended={!!pTimer && endPrev} offset={0} preview onClose={() => setPin(false)} innerRef={pinRef} />}
      <style>{`.btn[aria-pressed="true"]{background:var(--navy-900);border-color:var(--navy-900);color:#fff}.btn:disabled{opacity:.5;cursor:not-allowed}@media (max-width:767px){.ann-grid{grid-template-columns:1fr!important}.ann-grid>*{grid-column:1/-1!important;min-width:0}.ann-panel{position:static!important}}`}</style>
      <div className="ph"><div><h1>Announcements</h1>
      <p className="sub">Top bar, bottom bar and slide-in card for saabai.ai. Saabai-owned sites only. Nothing shows until the site switch is on and an announcement is set to Live.</p></div></div>

      <div style={box}>
        <strong>Announcements on saabai.ai (site switch)</strong>
        <p style={{ margin: "8px 0" }}>When this is OFF nothing shows, whatever each announcement below is set to. Client sites cannot enable this.</p>
        <OnOff testId="site-toggle" on={enabled} label="Announcements site switch for saabai.ai" disabled={busy} align="left"
          confirmOn={{ title: "Turn announcements on for saabai.ai?", body: "Any announcement that is ON will show to visitors.", confirmLabel: "Turn on" }}
          confirmOff={{ title: "Turn announcements off for saabai.ai?", body: "Nothing will show on the site." }}
          onToggle={() => { void post({ action: "set_flag", enabled: !enabled }); }} note={enabled ? "Announcements can show" : "Nothing is showing"} />
      </div>

      <div style={box}>
        <strong>{editing ? `Edit: ${editing}` : "New announcement"}</strong>
        {Object.keys(errors).length > 0 && (<div id="ann-banner" data-testid="error-banner" role="alert" tabIndex={-1} style={{ marginTop: 12, padding: "12px 14px", border: "1px solid var(--bad)", background: "var(--bad-bg)", color: "var(--bad)", borderRadius: "var(--r-md)" }}>
            <strong>Couldn&apos;t save: {msg}</strong>
            <ul style={{ margin: "6px 0 0 18px", fontSize: 13 }}>
              {[...ERROR_ORDER.filter((k) => errors[k]), ...Object.keys(errors).filter((k) => !ERROR_ORDER.includes(k))].map((k) => (
                <li key={k}>{document.getElementById(`f-${k}`) ? <a href={`#f-${k}`} onClick={(e) => { e.preventDefault(); const el = document.getElementById(`f-${k}`); el?.scrollIntoView({ block: "center", behavior: "smooth" }); el?.focus({ preventScroll: true }); }} style={{ color: "var(--bad)", textDecoration: "underline" }}>{FIELD_LABEL[k] ?? k}</a> : <b>{FIELD_LABEL[k] ?? k}</b>}: {errors[k]}</li>
              ))}
            </ul>
          </div>)}
        {panel}
        <div className="ann-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <label style={lab}>Id (lowercase, dashes)<input {...ip("id")} style={inpS("id")} value={f.id} disabled={!!editing} onChange={(e) => set("id", e.target.value)} /><Err k="id" /></label>
          <label style={lab}>Name<input {...ip("name")} style={inpS("name")} value={f.name} onChange={(e) => set("name", e.target.value)} /><Err k="name" /></label>
          <label style={lab}>Layout<select {...ip("layout")} style={inpS("layout")} value={f.layout} onChange={(e) => set("layout", e.target.value)}>{LAYOUTS.map((l) => <option key={l} value={l}>{l === "top" ? "Top bar" : l === "bottom" ? "Bottom bar" : "Slide-in card"}</option>)}</select><Err k="layout" /></label>
          <label style={lab}>Status<select {...ip("status")} style={inpS("status")} value={f.status} onChange={(e) => set("status", e.target.value)}><option>draft</option><option>scheduled</option><option>live</option><option>ended</option></select><Err k="status" /></label>
          {f.layout === "card" && <label style={{ ...lab, gridColumn: "1 / -1" }}>Title (max 60)<input {...ip("title")} style={inpS("title")} maxLength={60} value={f.title} onChange={(e) => set("title", e.target.value)} /><Err k="title" /></label>}
          <div style={{ ...lab, gridColumn: "1 / -1" }}><span id="l-message">Message (max {f.layout === "card" ? 140 : 120} visible characters)</span><RichEditor id="f-message" testId="rt-message" label="Message" value={f.message} onChange={(h) => set("message", h)} max={f.layout === "card" ? 140 : 120} invalid={!!errors.message} describedBy={errors.message ? "e-message" : undefined} /><Err k="message" /></div>
          <label style={lab}>Link text<input {...ip("linkText")} style={inpS("linkText")} maxLength={40} value={f.linkText} onChange={(e) => set("linkText", e.target.value)} /><Err k="linkText" /></label>
          <label style={lab}>Link URL (/path, https, tel:, mailto:)<input {...ip("linkUrl")} style={inpS("linkUrl")} value={f.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} /><Err k="linkUrl" /></label>
          <label style={lab}>Theme<select {...ip("theme")} style={inpS("theme")} value={f.theme} onChange={(e) => pickTheme(e.target.value)}>
            <optgroup label="Brand (blends with the site)">{Object.entries(THEMES).filter(([, v]) => v.group === "brand").map(([k, v]) => <option key={k} value={k}>{v.label} ({contrast(v.fg, v.bg).toFixed(1)}:1)</option>)}</optgroup>
            <optgroup label="Alert (stands out from the site)">{Object.entries(THEMES).filter(([, v]) => v.group === "alert").map(([k, v]) => <option key={k} value={k}>{v.label} ({contrast(v.fg, v.bg).toFixed(1)}:1)</option>)}</optgroup>
            <optgroup label="Your own"><option value="custom">Custom colours</option></optgroup>
          </select><Err k="theme" /></label>
          <label style={lab}>Drop shadow<select {...ip("shadow")} data-testid="shadow-select" style={inpS("shadow")} value={f.shadow} onChange={(e) => set("shadow", e.target.value)}>{SHADOWS.map((x) => <option key={x} value={x}>{x === "none" ? "None" : x === "soft" ? "Soft" : "Strong"}</option>)}</select><Err k="shadow" /></label>
          {f.shadow !== "none" && <label style={lab}>Shadow colour (optional, hex, blank = black)<input {...ip("shadowColor")} data-testid="hex-shadow" style={{ ...inpS("shadowColor"), borderColor: !f.shadowColor || normHex(f.shadowColor) ? "var(--n-300)" : "var(--bad)" }} maxLength={7} value={f.shadowColor} placeholder="#000000" onChange={(e) => set("shadowColor", e.target.value)} /><Err k="shadowColor" /></label>}
          <label style={lab}>Device<select {...ip("device")} style={inpS("device")} value={f.device} onChange={(e) => set("device", e.target.value)}>{DEVICES.map((d) => <option key={d}>{d}</option>)}</select><Err k="device" /></label>
          <label style={lab}>Starts (Brisbane time)<input {...ip("startsAt")} style={inpS("startsAt")} type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /><Err k="startsAt" /></label>
          <label style={lab}>Ends (Brisbane time)<input {...ip("endsAt")} style={inpS("endsAt")} type="datetime-local" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} /><Err k="endsAt" /></label>
          <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #3b3a6b", paddingTop: 12 }}>
            <label style={{ ...lab, marginBottom: 4 }}><input data-testid="timer-on" type="checkbox" checked={f.tOn} onChange={(e) => set("tOn", e.target.checked)} /> Countdown timer (fixed deadline)</label>
            <div style={{ fontSize: 12, color: "var(--n-500)" }}>Everyone sees the same real deadline. Per-visitor or restarting timers are not offered (misleading offers can breach Australian consumer law).</div>
          </div>
          {f.tOn && (<>
            <label style={lab}>Timer ends (Brisbane time, stored as UTC)<input {...ip("tEnd")} data-testid="timer-end" style={inpS("tEnd")} type="datetime-local" value={f.tEnd} onChange={(e) => set("tEnd", e.target.value)} /><Err k="tEnd" /></label>
            <label style={lab}>Timer style<select {...ip("tStyle")} data-testid="timer-style" style={inpS("tStyle")} value={f.tStyle} onChange={(e) => set("tStyle", e.target.value)}>{TIMER_STYLES.map((x) => <option key={x} value={x}>{x === "text" ? "Plain text line" : x === "boxed" ? "Boxed digits" : x === "flip" ? "Flip clock" : "Compact pill"}</option>)}</select><Err k="tStyle" /></label>
            <label style={{ ...lab, gridColumn: "1 / -1" }}>When the timer ends
              <select {...ip("tMode")} data-testid="timer-mode" style={inpS("tMode")} value={f.tMode} onChange={(e) => set("tMode", e.target.value)}><option value="hide">Hide the bar</option><option value="message">Swap to an end message</option></select>
              <Err k="tMode" />
            </label>
            {f.tMode === "message" && (<>
              <div style={{ ...lab, gridColumn: "1 / -1" }}><span>End message (max {f.layout === "card" ? LIMITS.cardBody : LIMITS.message} visible characters)</span><RichEditor id="f-tMsg" testId="rt-tmsg" label="End message" value={f.tMsg} onChange={(h) => set("tMsg", h)} max={f.layout === "card" ? LIMITS.cardBody : LIMITS.message} invalid={!!errors.tMsg} describedBy={errors.tMsg ? "e-tMsg" : undefined} /><Err k="tMsg" /></div>
              <label style={lab}>End button text (blank = no button)<input {...ip("tLinkText")} data-testid="timer-link-text" style={inpS("tLinkText")} maxLength={40} value={f.tLinkText} onChange={(e) => set("tLinkText", e.target.value)} /><Err k="tLinkText" /></label>
              <label style={lab}>End button URL<input {...ip("tLinkUrl")} data-testid="timer-link-url" style={inpS("tLinkUrl")} value={f.tLinkUrl} onChange={(e) => set("tLinkUrl", e.target.value)} /><Err k="tLinkUrl" /></label>
              <label style={{ ...lab, gridColumn: "1 / -1" }}><input data-testid="timer-auto" type="checkbox" checked={f.tAuto} onChange={(e) => set("tAuto", e.target.checked)} /> Auto-end the announcement after the end message has shown for{" "}
                <input {...ip("tHours")} style={{ ...inpS("tHours"), width: 80, display: "inline-block", marginTop: 0 }} type="number" min={1} max={720} value={f.tHours} disabled={!f.tAuto} onChange={(e) => set("tHours", Number(e.target.value))} /> hours<Err k="tHours" /><Err k="tHours" /></label>
            </>)}
          </>)}
          <fieldset data-testid="rules" style={{ gridColumn: "1 / -1", border: "1px solid var(--n-300)", borderRadius: "var(--r-md)", padding: 14, margin: "4px 0 12px", background: "var(--n-25)" }}>
            <legend style={{ fontWeight: 600, fontSize: 13.5, padding: "0 6px" }}>Who sees it, where and how often</legend>
            <div className="ann-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <label style={lab}>Where it shows
                <select {...ip("pageMode")} data-testid="page-mode" style={inpS("pageMode")} value={f.pageMode} onChange={(e) => set("pageMode", e.target.value)}>
                  <option value="all">All pages</option><option value="include">Only the pages I list</option><option value="exclude">All pages except the ones I list</option>
                </select><Err k="pageMode" /></label>
              {f.pageMode === "include" && <label style={lab}>Pages to show on (one per line)<textarea {...ip("include")} data-testid="page-include" style={inpS("include")} rows={3} placeholder={"/ai-score\n/blog/*"} value={f.include} onChange={(e) => set("include", e.target.value)} /><span style={{ display: "block", fontSize: 12 }}>Exact page (/pricing), everything under a folder (/blog/*), or * anywhere (/services/*/apply).</span><Err k="include" /></label>}
              {f.pageMode === "exclude" && <label style={lab}>Pages to leave out (one per line)<textarea {...ip("exclude")} data-testid="page-exclude" style={inpS("exclude")} rows={3} placeholder={"/ai-score\n/blog/*"} value={f.exclude} onChange={(e) => set("exclude", e.target.value)} /><span style={{ display: "block", fontSize: 12 }}>Checkout, admin, privacy, terms and unsubscribe pages are always left out.</span><Err k="exclude" /></label>}
              <label style={lab}>After a click on the button
                <select {...ip("afterClick")} data-testid="after-click" style={inpS("afterClick")} value={f.afterClick} onChange={(e) => set("afterClick", e.target.value)}>
                  <option value="keep">Keep showing it</option><option value="hide_target">Hide it on the page the button goes to</option><option value="hide_all">Hide it everywhere for that visitor</option>
                </select><Err k="afterClick" /></label>
              <label style={lab}>After the visitor closes it with the X
                <select {...ip("reshow")} data-testid="after-close" style={inpS("reshow")} value={f.reshow} onChange={(e) => set("reshow", e.target.value)}>
                  <option value="never">Stay hidden</option><option value="days">Come back after some days</option><option value="session">Come back next visit (new session)</option>
                </select><Err k="reshow" /></label>
              {f.reshow === "days" && <label style={lab}>Days until it comes back<input {...ip("reshowDays")} style={inpS("reshowDays")} type="number" min={1} value={f.reshowDays} onChange={(e) => set("reshowDays", Number(e.target.value))} /><Err k="reshowDays" /></label>}
              <label style={lab}>Show limit (sessions per visitor, 0 = no limit)<input {...ip("maxShows")} data-testid="max-shows" style={inpS("maxShows")} type="number" min={0} max={50} value={f.maxShows} onChange={(e) => set("maxShows", Number(e.target.value))} /><span style={{ display: "block", fontSize: 12 }}>A session is one visit. After this many visits it stops showing to that visitor.</span><Err k="maxShows" /></label>
              <label style={lab}>Priority (0 to 100)<input {...ip("priority")} data-testid="priority" style={inpS("priority")} type="number" min={0} max={100} value={f.priority} onChange={(e) => set("priority", Number(e.target.value))} /><span style={{ display: "block", fontSize: 12 }}>If more than one bar fits a page, the higher number shows. Only one bar shows at a time.</span><Err k="priority" /></label>
              <label style={lab}>Follow-up bar: only after a click on
                <select {...ip("requiresClickOf")} data-testid="requires-click" style={inpS("requiresClickOf")} value={f.requiresClickOf} onChange={(e) => set("requiresClickOf", e.target.value)}>
                  <option value="">Not a follow-up (show normally)</option>{items.filter((x) => x.id !== editing).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select><span style={{ display: "block", fontSize: 12 }}>Use with "Only the pages I list" to show a different bar on the target page once the first one was clicked.</span><Err k="requiresClickOf" /></label>
            </div>
            <div data-testid="rules-preview" style={{ marginTop: 6, fontSize: 13, color: "var(--n-700)", background: "#fff", border: "1px solid var(--n-200)", borderRadius: "var(--r-md)", padding: "10px 12px" }}>
              <strong>What this bar will do</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{describeRules({ ...f, pageMode: f.pageMode as never, include: lines(f.include), exclude: lines(f.exclude), device: f.device as never, reshow: f.reshow as never, afterClick: f.afterClick as never, requiresClickOf: f.requiresClickOf || undefined }, (id) => items.find((x) => x.id === id)?.name ?? id).map((l) => <li key={l}>{l}</li>)}</ul>
              {f.afterClick === "hide_target" && !targetPathOf(f.linkUrl) && <div role="alert" style={{ color: "var(--bad)", marginTop: 4 }}>Add a button link to a page on this site (like /ai-score) for this to work.</div>}
            </div>
          </fieldset>
          {f.layout === "card" && <><label style={lab}>Show delay (seconds)<input {...ip("delaySec")} style={inpS("delaySec")} type="number" min={0} value={f.delaySec} onChange={(e) => set("delaySec", Number(e.target.value))} /><Err k="delaySec" /></label>
          <label style={lab}>Or scroll depth (%)<input {...ip("scrollPct")} style={inpS("scrollPct")} type="number" min={0} max={100} value={f.scrollPct} onChange={(e) => set("scrollPct", Number(e.target.value))} /><Err k="scrollPct" /></label></>}
        </div>
        <div style={{ margin: "12px 0 4px", fontWeight: 600, fontSize: 13.5 }}>Colours <span style={{ fontWeight: 400, color: "var(--n-500)", fontSize: 12.5 }}>Pick a preset above to fill these, or type your own hex. Editing any colour switches to Custom.</span></div>
        {(
          <div data-testid="custom-colours" className="ann-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "8px 0" }}>
            {([["cBg", "Background colour"], ["cFg", "Text colour"], ["cCta", "Button colour"], ["cClose", "Close icon colour"]] as const).map(([k, l]) => {
              const valid = !!normHex(f[k]);
              return (
                <label key={k} style={k === "cBg" ? { ...lab, gridColumn: "1 / -1", fontWeight: 600, fontSize: 14, color: "var(--n-900)", padding: 12, border: "1px solid var(--n-300)", borderRadius: "var(--r-md)", background: "var(--n-25)" } : lab}>{l}
                  <span style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                    <input type="color" aria-label={`${l} colour picker`} value={normHex(f[k]) ?? "#000000"} onChange={(e) => set(k, e.target.value)} style={{ width: k === "cBg" ? 64 : 44, height: k === "cBg" ? 44 : 36, padding: 0, border: "1px solid #3b3a6b", background: "none" }} />
                    <input {...ip(k)} aria-label={`${l} hex`} data-testid={`hex-${k}`} style={{ ...inp, marginTop: 0, borderColor: valid && !errors[k] ? "var(--n-300)" : "var(--bad)" }} value={f[k]} maxLength={7} onChange={(e) => set(k, e.target.value)} placeholder="#rrggbb" />
                  </span>
                  {!valid && !errors[k] && <span style={{ color: "var(--bad)" }}>Enter a hex colour like #dc2626</span>}<Err k={k} />
                </label>
              );
            })}
          </div>
        )}
        <div data-testid="contrast-panel" style={{ margin: "8px 0", fontSize: 13 }}>
          {custom && !hexOk && <div style={{ color: "var(--bad)" }}>Enter valid hex colours to check contrast.</div>}
          {checks.map((c) => (
            <div key={c.key} role={c.level === "ok" ? undefined : "alert"} style={{ color: c.level === "block" ? "var(--bad)" : c.level === "warn" ? "var(--warn)" : "var(--ok)" }}>
              {c.level === "ok" ? "✓" : c.level === "warn" ? "⚠" : "✕"} {c.label}: {c.ratio.toFixed(1)}:1{" "}
              {c.level === "warn" && `is under ${MIN_WARN}:1 (hard to read for some people).`}
              {c.level === "block" && `is under ${MIN_BLOCK}:1. Saving is blocked.`}
              {c.level !== "ok" && custom && (c.key === "fg" || c.key === "close") && (
                <button className="btn sm" type="button" style={{ marginLeft: 8 }} onClick={() => fixText(c.key === "fg" ? "cFg" : "cClose", f.cBg)}>Use {c.suggest === "#000000" ? "black" : "white"} {c.key === "fg" ? "text" : "icon"}</button>
              )}
            </div>
          ))}
        </div>
        <button className="btn pri" onClick={save} disabled={busy}>{editing ? "Save changes" : "Create"}</button>{editing && <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => { setEditing(null); setF(blank); }}>Cancel</button>}
        {Object.keys(errors).length > 0 ? <p style={{ marginTop: 8, color: "var(--bad)", fontSize: 13 }}>Not saved. {Object.keys(errors).length} field{Object.keys(errors).length > 1 ? "s" : ""} need attention (highlighted above).</p> : msg ? <p role="status" style={{ marginTop: 8 }}>{msg}</p> : null}
      </div>

      <h2 style={{ fontSize: 18 }}>Your announcements</h2>
      {items.length === 0 && <p style={{ color: "var(--n-500)" }}>None yet. Nothing is showing on the site.</p>}
      {items.map((a) => (
        <div key={a.id} style={box}>
          <strong>{a.name}</strong> <span style={{ color: "var(--n-500)" }}>({a.id}, {a.layout}, v{a.version})</span>
          <div style={{ margin: "10px 0" }}><OnOff testId={`toggle-${a.id}`} on={a.status === "live" || a.status === "scheduled"} label={`Announcement ${a.name}`} disabled={busy} align="left"
            confirmOff={{ title: `Turn off ${a.name}?`, body: "It stops showing on the site." }}
            note={a.status === "scheduled" ? `Scheduled${a.startsAt ? `, starts ${toBrisbane(a.startsAt).replace("T", " ")} Brisbane` : ""}` : a.status === "ended" ? "Ended" : a.status === "draft" ? "Draft" : undefined}
            onToggle={() => { const on = a.status === "live" || a.status === "scheduled"; void post({ action: "save", id: a.id, data: { status: on ? "draft" : "live" } }); }} /></div>
          <p style={{ margin: "8px 0" }}>{visibleText(a.message)}</p>
          {a.timer && <p style={{ margin: "4px 0", fontSize: 13, color: "var(--n-500)" }}>Timer ({a.timer.style}) ends {toBrisbane(a.timer.endAt).replace("T", " ")} Brisbane. At the end: {a.timer.endMode === "hide" ? "hide the bar" : `show "${visibleText(a.timer.endMessage ?? "")}"${a.timer.autoEnd ? `, then auto-end after ${a.timer.endShowHours}h` : ""}`}.</p>}
          <ul data-testid={`rules-${a.id}`} style={{ margin: "4px 0 8px", paddingLeft: 18, fontSize: 12.5, color: "var(--n-500)" }}>{describeRules(a, (id) => items.find((x) => x.id === id)?.name ?? id).map((l) => <li key={l}>{l}</li>)}</ul>
          <button className="btn sm" onClick={() => edit(a)}>Edit</button>{" "}
          {a.status !== "live" && a.status !== "scheduled" && <button className="btn sm" onClick={() => { if (confirm("Delete this announcement?")) void post({ action: "delete", id: a.id }); }}>Delete</button>}
          <div style={{ marginTop: 12, fontSize: 13 }}>
            {a.testId ? <>Split test: <Link href="/saabai-admin/experiments" style={{ color: "var(--teal-700)" }}>{a.testId}</Link> (start, pause and read results on the Experiments page; minimum 14 days)</> : (
              <>Split test: <select value={goal} onChange={(e) => setGoal(e.target.value)} style={{ background: "#fff", color: "var(--n-900)", border: "1px solid var(--n-300)", borderRadius: 6 }}>{GOALS.map((g) => <option key={g}>{g}</option>)}</select>{" "}
                <button className="btn sm" onClick={() => void post({ action: "create_test", id: a.id, test: { kind: "bar_vs_none", goal } })}>Create draft test: bar vs no bar</button>
                <span style={{ color: "var(--n-500)" }}> (creates a draft only, {testIdFor(a.id)}. It does not start.)</span></>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
