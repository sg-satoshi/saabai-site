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
/** Retention: feedback items 12 months from creation (Redis TTL), screenshots 90 days. Also deleted with a firm's data under clause 10.7. */
export const FEEDBACK_RETENTION_DAYS = 365;
const ITEM_TTL = FEEDBACK_RETENTION_DAYS * 86400;
function ttlLeft(createdAt: string, now = Date.now()): number {
  return Math.max(60, Math.floor((Date.parse(createdAt) + ITEM_TTL * 1000 - now) / 1000));
}
/** The page field is client supplied: keep only a Lex path (no query, hash or free text). */
export function cleanPage(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim().split(/[?#]/)[0] : "";
  return /^\/[A-Za-z0-9/_-]{0,119}$/.test(s) ? s : "/lex";
}

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
  return { ok: true, value: { type, message, page: cleanPage(b.page), screenshot, screenshotRejected } };
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
  await r.set(`lex:feedback:${item.id}`, JSON.stringify(item), { ex: ITEM_TTL });
  if (v.screenshot) await r.set(`lex:feedback:shot:${item.id}`, v.screenshot, { ex: SHOT_TTL });
  await r.lpush("lex:feedback:ids", item.id);
  // Items trimmed off the list are deleted, not orphaned.
  const over = ((await r.lrange("lex:feedback:ids", MAX_ITEMS, -1)) as string[]) ?? [];
  for (const old of over) await r.del(`lex:feedback:${old}`, `lex:feedback:shot:${old}`);
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
  await redis().set(`lex:feedback:${it.id}`, JSON.stringify(it), { ex: ttlLeft(it.createdAt, now.getTime()) });
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

/**
 * Clause 10.7: deletes a firm's feedback (including copied answer-flag notes) by firm key or by user email.
 * dryRun only counts. Returns the number of items matched.
 */
export async function deleteFirmFeedback(firmKeys: string[], emails: string[], dryRun: boolean): Promise<number> {
  const r = redis();
  const keys = new Set(firmKeys.map((k) => k.toLowerCase()));
  const people = new Set(emails.map((e) => e.toLowerCase()));
  const ids = ((await r.lrange("lex:feedback:ids", 0, -1)) as string[]) ?? [];
  let n = 0;
  for (const id of ids) {
    const it = await getFeedback(String(id));
    if (!it || !(keys.has(it.firm.toLowerCase()) || people.has(it.user.toLowerCase()))) continue;
    n++;
    if (dryRun) continue;
    await r.del(`lex:feedback:${it.id}`, `lex:feedback:shot:${it.id}`);
    await r.lrem("lex:feedback:ids", 0, it.id);
  }
  return n;
}

/** hello@ alert throttle: the first 5 an hour are sent one by one, the rest wait for an hourly digest. */
export const ALERTS_PER_HOUR = 5;
type Send = (line: string, opts: { prefix: string; title: string }) => Promise<unknown>;
const ALERT_OPTS = { prefix: "Lex feedback", title: "New Lex feedback" };
export async function alertFeedback(it: FeedbackItem, send: Send, now = new Date()): Promise<"sent" | "queued"> {
  const r = redis();
  const hourKey = `lex:feedback:alerts:${now.toISOString().slice(0, 13)}`;
  const n = Number(await r.incr(hourKey));
  if (n === 1) { await r.expire(hourKey, 7200); await flushFeedbackDigest(send); }
  if (n <= ALERTS_PER_HOUR) { await send(feedbackAlertLine(it), ALERT_OPTS); return "sent"; }
  await r.lpush("lex:feedback:digest", it.id);
  await r.expire("lex:feedback:digest", 3 * 86400);
  return "queued";
}
/** Sends one digest for queued alerts (from the next hour's first alert, or the hourly lex-grace cron). */
export async function flushFeedbackDigest(send: Send, site = "https://www.saabai.ai"): Promise<number> {
  const r = redis();
  const ids = ((await r.lrange("lex:feedback:digest", 0, -1)) as string[]) ?? [];
  if (!ids.length) return 0;
  await r.del("lex:feedback:digest");
  const lines: string[] = [];
  for (const id of ids.reverse()) { const it = await getFeedback(String(id)); if (it) lines.push(feedbackAlertLine(it, site)); }
  if (lines.length) await send(`${lines.length} more Lex feedback items:\n${lines.join("\n")}`, { prefix: "Lex feedback", title: "Lex feedback digest" });
  return lines.length;
}

/** Admin alert line: type, firm, page and link only. Never the message or screenshot. */
export function feedbackAlertLine(it: FeedbackItem, site = "https://www.saabai.ai"): string {
  return `New Lex ${it.type === "answer_flag" ? "answer flag" : it.type} from ${it.firm || "unknown firm"} on ${cleanPage(it.page)}. Triage: ${site}/saabai-admin/lex-feedback?id=${it.id}`;
}
