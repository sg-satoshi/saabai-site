/**
 * "Chief" read-only admin session (the AI overseer's QA login).
 *
 * Separate from the real admin session: its own cookie, its own secret, never an admin.
 * - Enabled only while env CHIEF_ADMIN_PASSWORD is set. Delete or rotate it and login stops and every
 *   issued session dies at once (the signing key is derived from the password).
 * - Scope is a hard allowlist: GET/HEAD on the split-testing admin page and its read APIs. Everything else
 *   (billing, Stripe, payments, orders, customers, exports, users, writes of any kind) is refused in proxy.ts.
 * - Only honoured on saabai.ai hosts, never on customer domains.
 * - Edge safe (Web Crypto). Audit log: Redis list `chief:audit` (newest first, capped).
 */
export const CHIEF_COOKIE = "chief_session";
export const CHIEF_TTL_SECONDS = 2 * 60 * 60;

export const CHIEF_PAGES = ["/saabai-admin/experiments"];
export const CHIEF_READ_APIS = ["/api/admin/experiments"];

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

export function chiefEnabled(): boolean {
  return !!process.env.CHIEF_ADMIN_PASSWORD && process.env.CHIEF_ADMIN_PASSWORD.length >= 24 && !!process.env.SAABAI_SESSION_SECRET;
}

/** Only the master domain (and local dev / previews of it). Never customer domains. */
export function chiefHostOk(hostname: string): boolean {
  return hostname === "saabai.ai" || hostname === "www.saabai.ai" || hostname === "localhost" || hostname === "127.0.0.1";
}

async function sign(payload: string): Promise<string> {
  const material = `chief-v1:${process.env.SAABAI_SESSION_SECRET}:${process.env.CHIEF_ADMIN_PASSWORD}`;
  const key = await crypto.subtle.importKey("raw", enc.encode(material), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export function checkChiefPassword(pw: string): boolean {
  if (!chiefEnabled()) return false;
  const real = process.env.CHIEF_ADMIN_PASSWORD as string;
  // Pad so length differences do not short-circuit.
  const a = pw.padEnd(256, "\0").slice(0, 256);
  const b = real.padEnd(256, "\0").slice(0, 256);
  return safeEqual(a, b) && pw.length === real.length;
}

export async function createChiefToken(now = Date.now()): Promise<string> {
  const exp = Math.floor(now / 1000) + CHIEF_TTL_SECONDS;
  const payload = `chief.${exp}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifyChiefToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  try {
    if (!token || !chiefEnabled()) return false;
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== "chief") return false;
    const exp = parseInt(parts[1], 10);
    if (!exp || now / 1000 > exp) return false;
    return safeEqual(parts[2], await sign(`chief.${exp}`));
  } catch {
    return false;
  }
}

/** The one place scope is decided. Read only: GET/HEAD on the allowlists, nothing else. */
export function chiefAllowed(method: string, pathname: string): boolean {
  if (method !== "GET" && method !== "HEAD") return false;
  const m = (p: string) => pathname === p || pathname.startsWith(p + "/");
  return CHIEF_PAGES.some(m) || CHIEF_READ_APIS.some(m);
}

export function chiefCookieHeader(token: string, secure: boolean): string {
  return `${CHIEF_COOKIE}=${token}; Path=/; HttpOnly;${secure ? " Secure;" : ""} SameSite=Strict; Max-Age=${CHIEF_TTL_SECONDS}`;
}

type RedisLike = { lpush: (k: string, v: string) => Promise<unknown>; ltrim: (k: string, a: number, b: number) => Promise<unknown> };

export async function chiefAudit(redis: RedisLike | null | undefined, event: string, detail: Record<string, string | number | boolean | undefined> = {}): Promise<void> {
  try {
    if (!redis) return;
    await redis.lpush("chief:audit", JSON.stringify({ t: new Date().toISOString(), event, ...detail }));
    await redis.ltrim("chief:audit", 0, 999);
  } catch { /* auditing never blocks */ }
}
