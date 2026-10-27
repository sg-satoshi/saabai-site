/**
 * Existence check Lex uses for the OALC citation index.
 * The database is optional. With no Sydney env, or if the tables are missing,
 * the check returns "case-law index unavailable" and does not throw.
 */

import { checkLegislationStatus, type ActStatusResponse } from "./lex-tools";
import {
  CHECK_CITATION_DESCRIPTION,
  FCA_ACKNOWLEDGEMENT,
  INDEX_UNAVAILABLE,
  OALC_CORPUS_SHA256,
  OALC_CORPUS_VERSION,
  OALC_CUTOFF_ISO,
  OALC_CUTOFF_LABEL,
  citationYear,
  formatCutoffLabel,
  formatDecisionDate,
  isHttpUrl,
  isLegislationQuery,
  mncParts,
  normaliseCitation,
  notFoundMessage,
  type DatePrecision,
} from "./oalc-disclosure";

export { CHECK_CITATION_DESCRIPTION };

export type StoredCitation = {
  citation: string;
  source: string;
  jurisdiction: string;
  date: string | null;
  date_precision: DatePrecision;
  url: string;
  version_id: string;
  /** Present only on poisoned fixtures. Never copied onto a public result. */
  text?: string;
};

export type BuildMeta = {
  corpus_version: string;
  corpus_sha256: string;
  cutoff_date: string;
  built_at?: string;
  citation_count?: number;
  alias_count?: number;
  source_counts?: Record<string, number>;
};

export type CitationAlias = {
  alias_url: string;
  citation: string;
};

export interface CitationStore {
  exact(normalised: string): Promise<StoredCitation | null>;
  fuzzy(normalised: string): Promise<{ row: StoredCitation; similarity: number } | null>;
  byUrl(url: string): Promise<StoredCitation | null>;
  meta(): Promise<BuildMeta | null>;
}

export type LegislationLookup = (name: string) => Promise<ActStatusResponse | { query: string; source: string }>;

const SELECT_COLUMNS = "citation,source,jurisdiction,date,date_precision,url,version_id";

const PUBLIC_KEYS = [
  "status",
  "citation",
  "court",
  "date",
  "datePrecision",
  "dateDisplay",
  "dateFlagged",
  "dateNote",
  "url",
  "snapshotVersion",
  "snapshotSha256",
  "cutoff",
  "cutoffIso",
  "mayQuote",
  "acknowledgement",
  "textIncluded",
  "licence",
] as const;

export type FoundCitation = {
  status: "found";
  citation: string;
  court: string;
  date: string | null;
  datePrecision: DatePrecision;
  dateDisplay: string | null;
  dateFlagged: boolean;
  dateNote: string | null;
  url: string;
  snapshotVersion: string;
  snapshotSha256: string;
  cutoff: string;
  cutoffIso: string;
  mayQuote: boolean;
  acknowledgement: string | null;
  textIncluded: false;
  licence: "citation_and_link" | "quote_with_acknowledgement";
};

export type MissingCitation = {
  status: "missing";
  message: string;
  query: string;
  snapshotVersion: string;
  snapshotSha256: string;
  cutoff: string;
  cutoffIso: string;
};

export type LegislationRoute = {
  status: "legislation";
  routedTo: "federal_register";
  message: string;
  query: string;
  register: Awaited<ReturnType<LegislationLookup>>;
};

export type UnavailableIndex = {
  status: "unavailable";
  message: typeof INDEX_UNAVAILABLE;
};

export type CitationCheck = FoundCitation | MissingCitation | LegislationRoute | UnavailableIndex;

function unavailable(): UnavailableIndex {
  return { status: "unavailable", message: INDEX_UNAVAILABLE };
}

function snapshotOf(meta: BuildMeta | null): {
  snapshotVersion: string;
  snapshotSha256: string;
  cutoff: string;
  cutoffIso: string;
} {
  const cutoffIso = (meta?.cutoff_date || OALC_CUTOFF_ISO).slice(0, 10);
  return {
    snapshotVersion: meta?.corpus_version || OALC_CORPUS_VERSION,
    snapshotSha256: meta?.corpus_sha256 || OALC_CORPUS_SHA256,
    cutoffIso,
    cutoff: formatCutoffLabel(cutoffIso),
  };
}

