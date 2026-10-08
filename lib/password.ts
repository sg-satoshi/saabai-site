/**
 * Password hashing for Saabai accounts.
 *
 * Uses Node's built-in scrypt (no native dependency, builds anywhere) with a
 * random 16-byte salt per password. Stored format:
 *
 *   scrypt:<N>:<r>:<p>:<saltB64>:<hashB64>
 *
 * (Colons rather than "$" so the value survives .env files, where "$" triggers
 * variable expansion.)
 *
 * Legacy accounts still have their password stored as plain text. verifyPassword()
 * accepts both, compares in constant time, and tells the caller when the stored
 * value should be upgraded (needsRehash) so login can transparently re-hash it.
 *
 * Node runtime only (scrypt is not available on the Edge runtime).
 * Never log the plaintext or the stored value.
 */

import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash, type ScryptOptions } from "crypto";

const PREFIX = "scrypt";
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;
// scrypt needs ~128*N*r bytes; give it headroom so higher N values still work.
const MAXMEM = 64 * 1024 * 1024;

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export function isHashedPassword(stored: unknown): boolean {
  return typeof stored === "string" && stored.startsWith(`${PREFIX}:`);
}

export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("Password must be a non-empty string");
  }
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return [PREFIX, N, R, P, salt.toString("base64"), key.toString("base64")].join(":");
}

function sha256(s: string): Buffer {
  return createHash("sha256").update(s, "utf8").digest();
}

/** Constant-time string comparison (hashes both sides so lengths always match). */
export function safeEqualStrings(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

export interface VerifyResult {
  ok: boolean;
  /** True when the password matched but the stored value is legacy plaintext or uses old parameters. */
  needsRehash: boolean;
}

// A real hash of a random value, used so "no such user" takes as long as "wrong password".
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHash) dummyHash = hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}

/**
 * Verify a password against a stored value (scrypt hash or legacy plaintext).
 * Pass `undefined`/empty stored to burn equivalent time and return ok:false.
 */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<VerifyResult> {
  if (typeof password !== "string" || password.length === 0) {
    return { ok: false, needsRehash: false };
  }
  if (!stored) {
    await verifyHashed(password, await getDummyHash()).catch(() => false);
    return { ok: false, needsRehash: false };
  }
  if (isHashedPassword(stored)) {
    const parsed = parseHash(stored);
    if (!parsed) return { ok: false, needsRehash: false };
    const ok = await verifyHashed(password, stored).catch(() => false);
    const outdated = parsed.N !== N || parsed.r !== R || parsed.p !== P || parsed.key.length !== KEYLEN;
    return { ok, needsRehash: ok && outdated };
  }
  // Legacy plaintext value. Compare in constant time; upgrade on success.
  const ok = safeEqualStrings(password, stored);
  return { ok, needsRehash: ok };
}

function parseHash(stored: string): { N: number; r: number; p: number; salt: Buffer; key: Buffer } | null {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== PREFIX) return null;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (![n, r, p].every((v) => Number.isInteger(v) && v > 0)) return null;
  // Sanity limits so a corrupted value can't make us burn huge CPU/memory.
  if (n > 1 << 20 || r > 32 || p > 16) return null;
  const salt = Buffer.from(parts[4], "base64");
  const key = Buffer.from(parts[5], "base64");
  if (salt.length === 0 || key.length === 0) return null;
  return { N: n, r, p, salt, key };
}

async function verifyHashed(password: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed) return false;
  const candidate = await scrypt(password.normalize("NFKC"), parsed.salt, parsed.key.length, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
    maxmem: MAXMEM,
  });
  return candidate.length === parsed.key.length && timingSafeEqual(candidate, parsed.key);
}

/** Random password for accounts created on someone's behalf. Never emailed or logged. */
export function generateRandomPassword(): string {
  return randomBytes(24).toString("base64url");
}

/** Remove the password field from any user-like object before it leaves the server. */
export function withoutPassword<T extends { password?: unknown }>(user: T): Omit<T, "password"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _pw, ...rest } = user;
  return rest;
}

/** Minimum rules for a new password, shared by change/reset/set-password flows. */
export function validateNewPassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 256) return "Password is too long.";
  return null;
}
