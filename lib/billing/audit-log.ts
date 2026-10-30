/**
 * Audit log of admin money actions (Redis list, newest first, capped). Never stores card data.
 */
import { getRedis } from "../redis";

export const MONEY_AUDIT_KEY = "saabai:billing:audit";
const MAX = 2000;

export interface MoneyAuditEntry {
  at: string;
  actor: string;
  action: string;
  amountCents?: number;
  currency?: string;
  clientId?: string;
  clientEmail?: string;
  stripeIds?: Record<string, string>;
  /** Catalogue product or Stripe price the action used (Phase B product picker). */
  productId?: string;
  priceId?: string;
  ok: boolean;
  note?: string;
}

const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g;

export function buildAuditEntry(e: Omit<MoneyAuditEntry, "at"> & { at?: string }): MoneyAuditEntry {
  const ids: Record<string, string> = {};
  for (const [k, v] of Object.entries(e.stripeIds || {})) if (typeof v === "string" && v) ids[k] = v.slice(0, 120);
  return {
    at: e.at || new Date().toISOString(),
    actor: String(e.actor || "unknown").slice(0, 120),
    action: String(e.action).slice(0, 80),
    amountCents: typeof e.amountCents === "number" && Number.isFinite(e.amountCents) ? Math.round(e.amountCents) : undefined,
    currency: e.currency,
    clientId: e.clientId,
    clientEmail: e.clientEmail?.slice(0, 200),
    stripeIds: Object.keys(ids).length ? ids : undefined,
    productId: e.productId?.slice(0, 120),
    priceId: e.priceId?.slice(0, 120),
    ok: !!e.ok,
    note: e.note ? e.note.replace(CARD_RE, "[redacted]").slice(0, 300) : undefined,
  };
}

export async function logMoneyAction(e: Omit<MoneyAuditEntry, "at"> & { at?: string }): Promise<MoneyAuditEntry> {
  const entry = buildAuditEntry(e);
  try {
    const r = getRedis();
    if (r) {
      await r.lpush(MONEY_AUDIT_KEY, JSON.stringify(entry));
      await r.ltrim(MONEY_AUDIT_KEY, 0, MAX - 1);
    }
  } catch (err) {
    console.error("[money-audit] write failed", err instanceof Error ? err.message : String(err));
  }
  return entry;
}

export async function listMoneyAudit(limit = 200): Promise<MoneyAuditEntry[]> {
  const r = getRedis();
  if (!r) return [];
  const raw = (await r.lrange(MONEY_AUDIT_KEY, 0, Math.max(0, Math.min(limit, MAX) - 1))) as unknown[];
  return raw.map((x) => (typeof x === "string" ? JSON.parse(x) : x) as MoneyAuditEntry);
}
