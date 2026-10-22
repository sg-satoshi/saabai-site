/**
 * Lex citation backend (phase B0).
 *
 * The server, not the model, decides what a source is:
 *   - every search result gets an id (S1, S2, ...) in a per-request registry
 *   - its type and authority come from the URL and the tool that found it
 *   - readSource fetches the real text from an allowlist of legal sites
 *   - the model cites with [[cite:S3|para 41]] markers, which are checked after the answer
 */
import type { LegalSearchResponse } from "./lex-tools";

export type SourceType = "legislation" | "case" | "tribunal" | "ato_ruling" | "ato_guidance" | "regulator" | "foreign" | "secondary";
export type Authority = "binding" | "persuasive" | "not_binding" | "commissioner_bound" | "guidance" | "primary";

export type LexSource = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  type: SourceType;
  typeLabel: string;
  authority: Authority;
  issuer?: string;
  foundBy: string;
  read: boolean;
  readError?: string;
};

export type CiteStatus = "verified" | "not_checked" | "pinpoint_not_found" | "unknown_source" | "no_source";
export type LexCitation = { n: number; id: string | null; pinpoint: string; status: CiteStatus; note: string };
export type LexConclusion = { text: string; confidence: "high" | "moderate" | "low"; basis: string; citeIds: string[] };
export type LexAnswerMeta = {
  version: 1;
  sources: LexSource[];
  citations: LexCitation[];
  conclusions: LexConclusion[];
  verify: string[];
  counts: { verified: number; notChecked: number; problems: number };
};

// ── Classification ────────────────────────────────────────────────────────────

const HCA = /\/au\/cases\/cth\/(HCA|HCASJ)\//i;
const FED_APPEAL = /\/au\/cases\/cth\/FCAFC\//i;
const FED = /\/au\/cases\/cth\/(FCA|FCCA|FedCFamC2G|FMCA)\//i;
const STATE_APPEAL = /\/au\/cases\/(nsw|vic|qld|wa|sa|tas|act|nt)\/(NSWCA|VSCA|QCA|WASCA|SASCFC|SASCA|TASFC|TASCCA|ACTCA|NTCA|NSWCCA|VSCA)\//i;
const STATE_SC = /\/au\/cases\/(nsw|vic|qld|wa|sa|tas|act|nt)\/(NSWSC|VSC|QSC|WASC|SASC|TASSC|ACTSC|NTSC)\//i;
const TRIBUNAL = /\/au\/cases\/cth\/(ARTA|AATA|FWC|FWCFB)\/|\/au\/cases\/(nsw|vic|qld|wa|sa|tas|act|nt)\/(NCAT|NSWCATAD|VCAT|QCAT|SAT|SACAT|TASCAT|ACAT|NTCAT)\//i;

function host(url: string): string {
  try { return new URL(url).hostname.toLowerCase().replace(/^(www\d?|classic)\./, ""); } catch { return ""; }
}

