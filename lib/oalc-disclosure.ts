/**
 * Licence-safe copy and citation normalisation for the OALC v7.1.0 snapshot.
 * Safe to import from client components: no database client.
 *
 * The issue asked for the Sources panel "as drafted by Nexus". That draft text
 * is not in the issue body or its comments, so this copy is taken from the
 * licence table, the cutoff wording, and the provenance comment on issue 266.
 */

export const OALC_CORPUS_VERSION = "v7.1.0";
export const OALC_CORPUS_SHA256 = "5abc64a3ad35a44eca65706babd63d1095c29ebebf3f5c588beb56612097b758";
export const OALC_CUTOFF_ISO = "2025-03-10";
export const OALC_CUTOFF_LABEL = "10 March 2025";

export const INDEX_UNAVAILABLE = "case-law index unavailable";

export const CHECK_CITATION_DESCRIPTION =
  "Check one case citation against the licensed Open Australian Legal Corpus snapshot v7.1.0 (cutoff 10 March 2025). " +
  "Covers NSW Caselaw, Federal Court and High Court decisions in that snapshot only. " +
  "Does not cover the Family Court, the Federal Circuit and Family Court, other State or Territory supreme courts, or tribunals. " +
  "Returns the citation, the court, the date and a link to the official original. Does not return judgment text. " +
  "NSW Caselaw and High Court results are citation and link only. " +
  "A Federal Court result may be quoted only with an acknowledgement that it is a judgment of the Court, and this version does not return the text. " +
  "A year-only date is the year from the citation, not a precise decision date. " +
  "Legislation is checked on the Federal Register of Legislation, never in this snapshot. " +
  "If the citation is missing, repeat the tool's wording. A missing citation was not fabricated: ask the user to confirm it exists.";

export const SEARCH_AUSTLII_DESCRIPTION =
  "Web search on AustLII, only when AustLII access is enabled. This is not Lex's licensed case-law snapshot and it is not a complete set of Australian courts. " +
  "Do not describe it as a complete national case-law service. " +
  "To check a citation against the licensed snapshot (NSW Caselaw, Federal Court and High Court only, cutoff 10 March 2025), use checkCitation.";

export const SEARCH_FAMILY_LAW_DESCRIPTION =
  "Family Court and Federal Circuit and Family Court decisions are not in the licensed case-law snapshot (cutoff 10 March 2025). " +
  "This tool does not confirm those decisions. Do not tell the user the Family Court was searched.";

export const SEARCH_CORPORATIONS_DESCRIPTION =
  "Does not search a complete corporations case-law database. Corporations Act text is checked on the Federal Register of Legislation. " +
  "Case citations in the licensed snapshot (Federal Court, High Court and NSW Caselaw, cutoff 10 March 2025) are checked with checkCitation.";

export const FCA_ACKNOWLEDGEMENT =
  "Judgment of the Federal Court of Australia. Any commentary is the publisher's, not the Court's.";

export type SourcePanelBlock = { title: string; body: string };

export const OALC_SOURCE_PANEL: SourcePanelBlock[] = [
  {
    title: "Snapshot",
    body:
      `Case law in Lex comes from the Open Australian Legal Corpus, release ${OALC_CORPUS_VERSION}, cutoff ${OALC_CUTOFF_LABEL}. ` +
      `The snapshot hash is ${OALC_CORPUS_SHA256}. It is an archive, not current law.`,
  },
  {
    title: "Courts in the snapshot",
    body:
      "NSW Caselaw, the Federal Court of Australia and the High Court of Australia. Decisions only. " +
      "The Family Court, the Federal Circuit and Family Court, other state and territory supreme courts, and tribunals are not in this snapshot.",
  },
  {
    title: "What a result contains",
    body:
      "A result is the citation, the court, the date and a link to the official original. " +
      "NSW Caselaw and High Court results are citation and link only. Judgment text is not shown. " +
      "Federal Court judgments may be quoted with an acknowledgement that the text is a judgment of the Court and that any commentary is the publisher's. " +
      "This version does not return the full text.",
  },
  {
    title: "Dates",
    body: "A date shown as a year only is the year taken from the citation. It is flagged because it is not a precise decision date.",
  },
  {
    title: "If a citation is missing",
    body:
      `A citation year of 2025 or later: it may postdate our licensed snapshot (cutoff ${OALC_CUTOFF_LABEL}), confirm it exists. ` +
      `An older citation that is missing: it is not in our licensed snapshot (cutoff ${OALC_CUTOFF_LABEL}), confirm it exists. ` +
      "A missing citation is not proof it was made up.",
  },
  {
    title: "Legislation",
    body: "Acts and regulations are not taken from this snapshot. Commonwealth legislation is checked on the Federal Register of Legislation.",
  },
];

