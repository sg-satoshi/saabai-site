/**
 * Fold observability rows into one compact snapshot per site per Brisbane day,
 * then sum those snapshots into the report.
 */
import { getRedis } from "../redis";
import {
  botKey,
  botLabel,
  companyForBot,
  isAiCategory,
  isBingCrawler,
  isContentPath,
  isGoogleCrawler,
  referralBucket,
  siteKeyForRequest,
} from "./sites";
import {
  HISTORY_DAYS,
  META_KEY,
  SAABAI_SITE_KEY,
  SNAPSHOT_PREFIX,
  type AiCategory,
  type AnalyticsSite,
  type DaySnapshot,
  type FoldKind,
  type MetricRow,
  type SiteReport,
  type VisitorsView,
} from "./types";
import { brisbaneWindow, queryRequests } from "./vercel-query";

const AI_FILTER = "bot_category in ('ai_crawler','ai_assistant')";
const BOT_FILTER = "bot_category in ('ai_crawler','ai_assistant','search_engine_crawler','search_engine_optimization')";
const SAABAI_HOST_FILTER = "request_hostname in ('saabai.ai','www.saabai.ai')";
const PREFIX_FILTER = `${SAABAI_HOST_FILTER} and startswith(request_path,'/sites/')`;
const REFERRER_FILTER = [
  "contains(referrer_hostname,'chatgpt')",
  "contains(referrer_hostname,'openai')",
  "contains(referrer_hostname,'perplexity')",
  "contains(referrer_hostname,'claude.ai')",
  "contains(referrer_hostname,'gemini.google')",
  "contains(referrer_hostname,'copilot.microsoft')",
  "contains(referrer_hostname,'grok')",
  "contains(referrer_hostname,'google.')",
  "contains(referrer_hostname,'bing.')",
  "referrer_hostname eq 'com.google.android.googlequicksearchbox'",
].join(" or ");
const LIVE_FILTER = "bot_name in ('chatgpt-user','claude-user','perplexity-user','gpt-actions')";
const FAIL_FILTER = `${AI_FILTER} and http_status in ('400','401','403','404','405','410','429','500','502','503','504')`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Acc = {
  categories: { ai_crawler: number; ai_assistant: number };
  bots: Map<string, { count: number; category: AiCategory }>;
  google: number;
  bing: number;
  paths: Map<string, number>;
  referrals: { ai: number; google: number; bing: number };
  status: Map<number, number>;
  failing: Map<string, { path: string; status: number; count: number }>;
  live: Map<string, { bot: string; path: string; count: number }>;
};

function emptyAcc(): Acc {
  return {
    categories: { ai_crawler: 0, ai_assistant: 0 },
    bots: new Map(),
    google: 0,
    bing: 0,
    paths: new Map(),
    referrals: { ai: 0, google: 0, bing: 0 },
    status: new Map(),
    failing: new Map(),
    live: new Map(),
  };
}

function clamp0(n: number): number {
  return n > 0 ? n : 0;
}

export function brisbaneToday(now = new Date()): string {
  return new Date(now.getTime() + 10 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function addIsoDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * 86_400_000).toISOString().slice(0, 10);
}

export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to && dates.length < 120; date = addIsoDays(date, 1)) dates.push(date);
  return dates;
}

