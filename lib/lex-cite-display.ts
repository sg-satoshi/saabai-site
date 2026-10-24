/**
 * Display helpers for Lex citations (phase B research view).
 *
 * The answer text carries [[cite:S3|para 41]] markers. The view turns each
 * marker into a chip "[n] at [41]" linked to source card n, and copy or export
 * turns it into the same plain text. Earlier, renderMarkers produced
 * "[1 at [41]]", a pinpoint nested inside the number bracket. Here the number
 * and the pinpoint are separate: "[1] at [41]".
 */
import { CITE_MARKER, pinpointLabel, type CiteStatus, type LexAnswerMeta, type LexCitation, type LexSource } from "./lex-sources";

export type CiteSegment =
  | { kind: "text"; text: string }
  | { kind: "cite"; n: number; id: string; pinpoint: string; label: string; status: CiteStatus; note: string }
  | { kind: "unsourced"; note: string };

/** "[1] at [41]", "[2] s 109D(1)", "[3]". */
export function citeLabel(n: number, pinpoint: string): string {
  return `[${n}]${pinpoint ? ` ${pinpointLabel(pinpoint)}` : ""}`;
}

/** Splits answer text into text and citation segments. Incomplete markers at the end (still streaming) are dropped. */
export function splitCitations(text: string, citations: LexCitation[] = []): CiteSegment[] {
  const byKey = new Map(citations.map((c) => [`${c.id ?? "none"}|${c.pinpoint}`, c]));
  const out: CiteSegment[] = [];
  let last = 0;
  const pushText = (t: string) => {
    if (!t) return;
    const prev = out[out.length - 1];
    if (prev && prev.kind === "text") prev.text += t;
    else out.push({ kind: "text", text: t });
  };
  const src = text.replace(/\[\[cite:[^\]]*\]?$/i, "");
  for (const m of src.matchAll(new RegExp(CITE_MARKER.source, "gi"))) {
    const idx = m.index ?? 0;
    // Drop the space the model leaves before a marker that sits before punctuation.
    pushText(src.slice(last, idx));
    last = idx + m[0].length;
    const rawId = m[1];
    const pin = (m[2] ?? "").trim();
    const id = rawId.toLowerCase() === "none" ? null : rawId.toUpperCase();
    const c = byKey.get(`${id ?? "none"}|${pin}`);
    if (!id) { out.push({ kind: "unsourced", note: c?.note ?? "Stated without a source from this search" }); continue; }
    if (c && c.status === "unknown_source") { out.push({ kind: "unsourced", note: c.note }); continue; }
    // No verification data yet (still streaming): hide the marker rather than invent a number.
    if (!c || !c.n) continue;
    out.push({ kind: "cite", n: c.n, id, pinpoint: c.pinpoint, label: citeLabel(c.n, c.pinpoint), status: c.status, note: c.note });
  }
  pushText(src.slice(last));
  // Tidy " ." left where a marker was removed or followed by punctuation.
  for (const s of out) if (s.kind === "text") s.text = s.text.replace(/[ \t]+([.,;:])/g, "$1");
  return out;
}

