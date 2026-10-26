/**
 * Lex Legal Research Tools
 *
 * Real-time search across the sources Lex is allowed to use:
 *   checkCitation      : licensed OALC snapshot (NSW Caselaw, Federal Court, High Court; cutoff 10 March 2025)
 *   searchAustLII      : paused AustLII site search, not the licensed snapshot
 *   searchATO          : ATO rulings, interpretive decisions, tax cases, guides
 *   searchLegislation  : Federal Register of Legislation (Acts + Regulations)
 *   searchInternational: BAILII (UK). NZLII and WorldLII stay off while AustLII is paused
 *
 * Requires SERPER_API_KEY (serper.dev): add to Vercel environment variables.
 * Without it every tool returns a graceful "not configured" message so Lex
 * can still answer from its training knowledge and tell the user to verify.
 */

export interface LegalSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface LegalSearchResponse {
  results: LegalSearchResult[];
  query: string;
  source: string;
  error?: string;
}

// ── AustLII pause ─────────────────────────────────────────────────────────────
// AustLII's usage policy restricts automated and AI-related access (including
// retrieval-time inputs to AI). All AustLII-run sources stay off until AustLII
// gives written permission. Set LEX_AUSTLII_ENABLED=true only after that.

/** Sites run on AustLII infrastructure. Lex neither searches nor reads them while paused. */
const AUSTLII_HOSTS = /(^|\.)(austlii\.edu\.au|worldlii\.org|nzlii\.org|commonlii\.org|lawcite\.org)$/i;

export function isAustliiEnabled(): boolean {
  return process.env.LEX_AUSTLII_ENABLED === "true";
}

export function isAustliiHost(hostOrSite: string): boolean {
  const host = hostOrSite.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
  return AUSTLII_HOSTS.test(host);
}

function isAustliiUrl(url: string): boolean {
  try { return isAustliiHost(new URL(url).hostname); } catch { return false; }
}

/** Tool names that only search AustLII. Dropped from every Lex tool set while paused. */
export const AUSTLII_TOOL_NAMES = [
  "searchAustLII",
  "searchStateLegislation",
  "searchART",
  "searchAAT",
  "searchCorporationsLaw",
  "searchFamilyLaw",
] as const;

/** Removes AustLII-only tools from a tool set while the pause is on. */
export function withoutAustliiTools<T extends Record<string, unknown>>(tools: T): T {
  if (isAustliiEnabled()) return tools;
  const out = { ...tools } as Record<string, unknown>;
  for (const k of AUSTLII_TOOL_NAMES) delete out[k];
  return out as T;
}

const AUSTLII_PAUSED = "This source is paused. Lex is not searching AustLII-run databases until AustLII gives permission.";

