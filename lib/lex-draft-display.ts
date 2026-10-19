/**
 * Display helpers for the Lex drafting view (phase C). Pure functions, no React, so they are unit tested.
 * The draft API is unchanged: it streams plain text with [VERIFY: ...] markers, and a QA pass returns
 * { overallConfidence, sections[{ id, clause, status, note }], criticalIssues, recommendedChecks }.
 */

export type QAStatus = "verified" | "flagged" | "unverified";
export type QASection = { id: string; clause: string; status: QAStatus; note: string };
export type QAReport = { overallConfidence: number; sections: QASection[]; criticalIssues: string[]; recommendedChecks: string[] };

export type DraftBlock = { kind: "title" | "heading" | "para"; text: string; clauseId?: string };
export type DraftSegment = { kind: "text" | "verify" | "ref"; text: string };

const CLAUSE_RE = /^\s*((?:clause|schedule|part)\s+)?(\d+(?:\.\d+)*|[A-Z])[.)]?\s+/i;

/** Clause number a paragraph starts with ("1.2 The..." gives "1.2", "Clause 3. ..." gives "3"), if any. */
export function clauseIdOf(text: string): string | undefined {
  const m = CLAUSE_RE.exec(text);
  if (!m) return undefined;
  if (/^[A-Z]$/i.test(m[2]) && !m[1]) return undefined; // a bare "A " is a word, not a clause
  return m[2];
}

/** Normalise a QA section id ("Clause 1.2", "cl 1.2", "1.2.") to the clause number used in the draft. */
export function normaliseClauseId(id: string): string {
  const m = /(\d+(?:\.\d+)*)/.exec(id);
  return m ? m[1] : id.trim().toLowerCase();
}

function isHeading(text: string): boolean {
  if (text.includes("\n") || text.length > 90) return false;
  if (/[.;:,]$/.test(text) && !/^\d+\.\s/.test(text)) return false;
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 3 && letters === letters.toUpperCase()) return true; // ALL CAPS line
  return /^(\d+|[IVX]+)\.\s+[A-Z][^.]{0,70}$/.test(text) && text.split(" ").length <= 9; // "1. Grounds of objection"
}

/** Split the streamed draft into blocks. The first short line becomes the document title. */
export function splitDraft(text: string): DraftBlock[] {
  const parts = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out: DraftBlock[] = [];
  parts.forEach((p, i) => {
    if (i === 0 && p.length <= 90 && !p.includes("\n") && !clauseIdOf(p)) { out.push({ kind: "title", text: p }); return; }
    if (isHeading(p)) { out.push({ kind: "heading", text: p, clauseId: clauseIdOf(p) }); return; }
    out.push({ kind: "para", text: p, clauseId: clauseIdOf(p) });
  });
  return out;
}

// Legal references worth showing in citation style: cases with a medium neutral citation, sections, rulings.
const REF_RE = new RegExp([
  String.raw`\[(?:19|20)\d{2}\]\s+[A-Z][A-Za-z]{1,7}\s+\d+`,                       // [2019] HCA 12
  String.raw`\b(?:ss?|sections?)\s?\d+[A-Z]*(?:\(\d+[A-Za-z]?\))*(?:\s?(?:of\s+the\s+)?[A-Z][A-Za-z ]{2,60}?Act\s+\d{4})?`, // s 109D, section 8 of the Income Tax Assessment Act 1936
  String.raw`\b(?:TR|TD|PCG|LCR|MT|PS LA)\s?\d{4}\/[A-Z]?\d+`,                    // TR 2010/3
].join("|"), "g");
const VERIFY_RE = /\[VERIFY:\s*([^\]]*)\]/gi;

/** Break a paragraph into plain text, [VERIFY] markers and legal references. */
export function segmentDraft(text: string): DraftSegment[] {
  const out: DraftSegment[] = [];
  const pushText = (t: string) => {
    let last = 0;
    for (const m of t.matchAll(REF_RE)) {
      const at = m.index ?? 0;
      if (at > last) out.push({ kind: "text", text: t.slice(last, at) });
      out.push({ kind: "ref", text: m[0].trim() });
      last = at + m[0].length;
    }
    if (last < t.length) out.push({ kind: "text", text: t.slice(last) });
  };
  let last = 0;
  for (const m of text.matchAll(VERIFY_RE)) {
    const at = m.index ?? 0;
    if (at > last) pushText(text.slice(last, at));
    out.push({ kind: "verify", text: m[1].trim() || "Check this point" });
    last = at + m[0].length;
  }
  if (last < text.length) pushText(text.slice(last));
  return out;
}

/** Every [VERIFY] marker in the draft, in order. */
export function verifyMarkers(text: string): string[] {
  return [...text.matchAll(VERIFY_RE)].map((m) => m[1].trim() || "Check this point");
}

/** Unique legal references in the draft, in order of first use. */
export function draftReferences(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of text.replace(VERIFY_RE, " ").matchAll(REF_RE)) {
    const r = m[0].trim();
    const key = r.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(r); }
  }
  return out;
}

export const QA_STATUS: Record<QAStatus, { label: string; tone: "ok" | "warn" | "neu" }> = {
  verified: { label: "Supported", tone: "ok" },
  flagged: { label: "Needs review", tone: "warn" },
  unverified: { label: "Not checked", tone: "neu" },
};

/** Plain words for the QA score, matching the research view's tone tokens. */
export function confidenceBand(score: number): { label: string; tone: "ok" | "warn" | "bad" } {
  if (score >= 85) return { label: "High confidence", tone: "ok" };
  if (score >= 65) return { label: "Review advised", tone: "warn" };
  return { label: "Significant concerns", tone: "bad" };
}

/** QA sections with the most urgent first: flagged, then not checked, then supported. */
export function orderSections(sections: QASection[]): QASection[] {
  const rank: Record<QAStatus, number> = { flagged: 0, unverified: 1, verified: 2 };
  return [...sections].sort((a, b) => (rank[a.status] ?? 3) - (rank[b.status] ?? 3));
}
