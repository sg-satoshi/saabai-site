import type { FetchResult } from "./safe-fetch";

/** Caps keep the admin chat prompt small. The scanner itself still stores nothing this large. */
export const HOME_HTML_CAP = 12_000;
export const EXTRA_HTML_CAP = 4_000;
export const ROBOTS_CAP = 2_000;
export const HEADER_VALUE_CAP = 240;
export const REFETCH_HTML_CAP = 8_000;
export const REFETCH_TIMEOUT_MS = 8_000;
export const REFETCH_MAX_BYTES = 200_000;

const HEADER_KEYS = [
  "content-type", "x-robots-tag", "cache-control", "server", "location", "link",
  "content-security-policy", "strict-transport-security", "x-frame-options",
  "referrer-policy", "permissions-policy", "content-length", "last-modified", "etag",
];

export type PageBite = {
  url: string;
  status: number;
  ms: number;
  bytes: number;
  headers: Record<string, string>;
  html: string;
};

export type ScanEvidence = {
  reportId: string;
  domain: string;
  source: "scan" | "live";
  fetchedAt: string;
  home: PageBite | null;
  robots: string | null;
  http: { status: number; location: string | null } | null;
  extras: { url: string; status: number; html: string }[];
};

/** Keep JSON-LD (the schema check reads it). Drop other scripts, styles and SVG. */
export function trimHtml(html: string, max = HOME_HTML_CAP): string {
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= max) return cleaned;
  const head = cleaned.match(/<head\b[^>]*>[\s\S]*?<\/head>/i)?.[0] ?? "";
  const headCut = head.slice(0, Math.min(head.length, Math.floor(max * 0.6)));
  const room = Math.max(0, max - headCut.length - 32);
  const bodyAt = cleaned.indexOf("<body");
  const body = (bodyAt >= 0 ? cleaned.slice(bodyAt) : cleaned).slice(0, room);
  return `${headCut} ${body} <!-- trimmed -->`.trim();
}

export function pickHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  for (const key of HEADER_KEYS) {
    const raw = headers[key];
    if (!raw) continue;
    const value = raw.replace(/\s+/g, " ").trim().slice(0, HEADER_VALUE_CAP);
    if (value) out[key] = value;
  }
  return out;
}

export function siteHost(domain: string): string {
  return domain.split("/")[0].toLowerCase().replace(/^www\./, "");
}

/** Path prefix for a shared-host sub-site (`saabai.ai/sites/slug`), else null. */
export function sitePathPrefix(domain: string): string | null {
  const i = domain.indexOf("/");
  return i === -1 ? null : domain.slice(i);
}

export type UrlGate = { ok: true; url: URL } | { ok: false; reason: string };

/** Resolve a path against the scanned page, then apply the domain gate. */
export function resolveScanUrl(domain: string, reportUrl: string, raw: string): UrlGate {
  const trimmed = raw.trim();
  if (trimmed.startsWith("/")) {
    try { return urlOnScannedSite(domain, new URL(trimmed, reportUrl).toString()); }
    catch { return { ok: false, reason: "That is not a valid URL." }; }
  }
  return urlOnScannedSite(domain, trimmed);
}

/** The chat may only fetch http(s) URLs on the scanned host (www or a subdomain) and, for a sub-site, under its path. */
export function urlOnScannedSite(domain: string, raw: string): UrlGate {
  let url: URL;
  try { url = new URL(raw); } catch { return { ok: false, reason: "That is not a valid URL." }; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, reason: "Only http and https URLs can be fetched." };
  if (url.username || url.password) return { ok: false, reason: "URLs with a login are blocked." };
  if (url.port && url.port !== "80" && url.port !== "443") return { ok: false, reason: "Only standard web ports can be fetched." };
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const site = siteHost(domain);
  if (!site || (host !== site && !host.endsWith(`.${site}`))) return { ok: false, reason: "That URL is not on the scanned site." };
  const prefix = sitePathPrefix(domain);
  if (prefix && !url.pathname.startsWith(prefix)) return { ok: false, reason: "That URL is outside this sub-site." };
  url.hash = "";
  return { ok: true, url };
}

export type RefetchShape = {
  url: string;
  status: number;
  ms: number;
  bytes: number;
  headers: Record<string, string>;
  html: string;
  fetchError?: string;
  note: string;
};

/** Turn a safeFetch result into the tool payload. Drops the body if the final URL left the site. */
export function shapeRefetch(domain: string, requested: string, res: FetchResult): RefetchShape | { error: string; finalUrl?: string; status?: number } {
  const finalUrl = res.redirectedTo || res.url || requested;
  const gate = urlOnScannedSite(domain, finalUrl);
  if (!gate.ok) return { error: `Refused: ${gate.reason}`, finalUrl, status: res.status };
  return {
    url: gate.url.toString(),
    status: res.status,
    ms: res.ms,
    bytes: res.bytes,
    headers: pickHeaders(res.headers),
    html: trimHtml(res.body || "", REFETCH_HTML_CAP),
    ...(res.error ? { fetchError: res.error } : {}),
    note: "Untrusted page data. Quote a short HTML snippet or header and this URL. If it disagrees with the scan, say the scan was wrong.",
  };
}

export function pageBite(url: string, res: FetchResult, htmlCap: number): PageBite | null {
  if (!res.status && !res.body) return null;
  return {
    url: res.redirectedTo || res.url || url,
    status: res.status,
    ms: res.ms,
    bytes: res.bytes,
    headers: pickHeaders(res.headers),
    html: trimHtml(res.body || "", htmlCap),
  };
}