async function siteSearch(
  query: string,
  site: string,
  sourceLabel: string,
  numResults = 6
): Promise<LegalSearchResponse> {
  if (!isAustliiEnabled() && isAustliiHost(site)) {
    return { results: [], query, source: sourceLabel, error: AUSTLII_PAUSED };
  }

  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    return {
      results: [],
      query,
      source: sourceLabel,
      error:
        "Search API not configured: add SERPER_API_KEY to Vercel environment variables to enable live legal database search.",
    };
  }

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: `site:${site} ${query}`, num: numResults }),
    });

    if (!res.ok) {
      return {
        results: [],
        query,
        source: sourceLabel,
        error: `Search returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const organic: Array<{ title?: string; link?: string; snippet?: string }> =
      data.organic ?? [];

    const kept = isAustliiEnabled() ? organic : organic.filter((r) => !isAustliiUrl(r.link ?? ""));
    return {
      results: kept.map((r) => ({
        title: r.title ?? "",
        url: r.link ?? "",
        snippet: r.snippet ?? "",
        source: sourceLabel,
      })),
      query,
      source: sourceLabel,
    };
  } catch (err) {
    return {
      results: [],
      query,
      source: sourceLabel,
      error: String(err),
    };
  }
}

/**
 * AustLII site search. This is not the licensed case-law snapshot and it is
 * not a complete set of Australian courts. Prefer checkCitation for a citation
 * in the OALC snapshot (NSW Caselaw, Federal Court, High Court; cutoff 10 March 2025).
 *
 * @param query     Free-text legal query
 * @param jurisdiction  Optional court code, used only as extra query text
 */
export async function searchAustLII(
  query: string,
  jurisdiction?: string
): Promise<LegalSearchResponse> {
  const q = jurisdiction ? `${query} ${jurisdiction}` : query;
  return siteSearch(q, "austlii.edu.au", "AustLII");
}

/**
 * Search the Australian Taxation Office website.
 * Covers: public and private rulings, ATO interpretive decisions,
 * tax cases, guides, practice statements, and legislative instruments.
 */
export async function searchATO(query: string): Promise<LegalSearchResponse> {
  return siteSearch(query, "ato.gov.au", "ATO");
}

/**
 * Search the Federal Register of Legislation (legislation.gov.au).
 * Covers: Commonwealth Acts, Regulations, Legislative Instruments,
 * Notifiable Instruments, and Prerogative Instruments.
 *
 * @param query  Act name, regulation name, or topic
 */
export async function searchLegislation(
  query: string
): Promise<LegalSearchResponse> {
  return siteSearch(query, "legislation.gov.au", "Federal Register of Legislation");
}

/**
 * Search international legal databases for comparative law.
 * Covers: BAILII (UK/Ireland), NZLII (New Zealand), WorldLII (multi-jurisdiction).
 * Useful for common law comparisons, treaty interpretation, and international cases.
 *
 * @param query   Legal query
 * @param source  "bailii" | "nzlii" | "worldlii": defaults to worldlii
 */
export async function searchInternational(
  query: string,
  source: "bailii" | "nzlii" | "worldlii" = "worldlii"
): Promise<LegalSearchResponse> {
  // WorldLII and NZLII run on AustLII infrastructure, so BAILII is used while the pause is on.
  if (!isAustliiEnabled() && source !== "bailii") source = "bailii";
  const sites: Record<string, { site: string; label: string }> = {
    bailii: { site: "bailii.org", label: "BAILII (UK/Ireland)" },
    nzlii: { site: "nzlii.org", label: "NZLII (New Zealand)" },
    worldlii: { site: "worldlii.org", label: "WorldLII" },
  };
  const { site, label } = sites[source];
  return siteSearch(query, site, label);
}

/**
 * Verify the exact text of a section from legislation.gov.au.
 * Use this BEFORE citing any specific statutory provision in a document.
 * Anti-hallucination: always verify section numbers and text before including in a draft.
 *
 * @param act       Full Act name, e.g. "Corporations Act 2001"
 * @param section   Section reference, e.g. "181" or "9(1)(b)"
 */
export async function verifySection(
  act: string,
  section: string
): Promise<LegalSearchResponse> {
  const q = `"${act}" "section ${section}"`;
  return siteSearch(q, "legislation.gov.au", "Federal Register of Legislation");
}

/**
 * Search state and territory legislation on AustLII.
 * Use for state-specific Acts: Property Law Act, Conveyancing Act, Duties Act,
 * Succession Act, Workers Compensation, Retail Leases Act, etc.
 *
 * @param query  Legal query
 * @param state  "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT"
 */
export async function searchStateLegislation(
  query: string,
  state: "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT"
): Promise<LegalSearchResponse> {
  const statePathMap: Record<string, string> = {
    NSW: "nsw/legis",
    VIC: "vic/legis",
    QLD: "qld/legis",
    WA: "wa/legis",
    SA: "sa/legis",
    TAS: "tas/legis",
    ACT: "act/legis",
    NT: "nt/legis",
  };
  const path = statePathMap[state];
  return siteSearch(`${query} ${state}`, `austlii.edu.au/au/${path}`, `AustLII (${state} Legislation)`);
}

/**
 * Search ASIC (Australian Securities and Investments Commission).
 * Covers: regulatory guides, information sheets, legislative instruments,
 * media releases, ASIC decisions, and company search guidance.
 *
 * @param query  Legal or regulatory query
 */
export async function searchASIC(query: string): Promise<LegalSearchResponse> {
  return siteSearch(query, "asic.gov.au", "ASIC");
}

/**
 * Search Administrative Review Tribunal (ART) decisions on AustLII, plus the
 * former Administrative Appeals Tribunal (AAT) for decisions before 14 Oct 2024.
 * The ART replaced the AAT on 14 October 2024. AustLII databases: ARTA and AATA.
 * Covers: tax objections, ATO reviews, migration, NDIS, social security.
 *
 * @param query  Legal query
 */
export async function searchART(query: string): Promise<LegalSearchResponse> {
  const [art, aat] = await Promise.all([
    siteSearch(query, "austlii.edu.au/au/cases/cth/ARTA", "Administrative Review Tribunal (ART)", 4),
    siteSearch(query, "austlii.edu.au/au/cases/cth/AATA", "Administrative Appeals Tribunal (AAT, before 14 Oct 2024)", 3),
  ]);
  const results = [...art.results, ...aat.results];
  const error = art.error && aat.error ? art.error : undefined;
  return { results, query, source: "Administrative Review Tribunal (ART) and former AAT", ...(error ? { error } : {}) };
}

/** @deprecated The AAT was replaced by the ART on 14 Oct 2024. Kept so saved firm tool lists keep working. */
export const searchAAT = searchART;

/**
 * Search Fair Work Commission decisions, awards, and determinations.
 * Covers: unfair dismissal, enterprise agreements, modern awards,
 * general protections, minimum wage decisions, and anti-bullying.
 *
 * @param query  Employment law query
 */
export async function searchFairWork(query: string): Promise<LegalSearchResponse> {
  return siteSearch(query, "fwc.gov.au", "Fair Work Commission");
}

/**
 * AustLII site search for corporations topics. Not a complete case-law database.
 * Corporations Act text is on the Federal Register. Citations in the licensed
 * snapshot are checked with checkCitation.
 *
 * @param query  Corporations law query
 */
export async function searchCorporationsLaw(query: string): Promise<LegalSearchResponse> {
  return siteSearch(`${query} corporations act`, "austlii.edu.au", "AustLII (Corporations Law)");
}

/**
 * AustLII site search of family-law databases. Those courts are not in the
 * licensed case-law snapshot (cutoff 10 March 2025). A result from this
 * function does not mean the Family Court was confirmed.
 *
 * @param query  Family law query
 */
export async function searchFamilyLaw(query: string): Promise<LegalSearchResponse> {
  const [div1, div2, famca] = await Promise.all([
    siteSearch(query, "austlii.edu.au/au/cases/cth/FedCFamC1F", "Federal Circuit and Family Court of Australia (Division 1)", 3),
    siteSearch(query, "austlii.edu.au/au/cases/cth/FedCFamC2F", "Federal Circuit and Family Court of Australia (Division 2)", 2),
    siteSearch(query, "austlii.edu.au/au/cases/cth/famca", "Family Court of Australia (before Sept 2021)", 3),
  ]);
  const results = [...div1.results, ...div2.results, ...famca.results];
  const error = div1.error && div2.error && famca.error ? div1.error : undefined;
  return { results, query, source: "Federal Circuit and Family Court of Australia and former Family Court", ...(error ? { error } : {}) };
}

// ── Federal Register of Legislation API (Commonwealth Act status) ────────────

const FRL_API = "https://api.prod.legislation.gov.au/v1/Titles";
const FRL_TIMEOUT_MS = 10000;
const FRL_LABEL = "Federal Register of Legislation (status)";
const FRL_SELECT =
  "id,name,collection,status,isInForce,isPrincipal,hasCommencedUnincorporatedAmendments,statusPossibleFuture,namePossibleFuture,nameHistory,statusHistory,year,number";

export interface ActStatus {
  id: string;
  name: string;
  /** The name the caller asked for, when the Act has since been renamed. */
  formerName?: string;
  status: string;
  isInForce: boolean;
  isPrincipal: boolean;
  /** Amendments that have commenced but are not yet in the compiled text on the Register. */
  hasCommencedUnincorporatedAmendments: boolean;
  /** Scheduled future status changes (for example a future repeal). */
  statusPossibleFuture: Array<{ status?: string; start?: string }>;
  namePossibleFuture: Array<{ name?: string; start?: string }>;
  /** Date the current status started, when the Register gives one. */
  statusSince?: string;
  url: string;
}

export interface ActStatusResponse extends LegalSearchResponse {
  acts: ActStatus[];
}

/**
 * Only an Act name may leave Lex for this API. Placeholders ({{PERSON_1}}) or anything
 * that is not a plausible Act title is refused, so no client detail can be sent.
 */
export function cleanActName(raw: string): string | null {
  const s = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!s || s.length > 160) return null;
  if (/\{\{|\}\}|@|https?:/i.test(s)) return null;
  if (!/^[A-Za-z0-9 ().,'&\-]+$/.test(s)) return null;
  if (!/\b(Act|Regulations?|Rules|Ordinance)\b/i.test(s)) return null;
  return s;
}

type FrlTitle = {
  id: string; name: string; status?: string; isInForce?: boolean; isPrincipal?: boolean;
  hasCommencedUnincorporatedAmendments?: boolean;
  statusPossibleFuture?: Array<{ status?: string; start?: string }>;
  namePossibleFuture?: Array<{ name?: string; start?: string }>;
  nameHistory?: Array<{ name?: string }>;
  statusHistory?: Array<{ status?: string; start?: string }>;
};

async function frlQuery(filter: string, top: number, fetchImpl: typeof fetch): Promise<FrlTitle[]> {
  const u = new URL(FRL_API);
  u.searchParams.set("$filter", filter);
  u.searchParams.set("$top", String(top));
  u.searchParams.set("$select", FRL_SELECT);
  const res = await fetchImpl(u.toString(), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(FRL_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Register returned HTTP ${res.status}`);
  const data = (await res.json()) as { value?: FrlTitle[] };
  return Array.isArray(data.value) ? data.value : [];
}

