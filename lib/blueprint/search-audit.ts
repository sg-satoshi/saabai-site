/**
 * GET-only crawl for the Blueprint search checks, plus the plain-language
 * report. Rules and scoring live in search-rules.ts. This file does not POST,
 * and it does not invent ratings, prices, or results.
 */

import { safeFetch, type FetchResult } from "../site-scan/safe-fetch";
import { parseTarget, ScanUrlError } from "../site-scan/ssrf";
import type { AuditEngagement } from "../audit-types";
import {
  AREA_LABEL,
  SEARCH_LIMITS,
  bareHost,
  evaluateSearch,
  type CrawlSnapshot,
  type HostProbe,
  type HtmlPage,
  type QuestionResult,
  type SearchAudit,
  type SearchArea,
  type SearchCheck,
  type SearchClientInput,
  type TextDoc,
} from "./search-rules";

export type Fetcher = (url: string, o?: { follow?: boolean; timeoutMs?: number }) => Promise<FetchResult>;

const SKIP_EXT = /\.(jpg|jpeg|png|gif|webp|svg|pdf|css|js|ico|mp4|zip|woff2?)$/i;

export async function crawlForSearch(rawUrl: string, fetchImpl: Fetcher = safeFetch): Promise<CrawlSnapshot> {
  let target: URL;
  try {
    target = parseTarget(rawUrl);
  } catch (e) {
    const msg = e instanceof ScanUrlError ? e.message : "That address cannot be read.";
    return emptySnapshot(rawUrl, msg);
  }
  try {
    const timeoutMs = SEARCH_LIMITS.fetchTimeoutMs;
    const home = await fetchImpl(target.toString(), { timeoutMs });
    if (!home.ok) {
      const why = home.error === "dns" || home.status === 404 || home.status === 410
        ? `We could not find a working website at ${target.hostname}.`
        : "We could not read the website. Nothing was guessed.";
      return emptySnapshot(target.toString(), why);
    }
    const finalUrl = home.redirectedTo || home.url || target.toString();
    const final = new URL(finalUrl);
    const origin = `${final.protocol}//${final.host}`;
    const bare = bareHost(final.hostname);
    const probeUrls = [`https://${bare}/`, `https://www.${bare}/`, `http://${bare}/`, `http://www.${bare}/`];
    const [robotsR, sitemapR, llmsR, ...probeR] = await Promise.all([
      fetchImpl(`${origin}/robots.txt`, { timeoutMs }),
      fetchImpl(`${origin}/sitemap.xml`, { timeoutMs }),
      fetchImpl(`${origin}/llms.txt`, { timeoutMs }),
      ...probeUrls.map((u) => fetchImpl(u, { follow: false, timeoutMs })),
    ]);
    let capped = false;
    let sitemapUrls: string[] = [];
    const sitemapStatus = sitemapR.status || null;
    if (sitemapR.ok && /<sitemapindex/i.test(sitemapR.body)) {
      const children = locs(sitemapR.body).filter((u) => sameBare(u, bare)).slice(0, SEARCH_LIMITS.maxSitemapFiles);
      if (locs(sitemapR.body).length > children.length) capped = true;
      const childR = await Promise.all(children.map((u) => fetchImpl(u, { timeoutMs })));
      sitemapUrls = childR.flatMap((r) => (r.ok ? locs(r.body) : []));
    } else if (sitemapR.ok) {
      sitemapUrls = locs(sitemapR.body);
    }
    sitemapUrls = sitemapUrls.filter((u) => sameBare(u, bare));
    if (sitemapUrls.length > SEARCH_LIMITS.maxSitemapUrls) {
      sitemapUrls = sitemapUrls.slice(0, SEARCH_LIMITS.maxSitemapUrls);
      capped = true;
    }
    const queue = pickLinks(home.body, finalUrl, bare, sitemapUrls);
    const batch = queue.slice(0, Math.max(0, SEARCH_LIMITS.maxHtmlPages - 1));
    if (queue.length > batch.length) capped = true;
    const fetched = await Promise.all(batch.map((u) => fetchImpl(u, { timeoutMs })));
    const extra: HtmlPage[] = [];
    fetched.forEach((r, i) => {
      if (r.ok && /<html|<!doctype/i.test(r.body)) {
        extra.push({ url: r.redirectedTo || r.url || batch[i], status: r.status, html: r.body, headers: r.headers });
      }
    });
    const hostProbes: HostProbe[] = probeUrls.map((url, i) => ({
      url,
      status: probeR[i]?.status ?? 0,
      location: probeR[i]?.headers?.location ?? null,
    }));
    return {
      requestedUrl: target.toString(),
      finalUrl,
      pages: [{ url: finalUrl, status: home.status, html: home.body, headers: home.headers }, ...extra],
      robots: asDoc(robotsR),
      sitemapStatus,
      sitemapUrls,
      llms: asDoc(llmsR),
      hostProbes,
      capped,
    };
  } catch {
    return emptySnapshot(target.toString(), "We could not read the website. Nothing was guessed.");
  }
}

