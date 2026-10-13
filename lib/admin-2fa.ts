/**
 * TOTP two-factor auth for admin accounts (Node runtime only).
 *
 * Redis keys (Upstash):
 *   admin2fa:<adminId>        { secret: <AES-GCM encrypted base32>, backup: [sha256], enabledAt, lastStep }
 *   admin2fa:setup:<adminId>  encrypted base32 secret awaiting confirmation (15 min TTL)
 *   admin2fa:fail:<adminId>   failed code attempts (10 min window)
 *
 * Break-glass: SAABAI_ADMIN_2FA_DISABLE=true skips the code step entirely.
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import * as OTPAuth from "otpauth";
import { getRedis } from "./redis";

export const PENDING_COOKIE = "saabai_2fa_pending";
export const TRUST_COOKIE = "saabai_2fa_trust";
const PENDING_SECONDS = 5 * 60;
const TRUST_SECONDS = 30 * 24 * 60 * 60;
const SETUP_TTL = 15 * 60;
const MAX_FAILS = 5;
const FAIL_WINDOW = 10 * 60;
const ISSUER = "Saabai Admin";

type Record2fa = { secret: string; backup: string[]; enabledAt: string; lastStep?: number };

function secretKey(): Buffer {
  const base = process.env.SAABAI_2FA_KEY || process.env.SAABAI_SESSION_SECRET;
  if (!base) throw new Error("SAABAI_SESSION_SECRET is not set");
  return createHash("sha256").update(`saabai-2fa:${base}`).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", secretKey(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(blob: string): string {
  const [iv, tag, enc] = blob.split(".").map((s) => Buffer.from(s, "base64url"));
  const d = createDecipheriv("aes-256-gcm", secretKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

export function newSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

function totp(secret: string, label = "admin"): OTPAuth.TOTP {
  return new OTPAuth.TOTP({ issuer: ISSUER, label, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
}

export function otpauthUri(secret: string, label: string): string {
  return totp(secret, label).toString();
}

/** Returns the matched time step, or null. Accepts one step of drift either way. */
export function verifyTotpStep(secret: string, code: string, now = Date.now()): number | null {
  const token = (code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) return null;
  const delta = totp(secret).validate({ token, timestamp: now, window: 1 });
  if (delta === null) return null;
  return Math.floor(now / 1000 / 30) + delta;
}

export function generateCode(secret: string, now = Date.now()): string {
  return totp(secret).generate({ timestamp: now });
}

const hashBackup = (c: string) => createHash("sha256").update(c.replace(/[\s-]/g, "").toLowerCase()).digest("hex");

export function newBackupCodes(n = 8): string[] {
  return Array.from({ length: n }, () => {
    const s = randomBytes(5).toString("hex");
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  });
}

export function twoFactorDisabledByEnv(): boolean {
  return process.env.SAABAI_ADMIN_2FA_DISABLE === "true";
}

async function getRecord(adminId: string): Promise<Record2fa | null> {
  const r = getRedis();
  if (!r) return null;
  const v = await r.get<Record2fa | string>(`admin2fa:${adminId}`);
  if (!v) return null;
  return typeof v === "string" ? (JSON.parse(v) as Record2fa) : v;
}

export async function isTwoFactorEnabled(adminId: string): Promise<boolean> {
  if (twoFactorDisabledByEnv()) return false;
  return !!(await getRecord(adminId));
}

export async function twoFactorStatus(adminId: string): Promise<{ enabled: boolean; enabledAt?: string; backupLeft?: number; envDisabled: boolean }> {
  const rec = await getRecord(adminId);
  return { enabled: !!rec, enabledAt: rec?.enabledAt, backupLeft: rec?.backup.length, envDisabled: twoFactorDisabledByEnv() };
}

/** Start (or restart) enrolment: store a fresh encrypted secret for 15 minutes. */
export async function startSetup(adminId: string): Promise<string> {
  const r = getRedis();
  if (!r) throw new Error("Redis unavailable");
  const secret = newSecret();
  await r.set(`admin2fa:setup:${adminId}`, encrypt(secret), { ex: SETUP_TTL });
  return secret;
}

