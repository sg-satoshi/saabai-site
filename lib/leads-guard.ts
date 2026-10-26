/**
 * Guards for the public /api/leads endpoint.
 *
 * - validates and size-limits the body, whitelists `source`
 * - HTML-escapes every visitor-supplied string once, at the door, so all email
 *   templates are safe without touching each one
 * - per-IP and per-recipient rate limits (Redis, in-memory fallback)
 * - a safe log line that never contains names, emails or transcripts
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { getRedis } from "./redis";

export const PUBLIC_SOURCES = [
  "chat_widget",
  "chat_closed",
  "chat_ended",
  "chat_ended_short",
  "calculator_page",
  "calculator_homepage",
  "pete_ended",
  "instagram",
] as const;

/** Instagram bio landing (/ig). Offer is set on the server, not trusted from the client. */
export const INSTAGRAM_OFFER = "free-site-check";
/** Only the server (chat route) may use this one. */
export const INTERNAL_SOURCE = "mia_qualified";

const MAX_STR = 500;
const MAX_MSG = 2000;
const MAX_MESSAGES = 60;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape every string in a JSON-like value (recursively). */
export function deepEscape<T>(v: T): T {
  if (typeof v === "string") return escapeHtml(v) as unknown as T;
  if (Array.isArray(v)) return v.map(deepEscape) as unknown as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = deepEscape(val);
    return out as T;
  }
  return v;
}

const EMAIL_RE = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,24}$/;
export function isValidEmail(e: unknown): e is string {
  return typeof e === "string" && e.length <= 254 && EMAIL_RE.test(e) && !e.includes("..");
}

const clip = (v: unknown, n = MAX_STR): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, n) : undefined;

/** http(s) website only. A bare domain gets https. Returns undefined when it is not a real host. */
function cleanWebsite(v: unknown): string | undefined {
  const s = clip(v, 300);
  if (!s) return undefined;
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    if (u.username || u.password) return undefined;
    if (!u.hostname.includes(".")) return undefined;
    return u.toString().slice(0, 300);
  } catch {
    return undefined;
  }
}

const UTM_KEYS = ["source", "medium", "campaign", "content", "term"] as const;

/** Whitelisted UTM fields from the landing URL. Drop anything that looks like an email. */
function cleanUtm(v: unknown): Record<string, string> | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const s = clip(o[k], 80);
    if (s && !s.includes("@")) out[k] = s;
  }
  return Object.keys(out).length ? out : undefined;
}
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

/** Site-check score. Only a finite number is kept, clamped to 0–100. */
function cleanScore(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.min(100, Math.max(0, Math.round(v)));
}

export type CleanLead = Record<string, unknown> & {
  source: string;
  email?: string;
  conversation: { role: string; content: string }[];
};