/** NSW and High Court: citation, court, date, link. Federal Court may be quoted, but v0 still returns no text. */
export function toPublicCitation(row: StoredCitation, meta: BuildMeta | null): FoundCitation {
  const precision = row.date_precision;
  const shown = formatDecisionDate(row.date, precision);
  const federal = row.source === "Federal Court";
  const hit: FoundCitation = {
    status: "found",
    citation: row.citation,
    court: row.source,
    date: row.date,
    datePrecision: precision,
    dateDisplay: shown.dateDisplay,
    dateFlagged: shown.dateFlagged,
    dateNote: shown.dateNote,
    url: row.url,
    ...snapshotOf(meta),
    mayQuote: federal,
    acknowledgement: federal ? FCA_ACKNOWLEDGEMENT : null,
    textIncluded: false,
    licence: federal ? "quote_with_acknowledgement" : "citation_and_link",
  };
  const clean = {} as FoundCitation;
  for (const key of PUBLIC_KEYS) clean[key] = hit[key] as never;
  return clean;
}

function trigrams(value: string): Map<string, number> {
  const padded = `  ${value}  `;
  const counts = new Map<string, number>();
  for (let i = 0; i < padded.length - 2; i++) {
    const gram = padded.slice(i, i + 3);
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  return counts;
}

/** Dice coefficient on character trigrams, in the same range pg_trgm uses. */
export function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const left = trigrams(a);
  const right = trigrams(b);
  let shared = 0;
  let leftTotal = 0;
  let rightTotal = 0;
  for (const n of left.values()) leftTotal += n;
  for (const n of right.values()) rightTotal += n;
  for (const [gram, n] of left) shared += Math.min(n, right.get(gram) ?? 0);
  if (leftTotal + rightTotal === 0) return 0;
  return (2 * shared) / (leftTotal + rightTotal);
}

/**
 * Fuzzy only when the year agrees, and a medium-neutral court code and number
 * agree. A different case number is not a match.
 */
export function fuzzyAccept(query: string, candidate: string): boolean {
  const qMnc = mncParts(query);
  const cMnc = mncParts(candidate);
  if (qMnc && cMnc) {
    return qMnc.year === cMnc.year && qMnc.court === cMnc.court && qMnc.number === cMnc.number;
  }
  const qYear = citationYear(query);
  const cYear = citationYear(candidate);
  if (qYear && cYear && qYear !== cYear) return false;
  return true;
}

export function memoryStore(rows: StoredCitation[], aliases: CitationAlias[], meta: BuildMeta | null): CitationStore {
  const byNorm = new Map<string, StoredCitation>();
  const byUrl = new Map<string, StoredCitation>();
  for (const row of rows) {
    byNorm.set(normaliseCitation(row.citation), row);
    byUrl.set(row.url, row);
  }
  for (const alias of aliases) {
    const row = byNorm.get(normaliseCitation(alias.citation));
    if (row) byUrl.set(alias.alias_url, row);
  }
  return {
    async exact(normalised) {
      return byNorm.get(normalised) ?? null;
    },
    async byUrl(url) {
      return byUrl.get(url) ?? null;
    },
    async fuzzy(normalised) {
      let best: { row: StoredCitation; similarity: number } | null = null;
      for (const [key, row] of byNorm) {
        if (key === normalised || !fuzzyAccept(normalised, key)) continue;
        const similarity = trigramSimilarity(normalised, key);
        if (similarity < 0.8) continue;
        if (!best || similarity > best.similarity) best = { row, similarity };
      }
      return best;
    },
    async meta() {
      return meta;
    },
  };
}

const ROW_COLUMNS = SELECT_COLUMNS;

