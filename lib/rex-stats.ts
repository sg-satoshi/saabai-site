/**
 * Rex stats tracking via Upstash Redis.
 * All writes are fire-and-forget — never block the lead capture response.
 * All reads are parallelised via Promise.all.
 */

import { Redis } from "@upstash/redis";

// Graceful — if Redis isn't configured, tracking is silently skipped
function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// ── Key names ─────────────────────────────────────────────────────────────────

const K = {
  total:        "rex:stats:total",
  withEmail:    "rex:stats:with_email",
  withPrice:    "rex:stats:with_price",
  priceSum:     "rex:stats:price_sum",
  priceCount:   "rex:stats:price_count",
  materials:    "rex:hash:materials",
  despatch:     "rex:hash:despatch",
  sources:      "rex:hash:sources",
  recent:       "rex:list:recent",
  feedbackHash: "rex:hash:feedback_items",
  feedbackIds:  "rex:list:feedback_ids",
  day:          (d: string) => `rex:day:${d}`,
  transcript:   (ts: string) => `rex:transcript:${ts}`,
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LeadEvent {
  timestamp: string;
  source: string;
  name?: string;
  email?: string;
  emailHash?: string;   // SHA-256 of lowercase email — used for order attribution matching
  price?: string;       // raw string e.g. "$185.50 Ex GST"
  priceValue?: number;  // parsed numeric
  material?: string;
  despatch?: string;
  summary?: string;     // AI-extracted 2-3 sentence conversation summary
}

export type FeedbackCategory =
  | "pricing_error"
  | "wrong_material"
  | "missed_upsell"
  | "bad_tone"
  | "missing_info"
  | "other";

export type FeedbackStatus = "submitted" | "reviewed" | "approved" | "implemented";

export interface AtlasReview {
  valid: boolean;
  rootCause: string;
  recommendation: string;
  confidence: "high" | "medium" | "low";
  reviewedAt: string;
}

export interface FeedbackItem {
  id: string;
  submittedAt: string;
  category: FeedbackCategory;
  message: string;
  leadRef?: string;
  status: FeedbackStatus;
  atlasReview?: AtlasReview;
  // Audit trail
  approvedAt?: string;
  implementedAt?: string;
}

export interface RexStats {
  total: number;
  withEmail: number;
  withPrice: number;
  avgPrice: number;
  materials: Record<string, number>;
  despatch: Record<string, number>;
  sources: Record<string, number>;
  dailyCounts: { date: string; label: string; count: number }[];
  recentLeads: LeadEvent[];
  trackingSince: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function brisbaneDateString(offset = 0): string {
  const d = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
  // Brisbane is UTC+10
  return new Date(d.getTime() + 10 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function parsePriceValue(raw: string | undefined | null): number {
  if (!raw || raw === "Not quoted") return 0;
  const m = raw.match(/[\d,]+\.?\d*/);
  if (!m) return 0;
  return parseFloat(m[0].replace(/,/g, ""));
}

const MATERIAL_PATTERNS: [RegExp, string][] = [
  [/mirror\s*acrylic|euomir|prismatic/i,  "Mirror Acrylic"],
  [/acrylic/i,                             "Acrylic"],
  [/polycarbonate|poly\s*carb\b/i,        "Polycarbonate"],
  [/seaboard/i,                            "Seaboard HDPE"],
  [/playground/i,                          "Playground HDPE"],
  [/hdpe|high[\s-]density|cutting board/i, "HDPE"],
  [/acetal|pom[\s-]c/i,                    "Acetal"],
  [/ptfe|teflon/i,                         "PTFE"],
  [/uhmwpe|uhmw/i,                         "UHMWPE"],
  [/nylon|pa[\s-]?6/i,                     "Nylon"],
  [/polypropylene\b/i,                     "Polypropylene"],
  [/petg/i,                                "PETG"],
  [/hips/i,                                "HIPS"],
  [/peek/i,                                "PEEK"],
  [/corflute/i,                            "Corflute"],
  [/acp|alumin/i,                          "ACP"],
  [/pvc/i,                                 "PVC"],
];

export function extractMaterial(text: string | undefined | null): string | null {
  if (!text) return null;
  for (const [re, name] of MATERIAL_PATTERNS) {
    if (re.test(text)) return name;
  }
  return null;
}

// ── Track a lead event ────────────────────────────────────────────────────────

export async function trackLead(event: LeadEvent): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const today = brisbaneDateString();
  const priceVal = event.priceValue ?? parsePriceValue(event.price);

  try {
    const pipeline = redis.pipeline();

    // Global counters
    pipeline.incr(K.total);
    if (event.email) pipeline.incr(K.withEmail);
    if (priceVal > 0) {
      pipeline.incr(K.withPrice);
      pipeline.incrbyfloat(K.priceSum, priceVal);
      pipeline.incr(K.priceCount);
    }

    // Daily bucket (expires after 90 days)
    pipeline.incr(K.day(today));
    pipeline.expire(K.day(today), 90 * 24 * 60 * 60);

    // Hashes
    if (event.material) pipeline.hincrby(K.materials, event.material, 1);
    if (event.despatch) pipeline.hincrby(K.despatch, event.despatch, 1);
    if (event.source)   pipeline.hincrby(K.sources, event.source, 1);

    // Recent leads list — store minimal info (no full email for privacy)
    const record: LeadEvent = {
      timestamp:  event.timestamp,
      source:     event.source,
      name:       event.name,
      email:      event.email ? event.email.replace(/(?<=.{2}).(?=.*@)/g, "*") : undefined,
      emailHash:  event.emailHash, // privacy-safe matching key
      price:      event.price,
      priceValue: priceVal > 0 ? priceVal : undefined,
      material:   event.material,
      despatch:   event.despatch,
      summary:    event.summary,
    };
    pipeline.lpush(K.recent, JSON.stringify(record));
    pipeline.ltrim(K.recent, 0, 99); // keep last 100

    await pipeline.exec();
  } catch {
    // Never throw — this is analytics, not critical path
  }
}

// ── Fetch all stats for the dashboard ────────────────────────────────────────

export async function fetchRexStats(): Promise<RexStats> {
  const redis = getRedis();

  const empty: RexStats = {
    total: 0, withEmail: 0, withPrice: 0, avgPrice: 0,
    materials: {}, despatch: {}, sources: {},
    dailyCounts: buildEmptyDays(),
    recentLeads: [],
    trackingSince: null,
  };

  if (!redis) return empty;

  try {
    // Daily keys for last 30 days
    const days = Array.from({ length: 30 }, (_, i) => brisbaneDateString(-i));

    const [
      total, withEmail, withPrice, priceSum, priceCount,
      materials, despatch, sources, recentRaw,
      ...dailyRaw
    ] = await Promise.all([
      redis.get<number>(K.total),
      redis.get<number>(K.withEmail),
      redis.get<number>(K.withPrice),
      redis.get<string>(K.priceSum),
      redis.get<number>(K.priceCount),
      redis.hgetall<Record<string, number>>(K.materials),
      redis.hgetall<Record<string, number>>(K.despatch),
      redis.hgetall<Record<string, number>>(K.sources),
      redis.lrange<string>(K.recent, 0, 19),
      ...days.map(d => redis.get<number>(K.day(d))),
    ]);

    const totalVal    = total    ?? 0;
    const emailVal    = withEmail ?? 0;
    const priceVal    = withPrice ?? 0;
    const priceSumVal = parseFloat(String(priceSum ?? "0")) || 0;
    const priceCountV = priceCount ?? 0;
    const avgPrice    = priceCountV > 0 ? Math.round(priceSumVal / priceCountV) : 0;

    const dailyCounts = days.map((date, i) => ({
      date,
      label: formatDayLabel(date),
      count: (dailyRaw[i] as number | null) ?? 0,
    })).reverse(); // oldest first for chart

    const recentLeads: LeadEvent[] = (recentRaw ?? []).map(r => {
      try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; }
    }).filter(Boolean) as LeadEvent[];

    // First lead date from recentLeads (rough proxy for tracking start)
    const oldest = recentLeads[recentLeads.length - 1]?.timestamp ?? null;

    return {
      total: totalVal,
      withEmail: emailVal,
      withPrice: priceVal,
      avgPrice,
      materials: materials ?? {},
      despatch:  despatch  ?? {},
      sources:   sources   ?? {},
      dailyCounts,
      recentLeads,
      trackingSince: oldest,
    };
  } catch {
    return empty;
  }
}

function buildEmptyDays() {
  return Array.from({ length: 30 }, (_, i) => {
    const date = brisbaneDateString(-(29 - i));
    return { date, label: formatDayLabel(date), count: 0 };
  });
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+10:00");
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

// ── Feedback CRUD ─────────────────────────────────────────────────────────────

export async function trackFeedback(item: FeedbackItem): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const pipeline = redis.pipeline();
    pipeline.hset(K.feedbackHash, { [item.id]: JSON.stringify(item) });
    pipeline.lpush(K.feedbackIds, item.id);
    pipeline.ltrim(K.feedbackIds, 0, 199); // keep last 200
    await pipeline.exec();
  } catch { /* never throw */ }
}

export async function fetchFeedback(): Promise<FeedbackItem[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const all = await redis.hgetall(K.feedbackHash) as Record<string, string> | null;
    if (!all) return [];
    const items = Object.values(all)
      .map(v => { try { return typeof v === "string" ? JSON.parse(v) as FeedbackItem : null; } catch { return null; } })
      .filter(Boolean) as FeedbackItem[];
    // Sort newest first (ID is prefixed with timestamp)
    items.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return items.slice(0, 200);
  } catch { return []; }
}

export async function updateFeedback(id: string, updates: Partial<FeedbackItem>): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const raw = await redis.hget(K.feedbackHash, id) as string | null;
    if (!raw) return;
    const item = JSON.parse(raw) as FeedbackItem;
    const updated = { ...item, ...updates };
    await redis.hset(K.feedbackHash, { [id]: JSON.stringify(updated) });
  } catch { /* never throw */ }
}

// ── Transcript storage ────────────────────────────────────────────────────────

export interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

export async function storeTranscript(
  timestamp: string,
  messages: TranscriptMessage[]
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const key = K.transcript(timestamp);
    await redis.set(key, JSON.stringify(messages), { ex: 90 * 24 * 3600 }); // 90-day TTL
  } catch { /* never throw */ }
}

export async function fetchTranscript(
  timestamp: string
): Promise<TranscriptMessage[] | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(K.transcript(timestamp)) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as TranscriptMessage[];
  } catch { return null; }
}
