/**
 * Upstash's client auto-deserialises JSON values, so a GET can return an object, not a string.
 * parseRedisJson accepts both: objects are used as is, strings are JSON.parsed in a try/catch.
 * Returns null for missing or unparseable values. Never throws.
 */
export function parseRedisJson<T>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw === "object") return raw as T;
  if (typeof raw !== "string" || !raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
