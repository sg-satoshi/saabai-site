/**
 * Exit pop-up rules (spec: Designer exit-popup-redesign, angle 1).
 * Pure helpers so the trigger, cap, holdout and suppression rules are unit tested.
 * Browser storage is passed in, so tests use a plain in-memory store.
 */
import { isFocusedFormPath } from "./focused-paths";

export const EXIT_VARIANT = "score_v1";
export const CAP_KEY = "saabai_exit_v2";
export const GROUP_KEY = "saabai_exit_group";
export const SESSION_SEEN_KEY = "saabai_exit_seen";
export const SESSION_PV_KEY = "saabai_pv";
export const SCORE_DONE_KEY = "saabai_score_done";
export const CONVERTED_KEY = "saabai_converted";
export const MEMBER_KEY = "saabai_member";
export const ENTRY_KEY = "saabai_entry";
export const LEGACY_COOKIE = "saabai_subscribed";

export const HOLDOUT_SHARE = 0.1;
export const DESKTOP_ARM_MS = 8_000;
export const MOBILE_DWELL_MS = 20_000;
export const MOBILE_SCROLL_DEPTH = 0.5;
export const SHEET_MAX_SHARE = 0.25;
export const SCORE_HREF = "/score?from=exit-popup";

const DAY = 86_400_000;

/** How long each outcome hides the pop-up, in days. Holdout never shows. */
export const CAP_DAYS = { dismissed: 14, clicked: 30, emailed: 180 } as const;
export type CapState = keyof typeof CAP_DAYS | "holdout";
export type ExitGroup = "holdout" | "test";

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

/** Apps and pages where it never runs (logins, admin, portals, Lex). */
const APP_PREFIXES = [
  "/login", "/lex", "/saabai-admin", "/lex-widget", "/mission-control", "/onboarding",
  "/client-portal", "/dashboard", "/admin", "/pulse", "/clients", "/sites", "/leadgen",
  "/leadgen-widget", "/forgot-password", "/reset-password", "/testimonial",
];

/** Pages where the visitor is already converting, or that should stay free of sales interrupts. */
const NEVER_PREFIXES = [
  "/score", "/contact", "/blueprint", "/pricing", "/checkout", "/pay",
  "/legal", "/ai-chatbot-law-firms", "/privacy", "/terms", "/unsubscribe", "/case-studies",
];

/** Signed-in areas: a visit marks the browser as a client or admin, who never sees the pop-up. */
const MEMBER_PREFIXES = ["/saabai-admin", "/client-portal", "/dashboard", "/lex", "/mission-control"];

const under = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");