export function formatDay(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[(month ?? 1) - 1]}`;
}

export function formatRange(from: string, to: string): string {
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return sameYear ? `${formatDay(from)} to ${formatDay(to)}` : `${formatDay(from)} ${from.slice(0, 4)} to ${formatDay(to)} ${to.slice(0, 4)}`;
}

function topPairs(map: Map<string, number>, limit: number, keep?: (key: string) => boolean): { path: string; count: number }[] {
  return [...map.entries()]
    .filter(([key, count]) => count > 0 && (keep ? keep(key) : true))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([path, count]) => ({ path, count }));
}

function accToSnapshot(date: string, acc: Acc): DaySnapshot {
  const errors = { ok: 0, redirected: 0, s4xx: 0, s5xx: 0 };
  for (const [status, count] of acc.status) {
    if (status >= 200 && status < 300) errors.ok += count;
    else if (status >= 300 && status < 400) errors.redirected += count;
    else if (status >= 400 && status < 500) errors.s4xx += count;
    else if (status >= 500) errors.s5xx += count;
  }
  return {
    date,
    categories: { ...acc.categories },
    bots: [...acc.bots.entries()]
      .filter(([, bot]) => bot.count > 0)
      .map(([name, bot]) => ({ name, count: bot.count, category: bot.category }))
      .sort((a, b) => b.count - a.count),
    googleCrawlers: acc.google,
    bingCrawlers: acc.bing,
    paths: topPairs(acc.paths, 20, isContentPath),
    referrals: { ...acc.referrals },
    errors: {
      ...errors,
      failing: [...acc.failing.values()].filter((row) => row.count > 0).sort((a, b) => b.count - a.count).slice(0, 8),
    },
    live: [...acc.live.values()].filter((row) => row.count > 0).sort((a, b) => b.count - a.count).slice(0, 12),
  };
}

function addBot(acc: Acc, name: string, category: AiCategory, count: number, sign: 1 | -1) {
  const next = clamp0(acc.categories[category] + sign * count);
  acc.categories[category] = next;
  const key = botKey(name);
  const current = acc.bots.get(key) ?? { count: 0, category };
  current.count = clamp0(current.count + sign * count);
  current.category = category;
  acc.bots.set(key, current);
  if (isGoogleCrawler(key)) acc.google = clamp0(acc.google + sign * count);
  if (isBingCrawler(key)) acc.bing = clamp0(acc.bing + sign * count);
}

function addReferral(acc: Acc, host: string | undefined, count: number, sign: 1 | -1) {
  const bucket = referralBucket(host);
  if (!bucket) return;
  acc.referrals[bucket] = clamp0(acc.referrals[bucket] + sign * count);
}

function addStatus(acc: Acc, statusText: string | undefined, count: number, sign: 1 | -1) {
  const status = Number(statusText);
  if (!Number.isFinite(status)) return;
  acc.status.set(status, clamp0((acc.status.get(status) ?? 0) + sign * count));
}

function apply(acc: Acc, kind: FoldKind, row: MetricRow, sign: 1 | -1) {
  const count = row.value;
  if (count <= 0) return;
  if (kind === "bots" || kind === "prefixBots") {
    if (isAiCategory(row.bot_category)) addBot(acc, row.bot_name ?? "", row.bot_category, count, sign);
    else if (sign === 1 || isGoogleCrawler(row.bot_name ?? "") || isBingCrawler(row.bot_name ?? "")) {
      const key = botKey(row.bot_name);
      if (isGoogleCrawler(key)) acc.google = clamp0(acc.google + sign * count);
      if (isBingCrawler(key)) acc.bing = clamp0(acc.bing + sign * count);
    }
    return;
  }
  if (kind === "paths" && row.request_path) {
    const path = row.request_path.slice(0, 180);
    acc.paths.set(path, clamp0((acc.paths.get(path) ?? 0) + sign * count));
    return;
  }
  if (kind === "referrals" || kind === "prefixReferrals") {
    addReferral(acc, row.referrer_hostname, count, sign);
    return;
  }
  if (kind === "status" || kind === "prefixStatus") {
    addStatus(acc, row.http_status, count, sign);
    return;
  }
  if (kind === "failing" && row.request_path) {
    const status = Number(row.http_status);
    if (!Number.isFinite(status) || status < 400) return;
    const path = row.request_path.slice(0, 180);
    const id = `${status} ${path}`;
    const current = acc.failing.get(id) ?? { path, status, count: 0 };
    current.count = clamp0(current.count + sign * count);
    acc.failing.set(id, current);
    return;
  }
  if (kind === "live" && row.request_path) {
    const bot = botKey(row.bot_name);
    const path = row.request_path.slice(0, 180);
    const id = `${bot} ${path}`;
    const current = acc.live.get(id) ?? { bot, path, count: 0 };
    current.count = clamp0(current.count + sign * count);
    acc.live.set(id, current);
  }
}

const PREFIX_KIND: Record<string, FoldKind | undefined> = {
  prefixBots: "bots",
  prefixReferrals: "referrals",
  prefixStatus: "status",
};

export function foldDay(date: string, sites: AnalyticsSite[], batches: { kind: FoldKind; rows: MetricRow[] }[]): Record<string, DaySnapshot> {
  const accs = new Map<string, Acc>(sites.map((site) => [site.key, emptyAcc()]));
  const ensure = (key: string) => {
    let acc = accs.get(key);
    if (!acc) {
      acc = emptyAcc();
      accs.set(key, acc);
    }
    return acc;
  };

  for (const batch of batches) {
    const prefix = batch.kind.startsWith("prefix");
    const kind = PREFIX_KIND[batch.kind] ?? batch.kind;
    for (const row of batch.rows) {
      if (row.value <= 0) continue;
      const host = row.request_hostname || (prefix ? "saabai.ai" : "");
      if (!host) continue;
      const hostKey = siteKeyForRequest(host, "/", sites);
      if (!hostKey) continue;
      if (prefix) {
        const pathKey = siteKeyForRequest(host, row.request_path || "/", sites);
        if (!pathKey || pathKey === hostKey) continue;
        apply(ensure(hostKey), kind, row, -1);
        apply(ensure(pathKey), kind, row, 1);
        continue;
      }
      if (kind === "paths" || kind === "failing" || kind === "live") {
        const pathKey = siteKeyForRequest(host, row.request_path || "/", sites) ?? hostKey;
        apply(ensure(pathKey), kind, row, 1);
        continue;
      }
      apply(ensure(hostKey), kind, row, 1);
    }
  }

  const out: Record<string, DaySnapshot> = {};
  for (const site of sites) out[site.key] = accToSnapshot(date, accs.get(site.key) ?? emptyAcc());
  return out;
}

export async function collectDay(date: string, sites: AnalyticsSite[]): Promise<{ snapshots: Record<string, DaySnapshot>; truncated: boolean }> {
  const { startTime, endTime } = brisbaneWindow(date);
  const jobs: { kind: FoldKind; groupBy: string[]; filter: string }[] = [
    { kind: "bots", groupBy: ["request_hostname", "bot_category", "bot_name"], filter: BOT_FILTER },
    { kind: "paths", groupBy: ["request_hostname", "request_path"], filter: AI_FILTER },
    { kind: "referrals", groupBy: ["request_hostname", "referrer_hostname"], filter: REFERRER_FILTER },
    { kind: "status", groupBy: ["request_hostname", "http_status"], filter: AI_FILTER },
    { kind: "failing", groupBy: ["request_hostname", "request_path", "http_status"], filter: FAIL_FILTER },
    { kind: "live", groupBy: ["request_hostname", "request_path", "bot_name"], filter: LIVE_FILTER },
  ];
  if (sites.some((site) => site.pathPrefix)) {
    jobs.push(
      { kind: "prefixBots", groupBy: ["request_path", "bot_category", "bot_name"], filter: `${PREFIX_FILTER} and ${BOT_FILTER}` },
      { kind: "prefixReferrals", groupBy: ["request_path", "referrer_hostname"], filter: `${PREFIX_FILTER} and (${REFERRER_FILTER})` },
      { kind: "prefixStatus", groupBy: ["request_path", "http_status"], filter: `${PREFIX_FILTER} and ${AI_FILTER}` },
    );
  }

  const results = await Promise.all(jobs.map(async (job) => {
    const queried = await queryRequests({ startTime, endTime, groupBy: job.groupBy, filter: job.filter });
    return { kind: job.kind, rows: queried.rows, truncated: queried.truncated };
  }));

  return {
    snapshots: foldDay(date, sites, results.map(({ kind, rows }) => ({ kind, rows }))),
    truncated: results.some((result) => result.truncated),
  };
}

function redisOrThrow() {
  const redis = getRedis();
  if (!redis) throw new Error("Redis is not configured");
  return redis;
}

export async function saveSnapshots(snapshots: Record<string, DaySnapshot>): Promise<void> {
  const redis = redisOrThrow();
  await Promise.all(Object.entries(snapshots).map(([key, snapshot]) => (
    redis.hset(`${SNAPSHOT_PREFIX}${key}`, { [snapshot.date]: JSON.stringify(snapshot) })
  )));
}

export async function markRun(date: string, error = ""): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.hset(META_KEY, { lastRunAt: new Date().toISOString(), lastDate: date, lastError: error });
}

export async function readMeta(): Promise<{ lastRunAt: string | null; lastError: string }> {
  const redis = getRedis();
  if (!redis) return { lastRunAt: null, lastError: "" };
  const raw = await redis.hgetall<Record<string, string>>(META_KEY);
  return { lastRunAt: raw?.lastRunAt ? String(raw.lastRunAt) : null, lastError: raw?.lastError ? String(raw.lastError) : "" };
}

function parseSnapshot(value: unknown): DaySnapshot | null {
  let parsed = value;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { return null; }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const snapshot = parsed as DaySnapshot;
  if (!snapshot.date || !snapshot.categories) return null;
  snapshot.categories = {
    ai_crawler: Number(snapshot.categories.ai_crawler) || 0,
    ai_assistant: Number(snapshot.categories.ai_assistant) || 0,
  };
  snapshot.bots = Array.isArray(snapshot.bots) ? snapshot.bots : [];
  snapshot.paths = Array.isArray(snapshot.paths) ? snapshot.paths : [];
  snapshot.live = Array.isArray(snapshot.live) ? snapshot.live : [];
  snapshot.referrals = snapshot.referrals ?? { ai: 0, google: 0, bing: 0 };
  snapshot.errors = snapshot.errors ?? { ok: 0, redirected: 0, s4xx: 0, s5xx: 0, failing: [] };
  snapshot.errors.failing = Array.isArray(snapshot.errors.failing) ? snapshot.errors.failing : [];
  return snapshot;
}

export async function loadSnapshots(siteKey: string): Promise<DaySnapshot[]> {
  const redis = getRedis();
  if (!redis) return [];
  const raw = await redis.hgetall<Record<string, unknown>>(`${SNAPSHOT_PREFIX}${siteKey}`);
  if (!raw) return [];
  return Object.values(raw).map(parseSnapshot).filter((snapshot): snapshot is DaySnapshot => snapshot !== null);
}

export async function collectRange(input: {
  sites: AnalyticsSite[];
  from: string;
  to: string;
  maxDays: number;
  budgetMs: number;
}): Promise<{ stored: string[]; next: string | null; done: boolean; truncated: boolean }> {
  const started = Date.now();
  const stored: string[] = [];
  let truncated = false;
  let date = input.from;
  while (date <= input.to && stored.length < input.maxDays) {
    if (stored.length > 0 && Date.now() - started > input.budgetMs) {
      return { stored, next: date, done: false, truncated };
    }
    const collected = await collectDay(date, input.sites);
    await saveSnapshots(collected.snapshots);
    await markRun(date);
    truncated = truncated || collected.truncated;
    stored.push(date);
    date = addIsoDays(date, 1);
  }
  return { stored, next: date <= input.to ? date : null, done: date > input.to, truncated };
}

export function backfillStart(today = brisbaneToday()): string {
  return addIsoDays(today, -(HISTORY_DAYS - 1));
}

type Totals = {
  crawlers: number;
  assistants: number;
  googleCrawlers: number;
  bingCrawlers: number;
  referrals: { ai: number; google: number; bing: number };
  bots: Map<string, { count: number; category: AiCategory }>;
  paths: Map<string, number>;
  failing: Map<string, { path: string; status: number; count: number }>;
  live: Map<string, { bot: string; path: string; count: number }>;
  errors: { ok: number; redirected: number; s4xx: number; s5xx: number };
};

function emptyTotals(): Totals {
  return {
    crawlers: 0,
    assistants: 0,
    googleCrawlers: 0,
    bingCrawlers: 0,
    referrals: { ai: 0, google: 0, bing: 0 },
    bots: new Map(),
    paths: new Map(),
    failing: new Map(),
    live: new Map(),
    errors: { ok: 0, redirected: 0, s4xx: 0, s5xx: 0 },
  };
}

export function sumSnapshots(snapshots: DaySnapshot[]): Totals {
  const totals = emptyTotals();
  for (const snapshot of snapshots) {
    totals.crawlers += snapshot.categories.ai_crawler || 0;
    totals.assistants += snapshot.categories.ai_assistant || 0;
    totals.googleCrawlers += snapshot.googleCrawlers || 0;
    totals.bingCrawlers += snapshot.bingCrawlers || 0;
    totals.referrals.ai += snapshot.referrals?.ai || 0;
    totals.referrals.google += snapshot.referrals?.google || 0;
    totals.referrals.bing += snapshot.referrals?.bing || 0;
    totals.errors.ok += snapshot.errors?.ok || 0;
    totals.errors.redirected += snapshot.errors?.redirected || 0;
    totals.errors.s4xx += snapshot.errors?.s4xx || 0;
    totals.errors.s5xx += snapshot.errors?.s5xx || 0;
    for (const bot of snapshot.bots ?? []) {
      const current = totals.bots.get(bot.name) ?? { count: 0, category: bot.category };
      current.count += bot.count;
      totals.bots.set(bot.name, current);
    }
    for (const path of snapshot.paths ?? []) totals.paths.set(path.path, (totals.paths.get(path.path) ?? 0) + path.count);
    for (const row of snapshot.errors?.failing ?? []) {
      const id = `${row.status} ${row.path}`;
      const current = totals.failing.get(id) ?? { path: row.path, status: row.status, count: 0 };
      current.count += row.count;
      totals.failing.set(id, current);
    }
    for (const row of snapshot.live ?? []) {
      const id = `${row.bot} ${row.path}`;
      const current = totals.live.get(id) ?? { bot: row.bot, path: row.path, count: 0 };
      current.count += row.count;
      totals.live.set(id, current);
    }
  }
  return totals;
}

export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function trendWord(delta: number | null): string | null {
  if (delta === null) return null;
  if (delta >= 10) return "rising";
  if (delta <= -10) return "falling";
  return "steady";
}

function rangeWord(days: number): string {
  if (days <= 7) return "this week";
  if (days >= 28 && days <= 31) return "this month";
  return "in this period";
}

export function reportCopy(label: string, total: number, aiDelta: number | null, aiReferrals: number, days: number): { headline: string; summary: string } {
  if (total === 0) {
    return { headline: `AI read ${label} 0 times ${rangeWord(days)}.`, summary: "" };
  }
  const trend = trendWord(aiDelta);
  const reads = `${total.toLocaleString("en-AU")} time${total === 1 ? "" : "s"}`;
  const headline = trend
    ? `AI read ${label} ${reads} ${rangeWord(days)}, and it's ${trend}.`
    : `AI read ${label} ${reads} ${rangeWord(days)}.`;
  const referral = aiReferrals === 0
    ? "None of it has sent a visitor back yet."
    : `${aiReferrals.toLocaleString("en-AU")} request${aiReferrals === 1 ? "" : "s"} came from an AI answer.`;
  return { headline: `${headline} ${referral}`, summary: "" };
}

