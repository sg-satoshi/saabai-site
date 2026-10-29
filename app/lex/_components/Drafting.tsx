"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DOCUMENT_TYPES, fillPartiesTemplate } from "../../../lib/lex-document-types";
import type { LexError } from "../../../lib/lex-errors";
import {
  type QAReport, type QASection, splitDraft, segmentDraft, verifyMarkers, draftReferences,
  normaliseClauseId, QA_STATUS, confidenceBand, orderSections,
} from "../../../lib/lex-draft-display";
import { ErrorCard } from "./States";
import { DraftPrep } from "./DraftPrep";
import type { PrepState } from "../../../lib/lex-doc-extract";
import { Icon } from "./icons";
import "./drafting.css";

export const JURISDICTIONS = [
  "All Australian jurisdictions", "New South Wales (NSW)", "Victoria (VIC)", "Queensland (QLD)", "Western Australia (WA)",
  "South Australia (SA)", "Tasmania (TAS)", "Australian Capital Territory (ACT)", "Northern Territory (NT)", "Cross-border / International",
];
const CATEGORY_LABELS: Record<string, string> = { trust: "Trusts", "family-law": "Family Law", commercial: "Commercial", employment: "Employment", property: "Property" };
type Length = "default" | "concise" | "balanced" | "detailed";

export type DraftingProps = {
  typeId: string; setTypeId: (v: string) => void;
  jurisdiction: string; setJurisdiction: (v: string) => void;
  parties: string; setParties: (v: string) => void;
  length: Length; setLength: (v: Length) => void;
  instructions: string; setInstructions: (v: string) => void;
  text: string; qa: QAReport | null; loading: boolean; qaLoading: boolean; thinkLabel: string;
  error: LexError | null; onDraft: () => void;
  copied: boolean; onCopy: () => void; onExport: () => void; onSend: () => void;
  onResearch: (q: string) => void;
  prep: PrepState; setPrep: (s: PrepState) => void;
  savedAt?: number | null; onReset?: () => void;
};

function brisbaneTime(d: Date) {
  return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane" }).replace(/\s?(am|pm)$/i, (m) => "\u00a0" + m.trim().toUpperCase()) + " AEST";
}

function DraftText({ text }: { text: string }) {
  return (
    <>
      {segmentDraft(text).map((s, i) =>
        s.kind === "verify" ? (
          <span key={i} className="lxd-verify" title={`Verify: ${s.text}`}><Icon name="warn" size={12} />Verify: {s.text}</span>
        ) : s.kind === "ref" ? (
          <span key={i} className="lx-cite lxd-ref" title="Reference written by Lex. Not checked against a source yet.">{s.text}</span>
        ) : <span key={i}>{s.text}</span>,
      )}
    </>
  );
}

