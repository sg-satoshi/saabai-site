/**
 * Lex thread storage rules (#446, QA r1 on #447).
 * - Reads tell "nothing stored" apart from "corrupt", so the API never answers a corrupt key with
 *   200 and an empty list (which made browsers save an empty list over real history).
 * - Saves merge by thread id with what is stored. A thread the client didn't send is kept unless
 *   its id is in an explicit deletedIds list, so a stale or empty client list can't wipe history.
 * - The browser only saves after a load has succeeded.
 */
import { parseRedisJson } from "./redis-json";

type ThreadLike = { id?: unknown; [k: string]: unknown };

export type StoredThreadsRead = { ok: true; threads: ThreadLike[] } | { ok: false; error: "threads_corrupt" };

/** Missing key gives an empty list. Anything stored that isn't a JSON array is corrupt. */
export function readStoredThreads(raw: unknown): StoredThreadsRead {
  if (raw == null || raw === "") return { ok: true, threads: [] };
  const parsed = parseRedisJson<unknown>(raw);
  if (!Array.isArray(parsed)) return { ok: false, error: "threads_corrupt" };
  return { ok: true, threads: parsed as ThreadLike[] };
}

/** Thread ids the client explicitly deleted (strings only, capped). */
export function cleanDeletedIds(v: unknown): Set<string> {
  if (!Array.isArray(v)) return new Set();
  return new Set(v.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 200).slice(0, 1000));
}

/**
 * Client threads first (their order and content win), then stored threads the client didn't send,
 * minus explicit deletions. Never drops a stored thread that wasn't explicitly deleted.
 */
export function mergeThreads(stored: ThreadLike[], incoming: ThreadLike[], deleted: Set<string>): ThreadLike[] {
  const out: ThreadLike[] = [];
  const seen = new Set<string>();
  for (const t of incoming) {
    const id = typeof t?.id === "string" ? t.id : null;
    if (!id || seen.has(id) || deleted.has(id)) continue;
    seen.add(id); out.push(t);
  }
  for (const t of stored) {
    const id = typeof t?.id === "string" ? t.id : null;
    if (!id || seen.has(id) || deleted.has(id)) continue;
    seen.add(id); out.push(t);
  }
  return out;
}

/** Browser side: a load counts only on a 2xx whose body has a threads array (an empty one included). */
export function interpretThreadsLoad(ok: boolean, data: unknown): { loaded: boolean; threads: unknown[] } {
  const threads = ok && data && typeof data === "object" ? (data as { threads?: unknown }).threads : undefined;
  return Array.isArray(threads) ? { loaded: true, threads } : { loaded: false, threads: [] };
}

/** Browser side: the PUT body, or null when saving must not happen (not signed in or not loaded yet). */
export function planThreadsSave(opts: { loaded: boolean; userEmail: string | null | undefined; threads: unknown[]; deletedIds: Iterable<string> }): string | null {
  if (!opts.loaded || !opts.userEmail) return null;
  return JSON.stringify({ threads: opts.threads, deletedIds: [...opts.deletedIds] });
}
