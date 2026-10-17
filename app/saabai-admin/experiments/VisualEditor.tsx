"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { notify } from "../ui/Feedback";
import { api, CopyView, EditForm, nf, pct, tone, vtone, type Detail } from "./ExperimentsClient";
import { isLegalPath, isProtectedText, kindForElement, suggestSlot, type ElementInfo } from "../../../lib/exp/editor";
import { captureOrig, imagePathOf, previewInto, sectionOf } from "../../../lib/exp/editor-dom";
import { KIND_RULES, type SlotKind } from "../../../lib/exp/core";
import { findTarget, stableSelector } from "../../../lib/exp/overlay-dom";
import "./experiments.css";

type Picked =
  | { type: "slot"; slotName: string; expId: string }
  | { type: "candidate"; tag: string; kind: SlotKind; text: string; emphasis: string; section: string; selector: string | null };

const STYLE = `
.sb-edit [data-exp-slot]{outline:2px dashed #0d9488 !important;outline-offset:4px;cursor:pointer !important}
.sb-edit .sb-hov{outline:3px solid #2563eb !important;outline-offset:4px;cursor:pointer !important}
.sb-edit .sb-cand{outline:2px dotted #94a3b8 !important;outline-offset:4px;cursor:copy !important}
.sb-edit .sb-sel{outline:3px solid #f59e0b !important;outline-offset:4px}
`;
const EXCL = "[data-no-test], [itemprop], script, style, svg";
const PICKABLE = "h1,h2,h3,h4,h5,h6,button,a,p,li,blockquote,figcaption,dt,dd,td,th,label,small,span,div,strong,em,summary,cite,img,input,textarea";
const KIND_LABEL: Record<SlotKind, string> = { headline: "headline", button: "button", text: "text", link: "link", price: "price", placeholder: "form hint", image: "image" };

function describe(el: HTMLElement): ElementInfo {
  const kids = Array.from(el.children).filter((c) => !["SPAN", "BR"].includes(c.tagName));
  const spans = el.querySelectorAll(":scope > span").length;
  const credit = !!el.parentElement && isProtectedText(el.parentElement.textContent ?? "") && (el.parentElement.textContent ?? "").length < 120;
  return {
    tag: el.tagName, className: typeof el.className === "string" ? el.className : "", complex: kids.length > 0 || spans > 1, spans,
    excluded: credit || !!el.closest(EXCL) || (!!el.closest("[data-exp-slot]") && !el.hasAttribute("data-exp-slot")),
    text: el.textContent ?? "", placeholder: el.getAttribute("placeholder") ?? undefined, src: el.tagName === "IMG" ? imagePathOf(el) : undefined, alt: el.getAttribute("alt") ?? undefined,
  };
}

/** The element to offer for a click: a link or button ancestor first, then the nearest eligible element upwards. */
function pick(t: HTMLElement): HTMLElement | null {
  const slotEl = t.closest<HTMLElement>("[data-exp-slot]");
  if (slotEl) return slotEl;
  const c = t.closest<HTMLElement>("a,button");
  if (c && kindForElement(describe(c))) return c;
  let n: HTMLElement | null = t;
  for (let i = 0; n && i < 4; i++, n = n.parentElement) {
    if (n.matches(PICKABLE) && kindForElement(describe(n))) return n;
    if (n.matches("section, main, body")) break;
  }
  return null;
}