/** Confirm enrolment with a code from the app. Returns the backup codes (shown once) or null. */
export async function confirmSetup(adminId: string, code: string): Promise<string[] | null> {
  const r = getRedis();
  if (!r) return null;
  const blob = await r.get<string>(`admin2fa:setup:${adminId}`);
  if (!blob) return null;
  const secret = decrypt(blob);
  const step = verifyTotpStep(secret, code);
  if (step === null) return null;
  const codes = newBackupCodes();
  const rec: Record2fa = { secret: blob, backup: codes.map(hashBackup), enabledAt: new Date().toISOString(), lastStep: step };
  await r.set(`admin2fa:${adminId}`, JSON.stringify(rec));
  await r.del(`admin2fa:setup:${adminId}`);
  return codes;
}

export async function disableTwoFactor(adminId: string): Promise<void> {
  const r = getRedis();
  if (r) await r.del(`admin2fa:${adminId}`);
}

export type CodeResult = "ok" | "invalid" | "locked";

/** Check a TOTP or backup code at login. Rate limited; TOTP codes can't be replayed. */
export async function checkLoginCode(adminId: string, code: string): Promise<CodeResult> {
  const r = getRedis();
  const rec = await getRecord(adminId);
  if (!r || !rec) return "invalid";
  const failKey = `admin2fa:fail:${adminId}`;
  const fails = (await r.get<number>(failKey)) ?? 0;
  if (fails >= MAX_FAILS) return "locked";

  let ok = false;
  const step = verifyTotpStep(decrypt(rec.secret), code);
  if (step !== null && step > (rec.lastStep ?? -1)) {
    rec.lastStep = step;
    ok = true;
  } else if (step === null) {
    const h = hashBackup(code || "");
    const i = rec.backup.findIndex((b) => b.length === h.length && timingSafeEqual(Buffer.from(b), Buffer.from(h)));
    if (i >= 0) {
      rec.backup.splice(i, 1);
      ok = true;
    }
  }
  if (!ok) {
    const n = await r.incr(failKey);
    if (n === 1) await r.expire(failKey, FAIL_WINDOW);
    return n >= MAX_FAILS ? "locked" : "invalid";
  }
  await r.set(`admin2fa:${adminId}`, JSON.stringify(rec));
  await r.del(failKey);
  return "ok";
}

// ── Pending cookie: password passed, code still needed ──────────────────
function sign(payload: string): string {
  return createHmac("sha256", secretKey()).update(`pending:${payload}`).digest("base64url");
}

export function createPendingToken(clientId: string, redirect: string): string {
  const exp = Math.floor(Date.now() / 1000) + PENDING_SECONDS;
  const payload = [Buffer.from(clientId).toString("base64url"), exp, Buffer.from(redirect).toString("base64url")].join(".");
  return `${payload}.${sign(payload)}`;
}

export function verifyPendingToken(token: string | undefined): { clientId: string; redirect: string } | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const sig = Buffer.from(token.slice(i + 1));
  const want = Buffer.from(sign(payload));
  if (sig.length !== want.length || !timingSafeEqual(sig, want)) return null;
  const [id, exp, red] = payload.split(".");
  if (!id || Number(exp) < Date.now() / 1000) return null;
  return { clientId: Buffer.from(id, "base64url").toString(), redirect: Buffer.from(red ?? "", "base64url").toString() };
}

export function pendingCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${PENDING_COOKIE}=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${PENDING_SECONDS}`;
}

export function clearPendingCookieHeader(): string {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${PENDING_COOKIE}=; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=0`;
}


// ── Trusted device: skip code step for 30 days on this browser ───────────
function trustSign(payload: string): string {
  return createHmac("sha256", secretKey()).update(`trust:${payload}`).digest("base64url");
}

export function createTrustToken(clientId: string): string {
  const exp = Math.floor(Date.now() / 1000) + TRUST_SECONDS;
  const payload = `${Buffer.from(clientId).toString("base64url")}.${exp}`;
  return `${payload}.${trustSign(payload)}`;
}

export function verifyTrustToken(token: string | undefined, clientId: string): boolean {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const sig = Buffer.from(token.slice(i + 1));
  const want = Buffer.from(trustSign(payload));
  if (sig.length !== want.length || !timingSafeEqual(sig, want)) return false;
  const [id, exp] = payload.split(".");
  if (!id || Number(exp) < Date.now() / 1000) return false;
  const decoded = Buffer.from(id, "base64url").toString();
  const a = Buffer.from(decoded);
  const b = Buffer.from(clientId);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return true;
}

export function trustCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${TRUST_COOKIE}=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${TRUST_SECONDS}`;
}

export function clearTrustCookieHeader(): string {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${TRUST_COOKIE}=; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=0`;
}