function whatsNext(totals: Totals, aiDelta: number | null): SiteReport["next"] {
  const items: SiteReport["next"] = [];
  const trend = trendWord(aiDelta);
  items.push({
    title: "Keep robots.txt open to AI bots",
    body: trend === "rising"
      ? "Crawler requests are up on the previous half of this period. Blocking them would throw that away."
      : "The useful bots can already fetch the site. Leave that allowance in place.",
  });
  if (totals.referrals.ai === 0) {
    items.push({
      title: "Give AI something to quote",
      body: "These requests are reading, not sending clicks. A page that answers a specific question is what an AI answer can lift.",
    });
  } else {
    items.push({
      title: "See which pages the clicks land on",
      body: `${totals.referrals.ai.toLocaleString("en-AU")} requests arrived from an AI answer. The top pages show where that attention goes.`,
    });
  }
  const bad = totals.errors.s4xx + totals.errors.s5xx;
  if (bad > 0) {
    items.push({
      title: `Check the ${bad.toLocaleString("en-AU")} AI requests that failed`,
      body: totals.errors.s4xx > 0
        ? `${totals.errors.s4xx.toLocaleString("en-AU")} returned a not-found or other client error. Redirect old URLs if they are still being fetched.`
        : "A server error is what the bot stored. The failing list is under Errors.",
    });
  }
  const sensitive = [...totals.paths.keys()].filter((path) => /\/(login|checkout|account)\b/.test(path));
  if (sensitive.length) {
    items.push({
      title: "Login and checkout are being fetched",
      body: "That is not harmful. There is no value in an AI answer quoting those URLs.",
    });
  }
  return items.slice(0, 4);
}