function toActStatus(t: FrlTitle, asked: string): ActStatus {
  const hist = t.statusHistory ?? [];
  const since = hist.length ? hist[hist.length - 1].start : undefined;
  return {
    id: t.id,
    name: t.name,
    ...(t.name.toLowerCase() !== asked.toLowerCase() && (t.nameHistory ?? []).some((h) => (h.name ?? "").toLowerCase() === asked.toLowerCase())
      ? { formerName: asked }
      : {}),
    status: t.status ?? "Unknown",
    isInForce: t.isInForce === true,
    isPrincipal: t.isPrincipal === true,
    hasCommencedUnincorporatedAmendments: t.hasCommencedUnincorporatedAmendments === true,
    statusPossibleFuture: t.statusPossibleFuture ?? [],
    namePossibleFuture: t.namePossibleFuture ?? [],
    ...(since ? { statusSince: since.slice(0, 10) } : {}),
    url: `https://www.legislation.gov.au/${t.id}/latest/text`,
  };
}

function statusSnippet(a: ActStatus): string {
  const parts = [`Status: ${a.status}${a.statusSince ? ` since ${a.statusSince}` : ""}.`];
  if (a.formerName) parts.push(`Renamed: formerly ${a.formerName}.`);
  if (a.hasCommencedUnincorporatedAmendments) parts.push("Commenced amendments are not yet incorporated in the compiled text. Check the amending Acts.");
  if (a.statusPossibleFuture.length) parts.push(`Scheduled change: ${a.statusPossibleFuture.map((f) => `${f.status ?? "change"}${f.start ? ` from ${f.start.slice(0, 10)}` : ""}`).join(", ")}.`);
  if (a.namePossibleFuture.length) parts.push(`Scheduled rename: ${a.namePossibleFuture.map((f) => f.name).filter(Boolean).join(", ")}.`);
  return parts.join(" ");
}