export function classifySource(url: string, foundBy = ""): Pick<LexSource, "type" | "typeLabel" | "authority" | "issuer"> {
  const h = host(url);
  const path = (() => { try { return new URL(url).pathname; } catch { return ""; } })();
  if (h === "legislation.gov.au" || /\/au\/(legis|legislation)\/|\/consol_act\/|\/num_act\/|\/consol_reg\//i.test(path)) {
    return { type: "legislation", typeLabel: "Primary legislation", authority: "primary", issuer: h === "legislation.gov.au" ? "Federal Register of Legislation" : "AustLII" };
  }
  if (h === "austlii.edu.au" || h === "jade.io") {
    if (HCA.test(path)) return { type: "case", typeLabel: "Case, High Court", authority: "binding", issuer: "High Court of Australia" };
    if (FED_APPEAL.test(path)) return { type: "case", typeLabel: "Case, Full Federal Court", authority: "binding", issuer: "Full Court of the Federal Court" };
    if (STATE_APPEAL.test(path)) return { type: "case", typeLabel: "Case, state appeal court", authority: "binding", issuer: "State Court of Appeal" };
    if (FED.test(path)) return { type: "case", typeLabel: "Case, Federal Court", authority: "persuasive", issuer: "Federal Court of Australia" };
    if (STATE_SC.test(path)) return { type: "case", typeLabel: "Case, state Supreme Court", authority: "persuasive", issuer: "State Supreme Court" };
    if (TRIBUNAL.test(path)) {
      const art = /\/ARTA\//i.test(path);
      return { type: "tribunal", typeLabel: art ? "Tribunal decision, ART" : /\/AATA\//i.test(path) ? "Tribunal decision, former AAT" : "Tribunal decision", authority: "not_binding", issuer: art ? "Administrative Review Tribunal" : undefined };
    }
    if (/\/au\/cases\//i.test(path)) return { type: "case", typeLabel: "Case", authority: "persuasive", issuer: "AustLII" };
    if (/\/(nz|uk|ie|int)\//i.test(path)) return { type: "foreign", typeLabel: "Foreign authority", authority: "persuasive", issuer: "AustLII" };
    return { type: "secondary", typeLabel: "Secondary source", authority: "guidance", issuer: "AustLII" };
  }
  if (h === "ato.gov.au") {
    // Public rulings (TR, TD, PCG is guidance, LCR) live under /law/view with a docid such as TXR/TR20224/NAT/ATO
    const doc = decodeURIComponent(url).toUpperCase();
    if (/\b(TXR|TXD|CLR|LCR|GSTR|SGR|GSTD|FTR|PRR|MT|SMSFR)\//.test(doc) || /\b(TR|TD|LCR|GSTR|SGR|CR|PR)\s?\d{4}\/\d+/.test(doc)) {
      return { type: "ato_ruling", typeLabel: "ATO public ruling", authority: "commissioner_bound", issuer: "Australian Taxation Office" };
    }
    if (/\bCOG\/|\bPCG\b|\bPS ?LA\b|\bAID\/|\bATO ?ID\b|\bTPA\/|\bTA ?\d{4}/.test(doc)) {
      return { type: "ato_guidance", typeLabel: "ATO guidance", authority: "guidance", issuer: "Australian Taxation Office" };
    }
    return { type: "ato_guidance", typeLabel: "ATO guidance", authority: "guidance", issuer: "Australian Taxation Office" };
  }
  if (h === "asic.gov.au") return { type: "regulator", typeLabel: "ASIC guidance", authority: "guidance", issuer: "ASIC" };
  if (h === "fwc.gov.au") return { type: "tribunal", typeLabel: "Fair Work Commission", authority: "not_binding", issuer: "Fair Work Commission" };
  if (h === "art.gov.au") return { type: "secondary", typeLabel: "ART information", authority: "guidance", issuer: "Administrative Review Tribunal" };
  if (["bailii.org", "nzlii.org", "worldlii.org", "commonlii.org"].includes(h) || foundBy === "searchInternational") {
    return { type: "foreign", typeLabel: "Foreign authority", authority: "persuasive", issuer: h };
  }
  return { type: "secondary", typeLabel: "Secondary source", authority: "guidance", issuer: h || undefined };
}

// ── Registry ──────────────────────────────────────────────────────────────────

const normUrl = (u: string) => u.trim().replace(/^https?:\/\/(www\d?\.|classic\.)?/i, "").replace(/[#].*$/, "").replace(/\/$/, "").toLowerCase();

export class SourceRegistry {
  private byId = new Map<string, LexSource>();
  private byUrl = new Map<string, string>();
  private texts = new Map<string, string>();
  reads = 0;

  add(r: { title: string; url: string; snippet: string }, foundBy: string): LexSource | null {
    if (!r.url || !/^https?:\/\//i.test(r.url)) return null;
    const key = normUrl(r.url);
    const existing = this.byUrl.get(key);
    if (existing) return this.byId.get(existing)!;
    const id = `S${this.byId.size + 1}`;
    const src: LexSource = { id, title: r.title.slice(0, 300), url: r.url, snippet: r.snippet.slice(0, 500), foundBy, read: false, ...classifySource(r.url, foundBy) };
    this.byId.set(id, src);
    this.byUrl.set(key, id);
    return src;
  }
  get(id: string): LexSource | undefined { return this.byId.get(id.toUpperCase()); }
  findByUrl(url: string): LexSource | undefined { const id = this.byUrl.get(normUrl(url)); return id ? this.byId.get(id) : undefined; }
  list(): LexSource[] { return [...this.byId.values()]; }
  setText(id: string, text: string) { const s = this.get(id); if (s) { s.read = true; delete s.readError; this.texts.set(s.id, text); } }
  setReadError(id: string, err: string) { const s = this.get(id); if (s) s.readError = err; }
  text(id: string): string | undefined { return this.texts.get(id.toUpperCase()); }

  /** Registers a search response and returns it with ids and types, so the model can cite them. */
  register(res: LegalSearchResponse, foundBy: string) {
    return {
      ...res,
      results: res.results.map((r) => {
        const s = this.add(r, foundBy);
        return s ? { id: s.id, type: s.typeLabel, title: r.title, url: r.url, snippet: r.snippet } : r;
      }),
    };
  }
}

// ── readSource: fetch real text from allowlisted legal sites ──────────────────

export const READ_ALLOWLIST = [
  "legislation.gov.au", "www.legislation.gov.au",
  "ato.gov.au", "www.ato.gov.au",
  "fwc.gov.au", "www.fwc.gov.au",
  "asic.gov.au", "www.asic.gov.au",
  "art.gov.au", "www.art.gov.au",
];
export const MAX_READS_PER_ANSWER = 4;
const MAX_BYTES = 1_500_000;
const READ_TIMEOUT_MS = 9000;

/**
 * ATO's edge blocks the old bot UA (HTTP 403). A normal browser UA gets through
 * more often. There is no AustLII fallback while AustLII access is paused.
 */
export const SOURCE_BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const AUSTLII_RULING_DB: Record<string, string> = {
  TR: "ATOTR", TD: "ATOTD", GSTR: "ATOGSTR", GSTD: "ATOGSTD", SGR: "ATOSGR", SGD: "ATOSGD",
  SMSFR: "ATOSMSFR", SMSFD: "ATOSMSFD", FTR: "ATOFTR", FTD: "ATOFTD", MT: "ATOMTR",
  CR: "ATOCR", PR: "ATOPR", WETR: "ATOWETR", WETD: "ATOWETD", LCTD: "ATOLCTD",
};
// Longer series names first so GSTR is not read as TR.
const RULING_ID = /\b(GSTR|GSTD|SMSFR|SMSFD|WETR|WETD|LCTD|SGR|SGD|FTR|FTD|TR|TD|CR|PR|MT)(\d{4})(D)?(\d+)\b/;

/** AustLII copy of an ATO ruling page, or null when the URL is not a known public ruling. */
export function austliiMirrorUrl(raw: string): string | null {
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { /* keep the raw url */ }
  if (!/ato\.gov\.au/i.test(decoded)) return null;
  const m = decoded.toUpperCase().match(RULING_ID);
  if (!m) return null;
  const db = AUSTLII_RULING_DB[m[1]];
  if (!db) return null;
  const file = `${m[1]}${m[2]}${m[3] ?? ""}${m[4]}`;
  return `https://www.austlii.edu.au/au/other/rulings/ato/${db}/${m[2]}/${file}.html`;
}

export function isAllowedSourceUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password && (u.port === "" || u.port === "443") && READ_ALLOWLIST.includes(u.hostname.toLowerCase());
  } catch { return false; }
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", sect: "§", ndash: "-", mdash: ", ", rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"' };

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|head|nav|footer)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote|section|article)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) => e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()] ?? m)
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

