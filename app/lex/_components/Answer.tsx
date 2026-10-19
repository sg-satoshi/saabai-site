"use client";

import type React from "react";
import type { LexAnswerMeta } from "../../../lib/lex-sources";
import { splitCitations, citedSources, confidenceSummary, type CiteSegment } from "../../../lib/lex-cite-display";
import { Icon } from "./icons";

// ── Inline text: **bold**, [label](url) and bare https links ──────────────────
const INLINE = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(((?:https?|mailto):[^)\s]+)\)|(https?:\/\/[^\s)<>\]]+[^\s)<>\].,;:!?'"]))/g;

function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0; let k = 0;
  for (const m of text.matchAll(INLINE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    if (m[2]) out.push(<strong key={`${key}b${k++}`}>{m[2]}</strong>);
    else if (m[3]) out.push(<a key={`${key}a${k++}`} href={m[4]} target="_blank" rel="noopener noreferrer">{m[3]}</a>);
    else if (m[5]) out.push(<a key={`${key}u${k++}`} href={m[5]} target="_blank" rel="noopener noreferrer">{m[5].replace(/^https?:\/\/(www\.)?/, "")}</a>);
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Piece = CiteSegment;
type Line = Piece[];

/** Groups segments into paragraphs of lines, so chips can sit inside any paragraph. */
function toParagraphs(segs: CiteSegment[]): Line[][] {
  const paras: Line[][] = [[[]]];
  for (const s of segs) {
    if (s.kind !== "text") { const p = paras[paras.length - 1]; p[p.length - 1].push(s); continue; }
    const blocks = s.text.split(/\n{2,}/);
    blocks.forEach((block, bi) => {
      if (bi > 0) paras.push([[]]);
      block.split("\n").forEach((line, li) => {
        const p = paras[paras.length - 1];
        if (li > 0) p.push([]);
        if (line) p[p.length - 1].push({ kind: "text", text: line });
      });
    });
  }
  return paras
    .map((p) => p.filter((l) => l.some((x) => x.kind !== "text" || x.text.trim())))
    .filter((p) => p.length);
}

const lineText = (l: Line) => l.map((x) => (x.kind === "text" ? x.text : "")).join("").trim();
const isHeading = (p: Line[]) => p.length === 1 && p[0].every((x) => x.kind === "text") && (() => {
  const t = lineText(p[0]).replace(/:$/, "");
  return t.length > 2 && t.length <= 48 && !/[a-z]/.test(t) && /[A-Z]/.test(t);
})();
const BULLET = /^\s*(?:[-*\u2022]|\d{1,2}[.)])\s+/;
const isList = (p: Line[]) => p.length > 0 && p.every((l) => l[0]?.kind === "text" && BULLET.test(l[0].text));
const ordered = (p: Line[]) => p[0][0].kind === "text" && /^\s*\d/.test(p[0][0].text);

export function AnswerBody({ text, meta, selected, onCite }: {
  text: string; meta?: LexAnswerMeta; selected?: number | null; onCite?: (n: number) => void;
}) {
  const segs = splitCitations(text, meta?.citations ?? []);
  const paras = toParagraphs(segs);
  const renderLine = (l: Line, key: string, strip = false) => l.map((x, i) => {
    if (x.kind === "text") return <span key={`${key}-${i}`}>{inline(strip && i === 0 ? x.text.replace(BULLET, "") : x.text, `${key}-${i}`)}</span>;
    if (x.kind === "unsourced") return <span key={`${key}-${i}`} className="lx-cite unsrc" title={x.note}>unverified</span>;
    const warn = x.status === "pinpoint_not_found";
    return (
      <button key={`${key}-${i}`} type="button" className={`lx-cite${selected === x.n ? " on" : ""}${warn ? " warn" : ""}`}
        title={x.note} aria-label={`Source ${x.n}${x.pinpoint ? `, ${x.label.replace(/^\[\d+\]\s*/, "")}` : ""}`}
        onClick={() => onCite?.(x.n)} data-cite={x.n}>
        {x.label}
      </button>
    );
  });
  return (
    <div className="lx-ans">
      {paras.map((p, pi) => {
        if (isHeading(p)) return <h3 key={pi}>{lineText(p[0]).replace(/:$/, "")}</h3>;
        if (isList(p)) {
          const items = p.map((l, li) => <li key={li}>{renderLine(l, `${pi}-${li}`, true)}</li>);
          return ordered(p) ? <ol key={pi}>{items}</ol> : <ul key={pi}>{items}</ul>;
        }
        return <p key={pi}>{p.map((l, li) => <span key={li}>{li > 0 && <br />}{renderLine(l, `${pi}-${li}`)}</span>)}</p>;
      })}
    </div>
  );
}

const CONF_TONE = { high: "t-ok", moderate: "t-warn", low: "t-bad" } as const;
const CONF_WORD = { high: "High confidence", moderate: "Moderate confidence", low: "Low confidence" } as const;

/** Brisbane time stamp, for example "19 Oct 2026, 8:12 PM AEST". */
export function brisbaneStamp(ms: number): string {
  const d = new Date(ms);
  const date = d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Brisbane" });
  const time = d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Australia/Brisbane" }).replace(/\s?(am|pm)$/i, (m) => ` ${m.trim().toUpperCase()}`);
  return `${date}, ${time} AEST`;
}

export function AnswerSheet({ text, meta, at, streaming, selected, onCite, onExport, onCopy, onDraft, onSources, copied }: {
  text: string; meta?: LexAnswerMeta; at?: number; streaming?: boolean;
  selected?: number | null; onCite?: (n: number) => void;
  onExport?: () => void; onCopy?: () => void; onDraft?: () => void; onSources?: () => void; copied?: boolean;
}) {
  const { cited } = meta ? citedSources(meta) : { cited: [] };
  const conf = confidenceSummary(meta);
  const citeNo = (id: string) => cited.find((s) => s.id === id)?.n;
  const unchecked = cited.filter((s) => s.status === "not_checked").map((s) => s.n);
  const pinMissing = cited.filter((s) => s.status === "pinpoint_not_found").map((s) => s.n);
  const unsourced = meta?.citations.filter((c) => c.status === "no_source" || c.status === "unknown_source").length ?? 0;
  const secondary = cited.filter((s) => s.type === "secondary" || s.type === "ato_guidance" || s.type === "regulator" || s.type === "foreign").map((s) => s.n);
  const list = (ns: number[]) => ns.map((n) => `[${n}]`).join(", ");
  const verifyLines: string[] = [];
  if (meta) {
    if (unchecked.length) verifyLines.push(`${list(unchecked)} ${unchecked.length === 1 ? "was" : "were"} found by search but not checked against the source text.`);
    if (pinMissing.length) verifyLines.push(`The pinpoint for ${list(pinMissing)} was not found in the source text.`);
    if (secondary.length) verifyLines.push(`${list(secondary)} ${secondary.length === 1 ? "is" : "are"} guidance or secondary material, not binding authority.`);
    if (unsourced) verifyLines.push(`${unsourced} ${unsourced === 1 ? "point has" : "points have"} no source from this search (marked unverified).`);
    for (const v of meta.verify) if (!verifyLines.includes(v)) verifyLines.push(v);
  }
  const verified = cited.filter((s) => s.status === "verified").length;

  return (
    <article className="lx-sheet" aria-busy={streaming || undefined}>
      <div className="meta">
        {streaming && <span className="lx-pill t-acc"><i />Writing the answer</span>}
        {!streaming && meta && conf.high > 0 && <span className="lx-pill t-ok"><i />{conf.high > 1 ? `${conf.high} conclusions` : "1 conclusion"}: high confidence</span>}
        {!streaming && meta && conf.moderate > 0 && <span className="lx-pill t-warn"><i />{conf.moderate} moderate</span>}
        {!streaming && meta && conf.low > 0 && <span className="lx-pill t-bad"><i />{conf.low} low</span>}
        {!streaming && meta && (
          <button type="button" className="lx-pill t-neu" style={{ border: 0 }} onClick={onSources}>
            {cited.length} {cited.length === 1 ? "source" : "sources"}{cited.length ? `, ${verified} verified` : ""}
          </button>
        )}
      </div>
      {at && <div className="stamp">Searched {brisbaneStamp(at)}</div>}
      {!at && <div className="stamp" style={{ paddingBottom: 0, borderBottom: 0 }} />}

      <AnswerBody text={text} meta={meta} selected={selected} onCite={onCite} />

      {!streaming && meta && meta.conclusions.length > 0 && (
        <div className="lx-concl">
          <h4>Conclusions</h4>
          {meta.conclusions.map((c, i) => (
            <div className="row" key={i}>
              <span className={`lx-pill sm ${CONF_TONE[c.confidence]}`}><i />{CONF_WORD[c.confidence].split(" ")[0]}</span>
              <div>
                <div className="txt">
                  {c.text}{" "}
                  {c.citeIds.map((id) => citeNo(id)).filter(Boolean).map((n) => (
                    <button key={n} type="button" className={`lx-cite${selected === n ? " on" : ""}`} onClick={() => onCite?.(n!)}>[{n}]</button>
                  ))}
                </div>
                {c.basis && <div className="basis">{c.basis}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!streaming && verifyLines.length > 0 && (
        <div className="lx-verify" role="note">
          <Icon name="warn" />
          <div>
            <b>Verify before relying.</b>
            {verifyLines.length === 1 ? <> {verifyLines[0]}</> : <ul>{verifyLines.map((v, i) => <li key={i}>{v}</li>)}</ul>}
          </div>
        </div>
      )}

      {!streaming && !meta && (
        <p className="lx-legacy">This answer was saved before Lex checked citations, so it has no sources list. Ask again to get checked sources.</p>
      )}

      {!streaming && (
        <div className="lx-actions">
          <button type="button" className="lx-btn" onClick={onExport}><Icon name="word" />Export to Word</button>
          <button type="button" className="lx-btn" onClick={onCopy}><Icon name="copy" />{copied ? "Copied" : <>Copy<span className="lbl-long">{" with citations"}</span></>}</button>
          <button type="button" className="lx-btn" onClick={onDraft}><Icon name="draft" />Draft<span className="lbl-long">{" from this"}</span></button>
          {meta && cited.length > 0 && <><span className="lx-sp" /><button type="button" className="lx-btn" onClick={onSources}><Icon name="book" />Sources</button></>}
        </div>
      )}
    </article>
  );
}
