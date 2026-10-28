/** Pure sizing for the docked request panel. No DOM, so the tests can clamp and persist it. */

export const SPLIT_STORAGE_KEY = "mc.requests.split";
export const WIDTH_STORAGE_KEY = "mc.requests.panelWidth";

export const TOP_MIN = 120;
export const BOTTOM_MIN = 220;
export const HANDLE_PX = 12;
export const SPLIT_STEP = 24;

export const PANEL_MIN = 420;
export const PANEL_MAX_RATIO = 0.6;
export const PANEL_DEFAULT = 500;

type Store = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export function readStoredNumber(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Top section height inside a panel of `panelHeight`, leaving the handle and a usable bottom. */
export function clampSplit(top: number, panelHeight: number): number {
  const room = Number.isFinite(panelHeight) ? Math.max(0, panelHeight - HANDLE_PX) : 0;
  const min = Math.min(TOP_MIN, room);
  const max = Math.max(min, room - BOTTOM_MIN);
  const value = top === Number.POSITIVE_INFINITY ? max : Number.isFinite(top) ? top : min;
  return Math.round(Math.min(max, Math.max(min, value)));
}

export function moveSplit(top: number, panelHeight: number, delta: number): number {
  return clampSplit(top + delta, panelHeight);
}

export function splitHome(panelHeight: number): number {
  return clampSplit(TOP_MIN, panelHeight);
}

export function splitEnd(panelHeight: number): number {
  return clampSplit(Number.POSITIVE_INFINITY, panelHeight);
}

export function clampPanelWidth(width: number, viewport: number): number {
  if (!Number.isFinite(viewport) || viewport <= 0) return PANEL_MIN;
  const max = Math.max(PANEL_MIN, Math.floor(viewport * PANEL_MAX_RATIO));
  const value = Number.isFinite(width) ? width : PANEL_DEFAULT;
  return Math.round(Math.min(max, Math.max(PANEL_MIN, value)));
}

export function persistSplit(storage: Pick<Store, "setItem" | "removeItem">, top: number | null): void {
  if (top == null) storage.removeItem(SPLIT_STORAGE_KEY);
  else storage.setItem(SPLIT_STORAGE_KEY, String(Math.round(top)));
}

export function loadSplit(storage: Pick<Store, "getItem">, panelHeight: number): number | null {
  const n = readStoredNumber(storage.getItem(SPLIT_STORAGE_KEY));
  if (n == null) return null;
  return clampSplit(n, panelHeight);
}

export function persistPanelWidth(storage: Pick<Store, "setItem" | "removeItem">, width: number | null): void {
  if (width == null) storage.removeItem(WIDTH_STORAGE_KEY);
  else storage.setItem(WIDTH_STORAGE_KEY, String(Math.round(width)));
}

export function loadPanelWidth(storage: Pick<Store, "getItem">, viewport: number): number {
  const n = readStoredNumber(storage.getItem(WIDTH_STORAGE_KEY));
  return clampPanelWidth(n ?? PANEL_DEFAULT, viewport);
}
