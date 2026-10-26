/** AI visitor snapshots. Counts are requests, not people. */

export const SAABAI_SITE_KEY = "saabai";
export const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000;
export const HISTORY_DAYS = 35;
export const SNAPSHOT_PREFIX = "aiv:daily:";
export const META_KEY = "aiv:meta";
/** Vercel rejects observability `limit` above 500. One request never asks for more. */
export const OBSERVABILITY_LIMIT_MAX = 500;
/** Pages per window. 8 × 500 rows, then the window is marked truncated. */
export const OBSERVABILITY_MAX_PAGES = 8;
export const QUERY_ROW_LIMIT = OBSERVABILITY_LIMIT_MAX;

export const DATA_NOTE =
  "Counts are AI requests, not people. One page can be several requests, and the bot names are the platform's own classification. Vercel keeps about 36 days of request logs, so this history builds from the daily snapshot. Apps often strip the referrer, ads.openai.com is not counted as an AI referral, and ad clicks are not included.";

export type AiCategory = "ai_crawler" | "ai_assistant";

export type AnalyticsSite = {
  key: string;
  label: string;
  hosts: string[];
  pathPrefix: string | null;
};

export type SiteSource = {
  slug: string;
  name: string;
  url?: string;
  domains?: string[];
  analyticsHosts?: string[];
};

export type DaySnapshot = {
  date: string;
  categories: { ai_crawler: number; ai_assistant: number };
  bots: { name: string; count: number; category: AiCategory }[];
  googleCrawlers: number;
  bingCrawlers: number;
  paths: { path: string; count: number }[];
  referrals: { ai: number; google: number; bing: number };
  errors: {
    ok: number;
    redirected: number;
    s4xx: number;
    s5xx: number;
    failing: { path: string; status: number; count: number }[];
  };
  live: { bot: string; path: string; count: number }[];
};

export type MetricRow = {
  timestamp?: string;
  value: number;
  request_hostname?: string;
  request_path?: string;
  bot_category?: string;
  bot_name?: string;
  referrer_hostname?: string;
  http_status?: string;
};

export type FoldKind =
  | "bots"
  | "prefixBots"
  | "paths"
  | "referrals"
  | "prefixReferrals"
  | "status"
  | "prefixStatus"
  | "failing"
  | "live";

export type CompanySlice = {
  company: string;
  crawlers: number;
  assistants: number;
  total: number;
};

export type SiteReport = {
  key: string;
  label: string;
  headline: string;
  summary: string;
  periodLabel: string;
  crawlers: number;
  assistants: number;
  total: number;
  crawlerDelta: number | null;
  assistantDelta: number | null;
  aiDelta: number | null;
  referrals: { ai: number; google: number; bing: number };
  googleCrawlers: number;
  bingCrawlers: number;
  searchDelta: number | null;
  daily: { date: string; crawlers: number; assistants: number; aiReferrals: number; searchCrawlers: number }[];
  companies: CompanySlice[];
  bots: { name: string; label: string; company: string; count: number; category: AiCategory }[];
  paths: { path: string; count: number }[];
  live: { bot: string; label: string; path: string; count: number }[];
  errors: DaySnapshot["errors"] & { okPct: number; total: number };
  next: { title: string; body: string }[];
  empty: boolean;
  peakCrawler: { date: string; count: number } | null;
  peakAssistant: { date: string; count: number } | null;
  collectedDays: number;
};

export type VisitorsView = {
  from: string;
  to: string;
  days: number;
  dates: string[];
  compare: "previous" | "halves";
  compareNote: string;
  partial: boolean;
  partialDays: number;
  reports: SiteReport[];
};
