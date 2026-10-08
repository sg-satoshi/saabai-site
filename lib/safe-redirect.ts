/**
 * Validate a post-login redirect target.
 *
 * Only same-origin, relative paths are allowed (e.g. "/dashboard/requests?x=1").
 * Anything else (absolute URLs, protocol-relative "//evil.com", backslash
 * tricks, control characters, javascript: URIs) falls back to `fallback`.
 */
const PLACEHOLDER_ORIGIN = "http://saabai.invalid";

export function safeRedirect(target: unknown, fallback = "/dashboard"): string {
  if (typeof target !== "string") return fallback;
  const t = target.trim();
  if (!t || t.length > 2048) return fallback;
  if (!t.startsWith("/")) return fallback;
  // Protocol-relative ("//host") and backslash variants ("/\host") that some
  // browsers normalise to "//host".
  if (t.startsWith("//") || t.startsWith("/\\")) return fallback;
  // Reject control characters and whitespace that browsers strip/normalise.
  if (/[\u0000-\u001f\u007f\s\\]/.test(t)) return fallback;
  try {
    const url = new URL(t, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