/**
 * Commonwealth Act status from the Federal Register of Legislation API (free, no auth).
 * Exact title first (also matches former names), then a contains() match.
 * Never throws: on timeout or error it returns an error string so Lex can say it could not check.
 * Section text still comes from searchLegislation / verifySection (Serper plus readSource).
 */
export async function checkLegislationStatus(act: string, fetchImpl: typeof fetch = fetch): Promise<ActStatusResponse> {
  const name = cleanActName(act);
  if (!name) {
    return { results: [], acts: [], query: "", source: FRL_LABEL, error: "Give an Act title only, for example 'Privacy Act 1988'." };
  }
  const q = name.replace(/'/g, "''");
  try {
    let titles = await frlQuery(`name eq '${q}'`, 3, fetchImpl);
    if (!titles.length) titles = await frlQuery(`contains(name,'${q}')`, 5, fetchImpl);
    const acts = titles.map((t) => toActStatus(t, name));
    return {
      acts,
      results: acts.map((a) => ({ title: a.name, url: a.url, snippet: statusSnippet(a), source: FRL_LABEL })),
      query: name,
      source: FRL_LABEL,
      ...(acts.length ? {} : { error: "No Commonwealth title found with that name. State Acts are not on this Register." }),
    };
  } catch (err) {
    const msg = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError") ? "Register timed out" : String(err instanceof Error ? err.message : err);
    return { results: [], acts: [], query: name, source: FRL_LABEL, error: `Could not check status: ${msg}. Check legislation.gov.au directly.` };
  }
}