export async function runBlueprintSearchAudit(args: { url: string; client?: SearchClientInput; fetch?: Fetcher }): Promise<SearchAudit> {
  const snapshot = await crawlForSearch(args.url, args.fetch ?? safeFetch);
  return evaluateSearch(snapshot, args.client ?? {});
}

export function clientFromEngagement(eng: Pick<AuditEngagement, "firmName" | "firmType" | "location" | "responses" | "searchBrief">): SearchClientInput {
  const overview = eng.responses?.firm_overview?.value;
  const brief = eng.searchBrief;
  const services = Array.isArray(brief?.services) ? brief.services.filter((s) => typeof s === "string") : undefined;
  return {
    name: eng.firmName,
    firmType: eng.firmType,
    industry: brief?.industry,
    overview: typeof overview === "string" ? overview : undefined,
    location: eng.location,
    promise: brief?.promise,
    services,
    statedGoogleRating: brief?.statedGoogleRating,
    statedGoogleReviews: brief?.statedGoogleReviews,
    figures: brief?.figures,
  };
}

export type ReportBlock = { kind: "h1" | "h2" | "p" | "muted"; text: string };

export function searchSkippedBlocks(reason: string): ReportBlock[] {
  return [
    { kind: "h1", text: "Search and conversion" },
    { kind: "p", text: reason },
  ];
}

export function searchReportBlocks(audit: SearchAudit): ReportBlock[] {
  const out: ReportBlock[] = [
    { kind: "h1", text: "Search and conversion" },
    { kind: "muted", text: audit.foldNote },
    { kind: "p", text: `Rules last reviewed ${reviewedLabel(audit.lastReviewed)}. ${audit.weightingNote}` },
  ];
  if (audit.mode === "unread") {
    out.push({ kind: "p", text: audit.unreadNote ?? "We could not read the website, so these checks were not scored. Nothing here is guessed." });
    out.push({ kind: "h2", text: "Leak estimate" });
    out.push({ kind: "p", text: `${audit.leak.headline}. ${audit.leak.detail}` });
    return out;
  }
  const n = audit.pagesCrawled.length;
  out.push({
    kind: "p",
    text: `We opened ${n} page${n === 1 ? "" : "s"} with read-only requests${audit.capped ? ", and stopped at the page cap, so some findings are less certain" : ""}. Overall ${audit.overall ?? "not scored"} out of 100. ${areaSentence(audit)}`,
  });
  out.push({ kind: "h2", text: "Leak estimate" });
  out.push({ kind: "p", text: `${audit.leak.headline}. ${audit.leak.detail}` });
  if (audit.quickWins.length) {
    out.push({ kind: "h2", text: "Quick wins" });
    out.push({ kind: "p", text: "Short fixes. They do not need a decision about your offer, your prices, or your Google profile." });
    for (const f of audit.quickWins) out.push({ kind: "p", text: findingLine(f) });
  }
  if (audit.ownerDecisions.length) {
    out.push({ kind: "h2", text: "Decisions only you can make" });
    out.push({ kind: "p", text: "These need your words, your prices, or a yes or no. We have not filled them in for you." });
    for (const f of audit.ownerDecisions) out.push({ kind: "p", text: findingLine(f) });
  }
  out.push({ kind: "h2", text: "Buyer questions" });
  out.push({
    kind: "p",
    text: audit.questionScore === null
      ? "Buyer questions were not scored. We did not mark them missing."
      : `${audit.questions.length} questions for this kind of business. ${audit.questionScore} out of 100 are clearly answered. Clear means a direct answer on a page we opened. Partial means the topic is there without an answer. Missing means we did not find it.`,
  });
  for (const q of audit.questions) out.push({ kind: "p", text: questionLine(q) });
  if (audit.unverified.length) {
    out.push({ kind: "h2", text: "Not checked" });
    out.push({ kind: "p", text: "Left out of the score rather than guessed." });
    for (const u of audit.unverified) out.push({ kind: "p", text: `${u.what} ${u.why}`.trim() });
  }
  const passed = audit.checks.filter((c) => c.status === "pass");
  if (passed.length) {
    out.push({ kind: "h2", text: "Already in place" });
    out.push({ kind: "p", text: passed.map((p) => p.what).join(" ") });
  }
  return out;
}

