"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { notify } from "../ui/Feedback";
import { api, CopyView, EditForm, nf, pct, tone, vtone, type Detail } from "./ExperimentsClient";
import { kindForElement, suggestSlot, type ElementInfo } from "../../../lib/exp/editor";
import { previewInto, sectionOf } from "../../../lib/exp/editor-dom";
import type { SlotKind } from "../../../lib/exp/core";
import "./experiments.css";

type Picked =
  | { type: "slot"; slotName: string; expId: string }
  | { type: "candidate"; tag: string; kind: SlotKind; text: string; emphasis: string; section: string };

const STYLE = `
.sb-edit [data-exp-slot]{outline:2px dashed #0d9488 !important;outline-offset:4px;cursor:pointer !important}
.sb-edit .sb-hov{outline:3px solid #2563eb !important;outline-offset:4px;cursor:pointer !important}
.sb-edit .sb-cand{outline:2px dotted #94a3b8 !important;outline-offset:4px;cursor:copy !important}
.sb-edit .sb-sel{outline:3px solid #f59e0b !important;outline-offset:4px}
`;
const EXCL = "nav, footer, form, header, [data-no-test], [itemprop], script, style";

function describe(el: HTMLElement): ElementInfo {
  const kids = Array.from(el.children).filter((c) => !["SPAN", "BR"].includes(c.tagName));
  const spans = el.querySelectorAll(":scope > span").length;
  return { tag: el.tagName, className: typeof el.className === "string" ? el.className : "", complex: kids.length > 0 || spans > 1, excluded: !!el.closest(EXCL) || !!el.closest("[data-exp-slot]") && !el.hasAttribute("data-exp-slot"), text: el.textContent ?? "" };
}

function copyOf(el: HTMLElement, kind: SlotKind): { text: string; emphasis: string } {
  if (kind === "button") return { text: (el.textContent ?? "").replace(/\s*→\s*$/, "").replace(/\s+/g, " ").trim(), emphasis: "" };
  const span = el.querySelector(":scope > span");
  const emphasis = (span?.textContent ?? "").trim();
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelector(":scope > span")?.remove();
  return { text: (clone.textContent ?? "").replace(/\s+/g, " ").trim(), emphasis };
}

