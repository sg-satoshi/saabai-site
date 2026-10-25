"use client";

import { useEffect, useRef, useState } from "react";
import type { LexAnswerMeta } from "../../../lib/lex-sources";
import { pinpointLabel } from "../../../lib/lex-sources";
import { authorityBadge, citedSources, copyCiteText, sourceGroup, STATUS_TEXT, type SourceGroup } from "../../../lib/lex-cite-display";
import { Icon } from "./icons";

const GROUPS: [SourceGroup | "all", string][] = [["all", "All"], ["cases", "Cases"], ["legislation", "Legislation"], ["ato", "ATO"], ["other", "Other"]];

export function SourcesPanel({ meta, selected, onSelect, onClose }: {
  meta?: LexAnswerMeta; selected: number | null; onSelect: (n: number | null) => void; onClose: () => void;
}) {
  const [group, setGroup] = useState<SourceGroup | "all">("all");
  const [copied, setCopied] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { cited, other } = meta ? citedSources(meta) : { cited: [], other: [] };
  const count = (g: SourceGroup | "all") => (g === "all" ? cited.length : cited.filter((s) => sourceGroup(s) === g).length);
  const shown = cited.filter((s) => group === "all" || sourceGroup(s) === group);

  useEffect(() => {
    if (selected == null) return;
    const s = cited.find((x) => x.n === selected);
    if (s && group !== "all" && sourceGroup(s) !== group) setGroup("all");
    const el = bodyRef.current?.querySelector(`[data-src="${selected}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const copy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1400); }).catch(() => {});
  };

  return (
    <aside className="lx-panel-el" aria-label="Sources">
      <div className="lx-sheet-handle" />
      <div className="lx-ph">
        Sources <small>{cited.length}</small>
        <span className="lx-sp" />
        <button type="button" className="lx-btn sm" onClick={onClose}>Close</button>
      </div>
      {meta && cited.length > 0 && (
        <div className="lx-seg" role="tablist">
          {GROUPS.map(([g, label]) => (
            <button key={g} type="button" role="tab" aria-selected={group === g} className={group === g ? "on" : ""}
              disabled={g !== "all" && count(g) === 0} onClick={() => setGroup(g)}>
              {label}{g !== "all" ? ` ${count(g)}` : ""}
            </button>
          ))}
        </div>
      )}
      <div className="lx-pbody" ref={bodyRef}>
        {!meta && (
          <div className="lx-pempty">
            Sources appear here once Lex has answered.<br />Each citation in the answer links to its source card.
          </div>
        )}
        {meta && cited.length === 0 && (
          <div className="lx-pempty">This answer cites no sources from the search. Treat every point as unverified.</div>
        )}
        {shown.map((s) => {
          const badge = authorityBadge(s);
          const st = STATUS_TEXT[s.status];
          return (
            <div key={s.id} data-src={s.n} className={`lx-src${selected === s.n ? " on" : ""}`}
              onClick={() => onSelect(selected === s.n ? null : s.n)}>
              <div className="h">
                <span className="n">[{s.n}]</span>
                <span className={`lx-auth ${badge.tone}`}>{badge.label}</span>
                <span className="lx-sp" />
                <span className={`lx-pill sm t-${st.tone}`} title={`${st.label}. ${s.notes.join(". ")}`}><i />{st.short}</span>
              </div>
              <div className="t">{s.title || s.url}</div>
              <div className="m">{[s.issuer, s.typeLabel].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" \u00b7 ")}</div>
              {s.pinpoints.length > 0 && <div className="pins">Cited {s.pinpoints.map(pinpointLabel).join(", ")}</div>}
              {s.snippet && <blockquote>{s.snippet}</blockquote>}
              {s.readError && <div className="note">Could not read the source: {s.readError}</div>}
              <div className="f" onClick={(e) => e.stopPropagation()}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">Open source</a>
                <span className="lx-sp" />
                <button type="button" className="lx-btn sm" onClick={() => copy(s.id, copyCiteText(s))}>
                  <Icon name={copied === s.id ? "check" : "copy"} />{copied === s.id ? "Copied" : "Copy cite"}
                </button>
              </div>
            </div>
          );
        })}
        {meta && group === "all" && other.length > 0 && (
          <>
            <div className="lx-sec-h" style={{ margin: "10px 4px 0" }}>Also found, not cited</div>
            {other.slice(0, 8).map((s) => (
              <div key={s.id} className="lx-src other">
                <div className="h"><span className={`lx-auth ${authorityBadge(s).tone}`}>{authorityBadge(s).label}</span></div>
                <div className="t"><a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>{s.title || s.url}</a></div>
              </div>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