function peakOf(daily: SiteReport["daily"], key: "crawlers" | "assistants"): { date: string; count: number } | null {
  let best: { date: string; count: number } | null = null;
  for (const point of daily) {
    if (point[key] <= 0) continue;
    if (!best || point[key] > best.count) best = { date: point.date, count: point[key] };
  }
  return best;
}

function companiesOf(bots: Totals["bots"]): SiteReport["companies"] {
  const map = new Map<string, { crawlers: number; assistants: number }>();
  for (const [name, bot] of bots) {
    const company = companyForBot(name);
    const current = map.get(company) ?? { crawlers: 0, assistants: 0 };
    if (bot.category === "ai_assistant") current.assistants += bot.count;
    else current.crawlers += bot.count;
    map.set(company, current);
  }
  return [...map.entries()]
    .map(([company, counts]) => ({ company, ...counts, total: counts.crawlers + counts.assistants }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);
}

function inWindow(snapshots: DaySnapshot[], from: string, to: string): DaySnapshot[] {
  return snapshots.filter((snapshot) => snapshot.date >= from && snapshot.date <= to);
}

function mergeByDate(groups: DaySnapshot[][]): DaySnapshot[] {
  const byDate = new Map<string, DaySnapshot[]>();
  for (const group of groups) {
    for (const snapshot of group) {
      const list = byDate.get(snapshot.date) ?? [];
      list.push(snapshot);
      byDate.set(snapshot.date, list);
    }
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => {
    const totals = sumSnapshots(rows);
    return {
      date,
      categories: { ai_crawler: totals.crawlers, ai_assistant: totals.assistants },
      bots: [...totals.bots.entries()].map(([name, bot]) => ({ name, ...bot })),
      googleCrawlers: totals.googleCrawlers,
      bingCrawlers: totals.bingCrawlers,
      paths: topPairs(totals.paths, 20),
      referrals: totals.referrals,
      errors: {
        ...totals.errors,
        failing: [...totals.failing.values()].sort((a, b) => b.count - a.count).slice(0, 8),
      },
      live: [...totals.live.values()].sort((a, b) => b.count - a.count).slice(0, 12),
    };
  });
}

function toReport(input: {
  key: string;
  label: string;
  snapshots: DaySnapshot[];
  previous: DaySnapshot[] | null;
  dates: string[];
  days: number;
  compare: "previous" | "halves";
}): SiteReport {
  const totals = sumSnapshots(input.snapshots);
  const byDate = new Map(input.snapshots.map((snapshot) => [snapshot.date, snapshot]));
  const daily = input.dates.map((date) => {
    const snapshot = byDate.get(date);
    return {
      date,
      crawlers: snapshot?.categories.ai_crawler ?? 0,
      assistants: snapshot?.categories.ai_assistant ?? 0,
      aiReferrals: snapshot?.referrals?.ai ?? 0,
      searchCrawlers: (snapshot?.googleCrawlers ?? 0) + (snapshot?.bingCrawlers ?? 0),
    };
  });
  let crawlerDelta: number | null = null;
  let assistantDelta: number | null = null;
  let searchDelta: number | null = null;
  if (input.compare === "previous" && input.previous) {
    const prior = sumSnapshots(input.previous);
    crawlerDelta = deltaPct(totals.crawlers, prior.crawlers);
    assistantDelta = deltaPct(totals.assistants, prior.assistants);
    searchDelta = deltaPct(totals.googleCrawlers + totals.bingCrawlers, prior.googleCrawlers + prior.bingCrawlers);
  } else {
    const mid = Math.floor(input.dates.length / 2);
    const firstDates = new Set(input.dates.slice(0, mid));
    const secondDates = new Set(input.dates.slice(mid));
    const first = sumSnapshots(input.snapshots.filter((snapshot) => firstDates.has(snapshot.date)));
    const second = sumSnapshots(input.snapshots.filter((snapshot) => secondDates.has(snapshot.date)));
    crawlerDelta = deltaPct(second.crawlers, first.crawlers);
    assistantDelta = deltaPct(second.assistants, first.assistants);
    searchDelta = deltaPct(second.googleCrawlers + second.bingCrawlers, first.googleCrawlers + first.bingCrawlers);
  }
  const aiDelta = deltaPct(
    totals.crawlers + totals.assistants,
    input.compare === "previous" && input.previous
      ? sumSnapshots(input.previous).crawlers + sumSnapshots(input.previous).assistants
      : (() => {
        const mid = Math.floor(input.dates.length / 2);
        const firstDates = new Set(input.dates.slice(0, mid));
        const first = sumSnapshots(input.snapshots.filter((snapshot) => firstDates.has(snapshot.date)));
        return first.crawlers + first.assistants;
      })(),
  );
  const copy = reportCopy(input.label, totals.crawlers + totals.assistants, aiDelta, totals.referrals.ai, input.days);
  const errorTotal = totals.errors.ok + totals.errors.redirected + totals.errors.s4xx + totals.errors.s5xx;
  const summaryBits = [
    `${totals.crawlers.toLocaleString("en-AU")} crawler requests and ${totals.assistants.toLocaleString("en-AU")} assistant requests.`,
    `Google sent ${totals.googleCrawlers.toLocaleString("en-AU")} crawler requests and Bing sent ${totals.bingCrawlers.toLocaleString("en-AU")}.`,
  ];
  return {
    key: input.key,
    label: input.label,
    headline: copy.headline,
    summary: summaryBits.join(" "),
    periodLabel: formatRange(input.dates[0] ?? "", input.dates[input.dates.length - 1] ?? ""),
    crawlers: totals.crawlers,
    assistants: totals.assistants,
    total: totals.crawlers + totals.assistants,
    crawlerDelta,
    assistantDelta,
    aiDelta,
    referrals: totals.referrals,
    googleCrawlers: totals.googleCrawlers,
    bingCrawlers: totals.bingCrawlers,
    searchDelta,
    daily,
    companies: companiesOf(totals.bots),
    bots: [...totals.bots.entries()]
      .map(([name, bot]) => ({ name, label: botLabel(name), company: companyForBot(name), count: bot.count, category: bot.category }))
      .sort((a, b) => b.count - a.count),
    paths: topPairs(totals.paths, 8),
    live: [...totals.live.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((row) => ({ ...row, label: botLabel(row.bot) })),
    errors: {
      ...totals.errors,
      failing: [...totals.failing.values()].sort((a, b) => b.count - a.count).slice(0, 6),
      total: errorTotal,
      okPct: errorTotal ? Math.round((totals.errors.ok / errorTotal) * 100) : 0,
    },
    next: whatsNext(totals, aiDelta),
    empty: totals.crawlers + totals.assistants + totals.googleCrawlers + totals.bingCrawlers === 0,
    peakCrawler: peakOf(daily, "crawlers"),
    peakAssistant: peakOf(daily, "assistants"),
    collectedDays: input.snapshots.length,
  };
}

export function buildView(input: {
  sites: AnalyticsSite[];
  snapshots: Record<string, DaySnapshot[]>;
  days: number;
  today?: string;
}): VisitorsView {
  const today = input.today ?? brisbaneToday();
  const days = Math.min(90, Math.max(1, input.days));
  const to = today;
  const from = addIsoDays(to, -(days - 1));
  const dates = eachDate(from, to);
  const previousFrom = addIsoDays(from, -days);
  const previousTo = addIsoDays(from, -1);
  const anyPrevious = Object.values(input.snapshots).some((rows) => rows.some((snapshot) => snapshot.date >= previousFrom && snapshot.date <= previousTo));
  const compare = anyPrevious ? "previous" : "halves";
  const reports = input.sites.map((site) => {
    const rows = input.snapshots[site.key] ?? [];
    return toReport({
      key: site.key,
      label: site.label,
      snapshots: inWindow(rows, from, to),
      previous: compare === "previous" ? inWindow(rows, previousFrom, previousTo) : null,
      dates,
      days,
      compare,
    });
  });
  const allSnapshots = mergeByDate(input.sites.map((site) => inWindow(input.snapshots[site.key] ?? [], from, to)));
  const allPrevious = compare === "previous"
    ? mergeByDate(input.sites.map((site) => inWindow(input.snapshots[site.key] ?? [], previousFrom, previousTo)))
    : null;
  reports.unshift(toReport({
    key: "all",
    label: "your sites",
    snapshots: allSnapshots,
    previous: allPrevious,
    dates,
    days,
    compare,
  }));
  const partialDays = dates.filter((date) => input.sites.some((site) => (input.snapshots[site.key] ?? []).some((snapshot) => snapshot.date === date))).length;
  return {
    from,
    to,
    days,
    dates,
    compare,
    compareNote: compare === "previous"
      ? "Change compares this period with the previous one of the same length."
      : "Change compares the second half of this period with the first. A longer history builds as the daily snapshot runs.",
    partial: partialDays < dates.length,
    partialDays,
    reports,
  };
}

export { SAABAI_SITE_KEY };
