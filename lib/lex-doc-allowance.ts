/**
 * Lex Firm plan document allowance: Draft Documents generations per firm per calendar month (Australia/Brisbane).
 *
 *   lex:docs:used:{firm}:{YYYY-MM}   counter (INCR, so concurrent drafts can never pass the cap)
 *   lex:docs:req:{firm}:{sha256}     idempotency marker (SET NX, 10 min): a retried request is not counted twice
 *   lex:docs:firms:{YYYY-MM}         set of firms that drafted that month (admin value reports)
 *   lex:docs:caps                    hash firm -> monthly cap override (Enterprise). Absent = plan default.
 *
 * Only new drafts count. QA passes, research and editing an existing draft do not.
 * Fail open, with a log line, only when the store is missing or unreachable.
 * A firm is the user's email domain (or full email for free-mail), as for Doc review caps.
 */
import { createHash } from "node:crypto";
import { getRedis } from "./redis";

import { FIRM_PLAN_MONTHLY_DOCS, DOC_WARN_AT, resetDateLabel, type DocUsage } from "./lex-doc-allowance-shared";
export { FIRM_PLAN_MONTHLY_DOCS, DOC_WARN_AT, resetDateLabel, type DocUsage };
export const DOC_CAPS_KEY = "lex:docs:caps";
const REQ_TTL_SECONDS = 600;
const USED_TTL_SECONDS = 400 * 86400; // kept ~13 months for value reports

type Store = NonNullable<ReturnType<typeof getRedis>>;

/** YYYY-MM in Brisbane (UTC+10, no daylight saving). */
export function brisbaneMonth(now = new Date()): string {
  return new Date(now.getTime() + 10 * 3600 * 1000).toISOString().slice(0, 7);
}

/** First day of next Brisbane month, as YYYY-MM-DD (the reset date shown to firms). */
export function resetDate(now = new Date()): string {
  const [y, m] = brisbaneMonth(now).split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}


export const usedKey = (firm: string, month: string) => `lex:docs:used:${firm}:${month}`;
const reqKey = (firm: string, fp: string) => `lex:docs:req:${firm}:${fp}`;
const firmsKey = (month: string) => `lex:docs:firms:${month}`;

/** Same request content (and optional client request id) gives the same fingerprint, so a retry is not counted again. */
export function requestFingerprint(parts: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32);
}

export async function docCapForFirm(firm: string, store: Store | null = getRedis()): Promise<number> {
  if (store) {
    const v = await store.hget<number | string>(DOC_CAPS_KEY, firm);
    const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return FIRM_PLAN_MONTHLY_DOCS;
}

export function docLimitMessage(cap: number, resetIso: string): string {
  return `Your firm has used all ${cap} documents for this month. New drafts pause until ${resetDateLabel(resetIso)}. Research is still unlimited, and your existing drafts stay open to view and edit. Talk to us about more documents, or book a call.`;
}


export async function docUsage(firm: string, now = new Date(), store: Store | null = getRedis()): Promise<DocUsage | null> {
  if (!store) return null;
  const month = brisbaneMonth(now);
  const [raw, cap] = await Promise.all([store.get<number | string>(usedKey(firm, month)), docCapForFirm(firm, store)]);
  return { used: Number(raw ?? 0) || 0, cap, month, resetsOn: resetDate(now), warnAt: Math.min(DOC_WARN_AT, cap) };
}

export type DocTake =
  | { ok: true; counted: boolean; failOpen?: boolean; usage?: DocUsage; refund: () => Promise<void> }
  | { ok: false; usage: DocUsage; message: string };

const noop = async () => {};

/** Takes one document from this month's allowance. Call refund() if the draft could not start. */
export async function takeDocument(firm: string, fingerprint: string, now = new Date(), store: Store | null = getRedis(), log: (m: string) => void = (m) => console.warn(m)): Promise<DocTake> {
  if (!store) { log("[lex-docs] fail-open: store not configured"); return { ok: true, counted: false, failOpen: true, refund: noop }; }
  const month = brisbaneMonth(now);
  const uk = usedKey(firm, month);
  const rk = reqKey(firm, fingerprint);
  try {
    const first = await store.set(rk, "1", { nx: true, ex: REQ_TTL_SECONDS });
    if (first !== "OK") return { ok: true, counted: false, refund: noop }; // retry of a request already counted
    const cap = await docCapForFirm(firm, store);
    const n = await store.incr(uk);
    if (n === 1) await store.expire(uk, USED_TTL_SECONDS);
    if (n > cap) {
      await store.incrby(uk, -1);
      await store.del(rk);
      const usage: DocUsage = { used: n - 1, cap, month, resetsOn: resetDate(now), warnAt: Math.min(DOC_WARN_AT, cap) };
      return { ok: false, usage, message: docLimitMessage(cap, usage.resetsOn) };
    }
    try { await store.sadd(firmsKey(month), firm); } catch { /* report index is best effort */ }
    const usage: DocUsage = { used: n, cap, month, resetsOn: resetDate(now), warnAt: Math.min(DOC_WARN_AT, cap) };
    return {
      ok: true, counted: true, usage,
      refund: async () => { try { await store.incrby(uk, -1); await store.del(rk); } catch { /* best effort */ } },
    };
  } catch (err) {
    log(`[lex-docs] fail-open: store unreachable (${err instanceof Error ? err.name : "error"})`);
    return { ok: true, counted: false, failOpen: true, refund: noop };
  }
}

/** Admin read: every firm's count for a month (for value reports). */
export async function monthlyDocCounts(month: string, store: Store | null = getRedis()): Promise<Array<{ firm: string; used: number; cap: number }>> {
  if (!store) return [];
  const firms = ((await store.smembers(firmsKey(month))) ?? []).map(String).sort();
  return Promise.all(firms.map(async (firm) => ({
    firm, used: Number((await store.get<number | string>(usedKey(firm, month))) ?? 0) || 0, cap: await docCapForFirm(firm, store),
  })));
}