export default function VisualEditor() {
  const [paths, setPaths] = useState<string[]>(["/"]);
  const [path, setPath] = useState("/");
  const [mobile, setMobile] = useState(false);
  const [editing, setEditing] = useState(true);
  const [picked, setPicked] = useState<Picked | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const selEl = useRef<HTMLElement | null>(null);
  const orig = useRef<string>("");
  const editRef = useRef(editing);
  editRef.current = editing;

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("page");
    if (p && p.startsWith("/") && !p.startsWith("//")) setPath(p);
    fetch("/sitemap.xml").then((r) => r.text()).then((x) => {
      const list = [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => { try { const u = new URL(m[1]); return u.pathname || "/"; } catch { return ""; } }).filter((s) => s.startsWith("/"));
      const uniq = Array.from(new Set(["/", ...list])).slice(0, 80);
      if (uniq.length) setPaths(uniq);
    }).catch(() => { /* keep "/" */ });
  }, []);

  const clearSel = useCallback(() => {
    selEl.current?.classList.remove("sb-sel");
    selEl.current = null;
  }, []);

  const wire = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc || !doc.body) return;
    if (!doc.getElementById("sb-edit-style")) { const s = doc.createElement("style"); s.id = "sb-edit-style"; s.textContent = STYLE; doc.head.appendChild(s); }
    doc.documentElement.classList.toggle("sb-edit", editRef.current);
    const w = doc as Document & { __sbWired?: boolean };
    if (w.__sbWired) return;
    w.__sbWired = true;
    const target = (e: Event): HTMLElement | null => {
      if (!editRef.current) return null;
      const t = e.target as HTMLElement | null;
      if (!t || !t.closest) return null;
      const slotEl = t.closest<HTMLElement>("[data-exp-slot]");
      if (slotEl) return slotEl;
      const c = t.closest<HTMLElement>("h1,h2,h3,button,a");
      return c && kindForElement(describe(c)) ? c : null;
    };
    let hov: HTMLElement | null = null;
    doc.addEventListener("mouseover", (e) => {
      const t = target(e);
      if (hov && hov !== t) hov.classList.remove("sb-hov", "sb-cand");
      hov = t;
      if (t) t.classList.add(t.hasAttribute("data-exp-slot") ? "sb-hov" : "sb-cand");
    }, true);
    doc.addEventListener("mouseout", () => { hov?.classList.remove("sb-hov", "sb-cand"); hov = null; }, true);
    doc.addEventListener("click", (e) => {
      const t = target(e);
      if (!t) return;
      e.preventDefault(); e.stopPropagation();
      t.classList.remove("sb-hov", "sb-cand");
      selEl.current?.classList.remove("sb-sel");
      if (selEl.current && selEl.current !== t) previewInto(selEl.current, orig.current, "headline", null);
      selEl.current = t; orig.current = t.innerHTML;
      t.classList.add("sb-sel");
      const slot = t.getAttribute("data-exp-slot");
      if (slot) { setPicked({ type: "slot", slotName: slot, expId: t.getAttribute("data-exp-id") || slot.replace(/\./g, "-") }); return; }
      const kind = kindForElement(describe(t))!;
      const c = copyOf(t, kind);
      setPicked({ type: "candidate", tag: t.tagName.toLowerCase(), kind, text: c.text, emphasis: c.emphasis, section: sectionOf(t) });
    }, true);
  }, []);

  useEffect(() => { frame.current?.contentDocument?.documentElement.classList.toggle("sb-edit", editing); if (!editing) { clearSel(); setPicked(null); } }, [editing, clearSel]);

  const preview = useCallback((kind: SlotKind, v: { text: string; emphasis?: string } | null) => {
    if (selEl.current) previewInto(selEl.current, orig.current, kind, v);
  }, []);

  const onLoad = () => { clearSel(); setPicked(null); wire(); };
  const src = path.startsWith("/") && !path.startsWith("//") ? path : "/";

  return (
    <div className="pg xp xp-wide">
      <div className="ph">
        <div><h1>Visual editor</h1><p className="sub">See the live page, click a test element to edit its variants. Nothing here changes what visitors see unless you save a change, and you only ever see the original copy.</p></div>
        <a className="xp-editlink" href="/saabai-admin/experiments">All tests</a>
      </div>
      <div className="xp-ve-bar">
        <label>Page
          <select className="xp-in" value={path} onChange={(e) => { setPath(e.target.value); history.replaceState(null, "", `?view=editor&page=${encodeURIComponent(e.target.value)}`); }}>
            {paths.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <div className="xp-tabs" style={{ margin: 0 }}>
          <button className={!mobile ? "on" : ""} onClick={() => setMobile(false)}>Desktop</button>
          <button className={mobile ? "on" : ""} onClick={() => setMobile(true)}>Mobile</button>
          <button className={editing ? "on" : ""} onClick={() => setEditing(!editing)}>{editing ? "Edit mode on" : "Edit mode off"}</button>
        </div>
        <span className="xp-note"><i className="xp-key t" /> test element <i className="xp-key g" /> not a test yet (headlines and buttons) <i className="xp-key a" /> selected</span>
      </div>
      <div className="xp-ve">
        <div className="xp-ve-frame">
          <iframe ref={frame} key={src} src={src} title="Site preview" onLoad={onLoad} style={{ width: mobile ? 390 : "100%" }} />
        </div>
        <aside className="xp-ve-panel">
          {!picked && <Card><CardBody><p className="xp-note">{editing ? "Hover the page. Teal dashed outlines are existing test elements, grey dotted ones are headlines and buttons you could turn into a test. Click one." : "Edit mode is off, so the page behaves normally. Turn it on to pick an element."}</p></CardBody></Card>}
          {picked?.type === "slot" && <SlotPanel key={picked.expId} expId={picked.expId} onPreview={preview} onClose={() => { preview("headline", null); clearSel(); setPicked(null); }} />}
          {picked?.type === "candidate" && <CandidatePanel key={picked.text} p={picked} path={path} onClose={() => { clearSel(); setPicked(null); }} />}
        </aside>
      </div>
    </div>
  );
}

