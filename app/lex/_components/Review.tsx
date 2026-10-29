"use client";

import { useMemo, useRef, useState } from "react";
import { type LexError, lexErrorFromResponse, lexNetworkError, lexEmptyError } from "../../../lib/lex-errors";
import { splitDraft } from "../../../lib/lex-draft-display";
import {
  type ReviewReport, type ReviewIssue, type ReviewSeverity, buildIssues, severityCounts, issuesByClause,
  SEVERITY, RISK_LABEL, axisLabel,
} from "../../../lib/lex-review-display";
import { JURISDICTIONS } from "./Drafting";
import { ErrorCard } from "./States";
import { Icon } from "./icons";
import { addLexFiles, LexUploadError, OCR_NOTE } from "../../../lib/lex-upload-client";
import { LEX_DOC_ACCEPT } from "../../../lib/lex-doc-accept";
import "./drafting.css";
import "./review.css";

const DOC_TYPES: { group: string; items: [string, string][] }[] = [
  { group: "Commercial", items: [["service-agreement", "Service Agreement"], ["nda", "Non-Disclosure Agreement (NDA)"], ["shareholders-agreement", "Shareholders Agreement"], ["share-purchase-agreement", "Share Purchase Agreement"], ["commercial-lease", "Commercial Lease"], ["supply-agreement", "Supply Agreement"], ["distribution-agreement", "Distribution Agreement"], ["licensing-agreement", "Licensing Agreement"], ["joint-venture", "Joint Venture Agreement"]] },
  { group: "Employment", items: [["employment-contract", "Employment Contract"], ["contractor-agreement", "Contractor Agreement"], ["enterprise-agreement", "Enterprise Agreement"]] },
  { group: "Trusts and Estates", items: [["discretionary-trust-deed", "Discretionary Trust Deed"], ["unit-trust-deed", "Unit Trust Deed"], ["will", "Will and Testament"]] },
  { group: "Family Law", items: [["bfa", "Binding Financial Agreement (BFA)"], ["consent-orders", "Consent Orders"], ["parenting-plan", "Parenting Plan"]] },
  { group: "Correspondence and Advice", items: [["letter-of-advice", "Letter of Advice"], ["demand-letter", "Letter of Demand"], ["settlement-deed", "Deed of Settlement and Release"], ["court-submissions", "Court Submissions or Pleadings"]] },
  { group: "Property", items: [["contract-for-sale", "Contract for Sale of Land"], ["lease-residential", "Residential Lease"], ["easement", "Easement or Covenant"]] },
  { group: "Other", items: [["other", "Other or custom document"]] },
];
const ACTING_FOR: [string, string][] = [
  ["vendor", "Vendor or Seller"], ["purchaser", "Purchaser or Buyer"], ["landlord", "Landlord or Lessor"], ["tenant", "Tenant or Lessee"],
  ["employer", "Employer"], ["employee", "Employee"], ["licensor", "Licensor"], ["licensee", "Licensee"], ["service-provider", "Service Provider"],
  ["client", "Client or Customer"], ["lender", "Lender"], ["borrower", "Borrower"], ["both-parties", "Both parties (neutral)"],
];
const CHECKS = {
  incoming: ["Risk flags and unfavourable clauses", "Missing clauses", "Australian legislation conflicts", "Market position", "Suggested redlines"],
  outgoing: ["Citation accuracy", "Completeness of advice", "Professional conduct obligations", "Professional tone", "PI exposure"],
};

type InputMode = "upload" | "paste";
export type ReviewProps = {
  /** Active matter: its known parties are masked server side. */
  matterId?: string;
  /** The document was read from a scan by text recognition. */
  ocr?: boolean;
  direction: "incoming" | "outgoing"; setDirection: (v: "incoming" | "outgoing") => void;
  docType: string; setDocType: (v: string) => void;
  actingFor: string; setActingFor: (v: string) => void;
  jurisdiction: string; setJurisdiction: (v: string) => void;
  inputMode: InputMode; setInputMode: (v: InputMode) => void;
  pasteText: string; setPasteText: (v: string) => void;
  file: File | null; setFile: (f: File | null) => void;
  submittedBy: string; setSubmittedBy: (v: string) => void;
  matterNo: string; setMatterNo: (v: string) => void;
  clientName: string; setClientName: (v: string) => void;
  report: ReviewReport | null; docText: string; loading: boolean; stage: string; error: LexError | null; onReview: () => void;
  submitLoading: boolean; submitDone: boolean; submitError: LexError | null; onSubmit: () => void;
  onSend: () => void; onExport: (comparison?: string) => void; onResearch: (q: string) => void; onReset: () => void;
};

