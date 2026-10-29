/**
 * Admin Subscribers page data (#345). Pure helpers with injected storage, so tests run without
 * Redis or Postgres.
 * - listForAdmin: adds each row's email status using one batched suppression read.
 * - markUnsubscribed: the replacement for Delete. Adds each address to the suppression list and
 *   sets status to unsubscribed. The record and its consent history are kept.
 */
import { emailStatus, type EmailStatus } from "./subscriber-rules";
import type { Subscriber } from "./subscribers";

export type AdminSubscriber = Subscriber & { emailStatus: EmailStatus; canEmail: boolean };

export async function listForAdmin(
  subs: Subscriber[],
  suppressedSet: (emails: string[]) => Promise<Set<string>>,
): Promise<{ subscribers: AdminSubscriber[]; suppressionError: boolean }> {
  let blocked: Set<string> | null = null;
  try { blocked = await suppressedSet(subs.map((s) => s.email)); } catch { blocked = null; }
  const subscribers = subs.map((s) => {
    const st = emailStatus(s, blocked ? blocked.has(s.email.trim().toLowerCase()) : false);
    return { ...s, emailStatus: st, canEmail: st === "can_email" };
  });
  return { subscribers, suppressionError: blocked === null };
}

export type MarkDeps = {
  suppress: (email: string) => Promise<void>;
  setUnsubscribed: (emails: string[]) => Promise<string[]>;
};

export const MAX_MARK = 500;

export async function markUnsubscribed(body: unknown, deps: MarkDeps): Promise<{ status: number; body: Record<string, unknown> }> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (b.action !== "unsubscribe") return { status: 400, body: { error: "Unknown action" } };
  const raw = Array.isArray(b.emails) ? b.emails : [];
  const emails = [...new Set(raw.filter((e): e is string => typeof e === "string").map((e) => e.trim()).filter((e) => e.includes("@") && e.length <= 200))];
  if (!emails.length) return { status: 400, body: { error: "emails array required" } };
  if (emails.length > MAX_MARK) return { status: 400, body: { error: `At most ${MAX_MARK} at a time` } };
  const failed: string[] = [];
  const suppressedOk: string[] = [];
  // Suppression first: it is what the broadcast route checks, so a person is protected even if the status write fails.
  for (const e of emails) {
    try { await deps.suppress(e); suppressedOk.push(e); } catch { failed.push(e); }
  }
  let updated: string[] = [];
  try { updated = await deps.setUnsubscribed(suppressedOk); } catch { /* suppression already blocks sends */ }
  return { status: failed.length && !suppressedOk.length ? 502 : 200, body: { ok: suppressedOk.length > 0, marked: suppressedOk, updated: updated.length, failed } };
}
