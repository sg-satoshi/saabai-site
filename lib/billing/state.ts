/**
 * Pure billing state machine + dunning schedule. No I/O, unit tested.
 */

export type SiteBillingStatus =
  | "pending"        // link sent, not paid
  | "link_expired"   // 7 days passed, unpaid
  | "active"
  | "payment_failed" // first failure, before the first retry fails
  | "past_due"       // a retry also failed
  | "paused"         // 30+ days unpaid, site paused
  | "cancelling"     // cancel at period end requested, still active
  | "cancelled";

export const STATUS_LABELS: Record<SiteBillingStatus, string> = {
  pending: "Pending payment",
  link_expired: "Link expired",
  active: "Active",
  payment_failed: "Payment failed",
  past_due: "Past due",
  paused: "Paused",
  cancelling: "Cancels at cycle end",
  cancelled: "Cancelled",
};

export const LINK_TTL_DAYS = 7;
export const PAUSE_AFTER_DAYS = 30;
const DAY = 86_400_000;

/** Dunning sends: day 0 (immediately), 1, 3, 7, then every 7 days (14, 21, ...). */
export function dunningDays(upTo: number): number[] {
  const out = [0, 1, 3, 7];
  for (let d = 14; d <= upTo; d += 7) out.push(d);
  return out.filter((d) => d <= upTo);
}

/** Which dunning step (index) is due now, given how many were already sent. Null if none. */
export function dueDunningStep(failedAtIso: string, sentCount: number, now = Date.now()): number | null {
  const elapsedDays = Math.floor((now - Date.parse(failedAtIso)) / DAY);
  if (elapsedDays < 0) return null;
  const steps = dunningDays(Math.max(elapsedDays, 0));
  return steps.length > sentCount ? sentCount : null;
}

export function dunningDayForStep(step: number): number {
  return dunningDays(step * 7 + 7)[step];
}

export function linkExpiresAt(sentAtIso: string): string {
  return new Date(Date.parse(sentAtIso) + LINK_TTL_DAYS * DAY).toISOString();
}

export function isLinkExpired(expiresAtIso: string | undefined, now = Date.now()): boolean {
  return !!expiresAtIso && now > Date.parse(expiresAtIso);
}

export function shouldPause(failedAtIso: string | undefined, now = Date.now()): boolean {
  return !!failedAtIso && now - Date.parse(failedAtIso) >= PAUSE_AFTER_DAYS * DAY;
}

/**
 * Status after an invoice payment failure. Stripe's attempt_count is 1 on the
 * first attempt; any later failure is a failed retry, so the site is Past due.
 */
export function statusAfterFailure(current: SiteBillingStatus, attemptCount: number): SiteBillingStatus {
  if (current === "paused") return "paused";
  return attemptCount >= 2 ? "past_due" : "payment_failed";
}

/** Map a Stripe subscription status (subscription.updated) to ours, keeping finer local states. */
export function statusFromSubscription(sub: { status: string; cancel_at_period_end?: boolean }, current: SiteBillingStatus): SiteBillingStatus {
  switch (sub.status) {
    case "active":
    case "trialing":
      return sub.cancel_at_period_end ? "cancelling" : current === "payment_failed" || current === "past_due" || current === "paused" ? current : "active";
    case "past_due":
    case "unpaid":
      return current === "paused" ? "paused" : current === "payment_failed" ? "payment_failed" : "past_due";
    case "paused":
      return "paused";
    case "canceled":
    case "incomplete_expired":
      return "cancelled";
    default:
      return current;
  }
}

/** Plan change semantics: upgrades now with proration, downgrades at next cycle. */
export function planChangeKind(currentCents: number, nextCents: number): "upgrade" | "downgrade" | "same" {
  if (nextCents > currentCents) return "upgrade";
  if (nextCents < currentCents) return "downgrade";
  return "same";
}

/** Prorated amount (cents) for the rest of the cycle. */
export function prorate(deltaMonthlyCents: number, periodStartIso: string, periodEndIso: string, now = Date.now()): number {
  const start = Date.parse(periodStartIso), end = Date.parse(periodEndIso);
  if (!(end > start)) return 0;
  const left = Math.min(Math.max(end - now, 0), end - start);
  return Math.round((deltaMonthlyCents * left) / (end - start));
}

/** Totals for the setup form (first month + setup fee up front). */
export function upfrontTotals(monthlyCents: number, setupCents: number, gst: boolean) {
  const sub = monthlyCents + setupCents;
  const gstCents = gst ? Math.round(sub * 0.1) : 0;
  return { firstMonth: monthlyCents, setup: setupCents, gst: gstCents, dueNow: sub + gstCents, monthly: monthlyCents + (gst ? Math.round(monthlyCents * 0.1) : 0) };
}

/** Status that should show the site as needing attention in admin. */
export const NEEDS_ATTENTION: SiteBillingStatus[] = ["payment_failed", "past_due", "paused", "link_expired"];