function cleanPath(path: string | null | undefined): string {
  if (!path) return "/";
  const p = path.split(/[?#]/)[0] || "/";
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

export function exitPopupAllowedPath(path: string | null | undefined): boolean {
  const p = cleanPath(path);
  if (p.startsWith("/api")) return false;
  if (APP_PREFIXES.some((x) => under(p, x))) return false;
  if (NEVER_PREFIXES.some((x) => under(p, x))) return false;
  if (isFocusedFormPath(p)) return false;
  return true;
}

export function isMemberPath(path: string | null | undefined): boolean {
  const p = cleanPath(path);
  return MEMBER_PREFIXES.some((x) => under(p, x));
}

interface CapRecord { state: CapState; at: number }

function readRecord(store: KV): CapRecord | null {
  try {
    const raw = store.getItem(CAP_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as Partial<CapRecord>;
    if (!j || typeof j.state !== "string" || typeof j.at !== "number") return null;
    if (j.state !== "holdout" && !(j.state in CAP_DAYS)) return null;
    return { state: j.state as CapState, at: j.at };
  } catch {
    return null;
  }
}

/** Is the pop-up capped right now? Holdout is permanent; other states expire after CAP_DAYS. */
export function readCap(store: KV, now = Date.now()): { capped: boolean; state: CapState | null } {
  const r = readRecord(store);
  if (!r) return { capped: false, state: null };
  if (r.state === "holdout") return { capped: true, state: "holdout" };
  const until = r.at + CAP_DAYS[r.state] * DAY;
  return now < until ? { capped: true, state: r.state } : { capped: false, state: r.state };
}

/** Record an outcome. Never overwrites a holdout, and never shortens a longer cap still running. */
export function writeCap(store: KV, state: keyof typeof CAP_DAYS, now = Date.now()): void {
  const r = readRecord(store);
  if (r?.state === "holdout") return;
  if (r) {
    const current = r.at + CAP_DAYS[r.state] * DAY;
    if (current > now + CAP_DAYS[state] * DAY) return;
  }
  try { store.setItem(CAP_KEY, JSON.stringify({ state, at: now })); } catch { /* storage blocked */ }
}

/** Old pop-up cookie: anyone who had it is treated as emailed, hidden 180 days. */
export function migrateLegacyCookie(cookie: string, store: KV, now = Date.now()): boolean {
  const has = cookie.split(";").some((c) => c.trim().startsWith(LEGACY_COOKIE + "="));
  if (!has) return false;
  if (!readRecord(store)) writeCap(store, "emailed", now);
  return true;
}

/**
 * Holdout split. A browser is assigned once: 10% get the permanent holdout cap
 * and never see the pop-up; the rest are the test group. isNew tells the caller
 * to fire exit_popup_holdout once.
 */
export function assignGroup(store: KV, rand: () => number = Math.random, now = Date.now()): { group: ExitGroup; isNew: boolean } {
  const existing = readGroup(store);
  if (existing) return { group: existing, isNew: false };
  const group: ExitGroup = rand() < HOLDOUT_SHARE ? "holdout" : "test";
  try {
    store.setItem(GROUP_KEY, group);
    if (group === "holdout") store.setItem(CAP_KEY, JSON.stringify({ state: "holdout", at: now }));
  } catch { /* storage blocked: treat as test, nothing stored */ }
  return { group, isNew: true };
}

export function readGroup(store: KV): ExitGroup | null {
  try {
    const g = store.getItem(GROUP_KEY);
    if (g === "holdout" || g === "test") return g;
    // A holdout cap without a group key still counts as holdout.
    return readRecord(store)?.state === "holdout" ? "holdout" : null;
  } catch {
    return null;
  }
}

/** Took the score, sent a lead or contact form, bought a Blueprint or care plan, or is a signed-in client or admin. */
export function isConverted(store: KV): boolean {
  try {
    return !!(store.getItem(SCORE_DONE_KEY) || store.getItem(CONVERTED_KEY) || store.getItem(MEMBER_KEY));
  } catch {
    return false;
  }
}

export function markFlag(store: KV, key: typeof SCORE_DONE_KEY | typeof CONVERTED_KEY | typeof MEMBER_KEY, now = Date.now()): void {
  try { store.setItem(key, String(now)); } catch { /* storage blocked */ }
}

/** The mobile sheet may take at most 25% of the viewport height. */
export function sheetFits(heightPx: number, viewportPx: number): boolean {
  if (!(heightPx > 0) || !(viewportPx > 0)) return false;
  return heightPx <= viewportPx * SHEET_MAX_SHARE;
}

/** Page views this session, counted by the caller on each new path. */
export function bumpPageViews(session: KV): number {
  try {
    const n = (Number(session.getItem(SESSION_PV_KEY)) || 0) + 1;
    session.setItem(SESSION_PV_KEY, String(n));
    return n;
  } catch {
    return 1;
  }
}

/** Mobile trigger: never on the first page view, then 50% scroll depth and 20 seconds on the page. */
export function mobileReady(o: { pageViews: number; scrollDepth: number; dwellMs: number }): boolean {
  return o.pageViews >= 2 && o.scrollDepth >= MOBILE_SCROLL_DEPTH && o.dwellMs >= MOBILE_DWELL_MS;
}

export interface Eligibility {
  path: string;
  chrome: boolean;
  local: KV;
  session: KV;
  now?: number;
}

/** Every "should it show at all" rule except triggers and conversation holds. */
export function exitPopupEligible(e: Eligibility): boolean {
  if (!e.chrome) return false;
  if (!exitPopupAllowedPath(e.path)) return false;
  if (isConverted(e.local)) return false;
  if (readGroup(e.local) === "holdout") return false;
  if (readCap(e.local, e.now).capped) return false;
  try { if (e.session.getItem(SESSION_SEEN_KEY)) return false; } catch { /* ignore */ }
  return true;
}

/** Score funnel attribution: keep ?from= values that start with "exit-" (plus a short safe set). */
export function cleanEntry(from: string | null | undefined): string | null {
  if (!from) return null;
  const v = from.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,39}$/.test(v) ? v : null;
}

export const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export function validEmail(email: string): boolean {
  const e = email.trim();
  return e.length > 0 && e.length <= 254 && EMAIL_RE.test(e);
}
