/** Portal watermark: firm name + user email, tiled, very low opacity, never blocks clicks or selection. */
export const WATERMARK_OPACITY = 0.05;
/** Trial firms only for now (anti-copy for self-serve trials). Flip to true to watermark every Lex firm. */
export const WATERMARK_ALL_FIRMS = false;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
export function watermarkText(firmName: string, email: string): string {
  return `${firmName.slice(0, 60)} · ${email.slice(0, 80)}`;
}
/** Tiled SVG as a CSS background (data URI). Grey text, rotated, low opacity: readable content stays on top. */
export function watermarkBackground(text: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="220"><text x="20" y="130" transform="rotate(-24 210 110)" font-family="Inter, Arial, sans-serif" font-size="13" fill="#1b2559" fill-opacity="${WATERMARK_OPACITY}">${esc(text)}</text></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}
export function showWatermark(p: { status?: string; firmName?: string; me?: string | null } | null): boolean {
  return !!p?.firmName && !!p.me && (WATERMARK_ALL_FIRMS || p.status === "trial");
}
