// Shared client-portal helpers for the Wholesale Homes members area.
// Auth is a lightweight localStorage flag; the source of truth for credentials
// lives server-side in /api/wholesale-auth.

export const AUTH_KEY = "wholesale_client_auth";

export type ClientAuth = { email?: string; loggedInAt?: number };

/** Read + JSON-parse a localStorage value, returning `fallback` on miss/parse error. */
export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** JSON-stringify + write a value to localStorage (no-op during SSR). */
export function saveJSON(key: string, val: unknown): void {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(val));
}