function rowFrom(data: Record<string, unknown> | null): StoredCitation | null {
  if (!data) return null;
  const precision = String(data.date_precision ?? "none");
  if (precision !== "day" && precision !== "year" && precision !== "none") return null;
  return {
    citation: String(data.citation ?? ""),
    source: String(data.source ?? ""),
    jurisdiction: String(data.jurisdiction ?? ""),
    date: data.date == null || data.date === "" ? null : String(data.date),
    date_precision: precision,
    url: String(data.url ?? ""),
    version_id: String(data.version_id ?? ""),
  };
}

async function supabaseStore(): Promise<CitationStore | null> {
  const url = process.env.OALC_SUPABASE_URL;
  const key = process.env.OALC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  async function exact(normalised: string): Promise<StoredCitation | null> {
    const { data, error } = await sb.from("oalc_citations").select(ROW_COLUMNS).eq("normalised_citation", normalised).maybeSingle();
    if (error) throw error;
    return rowFrom(data as Record<string, unknown> | null);
  }

  return {
    exact,
    async byUrl(citationUrl) {
      const direct = await sb.from("oalc_citations").select(ROW_COLUMNS).eq("url", citationUrl).maybeSingle();
      if (direct.error) throw direct.error;
      if (direct.data) return rowFrom(direct.data as Record<string, unknown>);
      const alias = await sb.from("oalc_citation_aliases").select("normalised_citation").eq("alias_url", citationUrl).maybeSingle();
      if (alias.error) throw alias.error;
      const key = (alias.data as { normalised_citation?: string } | null)?.normalised_citation;
      if (!key) return null;
      return exact(key);
    },
    async fuzzy(normalised) {
      const { data, error } = await sb.rpc("oalc_fuzzy_citation", { q: normalised });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      const stored = rowFrom(row as Record<string, unknown>);
      if (!stored) return null;
      const similarity = Number((row as { similarity?: number }).similarity ?? 0);
      if (!fuzzyAccept(normalised, normaliseCitation(stored.citation))) return null;
      return { row: stored, similarity };
    },
    async meta() {
      const { data, error } = await sb.from("oalc_build_meta").select("corpus_version,corpus_sha256,cutoff_date,built_at,citation_count,alias_count,source_counts").eq("id", 1).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const meta = data as BuildMeta;
      return { ...meta, cutoff_date: String(meta.cutoff_date).slice(0, 10) };
    },
  };
}

async function defaultLegislation(name: string): Promise<ActStatusResponse> {
  return checkLegislationStatus(name);
}

export async function checkCitation(
  raw: string,
  deps: { store?: CitationStore | null; legislation?: LegislationLookup } = {},
): Promise<CitationCheck> {
  const query = String(raw ?? "").trim();
  if (isLegislationQuery(query)) {
    const legislation = deps.legislation ?? defaultLegislation;
    try {
      const register = await legislation(query);
      return {
        status: "legislation",
        routedTo: "federal_register",
        message: "Legislation is checked on the Federal Register of Legislation, not in the case-law snapshot.",
        query,
        register,
      };
    } catch {
      return {
        status: "legislation",
        routedTo: "federal_register",
        message: "Legislation is checked on the Federal Register of Legislation, not in the case-law snapshot.",
        query,
        register: { query, source: "Federal Register of Legislation", error: "Could not reach the Federal Register." },
      };
    }
  }

  try {
    const store = deps.store === undefined ? await supabaseStore() : deps.store;
    if (!store) return unavailable();

    const meta = await store.meta();
    const snap = snapshotOf(meta);

    if (isHttpUrl(query)) {
      const row = await store.byUrl(query);
      if (!row) {
        return { status: "missing", message: notFoundMessage(query, snap.cutoff), query, ...snap };
      }
      return toPublicCitation(row, meta);
    }

    const normalised = normaliseCitation(query);
    const exact = normalised ? await store.exact(normalised) : null;
    const hit = exact ?? (await store.fuzzy(normalised))?.row ?? null;
    if (!hit) {
      return { status: "missing", message: notFoundMessage(query, snap.cutoff), query, ...snap };
    }
    return toPublicCitation(hit, meta);
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "";
    console.error("[oalc] case-law index unavailable", code || (err instanceof Error ? err.name : "error"));
    return unavailable();
  }
}
