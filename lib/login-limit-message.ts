/**
 * Client-safe: turns a failed Wholesale sign-in response into the message to show.
 * A 429 shows the server's lockout message (plus "try again in N minutes" from Retry-After),
 * anything else shows the page's usual fallback.
 */
export const LOCKOUT_MESSAGE = "Too many sign-in attempts. Please try again later.";

export function retryMinutes(retryAfter: string | null | undefined): number | null {
  const s = Number(retryAfter);
  if (!Number.isFinite(s) || s <= 0) return null;
  return Math.max(1, Math.ceil(s / 60));
}

export function loginErrorMessage(status: number, serverError: unknown, retryAfter: string | null | undefined, fallback: string): string {
  if (status !== 429) return fallback;
  const base = typeof serverError === "string" && serverError.trim() ? serverError.trim() : LOCKOUT_MESSAGE;
  const m = retryMinutes(retryAfter);
  if (!m) return base;
  return `${base.replace(/\s*Please try again later\.?$/, "")} Please try again in ${m} minute${m === 1 ? "" : "s"}.`;
}

/** Reads the response body (if any) and returns the message. */
export async function loginErrorFromResponse(res: Response, fallback: string): Promise<string> {
  let err: unknown;
  if (res.status === 429) err = (await res.json().catch(() => ({})) as { error?: unknown }).error;
  return loginErrorMessage(res.status, err, res.headers.get("Retry-After"), fallback);
}