function sevTone(s: ReviewSeverity) { return SEVERITY[s].tone === "info" ? "t-info" : `t-${SEVERITY[s].tone}`; }

function Drop({ file, onFile, small, label }: { file: File | null; onFile: (f: File) => void; small?: boolean; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div className={`lxr-drop${small ? " sm" : ""}${over ? " over" : ""}${file ? " has" : ""}`} role="button" tabIndex={0}
      onClick={() => ref.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ref.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}>
      <input ref={ref} type="file" accept={LEX_DOC_ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      <Icon name={file ? "check" : "attach"} size={small ? 16 : 22} />
      {file ? <><b>{file.name}</b><small>{Math.max(1, Math.round(file.size / 1024)).toLocaleString("en-AU")} KB, click to change</small></>
        : <><b>{label}</b><small>PDF, DOCX or TXT, up to 25MB. Scans are read with text recognition</small></>}
    </div>
  );
}

function ModeToggle({ mode, setMode, disabled }: { mode: InputMode; setMode: (m: InputMode) => void; disabled?: boolean }) {
  return (
    <div className="lxr-toggle" role="radiogroup" aria-label="How to add the document">
      {(["upload", "paste"] as const).map((m) => (
        <button type="button" key={m} role="radio" aria-checked={mode === m} className={mode === m ? "on" : ""} onClick={() => setMode(m)} disabled={disabled}>
          {m === "upload" ? "Upload file" : "Paste text"}
        </button>
      ))}
    </div>
  );
}

export function ReviewView(p: ReviewProps) {
  // A report that is already there on mount (reopened from a matter) opens on its issues.
  const [tab, setTab] = useState<"issues" | "setup">(() => (p.report ? "issues" : "setup"));
  const [panelOpen, setPanelOpen] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | ReviewSeverity>("all");
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [showRedline, setShowRedline] = useState<Set<string>>(new Set());
  // Compare with another document (calls /api/lex-compare with the full text of both documents).
  const [cmpOpen, setCmpOpen] = useState(false);
  const [cmpMode, setCmpMode] = useState<InputMode>("upload");
  const [cmpFile, setCmpFile] = useState<File | null>(null);
  const [cmpPaste, setCmpPaste] = useState("");
  const [cmpLoading, setCmpLoading] = useState(false);
  const [cmpResult, setCmpResult] = useState("");
  const [cmpError, setCmpError] = useState<LexError | null>(null);
  const [cmpOcr, setOcrNote] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Adjust state while rendering when a report arrives or is cleared.
  const reportKey = p.report ? `${p.report.overallScore}:${p.report.summary.length}:${p.report.findings.length}` : "";
  const [seenKey, setSeenKey] = useState(reportKey);
  if (reportKey !== seenKey) {
    setSeenKey(reportKey);
    setTab(reportKey ? "issues" : "setup"); setSel(null); setAccepted(new Set()); setShowRedline(new Set());
  }

  const issues = useMemo(() => (p.report ? buildIssues(p.report) : []), [p.report]);
  const counts = useMemo(() => severityCounts(issues), [issues]);
  const byClause = useMemo(() => issuesByClause(issues), [issues]);
  const blocks = useMemo(() => (p.report && p.docText ? splitDraft(p.docText) : []), [p.report, p.docText]);
  const shown = filter === "all" ? issues : issues.filter((i) => i.severity === filter);
  const hasDoc = p.inputMode === "paste" ? !!p.pasteText.trim() : !!p.file;
  const hasCmp = cmpMode === "paste" ? !!cmpPaste.trim() : !!cmpFile;
  const busy = p.loading;
  const fileLabel = p.inputMode === "upload" && p.file ? p.file.name : "Pasted document";

  const pick = (i: ReviewIssue, from: "doc" | "panel") => {
    setSel(i.key); setTab("issues"); setPanelOpen(true);
    if (from === "panel" && i.clauseId) pageRef.current?.querySelector(`[data-clause="${CSS.escape(i.clauseId)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (from === "doc") setTimeout(() => panelRef.current?.querySelector(`[data-issue="${i.key}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0);
  };
  const toggle = (set: Set<string>, k: string) => { const n = new Set(set); if (n.has(k)) n.delete(k); else n.add(k); return n; };

  async function extract(f: File): Promise<string | LexError> {
    const form = new FormData();
    try { await addLexFiles(form, "file", [f]); }
    catch (e) { return { kind: "empty", title: "File not uploaded", message: e instanceof LexUploadError ? e.message : `Could not upload ${f.name}.`, canRetry: false, signIn: false }; }
    const res = await fetch("/api/lex-extract", { method: "POST", body: form });
    if (res.status === 422 || res.status === 400) {
      const bad = await res.json().catch(() => null) as { error?: string } | null;
      if (bad?.error) return { kind: "empty", title: "No text found", message: bad.error, canRetry: false, signIn: false };
    }
    if (!res.ok) return lexErrorFromResponse(res, "comparison");
    const data = await res.json() as { text?: string; ocr?: boolean };
    if (data.ocr) setOcrNote(true);
    return data.text?.trim() || { kind: "empty", title: "No text found", message: `No text could be read from ${f.name}. Try a text-based PDF or DOCX, or paste the text.`, canRetry: false, signIn: false };
  }

  async function compare() {
    if (cmpLoading) return;
    setCmpLoading(true); setCmpError(null); setCmpResult("");
    try {
      let original: string | LexError = p.docText || (p.inputMode === "paste" ? p.pasteText.trim() : "");
      if (!original && p.inputMode === "upload" && p.file) original = await extract(p.file);
      if (typeof original !== "string") { setCmpError(original); return; }
      if (!original) { setCmpError({ kind: "empty", title: "Add the first document", message: "Upload or paste the document to review first, then add the one to compare it with.", canRetry: false, signIn: false }); return; }
      const other: string | LexError = cmpMode === "paste" ? cmpPaste.trim() : cmpFile ? await extract(cmpFile) : "";
      if (typeof other !== "string") { setCmpError(other); return; }
      if (!other) { setCmpError({ kind: "empty", title: "Add the second document", message: "Upload or paste the document to compare with.", canRetry: false, signIn: false }); return; }
      const res = await fetch("/api/lex-compare", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentA: original, documentB: other, documentType: p.docType === "auto-detect" ? undefined : p.docType, jurisdiction: p.jurisdiction, matterId: p.matterId }),
      });
      if (!res.ok) { setCmpError(await lexErrorFromResponse(res, "comparison")); return; }
      const data = await res.json() as { analysis?: string };
      if (!data.analysis?.trim()) { setCmpError(lexEmptyError("comparison")); return; }
      setCmpResult(data.analysis.trim());
    } catch {
      setCmpError(lexNetworkError("comparison"));
    } finally {
      setCmpLoading(false);
    }
  }

  const setup = (
    <div className="lxd-setup">
      <div className="lxd-f">
        <span>Review type</span>
        <div className="lxd-seg two" role="radiogroup" aria-label="Review type">
          {(["incoming", "outgoing"] as const).map((d) => (
            <button type="button" key={d} role="radio" aria-checked={p.direction === d} className={p.direction === d ? "on" : ""} onClick={() => p.setDirection(d)} disabled={busy}>
              {d === "incoming" ? "Incoming" : "Outgoing"}
            </button>
          ))}
        </div>
        <small>{p.direction === "incoming" ? "Contracts and agreements received from the other side." : "Your firm's work before it goes to the client."}</small>
      </div>
      <label className="lxd-f">
        <span>Document type</span>
        <select value={p.docType} onChange={(e) => p.setDocType(e.target.value)} disabled={busy}>
          <option value="auto-detect">Auto-detect (Lex identifies the document)</option>
          {DOC_TYPES.map((g) => <optgroup key={g.group} label={g.group}>{g.items.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</optgroup>)}
        </select>
      </label>
      {p.direction === "incoming" && (
        <label className="lxd-f">
          <span>Acting for</span>
          <select value={p.actingFor} onChange={(e) => p.setActingFor(e.target.value)} disabled={busy}>
            {ACTING_FOR.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      )}
      <label className="lxd-f">
        <span>Jurisdiction</span>
        <select value={p.jurisdiction} onChange={(e) => p.setJurisdiction(e.target.value)} disabled={busy}>
          {JURISDICTIONS.map((j) => <option key={j}>{j}</option>)}
        </select>
      </label>
      <div className="lxd-f">
        <span>Matter details <em>optional, used when you submit for review</em></span>
        <input value={p.submittedBy} onChange={(e) => p.setSubmittedBy(e.target.value)} placeholder="Your name" aria-label="Submitted by" />
        <div className="lxr-two">
          <input value={p.matterNo} onChange={(e) => p.setMatterNo(e.target.value)} placeholder="Matter no." aria-label="Matter number" />
          <input value={p.clientName} onChange={(e) => p.setClientName(e.target.value)} placeholder="Client name" aria-label="Client name" />
        </div>
      </div>
      <div className="lxd-card lxr-cmp">
        <button type="button" className="lxr-cmp-h" aria-expanded={cmpOpen} onClick={() => setCmpOpen((o) => !o)}>
          <span>Compare with another document</span><span className="car" aria-hidden="true">{cmpOpen ? "\u25b4" : "\u25be"}</span>
        </button>
        {cmpOpen && (
          <div className="lxr-cmp-b">
            <ModeToggle mode={cmpMode} setMode={setCmpMode} disabled={cmpLoading} />
            {cmpMode === "upload"
              ? <Drop small file={cmpFile} onFile={setCmpFile} label="Drop or choose the other version" />
              : <textarea className="lxr-ta" rows={4} value={cmpPaste} onChange={(e) => setCmpPaste(e.target.value)} placeholder="Paste the other document's text" />}
            <button type="button" className="lx-btn sm lxr-cmp-go" onClick={compare} disabled={cmpLoading || !hasCmp || (!hasDoc && !p.docText)}>
              {cmpLoading ? "Comparing\u2026" : "Analyse differences"}
            </button>
            {!hasDoc && !p.docText && <small className="lxd-fine">Add the main document first.</small>}
            {cmpError && <ErrorCard error={cmpError} onRetry={cmpError.canRetry ? compare : undefined} />}
            {cmpResult && <small className="lxd-fine">Comparison ready. It is shown above the document.</small>}
          </div>
        )}
      </div>
      <p className="lxd-fine">Reviews count towards your firm&apos;s daily Doc review limit. The document stays inside your firm.</p>
    </div>
  );

  const issuesPanel = (
    <div className="lxd-sugg" ref={panelRef}>
      <div className="lxr-filter" role="tablist" aria-label="Filter issues">
        {(["all", "critical", "moderate", "minor"] as const).map((f) => (
          <button type="button" key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
            {f === "all" ? `All ${issues.length}` : `${SEVERITY[f].label} ${counts[f]}`}
          </button>
        ))}
      </div>
      {shown.length === 0 && <div className="lx-pempty">No issues at this level.</div>}
      {shown.map((i) => {
        const on = sel === i.key;
        const acc = accepted.has(i.key);
        return (
          <div key={i.key} data-issue={i.key} className={`lxd-card lxr-issue${on ? " on" : ""}${acc ? " acc" : ""}`} onClick={() => pick(i, "panel")}>
            <div className="h">
              <span className={`lx-pill sm ${sevTone(i.severity)}`}><i />{SEVERITY[i.severity].label}</span>
              <span className="lxr-kind">{i.kind === "missing" ? "Missing clause" : i.kind === "legislation" ? "Legislation" : axisLabel(i.axis)}</span>
              {acc && <span className="lx-pill sm t-neu"><i />Risk accepted</span>}
              <span className="lx-sp" />
              {i.clauseRef && <span className="lxr-ref">{i.clauseRef}</span>}
            </div>
            <div className="t">{i.title}</div>
            <p>{i.detail}</p>
            {on && i.recommendation && <p className="lxr-rec"><b>Recommendation.</b> {i.recommendation}</p>}
            {on && i.redline && showRedline.has(i.key) && <blockquote className="lxr-redline"><span>Suggested redline</span>{i.redline}</blockquote>}
            {on && (
              <div className="f" onClick={(e) => e.stopPropagation()}>
                {i.redline && <button type="button" className="lx-btn sm lxr-primary" onClick={() => setShowRedline((s) => toggle(s, i.key))}>{showRedline.has(i.key) ? "Hide redline" : "Suggest redline"}</button>}
                <button type="button" className="lx-btn sm" onClick={() => setAccepted((s) => toggle(s, i.key))}>{acc ? "Undo accept" : "Accept risk"}</button>
                <button type="button" className="lxd-why" onClick={() => p.onResearch(`${i.title}. ${i.detail}`.slice(0, 500))}>Research this</button>
              </div>
            )}
          </div>
        );
      })}
      {p.report && p.report.recommendedActions.length > 0 && (
        <div className="lxd-card">
          <b>Recommended actions</b>
          <ol className="lxd-checks">{p.report.recommendedActions.map((a, n) => <li key={n}>{a}</li>)}</ol>
        </div>
      )}
      <p className="lxd-fine pad">Accept risk is a note for you on this screen only. It is not saved or sent.</p>
    </div>
  );

  const r = p.report;
  const total = Math.max(1, counts.critical + counts.moderate + counts.minor);
  return (
    <div className={`lxd lxr${panelOpen ? " open" : ""}`} data-no-feedback>
      <section className="lxd-main">
        <div className="lxd-bar">
          <Icon name="review" size={15} />
          <b className="lxd-title lxr-title" title={r ? fileLabel : undefined}>{r ? fileLabel : "Review a document"}</b>
          <span className="lx-sp" />
          {r && !busy && (
            <>
              <button type="button" className="lx-btn sm" onClick={() => { setCmpResult(""); p.onReset(); }}><Icon name="plus" />New review</button>
              <button type="button" className="lx-btn sm" onClick={p.onSend}><Icon name="share" />Send to client</button>
              {p.submitDone
                ? <span className="lx-pill sm t-ok"><i />Submitted for review</span>
                : <button type="button" className="lx-btn sm" onClick={p.onSubmit} disabled={p.submitLoading}>{p.submitLoading ? "Submitting\u2026" : "Submit for review"}</button>}
              <button type="button" className="lx-btn sm lxd-export" onClick={() => p.onExport(cmpResult || undefined)}><Icon name="word" />Export report</button>
            </>
          )}
          {!panelOpen && <button type="button" className="lx-btn sm" onClick={() => setPanelOpen(true)}>{r ? `Issues ${issues.length}` : "Setup"}</button>}
        </div>
        <div className="lxd-scroll">
          {p.submitError && <div className="lxd-errwrap"><ErrorCard error={p.submitError} onRetry={p.onSubmit} /></div>}
          {p.error && !busy && <div className="lxd-errwrap"><ErrorCard error={p.error} onRetry={p.onReview} /></div>}

          {!r && !busy && (
            <div className="lxd-page lxr-intake">
              <h2>Review a document</h2>
              <p className="sub">Lex reads the whole document and checks it for risk, missing clauses and conflicts with Australian law, then lists each issue against its clause.</p>
              <ModeToggle mode={p.inputMode} setMode={p.setInputMode} />
              {p.inputMode === "upload"
                ? <Drop file={p.file} onFile={p.setFile} label="Drop a file here or choose one" />
                : <textarea className="lxr-ta big" rows={10} value={p.pasteText} onChange={(e) => p.setPasteText(e.target.value)} placeholder="Paste the document text here" />}
              <div className="lxr-checks">
                <span className="k">{p.direction === "incoming" ? "Lex checks for" : "Lex verifies"}</span>
                {CHECKS[p.direction].map((c) => <span key={c}>{c}</span>)}
              </div>
              <button type="button" className="lxd-go" onClick={p.onReview} disabled={!hasDoc}><Icon name="review" />Review document</button>
              <p className="lxd-fine">Settings such as acting for and jurisdiction are in the Setup panel.</p>
            </div>
          )}

          {busy && (
            <div className="lxd-page empty">
              <div className="lxd-empty">
                <div className="lxd-working"><span className="lxd-dots"><i /><i /><i /></span>{p.stage}</div>
                <p>Checking the document against Australian law. Longer documents can take a minute.</p>
              </div>
            </div>
          )}

          {r && !busy && (
            <div className="lxr-wrap">
              <aside className="lxr-sum" aria-label="Risk summary">
                <span className="k">Risk summary</span>
                {(p.ocr || cmpOcr) && <p className="lxr-ocr" role="note">{OCR_NOTE}</p>}
                <div className={`big r-${r.riskLevel}`}>{RISK_LABEL[r.riskLevel] ?? r.riskLevel}</div>
                <div className="sbar" aria-hidden="true">
                  {counts.critical > 0 && <span className="b-bad" style={{ flex: counts.critical / total }} />}
                  {counts.moderate > 0 && <span className="b-warn" style={{ flex: counts.moderate / total }} />}
                  {counts.minor > 0 && <span className="b-info" style={{ flex: counts.minor / total }} />}
                </div>
                <dl>
                  <div><dt>High</dt><dd>{counts.critical}</dd></div>
                  <div><dt>Medium</dt><dd>{counts.moderate}</dd></div>
                  <div><dt>Low</dt><dd>{counts.minor}</dd></div>
                </dl>
                <p>{r.summary}</p>
                <small className="mono">Score {r.overallScore}/100 {"\u00b7"} {r.wordCount.toLocaleString("en-AU")} words {"\u00b7"} {r.clauseCount} clauses</small>
                <small>{r.direction === "incoming" ? `Acting for ${(() => { const a = r.actingFor || p.actingFor; return ACTING_FOR.find(([v]) => v === a)?.[1] ?? a; })()}` : "Outgoing review"}. {r.jurisdiction || p.jurisdiction}.</small>
              </aside>
              <div className="lxr-docs">
                {cmpResult && (
                  <div className="lxd-card lxr-cmpres">
                    <div className="h"><b>Comparison with {cmpMode === "upload" && cmpFile ? cmpFile.name : "the pasted document"}</b>
                      <button type="button" className="lx-btn sm" onClick={() => setCmpResult("")}>Close</button></div>
                    <div className="body">{cmpResult}</div>
                  </div>
                )}
                <div className="lxd-page lxr-doc" ref={pageRef}>
                  {blocks.length === 0 && <p className="lxr-nodoc">The document text is not available to show here. The issues on the right still apply.</p>}
                  {blocks.map((b, n) => {
                    const hits = b.clauseId ? byClause.get(b.clauseId) : undefined;
                    const top = hits?.[0];
                    const on = !!hits?.some((h) => h.key === sel);
                    if (b.kind === "title") return <h1 key={n} className="lxd-h1">{b.text}</h1>;
                    if (b.kind === "heading" && !top) return <h2 key={n} className="lxd-h2" data-clause={b.clauseId}>{b.text}</h2>;
                    return (
                      <p key={n} data-clause={b.clauseId} className={top ? `hit s-${SEVERITY[top.severity].tone}${on ? " on" : ""}` : ""}
                        onClick={top ? () => pick(top, "doc") : undefined}>
                        {top && <span className={`lxr-tag s-${SEVERITY[top.severity].tone}`}>{SEVERITY[top.severity].label}{hits!.length > 1 ? ` \u00b7 ${hits!.length}` : ""}</span>}
                        {b.text}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {r && !busy && <p className="lxd-foot">Review assistance only, not legal advice. Check the document and primary sources before advising a client.</p>}
        </div>
      </section>

      {panelOpen && (
        <aside className="lxd-panel" aria-label={tab === "setup" ? "Review setup" : "Issues"}>
          <div className="lx-ph">
            <div className="lxd-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === "issues"} className={tab === "issues" ? "on" : ""} disabled={!r} onClick={() => setTab("issues")}>
                Issues{r ? <small>{issues.length}</small> : null}
              </button>
              <button type="button" role="tab" aria-selected={tab === "setup"} className={tab === "setup" ? "on" : ""} onClick={() => setTab("setup")}>Setup</button>
            </div>
            <span className="lx-sp" />
            <button type="button" className="lx-btn sm" onClick={() => setPanelOpen(false)}>Close</button>
          </div>
          <div className="lxd-pbody">{tab === "setup" ? setup : issuesPanel}</div>
        </aside>
      )}
    </div>
  );
}
