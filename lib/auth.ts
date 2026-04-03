/**
 * Session management for the Saabai Client Portal.
 * Uses HMAC-SHA256 (Web Crypto API) — compatible with Edge Runtime.
 *
 * Token format: {clientId}.{expiry}.{b64url(hmac)}
 *
 * Required env vars:
 *   SAABAI_SESSION_SECRET — random 32+ char secret for signing sessions
 */

const COOKIE_NAME = "saabai_session";
const SESSION_DAYS = 7;

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function b64urlToBytes(s: string): ArrayBuffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const chars = atob(s);
  const bytes = new Uint8Array(chars.length);
  for (let i = 0; i < chars.length; i++) bytes[i] = chars.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

async function getKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  const secret = process.env.SAABAI_SESSION_SECRET ?? "change-this-in-production";
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

export async function createSessionToken(clientId: string): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 3600;
  const payload = `${clientId}.${expiry}`;
  const key = await getKey("sign");
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifySessionToken(
  token: string
): Promise<{ clientId: string } | null> {
  try {
    const lastDot = token.lastIndexOf(".");
    if (lastDot === -1) return null;

    const payload = token.slice(0, lastDot);
    const sigB64 = token.slice(lastDot + 1);

    const secondDot = payload.indexOf(".");
    if (secondDot === -1) return null;

    const clientId = payload.slice(0, secondDot);
    const expiry = parseInt(payload.slice(secondDot + 1), 10);

    if (!clientId || isNaN(expiry) || Date.now() / 1000 > expiry) return null;

    const key = await getKey("verify");
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlToBytes(sigB64),
      new TextEncoder().encode(payload)
    );

    return valid ? { clientId } : null;
  } catch {
    return null;
  }
}

export function sessionCookieHeader(token: string): string {
  const maxAge = SESSION_DAYS * 24 * 3600;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export { COOKIE_NAME };
