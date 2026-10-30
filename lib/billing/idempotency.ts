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
 * Key for one Stripe create call, stable for one browser submission (requestId).
 * There is no derived fallback: money creates must send a requestId (routes return 400 without one),
 * so a real second sale with the same details always gets a fresh key and is never replayed.
 * The payload hash is folded in so a reused requestId with different details gets a new key
 * instead of a Stripe idempotency error.
 */
export function idemKey(op: string, requestId: string, payload: unknown): string {
  const h = createHash("sha256").update(stableJson(payload)).digest("hex").slice(0, 12);
  return `saabai:${op}:${requestId}:${h}`.slice(0, 255);
}

export const MISSING_REQUEST_ID = "Missing or invalid requestId. Reload the page and try again.";

/** Money creates must carry a per-submission requestId. Returns it, or a 400 body to send back. */
export function requireRequestId(body: unknown): { requestId: string } | { error: string; status: 400 } {
  const requestId = cleanRequestId((body as { requestId?: unknown } | null)?.requestId);
  return requestId ? { requestId } : { error: MISSING_REQUEST_ID, status: 400 };
}

/** Step key for a multi-call action (customer, invoice, invoice item ...), all sharing one base. */
export function stepKey(base: string, step: string): string {
  return `${base}:${step}`.slice(0, 255);
}

/** Price fingerprint of a catalogue product, so an edited price never shares a key with the old one. */
export function priceSignature(p: { updatedAt?: string; oneTimeAmount?: number; recurringAmount?: number; setupFee?: number; interval?: string; discounts?: unknown; discount?: unknown }): string {
  return createHash("sha256").update(stableJson({ u: p.updatedAt, o: p.oneTimeAmount, r: p.recurringAmount, s: p.setupFee, i: p.interval, d: p.discounts, l: p.discount })).digest("hex").slice(0, 12);
}

export { stableJson };
