/** Pure sizing for the docked request panel. No DOM, so the tests can clamp and persist it. */

export const SPLIT_STORAGE_KEY = "mc.requests.split";
export const WIDTH_STORAGE_KEY = "mc.requests.panelWidth";
export const REPLY_STORAGE_KEY = "mc.requests.replySplit";

export const TOP_MIN = 120;
export const HANDLE_PX = 12;
export const SPLIT_STEP = 24;
export const TABS_PX = 44;
export const THREAD_MIN = 160;
export const THREAD_RATIO = 0.45;
export const REPLY_MIN = 110;
export const REPLY_DEFAULT = 150;
/** Tabs, a usable thread, the reply grip, and the shortest reply box. */
export const BOTTOM_MIN = TABS_PX + THREAD_MIN + HANDLE_PX + REPLY_MIN;

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

/** Compact header so the thread can take at least 45% of an 800px panel. */
export function defaultTop(panelHeight: number): number {
  const thread = Math.max(THREAD_MIN, Math.round(panelHeight * THREAD_RATIO));
  const used = HANDLE_PX + TABS_PX + thread + HANDLE_PX + REPLY_DEFAULT;
  return clampSplit(panelHeight - used, panelHeight);
}

export function threadHeight(panelHeight: number, top: number, reply = REPLY_DEFAULT): number {
  return panelHeight - top - HANDLE_PX - TABS_PX - HANDLE_PX - reply;
}

/** Reply-box height inside the tabbed section. Dragging the grip up increases it. */
export function clampReply(reply: number, bottomHeight: number): number {
  const room = Number.isFinite(bottomHeight) ? Math.max(0, bottomHeight - TABS_PX - HANDLE_PX) : 0;
  const min = Math.min(REPLY_MIN, room);
  const max = Math.max(min, room - THREAD_MIN);
  const value = reply === Number.POSITIVE_INFINITY ? max : Number.isFinite(reply) ? reply : min;
  return Math.round(Math.min(max, Math.max(min, value)));
}

export function moveReply(reply: number, bottomHeight: number, delta: number): number {
  return clampReply(reply + delta, bottomHeight);
}

export function replyHome(bottomHeight: number): number {
  return clampReply(REPLY_MIN, bottomHeight);
}

export function replyEnd(bottomHeight: number): number {
  return clampReply(Number.POSITIVE_INFINITY, bottomHeight);
}

export function defaultReply(bottomHeight: number): number {
  return clampReply(REPLY_DEFAULT, bottomHeight);
}

export function persistReply(storage: Pick<Store, "setItem" | "removeItem">, reply: number | null): void {
  if (reply == null) storage.removeItem(REPLY_STORAGE_KEY);
  else storage.setItem(REPLY_STORAGE_KEY, String(Math.round(reply)));
}

export function loadReply(storage: Pick<Store, "getItem">, bottomHeight: number): number {
  const n = readStoredNumber(storage.getItem(REPLY_STORAGE_KEY));
  return clampReply(n ?? REPLY_DEFAULT, bottomHeight);
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