/** Returns a cleaned, escaped lead or an error string. `internal` allows the server-only source. */
export function sanitizeLead(raw: unknown, internal: boolean): { ok: true; lead: CleanLead } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "Invalid body" };
  const r = raw as Record<string, unknown>;

  const source = typeof r.source === "string" && r.source ? r.source : "chat_widget";
  const allowed = (PUBLIC_SOURCES as readonly string[]).includes(source) || (internal && source === INTERNAL_SOURCE);
  if (!allowed) return { ok: false, error: "Invalid source" };

  let email: string | undefined;
  if (r.email !== undefined && r.email !== "") {
    if (!isValidEmail(r.email)) return { ok: false, error: "Invalid email" };
    email = r.email.trim().toLowerCase();
  }

  const conversation = (Array.isArray(r.conversation) ? r.conversation : [])
    .slice(-MAX_MESSAGES)
    .map((m) => {
      const o = (m ?? {}) as Record<string, unknown>;
      const role = o.role === "assistant" ? "assistant" : "user";
      return { role, content: typeof o.content === "string" ? o.content.slice(0, MAX_MSG) : "" };
    })
    .filter((m) => m.content.trim());

  const calc = (r.calculatorResults ?? {}) as Record<string, unknown>;
  const roi = (r.roiData ?? undefined) as Record<string, unknown> | undefined;

  const lead: CleanLead = {
    source,
    email,
    name: clip(r.name, 120),
    business: clip(r.business),
    industry: clip(r.industry, 120),
    team_size: clip(r.team_size, 120),
    pain_points: Array.isArray(r.pain_points)
      ? r.pain_points.map((p) => clip(p, 300)).filter(Boolean).slice(0, 10)
      : undefined,
    qualification_summary: clip(r.qualification_summary, 800),
    qualification_score: num(r.qualification_score),
    business_fit: typeof r.business_fit === "boolean" ? r.business_fit : undefined,
    pain_point_named: typeof r.pain_point_named === "boolean" ? r.pain_point_named : undefined,
    automation_potential: typeof r.automation_potential === "boolean" ? r.automation_potential : undefined,
    page: clip(r.page, 200),
    sendTranscript: r.sendTranscript === true,
    timestamp: new Date().toISOString(), // never trust the client clock
    calculatorResults: {
      teamMembers: num(calc.teamMembers),
      hoursPerWeek: num(calc.hoursPerWeek),
      hourlyCost: num(calc.hourlyCost),
      weeklyHours: num(calc.weeklyHours),
      annualHours: num(calc.annualHours),
      annualCost: num(calc.annualCost),
    },
    roiData: roi
      ? {
          team_members: num(roi.team_members),
          hours_per_person_per_week: num(roi.hours_per_person_per_week),
          hourly_rate: num(roi.hourly_rate),
          process_name: clip(roi.process_name, 120),
          weeklyHours: num(roi.weeklyHours),
          annualHours: num(roi.annualHours),
          annualCost: num(roi.annualCost),
          monthlyCost: num(roi.monthlyCost),
        }
      : undefined,
    conversation,
  };
  if (source === "instagram") {
    lead.offer = INSTAGRAM_OFFER;
    lead.website = cleanWebsite(r.website);
    lead.phone = clip(r.phone, 40);
    lead.problem = clip(r.problem, MAX_STR);
    const utm = cleanUtm(r.utm);
    if (utm) lead.utm = utm;
    const siteScore = cleanScore(r.siteScore);
    if (siteScore !== undefined) lead.siteScore = siteScore;
    const checkSummary = clip(r.checkSummary, 800);
    if (checkSummary) lead.checkSummary = checkSummary;
  }
  const { email: e, ...rest } = lead;
  const escaped = deepEscape(rest) as Record<string, unknown>;
  return { ok: true, lead: { ...(escaped as CleanLead), email: e } };
}

/** Constant-time check of the server-to-server token (CRON_SECRET). */
export function isInternalCall(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("x-internal-token") ?? "";
  if (!secret || !got) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// ── Rate limiting ────────────────────────────────────────────────────────────
const mem = new Map<string, { n: number; exp: number }>();
function memHit(key: string, ttlSec: number): number {
  const now = Date.now();
  const cur = mem.get(key);
  if (!cur || cur.exp < now) {
    mem.set(key, { n: 1, exp: now + ttlSec * 1000 });
    if (mem.size > 5000) for (const [k, v] of mem) if (v.exp < now) mem.delete(k);
    return 1;
  }
  cur.n++;
  return cur.n;
}
async function hit(key: string, ttlSec: number): Promise<number> {
  const redis = getRedis();
  if (redis) {
    try {
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, ttlSec);
      return n;
    } catch {
      /* fall through to memory */
    }
  }
  return memHit(key, ttlSec);
}

const IP_SHORT = 8; // lead posts per 10 minutes
const IP_DAY = 30;

/** True if this IP is over its lead-post limits. */
export async function ipLimited(ip: string): Promise<boolean> {
  const short = await hit(`lead-rl:10m:${ip}:${Math.floor(Date.now() / 600000)}`, 660);
  if (short > IP_SHORT) return true;
  const day = await hit(`lead-rl:day:${ip}:${new Date().toISOString().slice(0, 10)}`, 26 * 3600);
  return day > IP_DAY;
}

/**
 * Claim the right to send visitor-facing email (transcript, follow-up, nurture) to
 * this address. One claim per address per 24h, so nobody can use the form to
 * mail-bomb a third party under the Saabai name.
 */
export async function claimVisitorEmail(email: string): Promise<boolean> {
  return (await hit(`lead-mail:${email.toLowerCase()}:${new Date().toISOString().slice(0, 10)}`, 26 * 3600)) === 1;
}

