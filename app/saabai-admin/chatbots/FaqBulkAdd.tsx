"use client";
import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import { LIMITS, type Faq } from "../../../lib/chatbot/core";
import {
  FAQ_PASTE_EXAMPLE,
  appendFaqs,
  faqsToAppend,
  normaliseFaqField,
  parseFaqImport,
  reviewFaqImport,
  type FaqImportCandidate,
  type FaqImportNotice,
  type FaqImportParse,
} from "../../../lib/chatbot/faq-import";

const MAX_FILE = 200_000;

/**
 * Paste or CSV import for the questions list.
 * Adds to the draft only. The editor's Save button is still what publishes, via the existing save path.
 */
export default function FaqBulkAdd({ existing, onAppend }: { existing: Faq[]; onAppend: (rows: Faq[]) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [notices, setNotices] = useState<FaqImportNotice[]>([]);
  const [format, setFormat] = useState<FaqImportParse["format"]>("empty");
  const [drafts, setDrafts] = useState<FaqImportCandidate[] | null>(null);
  const [note, setNote] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const atLimit = existing.length >= LIMITS.faqs;
  const room = Math.max(0, LIMITS.faqs - existing.length);

  useEffect(() => {
    if (open) area.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const review = useMemo(() => (drafts ? reviewFaqImport(drafts, existing) : []), [drafts, existing]);
  const ready = review.filter((r) => r.ready).length;
  const problems = review.filter((r) => r.messages.length > 0).length;
  const leftOut = review.filter((r) => r.skip && r.messages.length === 0).length;

  function showParse(raw: string, as: "auto" | "csv" | "paste") {
    const parsed = parseFaqImport(raw, as);
    setFormat(parsed.format);
    setNotices(parsed.notices);
    setDrafts(parsed.rows.map((r) => ({ ...r, skip: false })));
  }

  function patch(i: number, next: Partial<FaqImportCandidate>) {
    setDrafts((rows) => rows?.map((row, j) => (j === i ? { ...row, ...next } : row)) ?? rows);
  }

  function add() {
    if (!drafts) return;
    const incoming = faqsToAppend(reviewFaqImport(drafts, existing));
    const added = appendFaqs(existing, incoming).length - existing.length;
    if (added <= 0) {
      setNote("Nothing new was added. Rows with a problem stay out until you fix them.");
      return;
    }
    onAppend(incoming);
    setOpen(false);
    setDrafts(null);
    setText("");
    setFileName("");
    setNotices([]);
    setNote(`Added ${added} ${added === 1 ? "question" : "questions"} to the list. Press Save changes to publish them.`);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE) {
      setDrafts([]);
      setFormat("empty");
      setNotices([{ message: "That file is too big. Split it into a smaller CSV." }]);
      return;
    }
    const raw = await file.text();
    setText(raw);
    setFileName(file.name);
    showParse(raw, "csv");
  }

  return (
    <>
      <button
        type="button"
        className="btn sm"
        disabled={atLimit}
        aria-expanded={open}
        onClick={() => { setNote(""); setOpen((v) => !v); }}
        data-testid="faq-bulk-open"
      >
        {open ? "Close bulk add" : "Bulk add"}
      </button>
      {note && <span role="status" data-testid="faq-bulk-note" className="hint" style={{ margin: 0 }}>{note}</span>}
      {open && (
        <div className="bulk" data-testid="faq-bulk">
          <p className="hint" style={{ marginTop: 0 }}>
            Paste pairs separated by a blank line. An answer can use more than one line. You can also upload a CSV with the columns question and answer. {room} more {room === 1 ? "question fits" : "questions fit"} (maximum {LIMITS.faqs}). Nothing is published until you press Save changes.
          </p>
          <pre className="sample" data-testid="faq-bulk-example">{FAQ_PASTE_EXAMPLE}</pre>
          <label htmlFor={fieldId}>Questions and answers
            <textarea id={fieldId} ref={area} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Q: ...\nA: ..."} data-testid="faq-bulk-text" />
          </label>
          {fileName && <div className="hint">Loaded {fileName}. Preview again after you edit the text.</div>}
          <div className="bar">
            <button type="button" className="btn sm pri" onClick={() => showParse(text, "auto")} data-testid="faq-bulk-preview">Preview</button>
            <label className="btn sm" style={{ cursor: "pointer" }}>
              Upload CSV
              <input type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => void onFile(e)} data-testid="faq-bulk-file" />
            </label>
            <button type="button" className="btn sm" onClick={() => { setOpen(false); }} data-testid="faq-bulk-cancel">Cancel</button>
          </div>
          {notices.map((n, i) => (
            <div key={`${n.line ?? "n"}-${i}`} className="warn" role="status">{n.line ? `Line ${n.line}: ` : ""}{n.message}</div>
          ))}
          {drafts && (
            <>
              <p className="count" data-testid="faq-bulk-summary" aria-live="polite">
                {review.length} parsed{format === "csv" ? " from the CSV" : format === "paste" ? " from Q and A pairs" : ""}. {ready} ready to add. {problems} with a problem. {leftOut} left out. {existing.length} of {LIMITS.faqs} questions already in the list.
              </p>
              <p className="hint">A row with a problem stays out until you edit it. Uncheck a ready row to leave it out. Exact copies of a question and answer already in the list are skipped.</p>
              <ul className="bulk-list">
                {review.map((row, i) => {
                  const draft = drafts[i];
                  const qLen = normaliseFaqField(draft?.q ?? row.q).length;
                  const aLen = normaliseFaqField(draft?.a ?? row.a).length;
                  const blocked = row.messages.length > 0;
                  const status = row.messages.some((m) => m.startsWith("Already") || m.startsWith("Same question"))
                    ? "Duplicate"
                    : row.messages.some((m) => m.startsWith("Max "))
                      ? "Over the limit"
                      : blocked
                        ? "Needs a fix"
                        : row.skip
                          ? "Left out"
                          : "Ready";
                  const tone = status === "Ready" ? "ok" : status === "Needs a fix" ? "bad" : "skip";
                  return (
                    <li key={`${row.line}-${i}`} className="bulk-row" data-testid={`faq-bulk-row-${i}`}>
                      <div className="bulk-top">
                        <span className={`pill ${tone}`}>{status}</span>
                        <span className="hint" style={{ margin: 0 }}>{format === "csv" ? "Row" : "Line"} {row.line}</span>
                        <label className="include">
                          <input
                            type="checkbox"
                            checked={!row.skip && !blocked}
                            disabled={blocked}
                            onChange={(e) => patch(i, { skip: !e.target.checked })}
                            data-testid={`faq-bulk-include-${i}`}
                          />
                          Add this one
                        </label>
                      </div>
                      <label>Question
                        <input type="text" value={draft?.q ?? ""} onChange={(e) => patch(i, { q: e.target.value })} data-testid={`faq-bulk-q-${i}`} aria-invalid={qLen > LIMITS.q} />
                      </label>
                      <div className={qLen > LIMITS.q ? "err" : "hint"}>{qLen} of {LIMITS.q} characters</div>
                      <label>Answer
                        <textarea style={{ minHeight: 56 }} value={draft?.a ?? ""} onChange={(e) => patch(i, { a: e.target.value })} data-testid={`faq-bulk-a-${i}`} aria-invalid={aLen > LIMITS.a} />
                      </label>
                      <div className={aLen > LIMITS.a ? "err" : "hint"}>{aLen} of {LIMITS.a} characters</div>
                      {row.warning && <div className="warn">{row.warning}</div>}
                      {row.messages.length > 0 && (
                        <div className="err" role="alert" data-testid={`faq-bulk-issue-${i}`}>{row.messages.join(" ")}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="bar">
                <button type="button" className="btn sm pri" disabled={ready === 0} onClick={add} data-testid="faq-bulk-add">
                  {ready === 1 ? "Add 1 question" : `Add ${ready} questions`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