/** Plain text with citations as "[1] at [41]" and unsourced points as "[unverified]". */
export function plainAnswer(text: string, citations: LexCitation[] = []): string {
  return splitCitations(text, citations)
    .map((s) => (s.kind === "text" ? s.text : s.kind === "cite" ? ` ${s.label}` : " [unverified]"))
    .join("")
    .replace(/ +([.,;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export type SourceGroup = "cases" | "legislation" | "ato" | "other";

export function sourceGroup(s: Pick<LexSource, "type">): SourceGroup {
  if (s.type === "case" || s.type === "tribunal") return "cases";
  if (s.type === "legislation") return "legislation";
  if (s.type === "ato_ruling" || s.type === "ato_guidance") return "ato";
  return "other";
}

/** Short authority badge for a source card. */
export function authorityBadge(s: Pick<LexSource, "type" | "authority">): { label: string; tone: "strong" | "mid" | "weak" } {
  if (s.type === "legislation") return { label: "Primary legislation", tone: "strong" };
  if (s.type === "case" && s.authority === "binding") return { label: "Binding court", tone: "strong" };
  if (s.type === "case") return { label: "Persuasive court", tone: "mid" };
  if (s.type === "tribunal") return { label: "Tribunal, not binding", tone: "mid" };
  if (s.type === "ato_ruling") return { label: "ATO ruling", tone: "mid" };
  if (s.type === "ato_guidance") return { label: "ATO guidance", tone: "weak" };
  if (s.type === "regulator") return { label: "Regulator guidance", tone: "weak" };
  if (s.type === "foreign") return { label: "Foreign, persuasive", tone: "weak" };
  return { label: "Secondary", tone: "weak" };
}

const STATUS_RANK: Record<CiteStatus, number> = { verified: 0, not_checked: 1, pinpoint_not_found: 2, unknown_source: 3, no_source: 4 };

export type CitedSource = LexSource & { n: number; status: CiteStatus; pinpoints: string[]; notes: string[] };

/** Sources in citation order with their number, best status and pinpoints; uncited search results come after, without a number. */
export function citedSources(meta: LexAnswerMeta): { cited: CitedSource[]; other: LexSource[] } {
  const byId = new Map<string, CitedSource>();
  for (const c of meta.citations) {
    if (!c.id || !c.n) continue;
    const s = meta.sources.find((x) => x.id === c.id);
    if (!s) continue;
    const cur = byId.get(c.id);
    if (!cur) byId.set(c.id, { ...s, n: c.n, status: c.status, pinpoints: c.pinpoint ? [c.pinpoint] : [], notes: [c.note] });
    else {
      if (STATUS_RANK[c.status] > STATUS_RANK[cur.status]) cur.status = c.status; // show the worst case for the source
      if (c.pinpoint && !cur.pinpoints.includes(c.pinpoint)) cur.pinpoints.push(c.pinpoint);
      if (!cur.notes.includes(c.note)) cur.notes.push(c.note);
    }
  }
  const cited = [...byId.values()].sort((a, b) => a.n - b.n);
  const other = meta.sources.filter((s) => !byId.has(s.id));
  return { cited, other };
}

export const STATUS_TEXT: Record<CiteStatus, { label: string; short: string; tone: "ok" | "neu" | "warn" | "bad" }> = {
  verified: { label: "Verified in source", short: "Verified", tone: "ok" },
  not_checked: { label: "Not checked", short: "Not checked", tone: "neu" },
  pinpoint_not_found: { label: "Pinpoint not found", short: "Pinpoint not found", tone: "warn" },
  unknown_source: { label: "Unknown source", short: "Unknown source", tone: "bad" },
  no_source: { label: "No source", short: "No source", tone: "bad" },
};

/** "Copy cite" text for one source: title, then pinpoints, then the link. */
export function copyCiteText(s: CitedSource | LexSource): string {
  const pins = "pinpoints" in s && s.pinpoints.length ? ` (${s.pinpoints.map(pinpointLabel).join(", ")})` : "";
  return `${s.title}${pins}. ${s.url}`;
}

/** Answer plus a numbered source list, for "Copy with citations" and Word export. */
export function answerWithSources(text: string, meta?: LexAnswerMeta): string {
  if (!meta) return plainAnswer(text);
  const body = plainAnswer(text, meta.citations);
  const { cited } = citedSources(meta);
  if (!cited.length) return body;
  const list = cited.map((s) => `[${s.n}] ${s.title}. ${s.typeLabel}. ${STATUS_TEXT[s.status].label}. ${s.url}`).join("\n");
  return `${body}\n\nSources\n${list}`;
}

/** Overall summary pills for an answer: the weakest and strongest conclusion. */
export function confidenceSummary(meta?: LexAnswerMeta): { high: number; moderate: number; low: number } {
  const out = { high: 0, moderate: 0, low: 0 };
  for (const c of meta?.conclusions ?? []) out[c.confidence]++;
  return out;
}
