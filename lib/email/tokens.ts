/** Signed confirm and unsubscribe tokens. Tenant id is part of the payload. */
import { createHmac, timingSafeEqual } from "node:crypto";
import { CONFIRM_TTL_SECONDS } from "./constants";

export type TokenKind = "unsub" | "confirm";

export type EmailToken = {
  k: TokenKind;
  /** Tenant slug. */
  t: string;
  /** Lower-case email. */
  e: string;
  iat: number;
};

const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;

export function signEmailToken(payload: EmailToken, secret: string): string {
  if (!secret) throw new Error("Missing token secret");
  const body = Buffer.from(JSON.stringify({
    k: payload.k,
    t: payload.t,
    e: payload.e.trim().toLowerCase(),
    iat: payload.iat,
  })).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readEmailToken(token: string, secret: string, kind: TokenKind, nowSec = Math.floor(Date.now() / 1000)): EmailToken | null {
  if (!secret || !token || token.length > 2000) return null;
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let parsed: Partial<EmailToken>;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<EmailToken>;
  } catch {
    return null;
  }
  if (parsed.k !== kind || typeof parsed.t !== "string" || typeof parsed.e !== "string") return null;
  if (!/^[a-z0-9][a-z0-9-]{0,30}$/.test(parsed.t)) return null;
  const email = parsed.e.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return null;
  const iat = Number(parsed.iat);
  if (!Number.isFinite(iat)) return null;
  if (kind === "confirm" && (nowSec < iat - 120 || nowSec - iat > CONFIRM_TTL_SECONDS)) return null;
  return { k: kind, t: parsed.t, e: email, iat };
}