function SlotPanel({ expId, onPreview, onClose }: { expId: string; onPreview: (k: SlotKind, v: { text: string; emphasis?: string } | null) => void; onClose: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const load = useCallback(async () => { try { setD(await api(`/api/admin/experiments/${expId}`)); setErr(""); } catch (e) { setErr((e as Error).message); } }, [expId]);
  useEffect(() => { load(); }, [load]);

  async function act(action: Record<string, unknown>, ok: string): Promise<boolean> {
    if (!d) return false;
    setBusy(true);
    try { setD(await api(`/api/admin/experiments/${expId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, rev: d.experiment.rev ?? 0 }) })); notify.success(ok); return true; }
    catch (e) { notify.error((e as Error).message); if (/changed this test/.test((e as Error).message)) load(); return false; }
    finally { setBusy(false); }
  }

  if (err) return <Card><CardBody><div className="xp-err">{err}</div><Button variant="gh" onClick={onClose}>Close</Button></CardBody></Card>;
  if (!d) return <Card><CardBody><p className="muted">Loading…</p></CardBody></Card>;
  const e = d.experiment, kind: SlotKind = e.kind === "button" ? "button" : "headline";
  const byId = new Map(d.analysis.variants.map((x) => [x.id, x]));
  const v = d.analysis.verdict;
  return (
    <Card>
      <CardBody>
        <div className="xp-ve-head"><div><b>{e.name ?? e.id}</b><div className="xp-note">{e.slot} on {e.path}</div></div><button className="xp-back" style={{ margin: 0 }} onClick={onClose}>Close</button></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}><Badge tone={tone(e.status)}>{e.status}</Badge><Badge tone={vtone(v.kind)}>{v.headline}</Badge></div>
        <div className="xp-nums" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <div>Views<b>{nf(d.totals.views)}</b></div><div>Conversions<b>{nf(d.totals.conversions)}</b></div><div>Rate<b>{pct(d.totals.rate)}</b></div>
        </div>
        <div className="xp-acts" style={{ margin: "10px 0" }}>
          {e.status === "running" && <Button size="sm" disabled={busy} onClick={() => act({ type: "set_status", status: "paused" }, "Test paused. Everyone sees the control.")}>Pause test</Button>}
          {e.status === "paused" && <Button size="sm" variant="acc" disabled={busy} onClick={() => act({ type: "set_status", status: "running" }, "Test resumed.")}>Resume test</Button>}
          <Button size="sm" variant="gh" onClick={() => onPreview(kind, null)}>Show control in page</Button>
          <a className="xp-editlink" href={`/saabai-admin/experiments?id=${e.id}`}>Full results</a>
        </div>
        <div className="xp-ve-vars">
          {e.variants.map((x) => {
            const r = byId.get(x.id), isCtl = x.id === e.defaultVariantId;
            return (
              <div key={x.id} className={`xp-ve-var${x.active ? "" : " off"}`}>
                <div className="xp-top"><span className="nm">{x.id.toUpperCase()}{isCtl && <Badge tone="neutral">control</Badge>}{!x.active && <Badge tone="warn">paused</Badge>}</span>
                  <span className="xp-note">{r ? `${nf(r.impressions)} views · ${pct(r.rate)} · ${pct(r.probBest, 0)} best` : ""}</span></div>
                {editing === x.id
                  ? <EditForm noun={kind === "button" ? "button label" : "headline"} hasEmph={kind !== "button"} maxLen={kind === "button" ? 40 : 90} v={x} hasData={(r?.impressions ?? 0) > 0} busy={busy} onCancel={() => setEditing(null)} onSave={async (t, em) => { if (await act({ type: "update_variant", variantId: x.id, text: t, emphasis: em }, "Copy saved. Live within about a minute.")) { setEditing(null); onPreview(kind, { text: t, emphasis: em }); } }} />
                  : <>
                    <CopyView v={x} />
                    <div className="xp-acts">
                      <Button size="sm" onClick={() => onPreview(kind, x)}>Preview in page</Button>
                      <Button size="sm" variant="gh" disabled={busy} onClick={() => setEditing(x.id)}>Edit</Button>
                      {!isCtl && <Button size="sm" variant="gh" disabled={busy} onClick={() => act({ type: "set_variant_active", variantId: x.id, active: !x.active }, x.active ? "Variant paused." : "Variant resumed.")}>{x.active ? "Pause" : "Resume"}</Button>}
                    </div></>}
              </div>
            );
          })}
        </div>
        {adding
          ? <EditForm noun={kind === "button" ? "button label" : "headline"} hasEmph={kind !== "button"} maxLen={kind === "button" ? 40 : 90} v={{ text: "" }} hasData={false} busy={busy} saveLabel="Add variant" onCancel={() => setAdding(false)} onSave={async (t, em) => { if (await act({ type: "add_variant", text: t, emphasis: em }, "Variant added. It starts getting visitors within about a minute.")) { setAdding(false); onPreview(kind, { text: t, emphasis: em }); } }} />
          : <div className="xp-acts" style={{ marginTop: 10 }}><Button variant="sec" disabled={busy || e.variants.length >= 8} onClick={() => setAdding(true)}>Add variant</Button></div>}
        <p className="xp-note" style={{ marginTop: 8 }}>Previews only change this editor frame. Saving a change is logged and goes live for visitors within about a minute.</p>
      </CardBody>
    </Card>
  );
}

function CandidatePanel({ p, path, onClose }: { p: Extract<Picked, { type: "candidate" }>; path: string; onClose: () => void }) {
  const [name, setName] = useState(`${p.kind === "button" ? "Button" : "Headline"}: ${p.text.slice(0, 40)}`.slice(0, 80));
  const [slot, setSlot] = useState(suggestSlot(path, p.section, p.kind));
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ mode: string; prUrl?: string; prNumber?: number; snippet?: string; message?: string } | null>(null);
  async function request() {
    setBusy(true);
    try {
      const r = await api("/api/admin/experiments/wrap-request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path, slot, kind: p.kind, name, tag: p.tag, section: p.section, control: { text: p.text, emphasis: p.emphasis } }) });
      setRes(r); notify.success(r.mode === "pr" ? "Draft pull request opened. Nothing is live." : "Request ready.");
    } catch (e) { notify.error((e as Error).message); } finally { setBusy(false); }
  }
  const bad = /[\u2013\u2014]/.test(name);
  return (
    <Card>
      <CardBody>
        <div className="xp-ve-head"><div><b>Not a test yet</b><div className="xp-note">{p.tag} on {path}</div></div><button className="xp-back" style={{ margin: 0 }} onClick={onClose}>Close</button></div>
        <div className="xp-prev" style={{ margin: "10px 0" }}><CopyView v={{ text: p.text, emphasis: p.emphasis }} /></div>
        <p className="xp-note">This is plain {p.kind === "button" ? "button text" : "headline text"}, so it can become a test. It has to be wrapped in the site code first so visitors get the right words straight away, with no flicker. This opens a draft pull request for you to look at. It never merges and never starts a test.</p>
        {!res && (
          <div className="xp-form">
            <label>Test name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
            <label>Slot name<input value={slot} onChange={(e) => setSlot(e.target.value.toLowerCase())} maxLength={80} /></label>
            {bad && <p className="xp-note" style={{ color: "var(--bad)" }}>Please avoid long dashes.</p>}
            <div className="xp-acts"><Button variant="acc" disabled={busy || bad || !name.trim()} onClick={request}>Request test slot (draft PR)</Button></div>
          </div>
        )}
        {res?.mode === "pr" && <p className="xp-note" style={{ marginTop: 10 }}>Draft pull request #{res.prNumber} opened: <a href={res.prUrl} target="_blank" rel="noreferrer">{res.prUrl}</a>. Once it is wrapped and checked, the test appears in the list as a draft.</p>}
        {res?.mode === "manual" && (<><p className="xp-note" style={{ marginTop: 10 }}>{res.message}</p><pre className="xp-pre">{res.snippet}</pre></>)}
      </CardBody>
    </Card>
  );
}
