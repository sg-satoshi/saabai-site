/**
 * Mia's nudge bubble: a small, dismissible bubble on pricing and Blueprint pages.
 * - once per browser session
 * - never auto-opens the chat (the visitor must click)
 * - never on the score flow or checkout/confirmation pages
 */
export const NUDGE_DELAY_MS = 20_000;
export const NUDGE_SCROLL_RATIO = 0.5;
export const NUDGE_SESSION_KEY = "mia-nudge-shown";

export const NUDGE_PAGES: Record<string, string> = {
  "/blueprint": "Questions about the Blueprint? I can explain it in 30 seconds.",
  "/services": "Not sure which option fits? I can help you pick in a minute.",
  "/websites": "New site, or fixing the one you've got? I can help you pick a plan.",
};

const NEVER = ["/score", "/blueprint/checkout", "/blueprint/confirmation", "/checkout", "/pay"];

const norm = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

export function nudgeFor(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const p = norm(pathname.split("?")[0]);
  if (NEVER.some((n) => p === n || p.startsWith(n + "/"))) return null;
  return NUDGE_PAGES[p] ?? null;
}