type FetchResult = { ok: true; text: string } | { ok: false; error: string; status?: number };

async function fetchAllowlisted(url: string, fetcher: Fetcher): Promise<FetchResult> {
  let current = url;
  for (let hop = 0; hop < 3; hop++) {
    if (!isAllowedSourceUrl(current)) return { ok: false, error: "That site is not on Lex's list of sources it can read." };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), READ_TIMEOUT_MS);
    try {
      const res = await fetcher(current, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: {
          "User-Agent": SOURCE_BROWSER_UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
          "Accept-Language": "en-AU,en;q=0.9",
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return { ok: false, error: `Redirect without a location (${res.status})`, status: res.status };
        current = new URL(loc, current).toString();
        continue;
      }
      if (!res.ok) return { ok: false, error: `The source returned HTTP ${res.status}`, status: res.status };
      const len = Number(res.headers.get("content-length") ?? 0);
      if (len > MAX_BYTES) return { ok: false, error: "The source is too large to read" };
      const type = res.headers.get("content-type") ?? "";
      if (!/text\/html|text\/plain|application\/xhtml/i.test(type)) return { ok: false, error: "The source is not a web page (PDF and Word are not read yet)" };
      const raw = (await res.text()).slice(0, MAX_BYTES);
      const text = /html/i.test(type) ? htmlToText(raw) : raw;
      return text.length < 200 ? { ok: false, error: "The page had almost no readable text" } : { ok: true, text: text.slice(0, 400_000) };
    } catch (e) {
      return { ok: false, error: (e as Error)?.name === "AbortError" ? "The source took too long to respond" : "The source could not be reached" };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, error: "Too many redirects" };
}

