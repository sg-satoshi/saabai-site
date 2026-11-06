/**
 * Phone chat sheet geometry.
 *
 * `vh`, `dvh`, and `svh` follow the layout viewport. iOS Safari and Android
 * Chrome (default interactive-widget=resizes-visual) do not shrink those units
 * when the on-screen keyboard opens. The keyboard overlays the layout viewport
 * and shrinks `window.visualViewport` instead. Safari then pans that viewport
 * (`offsetTop`) so the focused input stays visible, which pushes a tall fixed
 * panel's header off the top and leaves the page showing in the gap.
 *
 * The sheet fills the visual viewport exactly. Desktop widths return null so
 * the existing card CSS is left alone. `public/chat-sheet.js` must implement
 * the same rules (tests compare the two).
 */

export const PHONE_MAX_WIDTH = 640;
export const COARSE_POINTER_MAX_WIDTH = 1024;
/** A smaller gap than this is browser chrome, not the keyboard. */
export const KEYBOARD_INSET_PX = 80;

export interface VisualBox {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
}

export interface ViewportReading {
  layoutWidth: number;
  layoutHeight: number;
  coarse: boolean;
  visual: VisualBox | null;
}

export interface SheetFrame {
  top: number;
  left: number;
  width: number;
  height: number;
  keyboard: boolean;
}

export function mobileSheetFrame(v: ViewportReading | null | undefined): SheetFrame | null {
  if (!v || !(v.layoutWidth > 0)) return null;
  const phone = v.layoutWidth <= PHONE_MAX_WIDTH || (!!v.coarse && v.layoutWidth <= COARSE_POINTER_MAX_WIDTH);
  if (!phone) return null;
  const vis = v.visual;
  const width = vis && vis.width > 0 ? vis.width : v.layoutWidth;
  const height = vis && vis.height > 0 ? vis.height : v.layoutHeight;
  let top = vis && Number.isFinite(vis.offsetTop) ? vis.offsetTop : 0;
  let left = vis && Number.isFinite(vis.offsetLeft) ? vis.offsetLeft : 0;
  if (top < 0) top = 0;
  if (left < 0) left = 0;
  if (!(width > 0) || !(height > 0)) return null;
  const keyboard = Math.max(0, (v.layoutHeight || 0) - height - top) > KEYBOARD_INSET_PX;
  return { top, left, width, height, keyboard };
}