export function formatSearchAudit(audit: SearchAudit): string {
  return searchReportBlocks(audit)
    .map((b) => (b.kind === "h1" ? `\n${b.text.toUpperCase()}\n` : b.kind === "h2" ? `\n${b.text}\n` : b.text))
    .join("\n\n");
}

/** Short, factual block for the assessment prompt. Truncated so it cannot crowd out the fact-find. */
export function searchAuditForPrompt(audit: SearchAudit): string {
  if (audit.mode === "unread") {
    return `The website was not read. ${audit.unreadNote ?? ""} Do not invent search findings, ratings, prices, traffic, or results.`.trim();
  }
  const lines = [
    `Overall ${audit.overall ?? "not scored"} out of 100. ${audit.weightingNote}`,
    `Leak: ${audit.leak.headline}. ${audit.leak.detail}`,
    "Quick wins:",
    ...(audit.quickWins.length ? audit.quickWins.map(oneLine) : ["None."]),
    "Decisions only the owner can make:",
    ...(audit.ownerDecisions.length ? audit.ownerDecisions.map(oneLine) : ["None."]),
    `Buyer questions: ${audit.questionScore ?? "not scored"} out of 100.`,
    ...audit.questions.filter((q) => q.result !== "clear").map((q) => `${q.result}: ${q.question}${q.page ? ` (${q.page})` : ""}`),
    "Do not invent ratings, prices, traffic, rankings, or lost revenue beyond the leak line above.",
  ];
  const text = lines.join("\n");
  return text.length > 4000 ? `${text.slice(0, 3990)}\n[truncated]` : text;
}

function oneLine(f: SearchCheck): string {
  return `- ${f.what} Page: ${f.page ?? "n/a"}. Effort: ${f.effort}. Confidence: ${cap(f.confidence)}.`;
}

function findingLine(f: SearchCheck): string {
  return `What: ${sentence(f.what)} Why it affects results: ${sentence(f.why)} Page: ${f.page ?? "the pages we opened"}. Effort: ${sentence(f.effort)} Confidence: ${cap(f.confidence)}.`;
}

function sentence(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return /[.!?]$/.test(t) ? `${t} ` : `${t}. `;
}

function questionLine(q: QuestionResult): string {
  const result = q.result === "clear" ? "Clear" : q.result === "partial" ? "Partial" : "Missing";
  const page = q.page ? `Page: ${q.page}.` : "Page: not found on the pages we opened.";
  const effort = q.effort ? ` Effort: ${sentence(q.effort)}` : "";
  return `${result}. ${q.question} ${page} ${sentence(q.why)}${effort}Confidence: ${cap(q.confidence)}.`;
}

function areaSentence(audit: SearchAudit): string {
  const parts = (Object.keys(audit.areas) as SearchArea[]).map((a) => {
    const v = audit.areas[a];
    return `${AREA_LABEL[a]} ${v === null ? "not scored" : `${v} out of 100`}`;
  });
  return parts.join(". ") + ".";
}

function reviewedLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function cap(c: string): string {
  return c === "high" ? "High" : c === "low" ? "Low" : "Medium";
}

function emptySnapshot(url: string, error: string): CrawlSnapshot {
  return {
    requestedUrl: url,
    finalUrl: url,
    pages: [],
    robots: null,
    sitemapStatus: null,
    sitemapUrls: [],
    llms: null,
    hostProbes: [],
    capped: false,
    error,
  };
}

function asDoc(r: FetchResult | undefined): TextDoc {
  if (!r || (!r.status && r.error)) return null;
  return { status: r.status, body: r.body ?? "" };
}

function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].trim());
}

function sameBare(url: string, bare: string): boolean {
  try { return bareHost(new URL(url).hostname) === bare; } catch { return false; }
}

function pickLinks(html: string, base: string, bare: string, sitemap: string[]): string[] {
  const found: string[] = [];
  const homeKey = normal(base);
  const push = (raw: string) => {
    try {
      const u = new URL(raw, base);
      if (bareHost(u.hostname) !== bare) return;
      if (SKIP_EXT.test(u.pathname)) return;
      u.hash = "";
      u.search = "";
      const s = u.toString();
      if (normal(s) === homeKey || found.includes(s)) return;
      found.push(s);
    } catch { /* skip bad hrefs */ }
  };
  const hrefs = [...html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)].map((m) => m[1]);
  const prefer = hrefs.filter((h) => /contact|about|service|pricing|price|faq|book|quote/i.test(h));
  const rest = hrefs.filter((h) => !prefer.includes(h));
  for (const h of [...prefer, ...rest, ...sitemap]) push(h);
  return found;
}

function normal(url: string): string {
  try {
    const u = new URL(url);
    return `${bareHost(u.hostname)}${u.pathname.replace(/\/+$/, "") || "/"}`.toLowerCase();
  } catch {
    return url;
  }
}
