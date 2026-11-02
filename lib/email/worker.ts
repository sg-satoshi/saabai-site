/**
 * Drain the email_sends outbox. A row moves pending → sending → sent.
 * A throttle puts it back to pending. A crash after SES accepts it leaves
 * sending with no message id; email_fail_stuck_sends marks that failed and
 * does not send it again.
 */
import type { SenderIdentity } from "./constants";
import { EMAIL_PUBLIC_ORIGIN } from "./constants";
import { listUnsubscribeHeader, renderMarketingEmail } from "./message";
import { classifySesError, fromDomainAllowed, publicSesError } from "./rules";
import type { SesMessage, SesSender } from "./ses";
import { readEmailToken, signEmailToken } from "./tokens";

export type OutboxRow = {
  id: string;
  toEmail: string;
  kind: "marketing" | "confirm" | "test";
  subject: string;
  html: string;
  fromName: string;
  respectQuiet: boolean;
  contactStatus: string;
  confirmedAt: string | null;
  firstName: string | null;
  campaignId: string | null;
  identity: SenderIdentity;
};

export type Outbox = {
  claim(limit: number, skipQuiet: boolean): Promise<OutboxRow[]>;
  markSent(id: string, messageId: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  markSkipped(id: string, reason: string): Promise<void>;
  release(id: string): Promise<void>;
  suppressed(emails: string[]): Promise<Set<string>>;
};

export type DrainResult = {
  sent: number;
  failed: number;
  skipped: number;
  released: number;
  paused: boolean;
};

function blockedReason(row: OutboxRow, suppressed: boolean): string | null {
  if (suppressed) return "suppressed";
  if (row.contactStatus === "missing" && row.kind !== "test") return "missing_contact";
  if (row.kind === "marketing") {
    if (row.contactStatus !== "subscribed" || !row.confirmedAt) return "not_confirmed";
  } else if (row.contactStatus === "unsubscribed" || row.contactStatus === "bounced" || row.contactStatus === "complained") {
    return row.contactStatus;
  }
  if (!fromDomainAllowed(row.identity.fromEmail)) return "from_not_allowed";
  return null;
}

export async function drainOutbox(opts: {
  outbox: Outbox;
  send: SesSender;
  acquire: () => Promise<{ ok: boolean; waitMs: number }>;
  paused: boolean;
  quiet: boolean;
  secret: string;
  origin?: string;
  limit?: number;
  deadlineMs?: number;
  sleep?: (ms: number) => Promise<void>;
  nowSec?: number;
}): Promise<DrainResult> {
  const result: DrainResult = { sent: 0, failed: 0, skipped: 0, released: 0, paused: opts.paused };
  if (opts.paused) return result;
  if (!opts.secret) return result;
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const origin = opts.origin ?? EMAIL_PUBLIC_ORIGIN;
  const deadline = Date.now() + (opts.deadlineMs ?? 45_000);
  const cap = opts.limit ?? 400;
  const nowSec = opts.nowSec ?? Math.floor(Date.now() / 1000);

  while (Date.now() < deadline && result.sent + result.failed + result.skipped < cap) {
    const batch = await opts.outbox.claim(10, opts.quiet);
    if (!batch.length) break;
    const blocked = await opts.outbox.suppressed(batch.map((r) => r.toEmail));
    for (const row of batch) {
      if (Date.now() >= deadline) {
        await opts.outbox.release(row.id);
        result.released++;
        continue;
      }
      const why = blockedReason(row, blocked.has(row.toEmail));
      if (why) {
        await opts.outbox.markSkipped(row.id, why);
        result.skipped++;
        continue;
      }
      const slot = await opts.acquire();
      if (!slot.ok) {
        await opts.outbox.release(row.id);
        result.released++;
        await sleep(slot.waitMs);
        continue;
      }
      if (slot.waitMs > 0) await sleep(slot.waitMs);
      const unsubToken = signEmailToken({ k: "unsub", t: row.identity.slug, e: row.toEmail, iat: nowSec }, opts.secret);
      const unsubHttps = `${origin}/api/email/unsubscribe?t=${encodeURIComponent(unsubToken)}`;
      const unsubPage = `${origin}/email/u?t=${encodeURIComponent(unsubToken)}`;
      let confirmUrl: string | undefined;
      if (row.kind === "confirm") {
        const confirmToken = signEmailToken({ k: "confirm", t: row.identity.slug, e: row.toEmail, iat: nowSec }, opts.secret);
        confirmUrl = `${origin}/email/confirm?t=${encodeURIComponent(confirmToken)}`;
      }
      const viewToken = signEmailToken({ k: "view", t: row.identity.slug, e: row.toEmail, iat: nowSec, id: /^[0-9a-f-]{36}$/i.test(row.id) ? row.id : undefined }, opts.secret);
      const viewUrl = /^[0-9a-f-]{36}$/i.test(row.id) ? `${origin}/email/view?t=${encodeURIComponent(viewToken)}` : undefined;
      const rendered = renderMarketingEmail({
        subject: row.subject,
        html: row.html,
        fromName: row.fromName,
        identity: row.identity,
        unsubUrl: unsubPage,
        viewUrl,
        confirmUrl,
        values: { firstName: row.firstName },
      });
      const msg: SesMessage = {
        from: rendered.from,
        to: row.toEmail,
        replyTo: row.identity.replyTo || undefined,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        headers: listUnsubscribeHeader(unsubHttps, `mailto:${row.identity.replyTo || row.identity.fromEmail}?subject=unsubscribe`),
        tenantName: row.identity.sesTenantName || undefined,
        configurationSetName: row.identity.configSet || undefined,
        tags: [
          { Name: "tenant", Value: row.identity.slug },
          { Name: "kind", Value: row.kind },
          ...(row.campaignId && /^[A-Za-z0-9_-]{1,256}$/.test(row.campaignId) ? [{ Name: "campaign", Value: row.campaignId }] : []),
        ],
      };
      try {
        const sent = await opts.send(msg);
        if (!sent.messageId) throw new Error("missing message id");
        await opts.outbox.markSent(row.id, sent.messageId);
        result.sent++;
      } catch (err) {
        const kind = classifySesError(err);
        if (kind === "throttle") {
          await opts.outbox.release(row.id);
          result.released++;
          await sleep(1000);
        } else {
          await opts.outbox.markFailed(row.id, kind === "uncertain" ? `not_retried: ${publicSesError(err)}` : publicSesError(err));
          result.failed++;
        }
      }
    }
  }
  return result;
}

export function tokenEmail(token: string, secret: string, kind: "unsub" | "confirm", nowSec?: number): { tenant: string; email: string } | null {
  const parsed = readEmailToken(token, secret, kind, nowSec);
  return parsed ? { tenant: parsed.t, email: parsed.e } : null;
}