const MNC_RE = /\[(\d{4})\]\s*([A-Za-z][A-Za-z0-9]*)\s*(\d+[A-Za-z]?)/i;
const YEAR_PAREN_RE = /\((1[89]\d{2}|20\d{2})\)/;
const YEAR_WORD_RE = /\b(1[89]\d{2}|20\d{2})\b/;

/** Same rules as normalise_citation in scripts/oalc-build-index.py. */
export function normaliseCitation(raw: string): string {
  let s = (raw ?? "").normalize("NFKC").replace(/\u00a0/g, " ").trim();
  s = s.replace(/\s+/g, " ");
  s = s.replace(/\[\s+/g, "[").replace(/\s+\]/g, "]");
  const match = MNC_RE.exec(s);
  if (match) return `[${match[1]}] ${match[2].toUpperCase()} ${match[3].toUpperCase()}`;
  return s.toLowerCase();
}

export function citationYear(raw: string): number | null {
  const s = (raw ?? "").normalize("NFKC");
  const mnc = MNC_RE.exec(s);
  if (mnc) return Number(mnc[1]);
  const paren = YEAR_PAREN_RE.exec(s);
  if (paren) return Number(paren[1]);
  const word = YEAR_WORD_RE.exec(s);
  if (word) return Number(word[1]);
  return null;
}

export function mncParts(raw: string): { year: string; court: string; number: string } | null {
  const match = MNC_RE.exec((raw ?? "").normalize("NFKC"));
  if (!match) return null;
  return { year: match[1], court: match[2].toUpperCase(), number: match[3].toUpperCase() };
}

/**
 * A miss in 2025 or later may postdate the snapshot. An older miss is simply
 * absent. Neither wording says the citation was fabricated, or that it was "not found".
 */
export function notFoundMessage(citation: string, cutoffLabel: string = OALC_CUTOFF_LABEL): string {
  const year = citationYear(citation);
  if (year !== null && year >= 2025) {
    return `may postdate our licensed snapshot (cutoff ${cutoffLabel}), confirm it exists`;
  }
  return `not in our licensed snapshot (cutoff ${cutoffLabel}), confirm it exists`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type DatePrecision = "day" | "year" | "none";

export function formatDecisionDate(date: string | null, precision: DatePrecision): {
  dateDisplay: string | null;
  dateFlagged: boolean;
  dateNote: string | null;
} {
  if (precision === "year" && date && /^\d{4}/.test(date)) {
    return {
      dateDisplay: date.slice(0, 4),
      dateFlagged: true,
      dateNote: "Year only, taken from the citation. Not a precise decision date.",
    };
  }
  if (precision === "day" && date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    const name = MONTHS[month - 1];
    if (!name || !day) return { dateDisplay: date, dateFlagged: false, dateNote: null };
    return { dateDisplay: `${day} ${name} ${year}`, dateFlagged: false, dateNote: null };
  }
  return {
    dateDisplay: null,
    dateFlagged: false,
    dateNote: "No decision date in the licensed snapshot.",
  };
}

export function formatCutoffLabel(iso: string): string {
  if (iso === OALC_CUTOFF_ISO) return OALC_CUTOFF_LABEL;
  const shown = formatDecisionDate(iso.slice(0, 10), "day");
  return shown.dateDisplay ?? iso;
}

/** Legislation goes to the Federal Register, never the case-law corpus. A medium-neutral citation stays a case. */
export function isLegislationQuery(raw: string): boolean {
  const s = (raw ?? "").trim();
  if (!s || MNC_RE.test(s)) return false;
  return /\b(Act|Regulations?|Rules|Ordinance)\b/i.test(s) && /\b(1[89]\d{2}|20\d{2})\b/.test(s);
}

export function isHttpUrl(raw: string): boolean {
  return /^https?:\/\//i.test(raw.trim());
}
