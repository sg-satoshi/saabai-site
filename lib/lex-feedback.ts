/**
 * Lex in-app feedback: "Report an issue / Suggest a feature" from any Lex screen, plus answer flags
 * (/api/lex-flag also files here so they get triage). Admin triage at /saabai-admin/lex-feedback.
 *
 * Redis keys
 *   lex:feedback:{id}        item (JSON)
 *   lex:feedback:ids         list of ids, newest first (capped at MAX_ITEMS)
 *   lex:feedback:shot:{id}   optional screenshot (JPEG/PNG data URL, <= MAX_SHOT_BYTES, 90-day TTL)
 *
 * Privacy: users are told not to include client-identifying details. Message text is masked for emails
 * and phone numbers on save, and admin alerts never include the message or the screenshot.
 */
import { randomBytes } from "crypto";
import { getRedis } from "./redis";

export const FEEDBACK_TYPES = ["bug", "idea", "question", "answer_flag"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];
export const FEEDBACK_STATUSES = ["new", "triaged", "planned", "fixed", "wont_do"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
export const FEEDBACK_SOURCES = ["button", "flag", "assistant"] as const;
export type FeedbackSource = (typeof FEEDBACK_SOURCES)[number];

export const MAX_MESSAGE = 4000;
export const MAX_ITEMS = 5000;
export const MAX_SHOT_BYTES = 1_500_000; // data URL length; the client downsizes to 1600px JPEG first
const SHOT_TTL = 90 * 86400;

export type FeedbackItem = {
  id: string; type: FeedbackType; message: string; status: FeedbackStatus; tags: string[];
  source: FeedbackSource; hasScreenshot: boolean;
  page: string; firm: string; user: string; browser: string; appVersion: string;
  createdAt: string; updatedAt: string; adminNote?: string;
};

function redis() {
  const r = getRedis();
  if (!r) throw new Error("Redis not configured");
  return r;
}
function parse<T>(raw: unknown): T | null {
  if (!raw) return null;
  if (typeof raw === "string") { try { return JSON.parse(raw) as T; } catch { return null; } }
  return raw as T;
}
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

/** Masks emails and phone-like numbers (client details people paste by accident). */
export function maskFeedbackText(s: string): string {
  return s
    .replace(/[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/gi, "[email]")
    .replace(/(?<![\w])(?:\+?61|0)[\s-]?[2-478](?:[\s-]?\d){8}(?![\w])/g, "[phone]")
    .replace(/(?<![\w])\+?\d[\d\s-]{9,}\d(?![\w])/g, "[number]");
}

export function cleanTags(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  return [...new Set(arr.map((t) => clip(t, 30).toLowerCase().replace(/[^a-z0-9 _-]/g, "")).filter(Boolean))].slice(0, 10);
}

export function validScreenshot(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  if (raw.length > MAX_SHOT_BYTES) return null;
  return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(raw) ? raw : null;
}

export type FeedbackInput = { type: FeedbackType; message: string; page: string; screenshot: string | null; screenshotRejected: boolean };
export function validateFeedback(body: unknown): { ok: true; value: FeedbackInput } | { ok: false; error: string; field?: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const type = FEEDBACK_TYPES.find((t) => t === b.type && t !== "answer_flag");
  if (!type) return { ok: false, error: "Pick bug, idea or question", field: "type" };
  const message = clip(b.message, MAX_MESSAGE);
  if (message.length < 3) return { ok: false, error: "Please tell us a little more", field: "message" };
  const screenshot = validScreenshot(b.screenshot);
  const screenshotRejected = !!b.screenshot && !screenshot;
  return { ok: true, value: { type, message, page: clip(b.page, 200), screenshot, screenshotRejected } };
}

export type FeedbackContext = { firm: string; user: string; browser: string; appVersion: string; source?: FeedbackSource };
export function appVersion(env = process.env): string {
  return (env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || env.npm_package_version || "dev";
}

export async function saveFeedback(v: Omit<FeedbackInput, "screenshotRejected">, ctx: FeedbackContext, now = new Date()): Promise<FeedbackItem> {
  const r = redis();
  const item: FeedbackItem = {
    id: `fb_${now.getTime().toString(36)}${randomBytes(4).toString("hex")}`,
    type: v.type, message: maskFeedbackText(v.message), status: "new", tags: [], source: ctx.source ?? "button",
    hasScreenshot: !!v.screenshot, page: v.page, firm: clip(ctx.firm, 200), user: clip(ctx.user, 200),
    browser: clip(ctx.browser, 300), appVersion: clip(ctx.appVersion, 40),
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  };
  await r.set(`lex:feedback:${item.id}`, JSON.stringify(item));
  if (v.screenshot) await r.set(`lex:feedback:shot:${item.id}`, v.screenshot, { ex: SHOT_TTL });
  await r.lpush("lex:feedback:ids", item.id);
  await r.ltrim("lex:feedback:ids", 0, MAX_ITEMS - 1);
  return item;
}

export async function getFeedback(id: string): Promise<FeedbackItem | null> {
  if (!/^fb_[a-z0-9]{8,30}$/.test(id)) return null;
  return parse<FeedbackItem>(await redis().get(`lex:feedback:${id}`));
}
export async function getScreenshot(id: string): Promise<string | null> {
  if (!/^fb_[a-z0-9]{8,30}$/.test(id)) return null;
  const v = await redis().get(`lex:feedback:shot:${id}`);
  return typeof v === "string" ? v : null;
}

export type FeedbackFilter = { status?: string; type?: string; firm?: string; tag?: string; limit?: number };
export async function listFeedback(f: FeedbackFilter = {}): Promise<FeedbackItem[]> {
  const ids = ((await redis().lrange("lex:feedback:ids", 0, MAX_ITEMS - 1)) as string[]) ?? [];
  const out: FeedbackItem[] = [];
  for (const id of ids) {
    const it = await getFeedback(String(id));
    if (!it) continue;
    if (f.status && it.status !== f.status) continue;
    if (f.type && it.type !== f.type) continue;
    if (f.firm && it.firm !== f.firm) continue;
    if (f.tag && !it.tags.includes(f.tag)) continue;
    out.push(it);
    if (out.length >= (f.limit ?? 1000)) break;
  }
  return out;
}

export function countsByFirm(items: FeedbackItem[]): { firm: string; total: number; open: number }[] {
  const m = new Map<string, { firm: string; total: number; open: number }>();
  for (const it of items) {
    const row = m.get(it.firm) ?? { firm: it.firm, total: 0, open: 0 };
    row.total++;
    if (it.status === "new" || it.status === "triaged" || it.status === "planned") row.open++;
    m.set(it.firm, row);
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

export async function updateFeedback(id: string, patch: { status?: unknown; tags?: unknown; adminNote?: unknown }, now = new Date()): Promise<FeedbackItem | null> {
  const it = await getFeedback(id);
  if (!it) return null;
  if (patch.status !== undefined) {
    const s = FEEDBACK_STATUSES.find((x) => x === patch.status);
    if (!s) throw new Error("bad status");
    it.status = s;
  }
  if (patch.tags !== undefined) it.tags = cleanTags(patch.tags);
  if (patch.adminNote !== undefined) it.adminNote = clip(patch.adminNote, 1000);
  it.updatedAt = now.toISOString();
  await redis().set(`lex:feedback:${it.id}`, JSON.stringify(it));
  return it;
}

const csvCell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // no spreadsheet formulas
  return `"${s.replace(/"/g, '""')}"`;
};
export function feedbackCsv(items: FeedbackItem[]): string {
  const cols: (keyof FeedbackItem)[] = ["id", "createdAt", "type", "status", "tags", "source", "firm", "user", "page", "browser", "appVersion", "hasScreenshot", "message", "adminNote"];
  return [cols.join(","), ...items.map((it) => cols.map((c) => csvCell(Array.isArray(it[c]) ? (it[c] as string[]).join(" ") : it[c])).join(","))].join("\n") + "\n";
}

/** Admin alert line: type, firm, page and link only. Never the message or screenshot. */
export function feedbackAlertLine(it: FeedbackItem, site = "https://www.saabai.ai"): string {
  return `New Lex ${it.type === "answer_flag" ? "answer flag" : it.type} from ${it.firm || "unknown firm"} on ${it.page || "unknown page"}. Triage: ${site}/saabai-admin/lex-feedback?id=${it.id}`;
}
