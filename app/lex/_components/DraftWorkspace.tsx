"use client";

/**
 * Draft Documents workspace (design: Lex docs flow, 29 Oct 2026, Inter).
 * Stages: resume (home), pick a type, upload supporting documents, the form (checklist rail, grouped
 * field cards with source chips, Verify drawer or bottom sheet) and the review gate.
 *
 * The checklist text (p.parties) stays the single source of truth for /api/lex-draft. The form, the rail
 * and the gate are generated from it (lib/lex-draft-form.ts). Lex does not draft while any answer is
 * still marked Verify.
 *
 * Progress is saved in this browser only (lib/lex-draft-progress.ts). Uploaded files are not kept.
 */
import { useEffect, useRef, useState } from "react";
import { DOCUMENT_TYPES, fillPartiesTemplate, type DocumentType } from "../../../lib/lex-document-types";
import { DOC_KIND_LABELS, prefillChecklist, profileFor, sourceLabel, type MergedDeed, type PrepState } from "../../../lib/lex-doc-extract";
import { needDone, needsFor } from "../../../lib/lex-doc-needs";
import { describeDocumentPrivacy } from "../../../lib/lex-privacy/document-privacy-text";
import {
  GROUP_LABELS, draftGate, formProgress, groupsOf, parseForm, setAnswer, type FormField, type FormGroupId, groupSummary, fieldText } from "../../../lib/lex-draft-form";
import type { LexError } from "../../../lib/lex-errors";
import { ErrorCard } from "./States";
import { Icon } from "./icons";
import "./draft-workspace.css";

type Length = "default" | "concise" | "balanced" | "detailed";
type Stage = "home" | "pick" | "upload" | "form" | "review";

const CATEGORY_LABELS: Record<string, string> = { trust: "Trusts", "family-law": "Family law", commercial: "Commercial", employment: "Employment", property: "Property" };
/** Short tile lines. Employment per QA round 1: no compliance claims. */
const TILE_LINES: Record<string, string> = { employment: "Pay, duties and leave" };
const FILE_ERRORS: Record<string, string> = {
  scanned: "This looks like a scanned image, so its text could not be read. Type those details in, or upload a text PDF or Word copy.",
  unreadable: "Couldn't read this file.",
  unsupported: "Only PDF, Word (.docx) or text files.",
  "too-large": "Too large (max 10MB).",
  empty: "No text found in this file.",
};

export type WorkspaceProps = {
  typeId: string; setTypeId: (v: string) => void;
  jurisdiction: string; setJurisdiction: (v: string) => void;
  jurisdictions: string[];
  parties: string; setParties: (v: string) => void;
  length: Length; setLength: (v: Length) => void;
  instructions: string; setInstructions: (v: string) => void;
  prep: PrepState; setPrep: (s: PrepState) => void;
  savedAt?: number | null; onReset?: () => void;
  onDraft: () => void; busy: boolean; thinkLabel: string; error: LexError | null;
  /** Open on this stage (e.g. "form" when editing answers after a draft). */
  initialStage?: Stage;
};

function timeAEST(ms: number) {
  return new Date(ms).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane" }).replace(/\s?(am|pm)$/i, (m) => "\u00a0" + m.trim().toUpperCase());
}
function dayAEST(ms: number) {
  return new Date(ms).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Brisbane" });
}

function Ring({ done, total, warn }: { done: number; total: number; warn?: boolean }) {
  if (warn) return <span className="lxw-ring warn" aria-hidden="true">!</span>;
  if (total && done >= total) return <span className="lxw-ring done" aria-hidden="true"><Icon name="check" size={11} /></span>;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return <span className="lxw-ring" aria-hidden="true" style={{ background: `conic-gradient(var(--navy) ${pct}%, transparent 0)` }} />;
}

function Chips({ f, onCheck }: { f: FormField; onCheck?: () => void }) {
  return (
    <div className="lxw-meta">
      {f.sources.map((s) => <span key={s} className="lxw-chip src" title={`From ${s}`}><span className="lxw-file" aria-hidden="true" />{s}</span>)}
      {f.status === "verify" && <span className="lxw-chip ver"><b aria-hidden="true">!</b>Verify</span>}
      {f.status === "confirmed" && <span className="lxw-chip ok"><Icon name="check" size={11} />Confirmed</span>}
      {f.status === "entered" && <span className="lxw-chip grey">Entered by you</span>}
      {f.status === "needs" && <span className="lxw-chip grey">{f.optional ? "Optional" : "Needs you"}</span>}
      {f.status === "verify" && onCheck && <button type="button" className="lxw-btn sm" onClick={onCheck}>Check source</button>}
    </div>
  );
}