// ── Alert gating and dedupe ──────────────────────────────────────────────────

/**
 * Sources that are a contact capture: they only make sense with a valid email.
 * Phone is optional extra detail on the Instagram form. It never replaces email.
 */
export const CONTACT_SOURCES = ["chat_widget", "calculator_page", "calculator_homepage", "instagram"] as const;

/**
 * Decide whether a sanitised lead is worth acting on at all. Empty or contactless
 * payloads (for example a QA probe POSTing `{}`) are rejected with a 400 so they
 * never reach the operator inbox as "New Lead via Mia: undefined".
 *
 * - chat_widget and calculator_*: a valid email is required.
 * - instagram (/ig free site check): email, name, business and a website.
 *   Phone is optional and is not a contact on its own.
 * - chat_closed, chat_ended, chat_ended_short, pete_ended: a valid email or at
 *   least one real visitor message.
 * - mia_qualified (server only): at least one visitor message or a qualification summary.
 */
export function leadAlertCheck(lead: CleanLead): { ok: true } | { ok: false; error: string } {
  const hasEmail = isValidEmail(lead.email);
  const visitorMsgs = lead.conversation.filter((m) => m.role === "user" && m.content.trim()).length;
  if (lead.source === "instagram") {
    if (!hasEmail) return { ok: false, error: "Email required" };
    if (typeof lead.name !== "string" || !lead.name) return { ok: false, error: "Name required" };
    if (typeof lead.business !== "string" || !lead.business) return { ok: false, error: "Business required" };
    if (typeof lead.website !== "string" || !lead.website) return { ok: false, error: "Website required" };
    return { ok: true };
  }
  if ((CONTACT_SOURCES as readonly string[]).includes(lead.source)) {
    return hasEmail ? { ok: true } : { ok: false, error: "Email required" };
  }
  if (lead.source === INTERNAL_SOURCE) {
    return visitorMsgs > 0 || !!lead.qualification_summary ? { ok: true } : { ok: false, error: "Empty lead" };
  }
  return hasEmail || visitorMsgs > 0 ? { ok: true } : { ok: false, error: "Empty lead" };
}

/** Stable fingerprint of a lead: source + email + transcript. No PII leaves this function. */
export function leadFingerprint(lead: CleanLead): string {
  const h = createHash("sha256");
  h.update(lead.source);
  h.update("\u0000");
  h.update(lead.email ?? "");
  h.update("\u0000");
  // Contact captures dedupe on the address alone, so a double click or retry with
  // one more message still counts as the same lead. Transcripts dedupe on content.
  if (!(CONTACT_SOURCES as readonly string[]).includes(lead.source) || !lead.email) {
    for (const m of lead.conversation) h.update(`${m.role}:${m.content}\u0000`);
  }
  return h.digest("hex").slice(0, 32);
}

export const ALERT_DEDUPE_SECONDS = 10 * 60;
const memOnce = new Map<string, number>();

/**
 * Claim the one operator alert for this lead fingerprint. Returns false when the
 * same lead already alerted within ALERT_DEDUPE_SECONDS. Redis SET NX EX, with an
 * in-memory fallback when Redis is not configured or errors.
 */
export async function claimLeadAlert(fingerprint: string, ttlSec = ALERT_DEDUPE_SECONDS): Promise<boolean> {
  const key = `lead-alert:${fingerprint}`;
  const redis = getRedis();
  if (redis) {
    try {
      const r = await redis.set(key, "1", { nx: true, ex: ttlSec });
      return r === "OK";
    } catch {
      /* fall through to memory */
    }
  }
  const now = Date.now();
  const exp = memOnce.get(key);
  if (exp && exp > now) return false;
  memOnce.set(key, now + ttlSec * 1000);
  if (memOnce.size > 5000) for (const [k, v] of memOnce) if (v < now) memOnce.delete(k);
  return true;
}

/** Log line with no names, emails or transcript text. */
export function safeLogLine(lead: { source: string; email?: string; conversation: unknown[]; qualification_score?: unknown }): string {
  return `[lead] source=${lead.source} hasEmail=${!!lead.email} msgs=${lead.conversation.length} score=${lead.qualification_score ?? "-"}`;
}