function copyOf(el: HTMLElement, kind: SlotKind): { text: string; emphasis: string } {
  const flat = (x: string) => x.replace(/\s+/g, " ").trim();
  if (kind === "image") return { text: imagePathOf(el), emphasis: flat(el.getAttribute("alt") ?? "") };
  if (kind === "placeholder") return { text: flat(el.getAttribute("placeholder") ?? ""), emphasis: "" };
  if (kind === "button") return { text: flat((el.textContent ?? "").replace(/\s*→\s*$/, "")), emphasis: "" };
  if (kind !== "headline") return { text: flat(el.textContent ?? ""), emphasis: "" };
  const span = el.querySelector(":scope > span");
  const emphasis = (span?.textContent ?? "").trim();
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelector(":scope > span")?.remove();
  return { text: flat(clone.textContent ?? ""), emphasis };
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
  const selKind = useRef<SlotKind>("headline");
  const pathRef = useRef("/");
  const editRef = useRef(editing);
  editRef.current = editing;
  pathRef.current = path;

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
      const found = pick(t);
      if (found && !found.hasAttribute("data-exp-slot") && isLegalPath(pathRef.current)) return null;
      return found;
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
      if (selEl.current && selEl.current !== t) previewInto(selEl.current, orig.current, selKind.current, null);
      selEl.current = t; orig.current = captureOrig(t);
      t.classList.add("sb-sel");
      const slot = t.getAttribute("data-exp-slot");
      if (slot) { selKind.current = (["headline","button","text","link","price","placeholder","image"].includes(t.getAttribute("data-exp-kind") ?? "") ? t.getAttribute("data-exp-kind") : "headline") as SlotKind; setPicked({ type: "slot", slotName: slot, expId: t.getAttribute("data-exp-id") || slot.replace(/\./g, "-") }); return; }
      const kind = kindForElement(describe(t))!;
      selKind.current = kind;
      const c = copyOf(t, kind);
      setPicked({ type: "candidate", tag: t.tagName.toLowerCase(), kind, text: c.text, emphasis: c.emphasis, section: sectionOf(t), selector: stableSelector(t) });
    }, true);
  }, []);

  useEffect(() => { frame.current?.contentDocument?.documentElement.classList.toggle("sb-edit", editing); if (!editing) { clearSel(); setPicked(null); } }, [editing, clearSel]);

  const preview = useCallback((kind: SlotKind, v: { text: string; emphasis?: string } | null) => {
    if (selEl.current) previewInto(selEl.current, orig.current, kind, v);
  }, []);

  const onLoad = () => {
    clearSel(); setPicked(null); wire();
    // Show overlay tests (no code wrapper) as test elements too, so clicking one opens its variants.
    const doc = frame.current?.contentDocument; const here = pathRef.current;
    if (!doc) return;
    fetch("/api/admin/experiments").then((r) => r.json()).then((d: { items?: { id: string; slot: string; path: string; kind?: string; overlay?: { sel: string; fp: string; tag: string } }[] }) => {
      for (const it of d.items ?? []) {
        if (!it.overlay || it.path !== here || doc.querySelector(`[data-exp-id="${it.id}"]`)) continue;
        const el = findTarget(doc, { s: it.overlay.sel, f: it.overlay.fp, t: it.overlay.tag });
        if (el) { el.setAttribute("data-exp-slot", it.slot); el.setAttribute("data-exp-id", it.id); el.setAttribute("data-exp-kind", it.kind ?? "headline"); }
      }
    }).catch(() => { /* editor still works without the highlights */ });
  };
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
        <span className="xp-note"><i className="xp-key t" /> test element <i className="xp-key g" /> not a test yet (headings, text, buttons, links, prices, images, form hints) <i className="xp-key a" /> selected</span>
      </div>
      <div className="xp-ve">
        <div className="xp-ve-frame">
          <iframe ref={frame} key={src} src={src} title="Site preview" onLoad={onLoad} style={{ width: mobile ? 390 : "100%" }} />
        </div>
        <aside className="xp-ve-panel">
          {!picked && <Card><CardBody><p className="xp-note">{editing ? "Hover the page. Teal dashed outlines are existing test elements, grey dotted ones are headings, text, buttons, links, prices, images and form hints you could turn into a test. Click one." : "Edit mode is off, so the page behaves normally. Turn it on to pick an element."}</p></CardBody></Card>}
          {picked?.type === "slot" && <SlotPanel key={picked.expId} expId={picked.expId} onPreview={preview} onClose={() => { preview("headline", null); clearSel(); setPicked(null); }} />}
          {picked?.type === "candidate" && <CandidatePanel key={picked.text} p={picked} path={path} onClose={() => { clearSel(); setPicked(null); }} onStarted={(expId, slotName) => setPicked({ type: "slot", slotName, expId })} />}
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
  const e = d.experiment, kind: SlotKind = e.kind && e.kind in KIND_RULES ? e.kind : "headline";
  const kr = KIND_RULES[kind];
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
        {e.overlay && <p className="xp-note">Live without a code change. {e.wrapPr?.state === "open" && e.wrapPr.url ? <>Native wrap: <a href={e.wrapPr.url} target="_blank" rel="noreferrer">draft PR #{e.wrapPr.number}</a> waiting for your review. When merged, the test switches over with no change for visitors or results.</> : e.wrapPr?.state === "pending" ? "Opening a draft code change in the background…" : e.wrapPr?.state === "failed" ? "The background code change couldn't be opened (the test still works)." : e.wrapPr?.state === "manual" ? "No code change was opened (no GitHub access). The test still works." : ""}</p>}
        <div className="xp-acts" style={{ margin: "10px 0" }}>
          {e.status === "running" && <Button size="sm" disabled={busy} onClick={() => act({ type: "set_status", status: "paused" }, "Test paused. Everyone sees the control.")}>Pause test</Button>}
          {e.status === "draft" && <Button size="sm" variant="acc" disabled={busy || e.variants.filter((x) => x.active).length < 2} onClick={() => act({ type: "set_status", status: "running" }, "Test started.")}>Start test</Button>}
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
                  ? <EditForm image={kind === "image"} noun={kr.noun} hasEmph={kr.emphasis} maxLen={kr.maxText} v={x} hasData={(r?.impressions ?? 0) > 0} busy={busy} onCancel={() => setEditing(null)} onSave={async (t, em) => { if (await act({ type: "update_variant", variantId: x.id, text: t, emphasis: em }, "Copy saved. Live within about a minute.")) { setEditing(null); onPreview(kind, { text: t, emphasis: em }); } }} />
                  : <>
                    <CopyView v={x} kind={kind} />
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

function CandidatePanel({ p, path, onClose, onStarted }: { p: Extract<Picked, { type: "candidate" }>; path: string; onClose: () => void; onStarted: (expId: string, slot: string) => void }) {
  const [name, setName] = useState(`${KIND_LABEL[p.kind].charAt(0).toUpperCase() + KIND_LABEL[p.kind].slice(1)}: ${p.text.split("/").pop()!.slice(0, 40)}`.slice(0, 80));
  const [slot] = useState(suggestSlot(path, p.section, p.kind));
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState("");
  const [res, setRes] = useState<{ mode: string; prUrl?: string; prNumber?: number; snippet?: string; message?: string } | null>(null);
  const [manual, setManual] = useState(!p.selector);
  const bad = /[\u2013\u2014]/.test(name);

  async function start(text: string, emphasis: string) {
    if (busy) return;
    setBusy(true); setFail("");
    try {
      const r = await api("/api/admin/experiments/overlay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path, slot, kind: p.kind, name, tag: p.tag, section: p.section, selector: p.selector, control: { text: p.text, emphasis: p.emphasis }, variant: { text, emphasis } }) });
      notify.success("Test started. Visitors start seeing it within about a minute.");
      onStarted(r.expId, r.slot);
    } catch (e) {
      const m = (e as Error).message; setFail(m); notify.error(m);
      if (/already a test/i.test(m)) setManual(false);
    } finally { setBusy(false); }
  }
  async function request() {
    if (busy || res) return;
    setBusy(true); setFail("");
    try {
      const r = await api("/api/admin/experiments/wrap-request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path, slot, kind: p.kind, name, tag: p.tag, section: p.section, control: { text: p.text, emphasis: p.emphasis } }) });
      setRes(r); notify.success(r.mode === "pr" ? "Draft pull request opened. Nothing is live." : "Request ready.");
    } catch (e) { setFail((e as Error).message); notify.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Card>
      <CardBody>
        <div className="xp-ve-head"><div><b>Not a test yet</b><div className="xp-note">{p.tag} on {path}</div></div><button className="xp-back" style={{ margin: 0 }} onClick={onClose}>Close</button></div>
        <div className="xp-prev" style={{ margin: "10px 0" }}><CopyView kind={p.kind} v={{ text: p.text, emphasis: p.emphasis }} /></div>
        <p className="xp-note">This is a {KIND_LABEL[p.kind]}, so it can become a test right now.{p.kind === "price" ? " Only the displayed price words change. What a customer is actually charged is never touched, so only test wording you can honour." : ""}{p.kind === "image" ? " Variant images must already be on the site (a file in the public folder), and should be the same shape as the original." : ""}{p.kind === "link" ? " Only the link words change, never where it goes." : ""}</p>
        {!manual && (
          <div className="xp-form">
            <label>Test name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
            {bad && <p className="xp-note" style={{ color: "var(--bad)" }}>Please avoid long dashes.</p>}
            <EditForm noun={p.kind === "image" ? "variant image path" : p.kind === "button" ? "variant button label" : "variant copy"} hasEmph={p.kind === "headline"} maxLen={p.kind === "image" ? 190 : KIND_RULES[p.kind].maxText} v={{ text: "" }} hasData={false} busy={busy || bad || !name.trim()} saveLabel="Start split test" image={p.kind === "image"} onSave={start} />
            <p className="xp-note">Starts straight away with no pull request. A draft code change is also opened in the background so the element gets wrapped natively. It never merges by itself.</p>
            {fail && <div className="xp-err" role="alert">{fail}</div>}
            <button className="xp-back" style={{ margin: 0 }} onClick={() => setManual(true)}>This element won't start? Use a code request instead</button>
          </div>
        )}
        {manual && !res && (
          <div className="xp-form">
            <p className="xp-note">{p.selector ? "" : "This element couldn't be pinned down reliably, so it needs wrapping in code first. "}This opens a draft pull request for you to look at. It never merges and never starts a test.</p>
            <label>Test name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
            <div className="xp-acts"><Button variant="acc" className={busy ? "loading" : ""} disabled={busy || bad || !name.trim()} onClick={request}>{busy ? "Opening draft pull request…" : "Request test slot (draft PR)"}</Button></div>
            {fail && <div className="xp-err" role="alert">{fail}</div>}
          </div>
        )}
        {res?.mode === "pr" && <div className="xp-ok" role="status">Draft PR opened: <a href={res.prUrl} target="_blank" rel="noreferrer">#{res.prNumber}</a>. Nothing is live. Once it is wrapped and checked, the test appears in the list as a draft.</div>}
        {res?.mode === "manual" && (<><p className="xp-note" style={{ marginTop: 10 }}>{res.message}</p><pre className="xp-pre">{res.snippet}</pre></>)}
      </CardBody>
    </Card>
  );
}
