/**
 * Who may run Lex Doc review and "send for review", and the per-firm daily cap.
 *
 * Allowed:
 *   - full Saabai admins (uncapped)
 *   - law-firm users signed in to the client portal (portal_session) who are known Lex clients
 *   - Saabai directory users with the "lex" product
 * Everyone else (other client logins, restricted staff, legacy dashboard cookie): 403.
 *
 * Cap: LEX_REVIEW_DAILY_CAP (default 20) document reviews per firm per day, Brisbane time.
 * A per-firm override lives in Redis hash lex:review:caps (set via /api/admin/lex-review-caps).
 * Send-for-review has its own counter with the same cap. A review that fails is refunded.
 * A firm is the user's email domain, or the full email for free-mail addresses.
 */
import { getRedis } from "./redis";
import { verifySessionToken, COOKIE_NAME, resolveStaff } from "./auth";
import { verifySession } from "./portal-session";
import { isKnownLexPortalClient } from "./lex-portal-access";

export const DEFAULT_REVIEW_DAILY_CAP = 20;
export const CAPS_KEY = "lex:review:caps";
export type ReviewAction = "review" | "submit";

export type LexReviewActor =
  | { kind: "admin"; id: string }
  | { kind: "firm"; email: string; firm: string };

const FREE_MAIL = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "msn.com", "yahoo.com", "yahoo.com.au",
  "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com", "pm.me", "bigpond.com", "bigpond.net.au",
  "optusnet.com.au", "aol.com", "gmx.com", "fastmail.com",
]);

export function firmKeyForEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  const domain = email.split("@")[1] ?? "";
  return !domain || FREE_MAIL.has(domain) ? email : domain;
}

function cookie(req: Request, name: string): string | undefined {
  return (req.headers.get("cookie") ?? "")
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(name + "="))
    ?.slice(name.length + 1);
}

/** Resolves the caller from the signed cookies. Never trusts the request body. */
export async function resolveReviewActor(req: Request): Promise<LexReviewActor | null> {
  const token = cookie(req, COOKIE_NAME);
  if (token) {
    const s = await verifySessionToken(token);
    if (s?.clientId) {
      const staff = await resolveStaff(s.clientId);
      if (staff?.grant.role === "admin") return { kind: "admin", id: staff.id };
      if (!staff) {
        try {
          const { listDirectoryUsers } = await import("./user-directory");
          const u = (await listDirectoryUsers()).find((x) => x.id === s.clientId);
          if (u?.email && u.products?.includes("lex")) return { kind: "firm", email: u.email.toLowerCase(), firm: firmKeyForEmail(u.email) };
        } catch { /* fall through to the portal cookie */ }
      }
    }
  }
  const portal = cookie(req, "portal_session");
  if (portal) {
    const p = verifySession(portal);
    if (p?.email && (await isKnownLexPortalClient(p.email))) {
      return { kind: "firm", email: p.email.toLowerCase(), firm: firmKeyForEmail(p.email) };
    }
  }
  return null;
}

/** YYYY-MM-DD in Brisbane (no daylight saving, so a day is always 24 hours). */
export function brisbaneDay(now = new Date()): string {
  return new Date(now.getTime() + 10 * 3600 * 1000).toISOString().slice(0, 10);
}

export function defaultCap(): number {
  const n = parseInt((process.env.LEX_REVIEW_DAILY_CAP ?? "").trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_REVIEW_DAILY_CAP;
}

const usedKey = (action: ReviewAction, firm: string, day: string) => `lex:review:${action === "review" ? "used" : "submits"}:${firm}:${day}`;

export async function capForFirm(firm: string): Promise<number> {
  const redis = getRedis();
  if (redis) {
    const v = await redis.hget<number | string>(CAPS_KEY, firm);
    const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return defaultCap();
}

export function limitMessage(action: ReviewAction, cap: number): string {
  const what = action === "review" ? "document reviews" : "send for review requests";
  return cap === 0
    ? `Doc review is turned off for your firm. Contact Saabai to turn it on.`
    : `Your firm has used all ${cap} ${what} for today. The limit resets at midnight Brisbane time. Contact Saabai if you need more.`;
}

export type Gate =
  | { ok: true; actor: LexReviewActor; refund: () => Promise<void> }
  | { ok: false; response: Response };

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Checks who is calling and takes one unit of today's allowance. Call refund() if the work fails. */
export async function gateReview(req: Request, action: ReviewAction, now = new Date()): Promise<Gate> {
  const actor = await resolveReviewActor(req);
  if (!actor) return { ok: false, response: json(403, { error: "Forbidden", message: "Doc review is available to Lex firm accounts. Sign in with your firm login." }) };
  if (actor.kind === "admin") return { ok: true, actor, refund: async () => {} };

  const redis = getRedis();
  if (!redis) return { ok: false, response: json(503, { error: "review_unavailable" }) };
  const cap = await capForFirm(actor.firm);
  const key = usedKey(action, actor.firm, brisbaneDay(now));
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 2 * 86400);
  if (n > cap) {
    await redis.incrby(key, -1);
    const message = limitMessage(action, cap);
    return { ok: false, response: json(429, { error: message, message, limit: cap }) };
  }
  return { ok: true, actor, refund: async () => { try { await redis.incrby(key, -1); } catch { /* best effort */ } } };
}

/** Today's usage for the admin view. */
export async function usageFor(firm: string, now = new Date()): Promise<{ reviews: number; submits: number; cap: number }> {
  const redis = getRedis();
  const day = brisbaneDay(now);
  const get = async (a: ReviewAction) => Number((await redis?.get<number | string>(usedKey(a, firm, day))) ?? 0) || 0;
  return { reviews: await get("review"), submits: await get("submit"), cap: await capForFirm(firm) };
}
