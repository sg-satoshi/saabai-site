/**
 * Who can get a marketing broadcast, as plain rules with no storage imports, so the admin page
 * (browser) and the broadcast route (server) count people the same way (#345).
 *
 * Can email = active, opted in to marketing ("yes"), and not on the suppression list.
 * This is the same rule as broadcastRecipients() in lib/broadcast.ts.
 */

export type ConsentFields = { status?: string; marketingConsent?: string };

/** Marketing broadcasts go only to active subscribers who ticked the optional consent box. */
export function canReceiveMarketing(sub: ConsentFields): boolean {
  return sub.status === "active" && sub.marketingConsent === "yes";
}

export type EmailStatus = "can_email" | "not_opted_in" | "unsubscribed";

/** Unsubscribed wins (status or suppression list), then consent. */
export function emailStatus(sub: ConsentFields, suppressed: boolean): EmailStatus {
  if (suppressed || sub.status === "unsubscribed") return "unsubscribed";
  if (!canReceiveMarketing(sub)) return "not_opted_in";
  return "can_email";
}

export const STATUS_LABEL: Record<EmailStatus, string> = {
  can_email: "Can email",
  not_opted_in: "Not opted in",
  unsubscribed: "Unsubscribed",
};

/** Why someone is left out of a broadcast. Plain words, full sentences. */
export const LEFT_OUT_REASON: Record<Exclude<EmailStatus, "can_email">, string> = {
  not_opted_in: "Not opted in. They never ticked the email box, and the Spam Act needs consent.",
  unsubscribed: "Unsubscribed. They used the unsubscribe link or were marked unsubscribed.",
};

export type Countable = { emailStatus?: EmailStatus };

export type AudienceCounts = { total: number; canEmail: number; notOptedIn: number; unsubscribed: number; leftOut: number };

export function audienceCounts(subs: Countable[]): AudienceCounts {
  let canEmail = 0, notOptedIn = 0, unsubscribed = 0;
  for (const s of subs) {
    if (s.emailStatus === "can_email") canEmail++;
    else if (s.emailStatus === "unsubscribed") unsubscribed++;
    else notOptedIn++;
  }
  return { total: subs.length, canEmail, notOptedIn, unsubscribed, leftOut: subs.length - canEmail };
}

export type SegmentSub = { industry?: string; subscribedAt?: string; country?: string; offer?: string };

export type Segment = { id: string; label: string; filter: (s: SegmentSub, now: number) => boolean };

const DAY = 86_400_000;
const joinedWithin = (s: SegmentSub, now: number, days: number) => {
  const t = Date.parse(s.subscribedAt || "");
  return Number.isFinite(t) && now - t < days * DAY;
};

/** Fixed segments (custom saved lists are phase 2). "All subscribers" is first. */
export const SEGMENTS: readonly Segment[] = [
  { id: "all", label: "All subscribers", filter: () => true },
  { id: "law", label: "Law / Legal", filter: (s) => s.industry === "Law / Legal" },
  { id: "accounting", label: "Accounting / Finance", filter: (s) => s.industry === "Accounting / Finance" },
  { id: "realestate", label: "Real Estate", filter: (s) => s.industry === "Real Estate" },
  { id: "popup", label: "Exit pop-up sign-ups", filter: (s) => s.offer === "score_link" },
  { id: "30d", label: "Joined last 30 days", filter: (s, now) => joinedWithin(s, now, 30) },
  { id: "7d", label: "Joined last 7 days", filter: (s, now) => joinedWithin(s, now, 7) },
  { id: "au", label: "Australia", filter: (s) => s.country === "Australia" },
  { id: "intl", label: "Outside Australia", filter: (s) => !!s.country && s.country !== "Australia" },
];