export function DraftingView(p: DraftingProps) {
  const doc = DOCUMENT_TYPES.find((d) => d.id === p.typeId);
  const docName = doc?.name ?? (p.typeId === "custom" ? "Custom document" : "Document");
  // A draft that is already there on mount (reopened from a matter) opens on its suggestions.
  const [tab, setTab] = useState<"setup" | "suggest">(() => (p.text ? "suggest" : "setup"));
  const [panelOpen, setPanelOpen] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [doneAt, setDoneAt] = useState<Date | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Switch to suggestions once a draft exists; back to setup when it is cleared.
  const hasDraft = !!p.text;
  // Adjust state while rendering when the draft appears, clears or finishes (no effect round trip).
  const phase = !hasDraft ? "none" : p.loading ? "writing" : "done";
  const [seenPhase, setSeenPhase] = useState(phase);
  if (phase !== seenPhase) {
    setSeenPhase(phase);
    if (phase === "none") { setTab("setup"); setSel(null); setDoneAt(null); }
    else { if (seenPhase === "none") setTab("suggest"); if (phase === "done") setDoneAt(new Date()); }
  }
  useEffect(() => { if (p.loading && p.text) bottomRef.current?.scrollIntoView({ block: "end" }); }, [p.text, p.loading]);

  const blocks = useMemo(() => splitDraft(p.text), [p.text]);
  const markers = useMemo(() => verifyMarkers(p.text), [p.text]);
  const refs = useMemo(() => draftReferences(p.text), [p.text]);
  const sections = useMemo(() => orderSections(p.qa?.sections ?? []), [p.qa]);
  const clauseIds = useMemo(() => new Set(sections.map((s) => normaliseClauseId(s.id))), [sections]);
  const busy = p.loading;

  const showClause = (id: string) => {
    const n = normaliseClauseId(id);
    setSel(n); setPanelOpen(true); setTab("suggest");
    pageRef.current?.querySelector(`[data-clause="${CSS.escape(n)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const showMarker = (i: number) => pageRef.current?.querySelectorAll(".lxd-verify")[i]?.scrollIntoView({ behavior: "smooth", block: "center" });

  const setup = (
    <div className="lxd-setup">
      <label className="lxd-f">
        <span>Document type</span>
        <select value={p.typeId} onChange={(e) => p.setTypeId(e.target.value)} disabled={busy}>
          <option value="custom">Custom or blank document</option>
          {(["trust", "family-law", "commercial", "employment", "property"] as const).map((cat) => {
            const docs = DOCUMENT_TYPES.filter((d) => d.category === cat);
            return docs.length ? <optgroup key={cat} label={CATEGORY_LABELS[cat]}>{docs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</optgroup> : null;
          })}
        </select>
        {doc && <small>{doc.description}</small>}
      </label>
      <label className="lxd-f">
        <span>Jurisdiction</span>
        <select value={p.jurisdiction} onChange={(e) => p.setJurisdiction(e.target.value)} disabled={busy}>
          {JURISDICTIONS.map((j) => <option key={j}>{j}</option>)}
        </select>
      </label>
      <DraftPrep doc={doc} typeId={p.typeId} busy={busy} parties={p.parties} setParties={p.setParties}
        template={doc?.partiesTemplate ? fillPartiesTemplate(doc.partiesTemplate) : undefined}
        prep={p.prep} setPrep={p.setPrep} savedAt={p.savedAt} onReset={p.onReset} />
      <label className="lxd-f">
        <span>Parties</span>
        {doc?.partiesTemplate && !p.parties.trim() && (
          <button type="button" className="lxd-fill" onClick={() => p.setParties(fillPartiesTemplate(doc.partiesTemplate!))} disabled={busy}>Fill in the {doc.name} checklist</button>
        )}
        <textarea rows={doc?.partiesTemplate ? 10 : 4} value={p.parties} onChange={(e) => p.setParties(e.target.value)} disabled={busy}
          placeholder={"e.g.\nTrustee: Smith Holdings Pty Ltd (ACN 123 456 789)\nSettlor: Jane Smith\nBeneficiaries: Smith Family"} />
      </label>
      <div className="lxd-f">
        <span>Length</span>
        <div className="lxd-seg" role="radiogroup" aria-label="Length">
          {(["default", "concise", "balanced", "detailed"] as const).map((o) => (
            <button type="button" key={o} role="radio" aria-checked={p.length === o} className={p.length === o ? "on" : ""} onClick={() => p.setLength(o)} disabled={busy}>
              {o[0].toUpperCase() + o.slice(1)}
            </button>
          ))}
        </div>
        <small>Default uses your portal preference. Change it here for this document only.</small>
      </div>
      <label className="lxd-f">
        <span>Special instructions <em>optional</em></span>
        <textarea rows={3} value={p.instructions} onChange={(e) => p.setInstructions(e.target.value)} disabled={busy}
          placeholder="e.g. Include a corporate trustee clause. Vesting date 80 years from establishment." />
      </label>
      {doc && doc.draftingWarnings.length > 0 && (
        <div className="lx-verify lxd-risks">
          <Icon name="warn" />
          <div><b>Key drafting risks</b><ul>{doc.draftingWarnings.slice(0, 3).map((w, i) => <li key={i}>{w}</li>)}</ul></div>
        </div>
      )}
      <button type="button" className="lxd-go" onClick={p.onDraft} disabled={busy}>
        <Icon name="draft" />{busy ? p.thinkLabel : hasDraft ? "Redraft document" : "Draft document"}
      </button>
      <p className="lxd-fine">Lex searches the governing legislation and checks section numbers before it drafts. Anything it could not confirm is marked Verify.</p>
    </div>
  );

  const suggestions = (
    <div className="lxd-sugg">
      {p.qaLoading && (
        <div className="lxd-card"><div className="lxd-working"><span className="lxd-dots"><i /><i /><i /></span>Checking every citation and clause</div></div>
      )}
      {p.qa && (() => {
        const band = confidenceBand(p.qa.overallConfidence);
        return (
          <div className="lxd-card lxd-score">
            <div className="h"><b>QA check</b><span className={`lx-pill sm t-${band.tone}`}><i />{band.label}</span></div>
            <div className="bar" aria-hidden="true"><span className={`t-${band.tone}`} style={{ width: `${Math.max(0, Math.min(100, p.qa.overallConfidence))}%` }} /></div>
            <p><span className="mono">{p.qa.overallConfidence}/100</span> from an independent review of citations, clauses and legal accuracy.</p>
          </div>
        );
      })()}
      {p.qa && p.qa.criticalIssues.length > 0 && (
        <div className="lxd-card lxd-crit">
          <b>Must review before use</b>
          <ul>{p.qa.criticalIssues.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </div>
      )}
      {markers.length > 0 && (
        <div className="lxd-card">
          <div className="h"><span className="lx-pill sm t-warn"><i />Missing references {markers.length}</span></div>
          <ul className="lxd-marks">
            {markers.map((m, i) => <li key={i}><button type="button" onClick={() => showMarker(i)}>{m}</button></li>)}
          </ul>
        </div>
      )}
      {sections.map((s: QASection, i) => {
        const n = normaliseClauseId(s.id);
        const st = QA_STATUS[s.status] ?? QA_STATUS.unverified;
        const key = `${n}-${i}`;
        return (
          <div key={key} className={`lxd-card lxd-clause${sel === n ? " on" : ""}`} onClick={() => showClause(s.id)}>
            <div className="h">
              <span className="lxd-cl">Clause {s.id.replace(/^clause\s*/i, "")}</span>
              <span className={`lx-pill sm t-${st.tone}`}><i />{st.label}</span>
            </div>
            <div className="t">{s.clause}</div>
            {(s.status !== "verified" || why === key) && <p>{s.note}</p>}
            <div className="f" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="lx-btn sm" onClick={() => showClause(s.id)}>Show in draft</button>
              <button type="button" className="lx-btn sm" onClick={() => p.onResearch(`${s.clause}: ${s.note}`.slice(0, 500))}>Research this</button>
              {s.status === "verified" && <button type="button" className="lxd-why" onClick={() => setWhy(why === key ? null : key)}>{why === key ? "Hide" : "Why?"}</button>}
            </div>
          </div>
        );
      })}
      {refs.length > 0 && (
        <div className="lxd-card">
          <div className="h"><b>References in this draft</b><small className="mono">{refs.length}</small></div>
          <ul className="lxd-refs">
            {refs.slice(0, 12).map((r) => (
              <li key={r}>
                <span className="lx-cite">{r}</span>
                <a href={`https://www.austlii.edu.au/cgi-bin/sinosrch.cgi?query=${encodeURIComponent(r)}`} target="_blank" rel="noopener noreferrer">Find on AustLII<Icon name="ext" size={12} /></a>
              </li>
            ))}
          </ul>
          <p className="lxd-fine">Written by Lex and not yet checked against the source text. Confirm each one before relying on it.</p>
        </div>
      )}
      {p.qa && p.qa.recommendedChecks.length > 0 && (
        <div className="lxd-card">
          <b>Check before use</b>
          <ol className="lxd-checks">{p.qa.recommendedChecks.map((c, i) => <li key={i}>{c}</li>)}</ol>
        </div>
      )}
      {!p.qa && !p.qaLoading && !busy && hasDraft && (
        <div className="lx-pempty">The QA check did not return. Review the draft and its Verify markers before use.</div>
      )}
      {busy && !p.qa && <div className="lx-pempty">Suggestions appear here once the draft is finished and checked.</div>}
      <p className="lxd-fine pad">Suggestions come from Lex&apos;s QA pass over this draft only. Nothing is sent to the client.</p>
    </div>
  );

  return (
    <div className={`lxd${panelOpen ? " open" : ""}`} data-no-feedback>
      <section className="lxd-main">
        <div className="lxd-bar">
          <b className="lxd-title">{docName}{hasDraft ? ", draft" : ""}</b>
          {busy && hasDraft && <span className="lxd-stamp">Drafting</span>}
          {!busy && doneAt && <span className="lxd-stamp">Drafted {brisbaneTime(doneAt)}</span>}
          <span className="lx-sp" />
          {hasDraft && !busy && (
            <>
              <button type="button" className="lx-btn sm" onClick={p.onCopy}><Icon name="copy" />{p.copied ? "Copied" : "Copy"}</button>
              <button type="button" className="lx-btn sm" onClick={p.onSend}><Icon name="share" />Send to client</button>
              <button type="button" className="lx-btn sm lxd-export" onClick={p.onExport}><Icon name="word" />Export to Word</button>
            </>
          )}
          {!panelOpen && <button type="button" className="lx-btn sm" onClick={() => setPanelOpen(true)}>{hasDraft ? "Suggestions" : "Setup"}</button>}
        </div>
        <div className="lxd-scroll">
          {p.error && !busy && !hasDraft && <div className="lxd-errwrap"><ErrorCard error={p.error} onRetry={p.onDraft} /></div>}
          <div className={`lxd-page${hasDraft ? "" : " empty"}`} ref={pageRef}>
            {!hasDraft && !busy && (
              <div className="lxd-empty">
                <Icon name="draft" size={28} />
                <h2>Ready to draft</h2>
                <p>Set up the {docName.toLowerCase()} in the panel on the right. Lex searches the governing legislation, checks section numbers, and drafts a cited document for you to review.</p>
                <div className="lxd-trust"><span>Search first</span><span>Cited references</span><span>QA check</span><span>Jurisdiction aware</span></div>
              </div>
            )}
            {busy && !hasDraft && (
              <div className="lxd-empty">
                <div className="lxd-working"><span className="lxd-dots"><i /><i /><i /></span>{p.thinkLabel}</div>
                <p>Lex searches legislation before drafting, so each section number can be checked.</p>
              </div>
            )}
            {blocks.map((b, i) => {
              const on = b.clauseId && sel === b.clauseId;
              const linked = b.clauseId && clauseIds.has(b.clauseId);
              if (b.kind === "title") return <h1 key={i} className="lxd-h1"><DraftText text={b.text} /></h1>;
              if (b.kind === "heading") return <h2 key={i} className="lxd-h2" data-clause={b.clauseId}><DraftText text={b.text} /></h2>;
              return (
                <p key={i} data-clause={b.clauseId} className={`${on ? "on" : ""}${linked ? " linked" : ""}`}
                  onClick={linked ? () => { setSel(b.clauseId!); setTab("suggest"); setPanelOpen(true); } : undefined}>
                  <DraftText text={b.text} />
                  {busy && i === blocks.length - 1 && <span className="lxd-caret" aria-hidden="true" />}
                </p>
              );
            })}
            <div ref={bottomRef} />
          </div>
          {hasDraft && <p className="lxd-foot">Drafting assistance only, not legal advice. Check every reference and Verify marker before this document is used.</p>}
        </div>
      </section>

      {panelOpen && (
        <aside className="lxd-panel" aria-label={tab === "setup" ? "Document setup" : "Suggestions"}>
          <div className="lx-ph">
            <div className="lxd-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === "suggest"} className={tab === "suggest" ? "on" : ""} disabled={!hasDraft} onClick={() => setTab("suggest")}>
                Suggestions{p.qa ? <small>{p.qa.sections.length + p.qa.criticalIssues.length + markers.length}</small> : null}
              </button>
              <button type="button" role="tab" aria-selected={tab === "setup"} className={tab === "setup" ? "on" : ""} onClick={() => setTab("setup")}>Setup</button>
            </div>
            <span className="lx-sp" />
            <button type="button" className="lx-btn sm" onClick={() => setPanelOpen(false)}>Close</button>
          </div>
          <div className="lxd-pbody">{tab === "setup" ? setup : suggestions}</div>
        </aside>
      )}
    </div>
  );
}
