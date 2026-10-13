/**
 * Optional 6-digit email codes for client-portal sign-in (alongside magic links).
 * Codes are hashed at rest, single-use, expire in 15 minutes, rate-limited.
 */
import { createHash, randomInt } from "crypto";
import { getRedis } from "./redis";

const CODE_TTL = 15 * 60;
const PREFIX = "portal:email-code:";
const RATE = "portal:email-code:rate:";

function hashCode(email: string, code: string): string {
  return createHash("sha256").update(`${email.trim().toLowerCase()}:${code.trim()}`).digest("hex");
}

export function generateEmailCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function storeEmailCode(email: string, code: string, meta: { clientId: string; redirect: string }): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const key = `${PREFIX}${email.trim().toLowerCase()}`;
  await redis.set(key, JSON.stringify({ hash: hashCode(email, code), ...meta }), { ex: CODE_TTL });
  return true;
}

export async function consumeEmailCode(email: string, code: string): Promise<{ clientId: string; redirect: string } | null> {
  const redis = getRedis();
  if (!redis) return null;
  const normalised = email.trim().toLowerCase();
  const key = `${PREFIX}${normalised}`;
  const raw = await redis.getdel(key);
  if (!raw) return null;
  let rec: { hash?: string; clientId?: string; redirect?: string } | null = null;
  try {
    rec = typeof raw === "string" ? JSON.parse(raw) : (raw as unknown as typeof rec);
  } catch {
    return null;
  }
  if (!rec?.hash || !rec.clientId) return null;
  const want = Buffer.from(rec.hash);
  const got = Buffer.from(hashCode(normalised, code));
  if (want.length !== got.length) return null;
  let ok = true;
  for (let i = 0; i < want.length; i++) ok = ok && want[i] === got[i];
  if (!ok) return null;
  return { clientId: rec.clientId, redirect: rec.redirect || "/client-portal" };
}

export async function underCodeRateLimit(email: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const key = `${RATE}${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, CODE_TTL);
  return n <= 5;
}

export { CODE_TTL as EMAIL_CODE_TTL_SECONDS };
