/**
 * contact_events: one append-only timeline per contact (contact_id = lower-cased email).
 * Neon table when DATABASE_URL is set, Redis otherwise. Writes never throw to callers.
 */
import { getRedis } from "../redis";
import { getSql, newId, getDoc, putDoc, type Doc } from "./store";
import type { Attribution } from "./attribution";

export type ContactEventType =
  | "score_taken" | "blueprint_purchased" | "report_delivered" | "upsell_sent" | "upsell_converted"
  | "care_plan_started" | "care_plan_changed" | "care_plan_cancelled" | "payment" | "payment_failed"
  | "purchase" | "email_sent" | "email_opened" | "email_clicked" | "sms_sent" | "unsubscribed"
  | "testimonial_received" | "referral_made" | "referral_qualified" | "portal_login" | "note";

export type ContactEvent = {
  id: string; contactId: string; type: ContactEventType; occurredAt: string;
  refId?: string; amountCents?: number; meta?: Record<string, unknown>;
};

export type ContactRecord = Doc & { email: string; name?: string; firstTouch?: Attribution["f"]; lastTouch?: Attribution["l"] };

export const contactKey = (email: string) => email.trim().toLowerCase().slice(0, 200);

export async function recordEvent(e: Omit<ContactEvent, "id" | "occurredAt"> & { id?: string; occurredAt?: string }): Promise<boolean> {
  try {
    if (!e.contactId) return false;
    const ev: ContactEvent = { ...e, contactId: contactKey(e.contactId), id: e.id || newId("ev"), occurredAt: e.occurredAt || new Date().toISOString() };
    const sql = await getSql();
    if (sql) {
      await sql(
        `insert into contact_events (id, contact_id, type, occurred_at, ref_id, amount_cents, meta) values ($1,$2,$3,$4,$5,$6,$7) on conflict (id) do nothing`,
        [ev.id, ev.contactId, ev.type, ev.occurredAt, ev.refId ?? null, ev.amountCents ?? null, JSON.stringify(ev.meta ?? {})],
      );
      return true;
    }
    const r = getRedis();
    if (!r) return false;
    if (await r.hexists("growth:events", ev.id)) return true; // idempotent (e.g. Stripe event ids)
    const ts = Date.parse(ev.occurredAt);
    await r.hset("growth:events", { [ev.id]: JSON.stringify(ev) });
    await r.zadd(`growth:events:c:${ev.contactId}`, { score: ts, member: ev.id });
    await r.zadd("growth:events:all", { score: ts, member: ev.id });
    return true;
  } catch (err) {
    console.error("[contact_events] write failed", err);
    return false;
  }
}

const parse = (v: unknown): ContactEvent | null => {
  if (!v) return null;
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return null; } }
  return v as ContactEvent;
};

function fromRow(x: Record<string, unknown>): ContactEvent {
  return {
    id: String(x.id), contactId: String(x.contact_id), type: x.type as ContactEventType,
    occurredAt: new Date(x.occurred_at as string).toISOString(), refId: (x.ref_id as string) ?? undefined,
    amountCents: x.amount_cents == null ? undefined : Number(x.amount_cents), meta: (x.meta as Record<string, unknown>) ?? {},
  };
}

async function hydrate(ids: string[]): Promise<ContactEvent[]> {
  const r = getRedis();
  if (!r || !ids.length) return [];
  const vals = (await r.hmget("growth:events", ...ids)) as Record<string, unknown> | null;
  return ids.map((id) => parse(vals?.[id])).filter(Boolean) as ContactEvent[];
}

/** Newest first. */
export async function listContactEvents(contactId: string, limit = 200): Promise<ContactEvent[]> {
  const id = contactKey(contactId);
  const sql = await getSql();
  if (sql) return (await sql(`select * from contact_events where contact_id=$1 order by occurred_at desc limit $2`, [id, limit])).map(fromRow);
  const r = getRedis();
  if (!r) return [];
  return hydrate((await r.zrange(`growth:events:c:${id}`, 0, limit - 1, { rev: true })) as string[]);
}

/** Events since a time, newest first, optionally filtered by type. */
export async function listEventsSince(sinceMs: number, types?: ContactEventType[], limit = 5000): Promise<ContactEvent[]> {
  const sql = await getSql();
  if (sql) {
    const rows = types?.length
      ? await sql(`select * from contact_events where occurred_at >= $1 and type = any($2) order by occurred_at desc limit $3`, [new Date(sinceMs).toISOString(), types, limit])
      : await sql(`select * from contact_events where occurred_at >= $1 order by occurred_at desc limit $2`, [new Date(sinceMs).toISOString(), limit]);
    return rows.map(fromRow);
  }
  const r = getRedis();
  if (!r) return [];
  const ids = (await r.zrange("growth:events:all", sinceMs, "+inf", { byScore: true })) as string[];
  const evs = (await hydrate(ids.slice(-limit))).reverse();
  return types?.length ? evs.filter((e) => types.includes(e.type)) : evs;
}

/** Contact record keeps the first touch forever and the latest touch. */
export async function touchContact(email: string, attr: Attribution | null, name?: string): Promise<void> {
  try {
    const id = contactKey(email);
    if (!id) return;
    const cur = await getDoc<ContactRecord>("contacts", id);
    await putDoc<ContactRecord>("contacts", {
      ...(cur ?? {}), id, email: id, name: name || cur?.name,
      firstTouch: cur?.firstTouch ?? attr?.f, lastTouch: attr?.l ?? cur?.lastTouch,
    } as ContactRecord);
  } catch (err) {
    console.error("[contacts] touch failed", err);
  }
}

export const EVENT_LABELS: Record<ContactEventType, string> = {
  score_taken: "Took the AI Readiness Score", blueprint_purchased: "Bought a Blueprint", report_delivered: "Blueprint report delivered",
  upsell_sent: "Upsell offer sent", upsell_converted: "Upsell converted", care_plan_started: "Care plan started",
  care_plan_changed: "Care plan changed", care_plan_cancelled: "Care plan cancelled", payment: "Payment received",
  payment_failed: "Payment failed", purchase: "Purchase", email_sent: "Email sent", email_opened: "Email opened",
  email_clicked: "Email link clicked", sms_sent: "SMS sent", unsubscribed: "Unsubscribed", testimonial_received: "Testimonial received",
  referral_made: "Referred someone", referral_qualified: "Referral qualified", portal_login: "Signed in to portal", note: "Note",
};
