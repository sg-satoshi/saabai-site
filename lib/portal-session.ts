/**
 * Signed session tokens for the Saabai Client Portal.
 *
 * Sessions are self-contained HMAC-SHA256 signed payloads stored in a cookie.
 * No Redis lookup required for validation — the signature IS the proof.
 *
 * Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
 */

import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.PORTAL_SESSION_SECRET ?? "saabai-portal-dev-secret-change-in-prod";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function signSession(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + SESSION_TTL_MS })
  ).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(token: string): { email: string } | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;

  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = createHmac("sha256", SECRET).update(payload).digest("base64url");

  try {
    const a = Buffer.from(sig, "base64url");
    const b = Buffer.from(expected, "base64url");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      email?: string;
      exp?: number;
    };
    if (!data.email || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}
