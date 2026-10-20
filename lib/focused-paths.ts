/**
 * Focused customer forms where site-wide sales chrome (announcement bar,
 * Mia chat, mobile CTA bar, news ticker, email popup, "Done" toasts) is hidden.
 */
export const FOCUSED_FORM_PREFIXES = ["/audit/factfind"];

export function isFocusedFormPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return FOCUSED_FORM_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

/**
 * Pages where the site-wide announcement bar (promo or countdown) never shows.
 * /legal is the Lex sales page: Blueprint offers and countdowns are off-brand
 * for lawyers there. Mia and the rest of the site chrome still show.
 */
export const NO_ANNOUNCEMENT_PREFIXES = ["/legal"];

export function hidesAnnouncement(path: string | null | undefined): boolean {
  if (!path) return false;
  const p = path.split(/[?#]/)[0];
  return isFocusedFormPath(p) || NO_ANNOUNCEMENT_PREFIXES.some((x) => p === x || p === x + "/" || p.startsWith(x + "/"));
}
