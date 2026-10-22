/**
 * Lex redaction log: one entry per Lex model call, stored per firm.
 *
 * Records only what kind of details were masked and how many, never the details themselves:
 * no raw values, no placeholders, no token map, no hashes, no prompt or reply text.
 *
 *   lex:redaction:{firm}   Redis list, newest first, last 2,000 entries, kept 400 days
 *   lex:redaction:firms    set of firms that have entries (for the admin picker)
 */
import { waitUntil } from "@vercel/functions";
import { getRedis } from "../redis";

export const REDACTION_KEEP = 2000;
export const REDACTION_TTL_SECONDS = 400 * 86400;
export const FIRMS_KEY = "lex:redaction:firms";
export const firmLogKey = (firm: string) => `lex:redaction:${firm}`;

export type RedactionOutcome = "pass" | "blocked" | "error";

export interface RedactionEntry {
  /** Random id for this request (calls in one request share it). */
  requestId: string;
  ts: number;
  route: string;
  model: string;
  masker: string;
  outcome: RedactionOutcome;
  /** Fixed reason code when blocked or errored, e.g. "known value present after masking". */
  reason?: string;
  /** Placeholder counts by type, e.g. { EMAIL: 1, COMPANY: 2 }. */
  types: Record<string, number>;
  total: number;
  /** Which detector found the placeholders (pattern, party, ner), counts only. Optional for old rows. */
  sources?: Record<string, number>;
  /** Matter parties loaded for this request (a count, never names). */
  parties?: number;
  tools: { calls: number; resultsMasked: number; argsScrubbed: number; errorsMasked: number; resultsBlocked: number };
}

const TYPE_RE = /^[A-Z]{1,24}$/;
const SOURCE_KEYS = new Set(["pattern", "party", "ner"]);
const SAFE_REASON = /^[a-z0-9 _:-]{1,80}$/i;
const FIRM_RE = /^[a-z0-9.@_+-]{1,254}$/i;

/** Builds a log entry from counts only. Anything that is not a known-safe shape is dropped. */
export function cleanEntry(e: RedactionEntry): RedactionEntry {
  const types: Record<string, number> = {};
  for (const [k, v] of Object.entries(e.types ?? {})) if (TYPE_RE.test(k) && Number.isFinite(v)) types[k] = Math.max(0, Math.floor(v));
  const n = (v: unknown) => (Number.isFinite(v as number) ? Math.max(0, Math.floor(v as number)) : 0);
  return {
    requestId: String(e.requestId).replace(/[^a-z0-9]/gi, "").slice(0, 32),
    ts: n(e.ts),
    route: String(e.route).replace(/[^a-z0-9-]/gi, "").slice(0, 40),
    model: String(e.model).replace(/[^a-z0-9.:_/-]/gi, "").slice(0, 80),
    masker: String(e.masker).replace(/[^a-z0-9.-]/gi, "").slice(0, 40),
    outcome: e.outcome === "pass" || e.outcome === "blocked" ? e.outcome : "error",
    ...(e.reason && SAFE_REASON.test(e.reason) ? { reason: e.reason } : e.reason ? { reason: "other" } : {}),
    types,
    total: Object.values(types).reduce((a, b) => a + b, 0),
    ...(e.sources ? { sources: Object.fromEntries(Object.entries(e.sources).filter(([k, v]) => SOURCE_KEYS.has(k) && Number.isFinite(v)).map(([k, v]) => [k, Math.max(0, Math.floor(v))])) } : {}),
    ...(Number.isFinite(e.parties) ? { parties: Math.max(0, Math.floor(e.parties as number)) } : {}),
    tools: { calls: n(e.tools?.calls), resultsMasked: n(e.tools?.resultsMasked), argsScrubbed: n(e.tools?.argsScrubbed), errorsMasked: n(e.tools?.errorsMasked), resultsBlocked: n(e.tools?.resultsBlocked) },
  };
}

export function normFirm(firm: string): string {
  const f = String(firm ?? "").trim().toLowerCase();
  return FIRM_RE.test(f) ? f : "unknown";
}

let writer: ((firm: string, entry: RedactionEntry) => Promise<void>) | null = null;
/** Test seam: capture entries instead of writing to Redis. */
export function __setRedactionWriterForTests(fn: typeof writer): void {
  writer = fn;
}

async function writeEntry(firm: string, entry: RedactionEntry): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const key = firmLogKey(firm);
  await redis.lpush(key, JSON.stringify(entry));
  await redis.ltrim(key, 0, REDACTION_KEEP - 1);
  await redis.expire(key, REDACTION_TTL_SECONDS);
  await redis.sadd(FIRMS_KEY, firm);
}

/** Records one entry. Never throws and never blocks the reply (Vercel waitUntil keeps it alive). */
export function recordRedaction(firm: string, entry: RedactionEntry): Promise<void> {
  const f = normFirm(firm);
  const clean = cleanEntry(entry);
  const job = (writer ?? writeEntry)(f, clean).catch((err) => {
    console.error("[lex-redaction-log] write failed", err instanceof Error ? err.name : "error");
  });
  try { waitUntil(job); } catch { /* not on Vercel */ }
  return job;
}

export async function listRedactionFirms(): Promise<string[]> {
  const redis = getRedis();
  if (!redis) return [];
  const firms = (await redis.smembers(FIRMS_KEY)) as string[];
  return firms.filter((f) => FIRM_RE.test(f)).sort();
}

export async function readRedactionLog(firm: string, limit = 200): Promise<RedactionEntry[]> {
  const redis = getRedis();
  if (!redis) return [];
  const rows = (await redis.lrange(firmLogKey(normFirm(firm)), 0, Math.min(Math.max(limit, 1), REDACTION_KEEP) - 1)) as unknown[];
  const out: RedactionEntry[] = [];
  for (const r of rows) {
    try {
      out.push(cleanEntry((typeof r === "string" ? JSON.parse(r) : r) as RedactionEntry));
    } catch {
      // skip a bad row
    }
  }
  return out;
}
