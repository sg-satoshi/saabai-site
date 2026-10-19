/**
 * Focused customer forms where site-wide sales chrome (announcement bar,
 * Mia chat, mobile CTA bar, news ticker, email popup, "Done" toasts) is hidden.
 */
export const FOCUSED_FORM_PREFIXES = ["/audit/factfind"];

export function isFocusedFormPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return FOCUSED_FORM_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}