/**
 * Fetches one allowlisted page as text. Redirects stay on the allowlist.
 * AustLII is not on the allowlist and there is no AustLII fallback: AustLII access is paused
 * until AustLII gives written permission (see isAustliiEnabled in lex-tools).
 */
export async function fetchSourceText(url: string, fetcher: Fetcher = fetch): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const first = await fetchAllowlisted(url, fetcher);
  if (first.ok) return first;
  return { ok: false, error: first.error };
}

// ── Pinpoints ─────────────────────────────────────────────────────────────────

/** Normalises a pinpoint ("para 41", "at [41]", "s 109D(1)", "section 14ZW", "p 12") to something we can search for. */
export function parsePinpoint(raw: string): { kind: "para" | "section" | "page" | "none" | "other"; value: string } {
  const p = raw.trim();
  if (!p) return { kind: "none", value: "" };
  let m = p.match(/^(?:at\s*)?(?:paras?\.?|paragraphs?)?\s*\[?(\d{1,4})\]?(?:\s*[-,].*)?$/i);
  if (m && /para|\[|^at|^\d/i.test(p)) return { kind: "para", value: m[1] };
  m = p.match(/^(?:s|ss|sec|section|reg|r)\.?\s*([0-9]+[A-Z]{0,4}(?:-[0-9]+[A-Z]?)?)/i);
  if (m) return { kind: "section", value: m[1] };
  m = p.match(/^(?:p|pp|page)\.?\s*(\d+)/i);
  if (m) return { kind: "page", value: m[1] };
  return { kind: "other", value: p };
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function findPinpoint(text: string, raw: string): { found: boolean; excerpt?: string } {
  const pin = parsePinpoint(raw);
  if (pin.kind === "none") return { found: true };
  let re: RegExp;
  if (pin.kind === "para") re = new RegExp(`(^|\\s|\\n)\\[${pin.value}\\](\\s|$)`, "m");
  else if (pin.kind === "section") re = new RegExp(`(^|\\n|\\s)(section\\s+|s\\s?|sect\\s?|reg\\s?)?${esc(pin.value)}(\\s|\\.|\\(|$)`, "im");
  else if (pin.kind === "page") return { found: false };
  else re = new RegExp(esc(pin.value), "i");
  const m = re.exec(text);
  if (!m) return { found: false };
  const start = Math.max(0, m.index - 80);
  return { found: true, excerpt: text.slice(start, m.index + 600).trim() };
}

/** What readSource hands back to the model: the passage around the pinpoint, or the start of the document. */
export function excerptFor(text: string, pinpoint?: string, max = 3500): { excerpt: string; pinpointFound: boolean | null } {
  if (pinpoint && pinpoint.trim()) {
    const f = findPinpoint(text, pinpoint);
    if (f.found && f.excerpt) return { excerpt: f.excerpt.slice(0, max), pinpointFound: true };
    return { excerpt: text.slice(0, max), pinpointFound: false };
  }
  return { excerpt: text.slice(0, max), pinpointFound: null };
}

// ── Markers ───────────────────────────────────────────────────────────────────

export const CITE_MARKER = /\[\[cite:\s*(S\d{1,3}|none)\s*(?:\|\s*([^\]]{0,80}?))?\s*\]\]/gi;

export function parseMarkers(text: string): { id: string | null; pinpoint: string; index: number }[] {
  const out: { id: string | null; pinpoint: string; index: number }[] = [];
  for (const m of text.matchAll(CITE_MARKER)) out.push({ id: m[1].toLowerCase() === "none" ? null : m[1].toUpperCase(), pinpoint: (m[2] ?? "").trim(), index: m.index ?? 0 });
  return out;
}

/** Replaces markers with readable text: [1] at [41], [2] s 109D. Unknown sources become [unverified]. */
export function renderMarkers(text: string, citations: LexCitation[]): string {
  const byKey = new Map(citations.map((c) => [`${c.id ?? "none"}|${c.pinpoint}`, c]));
  return text.replace(CITE_MARKER, (_m, id: string, pin?: string) => {
    const c = byKey.get(`${id.toLowerCase() === "none" ? "none" : id.toUpperCase()}|${(pin ?? "").trim()}`);
    if (!c || c.id === null) return "[unverified]";
    return `[${c.n}${c.pinpoint ? ` ${pinpointLabel(c.pinpoint)}` : ""}]`;
  });
}

export function pinpointLabel(raw: string): string {
  const p = parsePinpoint(raw);
  if (p.kind === "para") return `at [${p.value}]`;
  if (p.kind === "section") return `s ${p.value}`;
  if (p.kind === "page") return `p ${p.value}`;
  return raw;
}

/** Removes markers from earlier answers before they go back to the model (their ids belonged to an old request). */
export function stripMarkers(text: string): string {
  return text.replace(CITE_MARKER, "").replace(/[ \t]+([.,;:])/g, "$1").replace(/[ \t]{2,}/g, " ");
}

// ── Verification after the answer ─────────────────────────────────────────────

export function verifyCitations(text: string, reg: SourceRegistry): LexCitation[] {
  const seen = new Map<string, LexCitation>();
  const numberOf = new Map<string, number>();
  for (const mk of parseMarkers(text)) {
    const key = `${mk.id ?? "none"}|${mk.pinpoint}`;
    if (seen.has(key)) continue;
    let status: CiteStatus; let note: string;
    const src = mk.id ? reg.get(mk.id) : undefined;
    if (!mk.id) { status = "no_source"; note = "Stated without a source from this search"; }
    else if (!src) { status = "unknown_source"; note = `${mk.id} was not returned by any search in this answer`; }
    else if (!src.read) { status = "not_checked"; note = src.readError ? `Could not read the source: ${src.readError}` : "Found by search; the text was not read"; }
    else {
      const f = findPinpoint(reg.text(src.id) ?? "", mk.pinpoint);
      const pin = parsePinpoint(mk.pinpoint);
      if (f.found) { status = "verified"; note = mk.pinpoint ? "Pinpoint found in the source text" : "Source text read"; }
      else if (pin.kind === "page") { status = "not_checked"; note = "Page pinpoints can't be checked against web text"; }
      else { status = "pinpoint_not_found"; note = `${pinpointLabel(mk.pinpoint)} was not found in the source text`; }
    }
    if (mk.id && !numberOf.has(mk.id)) numberOf.set(mk.id, numberOf.size + 1);
    seen.set(key, { n: mk.id ? numberOf.get(mk.id)! : 0, id: mk.id, pinpoint: mk.pinpoint, status, note });
  }
  return [...seen.values()];
}

export function countStatuses(citations: LexCitation[]) {
  return {
    verified: citations.filter((c) => c.status === "verified").length,
    notChecked: citations.filter((c) => c.status === "not_checked").length,
    problems: citations.filter((c) => c.status === "pinpoint_not_found" || c.status === "unknown_source" || c.status === "no_source").length,
  };
}

// ── Prompt ────────────────────────────────────────────────────────────────────

export const CITATION_RULES = `

CITATION MARKERS (REQUIRED):
Every search result comes with an id such as S3 and a source type. After each legal proposition, add a marker naming the source you relied on, then keep writing.

Format: [[cite:S3|para 41]] for a paragraph of a judgment, [[cite:S2|s 109D(1)]] for a section, [[cite:S5]] when there is no pinpoint.

Also keep the normal citation in your prose (case name and medium neutral citation, section and Act, ruling number), because the marker is only a link to the source.

Only use ids that a tool gave you in this answer. Never invent an id. If a proposition is from your own knowledge and no search result supports it, mark it [[cite:none]] so the lawyer knows to check it.

Before giving a paragraph or section pinpoint, call readSource on that source (up to ${MAX_READS_PER_ANSWER} reads per answer) and take the pinpoint from the text it returns. If you could not read it, cite without a pinpoint.

Rank authority correctly: High Court and Full Federal Court bind; single Federal Court judges and state courts are persuasive outside their hierarchy; ART and former AAT decisions do not bind; ATO public rulings bind the Commissioner, not courts; ATO guidance and secondary sources bind no one.`;

export function buildMeta(reg: SourceRegistry, citations: LexCitation[], conclusions: LexConclusion[], verify: string[]): LexAnswerMeta {
  const cited = new Set(citations.map((c) => c.id).filter(Boolean) as string[]);
  // Cited sources first in citation order, then other sources the search found.
  const order = new Map(citations.filter((c) => c.id).map((c) => [c.id!, c.n]));
  const sources = reg.list().sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999)).filter((s, i) => cited.has(s.id) || i < 12);
  return { version: 1, sources, citations, conclusions, verify, counts: countStatuses(citations) };
}
