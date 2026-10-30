/**
 * Stripe idempotency keys for admin money actions. A retry or double click with the same
 * requestId (minted once per form submission in the browser) maps to the same key, so Stripe
 * returns the first result instead of creating a second charge, invoice or subscription.
 */
import { createHash } from "node:crypto";

const REQ_ID_RE = /^[A-Za-z0-9_-]{8,80}$/;

export function cleanRequestId(v: unknown): string | null {
  return typeof v === "string" && REQ_ID_RE.test(v) ? v : null;
}

function stableJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stableJson(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

/**
 * Key for one Stripe create call. With a requestId the key is stable for that submission.
 * Without one it falls back to a hash of the payload in a 10 minute bucket, which still
 * blocks an accidental double submit of identical details.
 */
export function idemKey(op: string, requestId: string | null, payload: unknown, now = Date.now()): string {
  const base = requestId ?? `p${Math.floor(now / 600_000)}:${createHash("sha256").update(stableJson(payload)).digest("hex").slice(0, 24)}`;
  return `saabai:${op}:${base}`.slice(0, 255);
}

/** Step key for a multi-call action (customer, invoice, invoice item ...), all sharing one base. */
export function stepKey(base: string, step: string): string {
  return `${base}:${step}`.slice(0, 255);
}

export { stableJson };
