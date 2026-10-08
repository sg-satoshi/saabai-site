/**
 * Single-use "set your password" / "reset your password" links for directory
 * (Redis) accounts.
 *
 * - 256-bit crypto-random token; only its SHA-256 hash is stored in Redis.
 * - Consumed atomically with GETDEL, so a link works exactly once.
 * - Reset links expire after 1 hour; welcome (first password) links after 72 hours.
 * - Links always use the fixed site base URL, never the request Host header.
 */
import { createHash, randomBytes } from "crypto";
import { getRedis } from "./redis";

export type PasswordTokenPurpose = "reset" | "welcome";

export const RESET_TTL_SECONDS = 60 * 60;
export const WELCOME_TTL_SECONDS = 72 * 60 * 60;

const TOKEN_PREFIX = "saabai:pwtoken:";
const RATE_PREFIX = "saabai:pwreset:rate:";
const MAX_RESETS_PER_WINDOW = 5;
const RATE_WINDOW_SECONDS = 15 * 60;

interface PasswordTokenRecord {
  email: string;
  purpose: PasswordTokenPurpose;
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || "https://www.saabai.ai").replace(/\/+$/, "");
}

/** Create a token for this email. Returns the raw token (only ever sent by email). */
export async function createPasswordToken(email: string, purpose: PasswordTokenPurpose): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const token = randomBytes(32).toString("base64url");
  const record: PasswordTokenRecord = { email: email.trim().toLowerCase(), purpose };
  await redis.set(`${TOKEN_PREFIX}${sha256Hex(token)}`, JSON.stringify(record), {
    ex: purpose === "welcome" ? WELCOME_TTL_SECONDS : RESET_TTL_SECONDS,
  });
  return token;
}

/** Atomically consume a token. Returns null when missing, expired or already used. */
export async function consumePasswordToken(token: unknown): Promise<PasswordTokenRecord | null> {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) return null;
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.getdel(`${TOKEN_PREFIX}${sha256Hex(token)}`);
  if (!raw) return null;
  let rec: Partial<PasswordTokenRecord> | null = null;
  if (typeof raw === "string") {
    try { rec = JSON.parse(raw); } catch { rec = null; }
  } else {
    rec = raw as Partial<PasswordTokenRecord>;
  }
  if (!rec?.email || (rec.purpose !== "reset" && rec.purpose !== "welcome")) return null;
  return { email: rec.email, purpose: rec.purpose };
}

export function setPasswordUrl(token: string, purpose: PasswordTokenPurpose): string {
  const q = new URLSearchParams({ token });
  if (purpose === "welcome") q.set("welcome", "1");
  return `${siteBaseUrl()}/reset-password?${q.toString()}`;
}

/** Per-email throttle for reset requests: max 5 per 15 minutes. */
export async function underResetRateLimit(email: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const key = `${RATE_PREFIX}${sha256Hex(email.trim().toLowerCase())}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, RATE_WINDOW_SECONDS);
  return n <= MAX_RESETS_PER_WINDOW;
}
