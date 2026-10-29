"use client";

/**
 * Draft Documents helpers shown above the Parties box:
 *  - "What you'll need": the documents and facts for this type, ticked as they arrive.
 *  - Upload supporting documents: several files at once; Lex reads them and lists each field with the
 *    file, clause and page it came from. The user edits, then puts them into the checklist.
 * Progress is saved in this browser only, per signed-in Lex user (see lib/lex-draft-progress.ts).
 * The field list ({ key, value, source, confidence }) is the same shape a later step-by-step assistant can use.
 */
import { useRef, useState } from "react";
import type { DocumentType } from "../../../lib/lex-document-types";
import { DOC_KIND_LABELS, prefillChecklist, profileFor, sourceLabel, type MergedDeed, type PrepState } from "../../../lib/lex-doc-extract";
import { needDone, needsFor } from "../../../lib/lex-doc-needs";
import { Icon } from "./icons";

const FILE_ERRORS: Record<string, string> = {
  scanned: "This looks like a scanned image, so its text could not be read. Type those details in, or upload a text PDF or Word copy.",
  unreadable: "Could not read this file.",
  unsupported: "Only PDF, Word (.docx) or text files.",
  "too-large": "Too large (max 10MB).",
  empty: "No text found in this file.",
};


export function DraftPrep(p: {
  doc?: DocumentType; typeId: string; busy: boolean;
  parties: string; setParties: (v: string) => void; template?: string;
  prep: PrepState; setPrep: (s: PrepState) => void;
  savedAt?: number | null; onReset?: () => void;
}) {
  const profile = profileFor(p.doc);
  const needs = needsFor(p.typeId, p.doc?.category);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [needsOpen, setNeedsOpen] = useState(true);
  const input = useRef<HTMLInputElement>(null);
  const ex = p.prep.extracted && p.prep.extracted.profile === profile.id ? p.prep.extracted : null;
  const doneCount = needs.filter((n) => needDone(n, { extracted: ex, parties: p.parties, template: p.template, manual: p.prep.manual })).length;

  async function upload(list: FileList | null) {
    if (!list?.length || loading) return;
    setLoading(true); setErr(null);
    try {
      const fd = new FormData();
      Array.from(list).forEach((f) => fd.append("files", f));
      fd.append("documentType", p.typeId);
      const res = await fetch("/api/lex-doc-extract", { method: "POST", body: fd });
      const data = await res.json().catch(() => null) as (MergedDeed & { error?: string }) | null;
      if (!res.ok || !data || data.error) { setErr(data?.error && res.status === 400 ? data.error : "Lex could not read those files. Try again, or fill in the checklist by hand."); return; }
      p.setPrep({ ...p.prep, extracted: data });
    } catch {
      setErr("Lex could not read those files. Try again, or fill in the checklist by hand.");
    } finally {
      setLoading(false);
    }
  }

  const edit = (key: string, value: string) => {
    if (!ex) return;
    p.setPrep({ ...p.prep, extracted: { ...ex, fields: ex.fields.map((f) => (f.key === key ? { ...f, value, edited: true } : f)) } });
  };
  const apply = () => {
    if (!ex) return;
    const base = p.parties.trim() ? p.parties : p.template ?? "";
    p.setParties(prefillChecklist(base, ex));
  };
  const toggle = (id: string) => p.setPrep({ ...p.prep, manual: p.prep.manual.includes(id) ? p.prep.manual.filter((x) => x !== id) : [...p.prep.manual, id] });

  return (
    <div className="lxd-prep">
      <div className="lxd-needs">
        <button type="button" className="lxd-needs-h" aria-expanded={needsOpen} onClick={() => setNeedsOpen(!needsOpen)}>
          <b>What you&apos;ll need</b><span>{doneCount} of {needs.length} ready</span>
        </button>
        {needsOpen && (
          <ul>
            {needs.map((n) => {
              const done = needDone(n, { extracted: ex, parties: p.parties, template: p.template, manual: p.prep.manual });
              return (
                <li key={n.id} className={done ? "done" : ""}>
                  <label><input type="checkbox" checked={done} onChange={() => toggle(n.id)} disabled={p.busy} />{n.label}{n.optional && <em> if any</em>}</label>
                </li>
              );
            })}
            <li className="lxd-needs-note">Missing items are fine. Lex drafts anyway and marks them Verify.
              {p.savedAt ? <> Progress saved in this browser.{p.onReset && <> <button type="button" className="lxd-link" onClick={p.onReset} disabled={p.busy}>Start over</button></>}</> : null}
            </li>
          </ul>
        )}
      </div>

      <div className="lxd-up">
        <input ref={input} type="file" multiple accept=".pdf,.docx,.doc,.txt" hidden onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
        <button type="button" className="lxd-fill" onClick={() => input.current?.click()} disabled={p.busy || loading}>
          <Icon name="attach" size={13} /> {loading ? "Reading your documents..." : profile.uploadLabel}
        </button>
        <small>PDF, Word or text, up to 8 files. Names are masked before Lex&apos;s model reads them, and the files are not kept.</small>
        {err && <div className="lx-verify"><Icon name="warn" />{err}</div>}
      </div>

      {ex && (
        <div className="lxd-ex">
          <div className="lxd-ex-files">
            {ex.files.map((f, i) => (
              <div key={i} className={f.error ? "bad" : ""}>
                <b>{f.file}</b> {f.error ? FILE_ERRORS[f.error] : `${f.kind ? DOC_KIND_LABELS[f.kind] : "Document"}${f.documentDate ? `, ${f.documentDate}` : ""}`}
              </div>
            ))}
          </div>
          {ex.fields.length > 0 && (
            <>
              <table className="lxd-ex-t">
                <tbody>
                  {ex.fields.map((f) => (
                    <tr key={f.key} className={f.verify ? "v" : ""}>
                      <th>{f.label}</th>
                      <td>
                        <input value={f.value} onChange={(e) => edit(f.key, e.target.value)} placeholder="Not found" disabled={p.busy} aria-label={f.label} />
                        <small>
                          {f.source ? `From ${sourceLabel(f.source)}` : ""}
                          {f.replaced?.length ? `. Replaces ${f.replaced.map((r) => `"${r.value}" (${sourceLabel(r.source)})`).join(", ")}` : ""}
                          {f.verify ? <span className="lxd-verify"><Icon name="warn" size={11} />Verify{f.why ? `: ${f.why}` : ""}</span> : null}
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="lxd-fill" onClick={apply} disabled={p.busy}>Put these into the checklist</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
