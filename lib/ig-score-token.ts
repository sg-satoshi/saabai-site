/**
 * HMAC for the Instagram site-check score.
 * Uses a secret already in the environment. Does not add or change env vars.
 * Preview and production both have PORTAL_SESSION_SECRET; the other two are
 * the same fallbacks the rest of the app already uses for HMAC.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_AGE_MS = 30 * 60 * 1000;
const SKEW_MS = 60 * 1000;

export function igScoreSecret(): string | null {
  const s = process.env.PORTAL_SESSION_SECRET || process.env.SAABAI_SESSION_SECRET || process.env.CRON_SECRET || "";
  return s.length > 0 ? s : null;
}

/** Same http(s) shape the lead cleaner stores, so the signed URL matches the lead. */
export function canonicalScoreUrl(raw: string): string | null {
  const s = raw.trim().slice(0, 300);
  if (!s) return null;
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    if (!u.hostname.includes(".")) return null;
    u.hash = "";
    return u.toString().slice(0, 300);
  } catch {
    return null;
  }
}

type Claim = { u: string; s: number | null; t: number };

/** Sign the checked URL, the score (null when unread), and the time it was signed. */
export function signIgScore(url: string, score: number | null, now = Date.now()): string | null {
  const secret = igScoreSecret();
  const u = canonicalScoreUrl(url);
  if (!secret || !u) return null;
  const s = typeof score === "number" && Number.isFinite(score) ? Math.min(100, Math.max(0, Math.round(score))) : null;
  const body = Buffer.from(JSON.stringify({ u, s, t: now })).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** The signed score, or ok:false when the token, URL, or time does not match. */
export function readIgScore(token: string, website: string, now = Date.now()): { ok: true; score: number | null } | { ok: false } {
  const secret = igScoreSecret();
  const site = canonicalScoreUrl(website);
  if (!secret || !site || token.length > 800) return { ok: false };
  const dot = token.indexOf(".");
  if (dot <= 0) return { ok: false };
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig || sig.includes(".")) return { ok: false };
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  let claim: Claim;
  try {
    claim = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Claim;
  } catch {
    return { ok: false };
  }
  if (claim.u !== site) return { ok: false };
  if (typeof claim.t !== "number" || claim.t > now + SKEW_MS || now - claim.t > MAX_AGE_MS) return { ok: false };
  if (claim.s === null) return { ok: true, score: null };
  if (typeof claim.s !== "number" || !Number.isInteger(claim.s) || claim.s < 0 || claim.s > 100) return { ok: false };
  return { ok: true, score: claim.s };
}