export function DraftWorkspace(p: WorkspaceProps) {
  const doc: DocumentType | undefined = DOCUMENT_TYPES.find((d) => d.id === p.typeId);
  const docName = doc?.name ?? "Custom document";
  const template = doc?.partiesTemplate ? fillPartiesTemplate(doc.partiesTemplate) : "";
  const trust = p.typeId === "trust-distribution-resolution";
  const fields = template ? parseForm(p.parties, template, trust) : [];
  const groups = groupsOf(fields);
  const prog = formProgress(fields);
  const gate = draftGate(fields);
  const hasWork = !!(p.parties.trim() || p.prep.extracted || p.prep.manual.length);

  const [stageSet, setStage] = useState<Stage | null>(p.initialStage ?? null);
  const stage: Stage = stageSet ?? (p.savedAt && hasWork ? "home" : "pick");
  const [active, setActive] = useState<FormGroupId | null>(null);
  const [drawer, setDrawer] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState<{ n: number; files: number } | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const profile = profileFor(doc);
  const ex: MergedDeed | null = p.prep.extracted && p.prep.extracted.profile === profile.id ? p.prep.extracted : null;
  const needs = needsFor(p.typeId, doc?.category);
  const needState = { extracted: ex, parties: p.parties, template: template || undefined, manual: p.prep.manual };
  const activeGroup = active ?? groups.find((g) => fields.some((f) => f.group === g && (f.status === "verify" || (f.status === "needs" && !f.optional)))) ?? groups[0];
  const nextVerify = gate.open[0];
  const nextTodo = nextVerify ?? fields.find((f) => f.status === "needs" && !f.optional);

  const [typed, setTyped] = useState<Record<string, string>>({});
  const set = (key: string, value: string) => p.setParties(setAnswer(p.parties, template, key, value));
  const confirm = (key: string, value: string) => p.setParties(setAnswer(p.parties, template, key, value, { confirm: true }));
  const fieldId = (key: string) => `lxw-f-${key.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  function goField(key: string) {
    const f = fields.find((x) => x.key === key);
    if (f) setActive(f.group);
    setStage("form");
    setTimeout(() => {
      const el = document.getElementById(fieldId(key));
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el?.querySelector("input,textarea,button") as HTMLElement | null)?.focus({ preventScroll: true });
    }, 30);
  }
  function openDrawer(key: string) {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setStage("form");
    setDrawer(key);
  }
  function closeDrawer() {
    setDrawer(null);
    setTimeout(() => returnFocus.current?.focus(), 0);
  }

  async function upload(list: FileList | null) {
    if (!list?.length || loading) return;
    const names = Array.from(list).map((f) => f.name);
    setLoading(names); setErr(null); setStage("upload");
    try {
      const fd = new FormData();
      Array.from(list).forEach((f) => fd.append("files", f));
      fd.append("documentType", p.typeId);
      const res = await fetch("/api/lex-doc-extract", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as (MergedDeed & { error?: string }) | null;
      if (!res.ok || !data || data.error) { setErr(data?.error && res.status === 400 ? data.error : "Lex could not read those files. Try again, or fill in the form by hand."); return; }
      p.setPrep({ ...p.prep, extracted: data });
    } catch {
      setErr("Lex could not read those files. Try again, or fill in the form by hand.");
    } finally {
      setLoading(null);
    }
  }
  function continueToForm() {
    if (ex && ex.fields.some((f) => f.value)) {
      const base = p.parties.trim() ? p.parties : template;
      p.setParties(prefillChecklist(base, ex));
      setPrefilled({ n: ex.fields.filter((f) => f.value).length, files: ex.files.filter((f) => !f.error).length });
    } else if (!p.parties.trim() && template) p.setParties(template);
    setStage("form");
  }
  function startForm() {
    if (!p.parties.trim() && template) p.setParties(template);
    setStage("form");
  }

  // Esc closes the drawer.
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeDrawer(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  const legal = <p className="lxw-legal">Drafting assistance only, not legal advice. Check every reference and Verify marker before this document is used.</p>;

  const bar = (
    <div className="lxw-bar">
      <div className="lxw-crumb">
        <button type="button" className="lxw-link" onClick={() => setStage(p.savedAt && hasWork ? "home" : "pick")}>Draft documents</button>
        {stage !== "home" && stage !== "pick" && <> / <b>{docName}</b></>}
      </div>
      <span className="lx-sp" />
      {p.savedAt ? <span className="lxw-saved"><i aria-hidden="true" />Saved {timeAEST(p.savedAt)}</span> : null}
      {(stage === "form" || stage === "review") && (
        <button type="button" className="lxw-btn" onClick={() => fileInput.current?.click()} disabled={p.busy || !!loading}>Add documents</button>
      )}
      {stage === "form" && (
        <button type="button" className="lxw-btn primary" onClick={() => setStage("review")}>
          {prog.verify ? `Review, ${prog.verify} to verify` : "Review"}
        </button>
      )}
    </div>
  );

  // ── Resume ────────────────────────────────────────────────────────────────
  const home = (() => {
    const trustName = fields.find((f) => f.label === "Trust name")?.value;
    const todo = fields.filter((f) => f.status === "verify" || (f.status === "needs" && !f.optional)).slice(0, 5);
    return (
      <div className="lxw-center">
        <h1 className="lxw-h1">Draft documents</h1>
        <section className="lxw-card lxw-resume" aria-labelledby="lxw-resume-h">
          <p className="lxw-eyebrow" id="lxw-resume-h">Pick up where you left off</p>
          <h2>{docName}{trustName ? `, ${trustName}` : ""}</h2>
          <p className="lxw-sub">Last edited {p.savedAt ? `${dayAEST(p.savedAt)}, ${timeAEST(p.savedAt)} AEST` : "recently"}. Progress saved in this browser.</p>
          {fields.length > 0 && (
            <>
              <div className="lxw-bar-p" aria-hidden="true"><span style={{ width: `${prog.required ? (prog.filled / prog.required) * 100 : 0}%` }} /></div>
              <p className="lxw-sub"><b>{prog.filled} of {prog.required}</b> required filled{prog.verify ? <>, <span className="lxw-amber">{prog.verify} to verify</span></> : null}</p>
            </>
          )}
          {todo.length > 0 && (
            <div className="lxw-todo-list">
              <b>Still to do</b>
              <ul>{todo.map((f) => <li key={f.key} className={f.status === "verify" ? "v" : ""}>{f.status === "verify" ? "Verify: " : ""}{f.label}</li>)}</ul>
            </div>
          )}
          <div className="lxw-actions">
            <button type="button" className="lxw-btn primary" onClick={() => (nextTodo ? (nextTodo.status === "verify" ? openDrawer(nextTodo.key) : goField(nextTodo.key)) : setStage(fields.length ? "review" : "form"))}>
              {nextTodo ? `Continue, next: ${nextTodo.label.length > 40 ? nextTodo.label.slice(0, 40).trim() + "..." : nextTodo.label}` : "Continue"}
            </button>
            {p.onReset && <button type="button" className="lxw-btn quiet" onClick={() => { p.onReset?.(); setStage("pick"); setPrefilled(null); }}>Start over</button>}
          </div>
          <p className="lxw-fine">Progress saved in this browser for 30 days after your last edit. Uploaded files are not kept. It does not follow you to another device.</p>
        </section>
        <section className="lxw-other">
          <h3>Other drafts in progress in this browser</h3>
          <p className="lxw-fine">None. Only progress saved in this browser shows here, so drafts started on another device or browser will not appear.</p>
          <button type="button" className="lxw-btn" onClick={() => setStage("pick")}>Start a new document</button>
        </section>
        {legal}
      </div>
    );
  })();

  // ── Pick ──────────────────────────────────────────────────────────────────
  const q = query.trim().toLowerCase();
  const pick = (
    <div className="lxw-pick">
      <div className="lxw-pick-main">
        <h1 className="lxw-h1">What are you drafting?</h1>
        <input className="lxw-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${DOCUMENT_TYPES.length} document types, or start blank`} aria-label="Search document types" />
        {(["trust", "family-law", "commercial", "employment", "property"] as const).map((cat) => {
          const docs = DOCUMENT_TYPES.filter((d) => d.category === cat && (!q || d.name.toLowerCase().includes(q)));
          if (!docs.length) return null;
          return (
            <div key={cat} className="lxw-tilegroup">
              <h3>{CATEGORY_LABELS[cat]}</h3>
              <div className="lxw-tiles">
                {docs.map((d) => (
                  <button type="button" key={d.id} className={`lxw-tile${p.typeId === d.id ? " on" : ""}`} aria-pressed={p.typeId === d.id} onClick={() => p.setTypeId(d.id)} disabled={p.busy}>
                    <b>{d.name}</b><span>{TILE_LINES[cat] ?? d.description.split(".")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <div className="lxw-tilegroup">
          <div className="lxw-tiles">
            <button type="button" className={`lxw-tile${p.typeId === "custom" ? " on" : ""}`} aria-pressed={p.typeId === "custom"} onClick={() => p.setTypeId("custom")} disabled={p.busy}>
              <b>Custom or blank document</b><span>Describe it in your own words</span>
            </button>
          </div>
        </div>
        {legal}
      </div>
      <aside className="lxw-card lxw-need">
        <p className="lxw-eyebrow">What you&apos;ll need</p>
        <h2>{docName}</h2>
        {fields.length > 0 && <p className="lxw-sub">{groups.length} {groups.length === 1 ? "section" : "sections"}, {prog.required} required answers</p>}
        <ul>
          {needs.map((n) => {
            const done = needDone(n, needState);
            return (
              <li key={n.id} className={done ? "done" : ""}>
                <label>
                  <input type="checkbox" checked={done} disabled={p.busy}
                    onChange={() => p.setPrep({ ...p.prep, manual: p.prep.manual.includes(n.id) ? p.prep.manual.filter((x) => x !== n.id) : [...p.prep.manual, n.id] })} />
                  <span>{n.label}{n.optional && <em> if any</em>}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <label className="lxw-field">
          <span>Jurisdiction</span>
          <select value={p.jurisdiction} onChange={(e) => p.setJurisdiction(e.target.value)} disabled={p.busy}>
            {p.jurisdictions.map((j) => <option key={j}>{j}</option>)}
          </select>
        </label>
        <p className="lxw-fine">Answers marked Verify must be confirmed before Lex drafts.</p>
        <div className="lxw-actions">
          <button type="button" className="lxw-btn" onClick={() => fileInput.current?.click()} disabled={p.busy || !!loading}><Icon name="attach" size={13} />Upload documents</button>
          <button type="button" className="lxw-btn primary" onClick={startForm} disabled={p.busy}>Start the form</button>
        </div>
      </aside>
    </div>
  );

  // ── Upload ────────────────────────────────────────────────────────────────
  const found = ex?.fields.filter((f) => f.value) ?? [];
  const upload_ = (
    <div className="lxw-pick">
      <div className="lxw-pick-main">
        <h1 className="lxw-h1">Supporting documents</h1>
        <div className="lxw-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void upload(e.dataTransfer.files); }}>
          <b>{profile.uploadLabel}</b>
          <p className="lxw-fine">PDF, Word or text, up to 8 files. Names are masked before Lex&apos;s model reads them, and the files are not kept.</p>
          <button type="button" className="lxw-btn" onClick={() => fileInput.current?.click()} disabled={p.busy || !!loading}>Choose files</button>
        </div>
        {err && <div className="lx-verify" role="alert"><Icon name="warn" />{err}</div>}
        <ul className="lxw-files" aria-live="polite">
          {loading?.map((n) => (
            <li key={`l-${n}`}><b>{n}</b><span className="lxw-st">Reading</span><small className="lxw-mask">Privacy check runs before Lex reads it.</small></li>
          ))}
          {!loading && ex?.files.map((f, i) => (
            <li key={i} className={f.error ? "bad" : ""}>
              <b>{f.file}</b>
              <span className="lxw-st">{f.error ? "Failed" : "Read"}</span>
              {f.error ? <small className="lxw-err">{FILE_ERRORS[f.error] ?? FILE_ERRORS.unreadable}</small> : <small className="lxw-kind">{f.kind ? DOC_KIND_LABELS[f.kind] : "Document"}{f.documentDate ? `, ${f.documentDate}` : ""}</small>}
              {!f.error && <small className="lxw-mask">{f.privacy ? describeDocumentPrivacy({ ...f.privacy, ner: "skipped" }) : "Names are masked before Lex's model reads them."}</small>}
            </li>
          ))}
        </ul>
        {!loading && ex && !found.length && <div className="lxw-note">No answers found in these files. Fill in the form or add another file.</div>}
        {legal}
      </div>
      <aside className="lxw-card lxw-need">
        <p className="lxw-eyebrow">Found so far</p>
        {!found.length && <p className="lxw-sub">{loading ? "Reading your documents..." : "Answers Lex finds appear here with the file and clause they came from."}</p>}
        <ul className="lxw-found">
          {found.slice(0, 14).map((f) => (
            <li key={f.key}>
              <span>{f.label}</span><b>{f.value}</b>
              <div className="lxw-meta">
                {f.source && <span className="lxw-chip src"><span className="lxw-file" aria-hidden="true" />{sourceLabel(f.source)}</span>}
                {f.verify && <span className="lxw-chip ver"><b aria-hidden="true">!</b>Verify</span>}
              </div>
            </li>
          ))}
        </ul>
        <div className="lxw-actions">
          <button type="button" className="lxw-btn primary" onClick={continueToForm} disabled={p.busy}>
            {found.length ? `Continue to form, ${found.length} prefilled` : "Continue to form"}
          </button>
        </div>
      </aside>
    </div>
  );

  // ── Form ──────────────────────────────────────────────────────────────────
  const fieldInput = (f: FormField) => {
    const id = `${fieldId(f.key)}-in`;
    if (f.options) {
      return (
        <div className="lxw-seg" role="radiogroup" aria-labelledby={`${id}-l`}>
          {f.options.map((o) => (
            <button type="button" key={o} role="radio" aria-checked={f.value === o} className={f.value === o ? "on" : ""} onClick={() => set(f.key, o)} disabled={p.busy}>
              {o[0].toUpperCase() + o.slice(1)}
            </button>
          ))}
        </div>
      );
    }
    const long = f.multiline || f.value.length > 70 || f.label.length > 90;
    const text = fieldText(typed[f.key], f.value);
    const onText = (v: string) => { setTyped((t) => ({ ...t, [f.key]: v })); set(f.key, v); };
    return long
      ? <textarea id={id} rows={f.multiline ? Math.max(3, text.split("\n").length + 1) : 2} value={text} onChange={(e) => onText(e.target.value)} placeholder={f.multiline ? "  1. \n  2. " : f.hint} disabled={p.busy} />
      : <input id={id} value={text} onChange={(e) => onText(e.target.value)} placeholder={f.hint} disabled={p.busy} />;
  };

  const rail = (
    <nav className="lxw-rail" aria-label="Checklist">
      <p className="lxw-eyebrow">What you&apos;ll need</p>
      <h2>{docName}</h2>
      <div className="lxw-bar-p" aria-hidden="true"><span style={{ width: `${prog.required ? (prog.filled / prog.required) * 100 : 0}%` }} /></div>
      <p className="lxw-sub lxw-progress"><span><b>{prog.filled} of {prog.required}</b> required filled</span>{prog.verify > 0 && <span className="lxw-amber">{prog.verify} to verify</span>}</p>
      <ul className="lxw-groups">
        {groups.map((g) => {
          const gf = fields.filter((f) => f.group === g);
          const req = gf.filter((f) => !f.optional);
          const done = req.filter((f) => f.filled && f.status !== "verify").length;
          const warn = gf.some((f) => f.status === "verify");
          const on = g === activeGroup;
          return (
            <li key={g} className={on ? "on" : ""}>
              <button type="button" className="lxw-grow" aria-expanded={on} onClick={() => { setActive(g); document.getElementById(`lxw-g-${g}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                <Ring done={done} total={req.length} warn={warn} /><b>{GROUP_LABELS[g]}</b><small>{req.length ? `${done} of ${req.length}` : "optional"}</small>
              </button>
              {on && (
                <ul>
                  {gf.map((f) => (
                    <li key={f.key} className={f.status === "verify" ? "v" : f.filled ? "d" : ""}>
                      <button type="button" onClick={() => (f.status === "verify" ? openDrawer(f.key) : goField(f.key))}>
                        <span className="lxw-tick" aria-hidden="true">{f.status === "verify" ? "" : f.filled ? <Icon name="check" size={10} /> : ""}</span>
                        <span className="lxw-il">{f.label.replace(/\s*\(.*$/, "")}</span>
                        {f.status === "verify" && <em>Verify</em>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <p className="lxw-fine lxw-railfoot">Ticks fill in as you go. Progress saved in this browser for 30 days. Uploaded files are not kept.</p>
    </nav>
  );

  const form = (
    <div className="lxw-work">
      {fields.length > 0 && rail}
      <div className="lxw-scroll" ref={scrollRef}>
        {(prefilled || prog.verify > 0) && (
          <div className="lxw-banner" role="status">
            <p>{prefilled ? <><b>{prefilled.n} answers prefilled from {prefilled.files} {prefilled.files === 1 ? "file" : "files"}.</b> </> : null}
              {prog.verify > 0 ? "Answers marked Verify need your confirmation before drafting." : "Every prefilled answer is confirmed."}</p>
            {nextVerify && <button type="button" className="lxw-btn" onClick={() => openDrawer(nextVerify.key)}>Next to verify</button>}
          </div>
        )}
        {fields.length === 0 && (
          <section className="lxw-card lxw-group">
            <h2 className="lxw-gh">Parties and facts</h2>
            <label className="lxw-field">
              <span>Who is involved and the key facts</span>
              <textarea rows={8} value={p.parties} onChange={(e) => p.setParties(e.target.value)} disabled={p.busy}
                placeholder={"e.g.\nTrustee: Smith Holdings Pty Ltd (ACN 123 456 789)\nSettlor: Jane Smith\nBeneficiaries: Smith Family"} />
            </label>
          </section>
        )}
        {groups.map((g) => {
          const gf = fields.filter((f) => f.group === g);
          const req = gf.filter((f) => !f.optional);
          const conf = req.filter((f) => f.filled && f.status !== "verify").length;
          const ver = gf.filter((f) => f.status === "verify").length;
          return (
            <section key={g} id={`lxw-g-${g}`} className={`lxw-card lxw-group${ver ? " warn" : ""}`} onFocus={() => setActive(g)}>
              <div className="lxw-gh">
                <Ring done={conf} total={req.length} warn={ver > 0} />
                <h2>{GROUP_LABELS[g]}{g === "streaming" && <em> optional</em>}</h2>
                <small>{req.length ? `${conf} of ${req.length} confirmed` : "optional"}</small>
                <span className="lx-sp" />
                {ver > 0 && <span className="lxw-chip ver"><b aria-hidden="true">!</b>{ver} to verify</span>}
              </div>
              <div className="lxw-fields">
                {gf.map((f) => (
                  <div key={f.key} id={fieldId(f.key)} className={`lxw-field${f.status === "verify" ? " v" : ""}${f.multiline || f.label.length > 90 ? " wide" : ""}`}>
                    <label id={`${fieldId(f.key)}-in-l`} htmlFor={`${fieldId(f.key)}-in`}>{f.label}{f.optional && <em> optional</em>}</label>
                    {fieldInput(f)}
                    <Chips f={f} onCheck={() => openDrawer(f.key)} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        <div className="lxw-formfoot">
          <button type="button" className="lxw-btn primary" onClick={() => setStage("review")}>{prog.verify ? `Review, ${prog.verify} to verify` : "Review"}</button>
          {legal}
        </div>
      </div>
    </div>
  );

  // ── Review ────────────────────────────────────────────────────────────────
  const review = (
    <div className="lxw-pick lxw-review">
      <div className="lxw-pick-main">
        <h1 className="lxw-h1">Review before drafting</h1>
        {!gate.ok && (
          <div className="lxw-banner warn" role="status">
            <p><b>{gate.open.length} {gate.open.length === 1 ? "answer needs" : "answers need"} verifying before Lex can draft.</b> {gate.open.length === 1 ? "It came" : "They came"} from your documents and Lex was not sure of {gate.open.length === 1 ? "it" : "them"}.</p>
            <button type="button" className="lxw-btn primary" onClick={() => openDrawer(gate.open[0].key)}>Verify now</button>
          </div>
        )}
        {p.error && !p.busy && <ErrorCard error={p.error} onRetry={p.onDraft} />}
        <ul className="lxw-card lxw-sum">
          {groups.map((g) => {
            const gf = fields.filter((f) => f.group === g);
            const open = gf.filter((f) => f.status === "verify");
            const summary = groupSummary(gf);
            return (
              <li key={g}>
                <Ring done={1} total={1} warn={open.length > 0} />
                <div><b>{GROUP_LABELS[g]}</b><p>{summary ? (summary.length > 160 ? summary.slice(0, 160).trim() + "..." : summary) : "Nothing entered yet."}</p></div>
                {open.length > 0 && <span className="lxw-chip ver"><b aria-hidden="true">!</b>{open[0].label.replace(/\s*\(.*$/, "")}{open.length > 1 ? ` and ${open.length - 1} more` : ""}</span>}
                <button type="button" className="lxw-btn sm" onClick={() => (open.length ? openDrawer(open[0].key) : goField(gf[0].key))}>{open.length ? "Verify" : "Edit"}</button>
              </li>
            );
          })}
          {groups.length === 0 && (
            <li><Ring done={p.parties.trim() ? 1 : 0} total={1} /><div><b>Parties and facts</b><p>{p.parties.trim() ? p.parties.trim().slice(0, 160) : "Nothing entered yet."}</p></div>
              <button type="button" className="lxw-btn sm" onClick={() => setStage("form")}>Edit</button></li>
          )}
        </ul>
        <p className="lxw-fine">Every confirmed answer keeps its source, so the drafted clause can cite it.</p>
      </div>
      <aside className="lxw-card lxw-need lxw-gate">
        <h2>Draft the {docName.toLowerCase()}</h2>
        {fields.length > 0 && (
          <>
            <div className="lxw-bar-p two" aria-hidden="true"><span style={{ width: `${prog.required ? ((prog.filled - Math.min(prog.verify, prog.filled)) / prog.required) * 100 : 0}%` }} /><i style={{ width: `${prog.required ? (Math.min(prog.verify, prog.filled) / prog.required) * 100 : 0}%` }} /></div>
            <p className="lxw-sub"><b>{prog.filled - Math.min(prog.verify, prog.filled)} of {prog.required}</b> confirmed.{prog.verify ? ` ${prog.verify} waiting on you.` : ""}</p>
          </>
        )}
        {gate.open.length > 0 && (
          <ul className="lxw-open">{gate.open.map((f) => <li key={f.key}><button type="button" onClick={() => openDrawer(f.key)}><span className="lxw-tick" aria-hidden="true" />{f.label.replace(/\s*\(.*$/, "")}</button></li>)}</ul>
        )}
        <label className="lxw-field">
          <span>Jurisdiction</span>
          <select value={p.jurisdiction} onChange={(e) => p.setJurisdiction(e.target.value)} disabled={p.busy}>
            {p.jurisdictions.map((j) => <option key={j}>{j}</option>)}
          </select>
        </label>
        <div className="lxw-field">
          <span id="lxw-len">Length</span>
          <div className="lxw-seg" role="radiogroup" aria-labelledby="lxw-len">
            {(["default", "concise", "balanced", "detailed"] as const).map((o) => (
              <button type="button" key={o} role="radio" aria-checked={p.length === o} className={p.length === o ? "on" : ""} onClick={() => p.setLength(o)} disabled={p.busy}>{o[0].toUpperCase() + o.slice(1)}</button>
            ))}
          </div>
        </div>
        <label className="lxw-field">
          <span>Special instructions <em>optional</em></span>
          <textarea rows={2} value={p.instructions} onChange={(e) => p.setInstructions(e.target.value)} disabled={p.busy} placeholder="e.g. Include a corporate trustee clause." />
        </label>
        {doc && doc.draftingWarnings.length > 0 && (
          <div className="lx-verify lxd-risks"><Icon name="warn" /><div><b>Key drafting risks</b><ul>{doc.draftingWarnings.slice(0, 3).map((w, i) => <li key={i}>{w}</li>)}</ul></div></div>
        )}
        <button type="button" className={`lxw-draft${gate.ok ? "" : " off"}`} aria-disabled={!gate.ok || p.busy} aria-describedby="lxw-gate-why"
          onClick={() => { if (gate.ok && !p.busy) p.onDraft(); }}>
          <Icon name="draft" />{p.busy ? p.thinkLabel : "Draft document"}
        </button>
        <p id="lxw-gate-why" className={gate.ok ? "lxw-fine" : "lxw-why"}>{gate.ok ? "Lex searches the governing legislation and checks section numbers before it drafts." : gate.reason}</p>
        {legal}
      </aside>
    </div>
  );

  // ── Verify drawer / bottom sheet ──────────────────────────────────────────
  const df = drawer ? fields.find((f) => f.key === drawer) : undefined;
  const quote = df && ex?.fields.find((x) => x.source && df.sources.includes(sourceLabel(x.source)) && x.source.quote)?.source?.quote;

  return (
    <div className="lxw" data-no-feedback>
      <input ref={fileInput} type="file" multiple accept=".pdf,.docx,.doc,.txt" hidden onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
      {bar}
      <div className="lxw-body">
        {stage === "home" && home}
        {stage === "pick" && pick}
        {stage === "upload" && upload_}
        {stage === "form" && form}
        {stage === "review" && review}
      </div>
      {df && (
        <VerifyDrawer key={df.key} f={df} quote={quote} busy={p.busy} onClose={closeDrawer}
          onConfirm={(v) => {
            confirm(df.key, v);
            const rest = gate.open.filter((x) => x.key !== df.key);
            if (rest[0]) setDrawer(rest[0].key); else closeDrawer();
          }} />
      )}
    </div>
  );
}

function VerifyDrawer({ f, quote, busy, onClose, onConfirm }: { f: FormField; quote?: string; busy: boolean; onClose: () => void; onConfirm: (v: string) => void }) {
  const [v, setV] = useState(f.value);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>("textarea,input")?.focus(); }, []);
  return (
    <>
      <div className="lxw-scrim" onClick={onClose} aria-hidden="true" />
      <div className="lxw-drawer" role="dialog" aria-modal="true" aria-labelledby="lxw-dr-h" ref={ref}>
        <div className="lxw-dr-head">
          <span className="lxw-chip ver"><b aria-hidden="true">!</b>Verify</span>
          <span className="lx-sp" />
          <button type="button" className="lxw-btn sm" onClick={onClose} aria-label="Close">Close</button>
        </div>
        <h2 id="lxw-dr-h">{f.label}</h2>
        <div className="lxw-why-box">
          <b>Why Lex is unsure</b>
          <ul>{f.verifyReasons.map((r, i) => <li key={i}>{r[0].toUpperCase() + r.slice(1)}</li>)}</ul>
        </div>
        {f.sources.length > 0 && <div className="lxw-meta">{f.sources.map((s) => <span key={s} className="lxw-chip src"><span className="lxw-file" aria-hidden="true" />{s}</span>)}</div>}
        {quote ? <blockquote className="lxw-excerpt">{quote}</blockquote> : <p className="lxw-fine">{f.sources.length ? "No excerpt was returned for this answer. Check it against the file." : "Not found in the uploaded files. Enter the answer from the source document."}</p>}
        <label className="lxw-field">
          <span>Answer</span>
          {f.options
            ? <div className="lxw-seg" role="radiogroup" aria-label="Answer">{f.options.map((o) => <button type="button" key={o} role="radio" aria-checked={v === o} className={v === o ? "on" : ""} onClick={() => setV(o)}>{o[0].toUpperCase() + o.slice(1)}</button>)}</div>
            : <textarea rows={f.multiline ? 4 : 2} value={v} onChange={(e) => setV(e.target.value)} disabled={busy} />}
        </label>
        <div className="lxw-actions">
          <button type="button" className="lxw-btn" onClick={onClose}>Skip for now</button>
          <button type="button" className="lxw-btn primary" onClick={() => onConfirm(v)} disabled={busy || !v.trim()}>Confirm and next</button>
        </div>
      </div>
    </>
  );
}
