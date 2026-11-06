import { ALLOWED_FROM_DOMAINS, SUNDER_FROM_NAME } from "./constants";

const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;

export type ContactGate = {
  email: string;
  status: string;
  confirmedAt: string | null;
};

/** Marketing goes only to confirmed, subscribed contacts who are not suppressed. */
export function mailableContacts<T extends ContactGate>(contacts: T[], suppressed: Set<string>): {
  recipients: T[];
  suppressed: number;
  held: number;
} {
  const seen = new Set<string>();
  const recipients: T[] = [];
  let blocked = 0;
  let held = 0;
  for (const c of contacts) {
    const email = c.email.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    if (c.status !== "subscribed" || !c.confirmedAt) { held++; continue; }
    if (suppressed.has(email)) { blocked++; continue; }
    else recipients.push(c);
  }
  return { recipients, suppressed: blocked, held };
}

export function cleanFromName(name: string, fallback = SUNDER_FROM_NAME): string {
  const n = String(name || "").replace(/[\u0000-\u001f\u007f<>"]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
  return n || fallback;
}

export function formatFrom(name: string, email: string): string {
  return `${cleanFromName(name)} <${email}>`;
}

export function fromDomainAllowed(email: string): boolean {
  const at = email.toLowerCase().lastIndexOf("@");
  if (at < 1) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return (ALLOWED_FROM_DOMAINS as readonly string[]).includes(domain);
}

/** A single recipient. Rejects lists, blanks and anything the mailbox simulator syntax would split. */
export function oneAddress(raw: string): string | null {
  const email = String(raw || "").trim().toLowerCase();
  if (!email || email.length > 254 || /[,;\s]/.test(email) || !EMAIL.test(email)) return null;
  return email;
}

export function validateBroadcastCopy(input: { subject: string; body: string }): string | null {
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject) return "Add a subject first.";
  if (subject.length > 200) return "Subjects are limited to 200 characters.";
  if (!body) return "Write a message first.";
  if (body.length > 8000) return "That message is too long.";
  return null;
}

export type SeriesStepInput = { position: number; delayDays: number; subject: string; body: string };

export function validateSeriesSteps(steps: SeriesStepInput[]): string | null {
  if (steps.length < 1 || steps.length > 6) return "Use between 1 and 6 steps.";
  const ordered = [...steps].sort((a, b) => a.position - b.position);
  let prev = -1;
  for (const s of ordered) {
    if (!Number.isInteger(s.delayDays) || s.delayDays < 0 || s.delayDays > 365) return "Delays are whole days from 0 to 365.";
    if (s.delayDays < prev) return "Each step has to fall on the same day or later than the one before.";
    prev = s.delayDays;
    const copy = validateBroadcastCopy({ subject: s.subject, body: s.body });
    if (copy) return copy;
  }
  return null;
}

export type SesErrorClass = "throttle" | "permanent" | "uncertain";

/** Throttles go back on the queue. Anything that might have been accepted is not retried. */
export function classifySesError(err: unknown): SesErrorClass {
  const name = String((err as { name?: string })?.name || "");
  const msg = err instanceof Error ? err.message : String(err);
  const blob = `${name} ${msg}`;
  if (/throttl|too many requests|rate exceeded|limit exceeded|429/i.test(blob)) return "throttle";
  if (/MessageRejected|AccountSuspended|MailFromDomainNotVerified|NotFoundException|BadRequest|InvalidParameter|AccessDenied|MessageRejected/i.test(blob)) return "permanent";
  if (/timeout|ECONNRESET|ETIMEDOUT|socket hang up|network/i.test(blob)) return "uncertain";
  return "permanent";
}

export function publicSesError(err: unknown): string {
  const name = String((err as { name?: string })?.name || "Error");
  const msg = (err instanceof Error ? err.message : String(err))
    .replace(/AKIA[0-9A-Z]{8,}/g, "[key]")
    .replace(/[A-Za-z0-9/+=]{40,}/g, "[redacted]")
    .slice(0, 180);
  return `${name}: ${msg}`;
}

export function confirmationKey(email: string, now: Date): string {
  return `confirm:sunder:${email.trim().toLowerCase()}:${now.toISOString().slice(0, 10)}`;
}

/** New rows always get a confirmation. A repeat signup only does when they are still pending. */
export function shouldQueueConfirmation(created: boolean, marketingStatus: string | null): boolean {
  if (created) return true;
  return marketingStatus === "pending";
}
