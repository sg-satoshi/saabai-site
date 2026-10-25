/**
 * Blueprint build credit: the 30-day window on a delivered Blueprint.
 *
 * Storage is the existing Redis engagement (`audit:engagements`), not a new
 * table. `deliveredAt`, `creditUsedCents` and `creditApplications` are
 * optional. Missing deliveredAt is derived on read. See AuditEngagement.
 *
 * End of the window is 11:59:59 pm Australia/Brisbane on the calendar day
 * 30 days after the Brisbane delivery date. Example: delivered 9:14 am
 * Monday 26 Oct 2026 ends 11:59:59 pm Wednesday 25 Nov 2026.
 *
 * Credit is used only when a signed quote or a deposit is recorded.
 * A booked call does not reduce it. Partial use across builds is allowed.
 * The card shows the remaining amount. It hides when nothing is left, when
 * the Blueprint was never delivered, or as soon as the window closes
 * (11:59 pm Australia/Brisbane on day 30). There is no post-expiry card.
 */

import { normalizeAuditTier, type AuditTier, type BlueprintCreditApplication } from "./audit-types";
import { formatAud } from "./money";

export const CREDIT_WINDOW_DAYS = 30;
export const BRISBANE_TZ = "Australia/Brisbane";

/** AUD cents. Matches lib/blueprint.ts tier prices. */
export const TIER_CREDIT_CENTS: Record<AuditTier, number> = {
  starter: 497_00,
  pro: 1_497_00,
  business: 3_500_00,
};

export const TIER_CREDIT_NAME: Record<AuditTier, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

export function tierCreditName(tier: string | undefined): string {
  return TIER_CREDIT_NAME[normalizeAuditTier(tier)];
}

/** How many mapped recommendations the rail shows. */
export const TIER_PLAN_LIMIT: Record<AuditTier, number> = {
  starter: 2,
  pro: 3,
  business: 4,
};

/** Same Calendly link the Blueprint checkout and the public site already use. */
export const IMPLEMENTATION_CALL_URL = "https://calendly.com/shanegoldberg/30min";
export const BLUEPRINT_PAGE_HREF = "/client-portal?page=blueprint";

export const BOOK_IMPLEMENTATION_CTA = "Book an implementation call";
export const SEE_CREDIT_CTA = "See what your credit covers";

/**
 * Verbatim from the live Blueprint FAQ (app/blueprint/page.tsx).
 * "If you book any Saabai build within 30 days of receiving your Blueprint,
 * the full fee is taken off that build. Credit applies to implementation
 * costs only, not care plans or monthly fees. Any unused credit expires
 * after 30 days."
 */
export const BLUEPRINT_CREDIT_FINE_PRINT =
  "If you book any Saabai build within 30 days of receiving your Blueprint, the full fee is taken off that build. Credit applies to implementation costs only, not care plans or monthly fees. Any unused credit expires after 30 days.";

export const ALSO_COVERS =
  "Also covers Presence, Growth and Signature websites, Lex chat, Lachie and automation.";

export type CreditServiceId =
  | "lex"
  | "lachie"
  | "website_presence"
  | "website_growth"
  | "website_signature"
  | "automation";

export const SERVICE_LABEL: Record<CreditServiceId, string> = {
  lex: "Lex chat",
  lachie: "Lachie",
  website_presence: "Presence website",
  website_growth: "Growth website",
  website_signature: "Signature website",
  automation: "Automation",
};

export type CreditPhase = "fresh" | "mid" | "urgent" | "last_day";

export type CreditOpportunity = {
  title?: string;
  description?: string;
  rank?: number;
  status?: string;
};

export type CreditEngagementInput = {
  id: string;
  tier?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  deliveredAt?: string;
  reports?: { deliveredAt?: string }[];
  timeline?: { type?: string; at?: string }[];
  creditUsedCents?: number;
  creditApplications?: BlueprintCreditApplication[];
  assessment?: { opportunities?: CreditOpportunity[] };
};

export type CreditPlanItem = {
  title: string;
  detail: string;
  service: CreditServiceId;
  serviceLabel: string;
};

export type BlueprintCreditModel = {
  engagementId: string;
  tier: AuditTier;
  fullCents: number;
  usedCents: number;
  deliveredAt: string;
  endsAt: string;
  /** Server clock at the moment this model was built. The browser ticks from the offset. */
  serverNow: string;
  /** Null when this client has no ranked recommendations. The rail then uses the general service list. */
  recommendations: { title: string; service: CreditServiceId }[] | null;
};

export type CreditView = {
  phase: CreditPhase;
  tone: "calm" | "warm";
  statusLabel: string;
  headline: string;
  body: string;
  usedNote: string | null;
  endsLine: string;
  planTitle: string;
  planSource: string;
  items: CreditPlanItem[];
  fromBlueprint: boolean;
  alsoCovers: string;
  finePrint: string;
  showCountdown: boolean;
  days: number;
  hours: number;
  minutes: number;
  fraction: number;
  ariaSummary: string;
  remainingCents: number;
  fullCents: number;
  primaryLabel: string;
  secondaryLabel: string;
};

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function padCreditUnit(n: number): string {
  return pad2(n);
}

function part(instant: Date, type: Intl.DateTimeFormatPartTypes, options: Intl.DateTimeFormatOptions): string {
  const parts = new Intl.DateTimeFormat("en-AU", { timeZone: BRISBANE_TZ, ...options }).formatToParts(instant);
  return (parts.find((p) => p.type === type)?.value ?? "").replace(/\./g, "");
}

function brisbaneYmd(instant: Date): { y: number; m: number; d: number } {
  const y = Number(part(instant, "year", { year: "numeric" }));
  const m = Number(part(instant, "month", { month: "2-digit" }));
  const d = Number(part(instant, "day", { day: "2-digit" }));
  return { y, m, d };
}

function addCalendarDays(y: number, m: number, d: number, days: number): { y: number; m: number; d: number } {
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  return { y: utc.getUTCFullYear(), m: utc.getUTCMonth() + 1, d: utc.getUTCDate() };
}

/** Australia/Brisbane is UTC+10 all year (no daylight saving). */
function brisbaneWallTime(y: number, m: number, d: number, hh: number, mm: number, ss: number): Date {
  return new Date(Date.UTC(y, m - 1, d, hh - 10, mm, ss));
}

export function creditEndsAt(deliveredAt: Date): Date {
  const p = brisbaneYmd(deliveredAt);
  const end = addCalendarDays(p.y, p.m, p.d, CREDIT_WINDOW_DAYS);
  return brisbaneWallTime(end.y, end.m, end.d, 23, 59, 59);
}

function validIso(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}

/**
 * Delivery instant for the credit clock.
 * 1. engagement.deliveredAt
 * 2. earliest report.deliveredAt
 * 3. earliest report_delivered timeline event
 * 4. updatedAt, only when status is already "delivered" (legacy rows)
 */
export function resolveDeliveredAt(engagement: CreditEngagementInput): string | null {
  const explicit = validIso(engagement.deliveredAt);
  if (explicit) return explicit;

  const reportTimes = (engagement.reports ?? [])
    .map((r) => validIso(r.deliveredAt))
    .filter((v): v is string => !!v)
    .sort();
  if (reportTimes[0]) return reportTimes[0];

  const events = (engagement.timeline ?? [])
    .filter((ev) => ev.type === "report_delivered")
    .map((ev) => validIso(ev.at))
    .filter((v): v is string => !!v)
    .sort();
  if (events[0]) return events[0];

  if (engagement.status === "delivered") return validIso(engagement.updatedAt);
  return null;
}

export function creditUsedCents(engagement: {
  creditApplications?: { cents?: number }[];
  creditUsedCents?: number;
}): number {
  const fromApps = Array.isArray(engagement.creditApplications)
    ? engagement.creditApplications.reduce((sum, row) => {
        const cents = row?.cents;
        return sum + (Number.isInteger(cents) && (cents as number) > 0 ? (cents as number) : 0);
      }, 0)
    : 0;
  const field = engagement.creditUsedCents;
  const fromField = Number.isInteger(field) && (field as number) > 0 ? (field as number) : 0;
  return Math.max(fromApps, fromField);
}

export function mapRecommendation(title: string, description = ""): CreditServiceId {
  const text = `${title} ${description}`.toLowerCase();
  if (/\b(calls?|phone|receptionist|voicemail)\b/.test(text)) return "lachie";
  if (/\b(chat|chatbot|enquir\w*|inbox|messages?)\b/.test(text)) return "lex";
  if (/\bsignature\b/.test(text) && /\b(site|website)\b/.test(text)) return "website_signature";
  if (/\b(presence|brochure)\b/.test(text)) return "website_presence";
  if (/\b(website|site|booking|online)\b/.test(text)) return "website_growth";
  return "automation";
}

function mappedPlan(
  opportunities: CreditOpportunity[] | undefined,
  tier: AuditTier,
): { title: string; service: CreditServiceId }[] | null {
  const rows = (opportunities ?? [])
    .filter((row) => row.status !== "cut" && typeof row.title === "string" && row.title.trim())
    .map((row, index) => ({ row, index }))
    .sort((a, b) => (a.row.rank ?? 1_000 + a.index) - (b.row.rank ?? 1_000 + b.index))
    .slice(0, TIER_PLAN_LIMIT[tier])
    .map(({ row }) => ({
      title: row.title!.trim(),
      service: mapRecommendation(row.title!.trim(), row.description ?? ""),
    }));
  return rows.length ? rows : null;
}

export function creditModelForEngagement(
  engagement: CreditEngagementInput,
  now: Date,
): BlueprintCreditModel | null {
  const deliveredAt = resolveDeliveredAt(engagement);
  if (!deliveredAt) return null;
  const tier = normalizeAuditTier(engagement.tier);
  const delivered = new Date(deliveredAt);
  return {
    engagementId: engagement.id,
    tier,
    fullCents: TIER_CREDIT_CENTS[tier],
    usedCents: creditUsedCents(engagement),
    deliveredAt,
    endsAt: creditEndsAt(delivered).toISOString(),
    serverNow: now.toISOString(),
    recommendations: mappedPlan(engagement.assessment?.opportunities, tier),
  };
}

/** The one card to show. Closed windows are already filtered out. Soonest end wins. */
export function creditModelForEngagements(
  engagements: CreditEngagementInput[],
  now: Date,
): BlueprintCreditModel | null {
  const visible = engagements
    .map((engagement) => creditModelForEngagement(engagement, now))
    .filter((model): model is BlueprintCreditModel => !!model && describeCredit(model, now) !== null);
  if (!visible.length) return null;
  visible.sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
  return visible[0];
}

export function countdownParts(now: Date, endsAt: Date): { days: number; hours: number; minutes: number; ms: number } {
  const ms = Math.max(0, endsAt.getTime() - now.getTime());
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
  return { days, hours, minutes, ms };
}

/**
 * Fresh is more than 14 whole days left. Mid is 8 to 14. Urgent is 1 to 7.
 * Last day is under 24 hours and at least one minute. Under one minute the
 * rail is already hidden, so this never describes a 0h 0m frame.
 */
export function phaseAt(now: Date, endsAt: Date): CreditPhase {
  const { days } = countdownParts(now, endsAt);
  if (days <= 0) return "last_day";
  if (days <= 7) return "urgent";
  if (days <= 14) return "mid";
  return "fresh";
}

function shortStamp(instant: Date): string {
  const weekday = part(instant, "weekday", { weekday: "short" });
  const day = part(instant, "day", { day: "numeric" });
  const month = part(instant, "month", { month: "short" });
  return `${weekday} ${day} ${month}`;
}

function longDate(instant: Date): string {
  const weekday = part(instant, "weekday", { weekday: "long" });
  const day = part(instant, "day", { day: "numeric" });
  const month = part(instant, "month", { month: "long" });
  return `${weekday} ${day} ${month}`;
}

function unit(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

const FALLBACK_ITEMS: CreditPlanItem[] = [
  { title: "Websites", detail: "Presence, Growth or Signature", service: "website_growth", serviceLabel: "Websites" },
  { title: "Lex chat", detail: "AI chatbot for your site", service: "lex", serviceLabel: "Lex chat" },
  { title: "Lachie", detail: "AI receptionist", service: "lachie", serviceLabel: "Lachie" },
  { title: "Automation", detail: "Admin and workflow", service: "automation", serviceLabel: "Automation" },
];

export function describeCredit(model: BlueprintCreditModel, now: Date): CreditView | null {
  const ends = new Date(model.endsAt);
  const delivered = new Date(model.deliveredAt);
  if (!Number.isFinite(ends.getTime()) || !Number.isFinite(delivered.getTime())) return null;
  // Hide at 11:59 pm on day 30. The last minute is included so the rail
  // never sits on a 0h 0m frame after the window has effectively closed.
  if (ends.getTime() - now.getTime() < MINUTE_MS) return null;

  const fullCents = model.fullCents;
  const usedCents = Math.max(0, model.usedCents);
  const remainingCents = fullCents - usedCents;
  if (remainingCents <= 0) return null;

  const phase = phaseAt(now, ends);
  const parts = countdownParts(now, ends);
  const amount = formatAud(remainingCents / 100);
  const tierName = TIER_CREDIT_NAME[model.tier];
  const fromBlueprint = !!model.recommendations?.length;
  const items: CreditPlanItem[] = fromBlueprint
    ? model.recommendations!.map((row, index) => ({
        title: row.title,
        detail: `Blueprint recommendation ${index + 1}`,
        service: row.service,
        serviceLabel: SERVICE_LABEL[row.service],
      }))
    : FALLBACK_ITEMS;

  const total = ends.getTime() - delivered.getTime();
  const fraction = total <= 0 ? 0 : Math.min(1, Math.max(0, (ends.getTime() - now.getTime()) / total));

  let body: string;
  let endsLine: string;
  let ariaSummary: string;
  if (phase === "last_day") {
    body = "Your credit is available until 11:59 pm tonight. If you'd like to use it, book a call today and we'll help you with the details.";
    endsLine = "Ends 11:59 pm tonight, Brisbane time";
    ariaSummary = `${unit(parts.hours, "hour")} and ${unit(parts.minutes, "minute")} left on your ${amount} credit. Ends 11:59 pm tonight, Brisbane time.`;
  } else if (phase === "urgent") {
    const more = parts.days === 1 ? "1 more day" : `${parts.days} more days`;
    body = `Your ${amount} credit is available for ${more}. If a build is on your list, a short call is the quickest way to plan it.`;
    endsLine = `Ends 11:59 pm ${shortStamp(ends)}, Brisbane time`;
    ariaSummary = `${unit(parts.days, "day")}, ${unit(parts.hours, "hour")} and ${unit(parts.minutes, "minute")} left on your ${amount} credit. Ends 11:59 pm ${longDate(ends)}, Brisbane time.`;
  } else if (phase === "mid") {
    body = "You're halfway through your credit window. A short call is the easiest way to turn your Blueprint into a build plan.";
    endsLine = `Ends 11:59 pm ${shortStamp(ends)}, Brisbane time`;
    ariaSummary = `${unit(parts.days, "day")}, ${unit(parts.hours, "hour")} and ${unit(parts.minutes, "minute")} left on your ${amount} credit. Ends 11:59 pm ${longDate(ends)}, Brisbane time.`;
  } else {
    const comesOff = usedCents > 0 ? `the remaining ${amount} comes off it` : `the full ${amount} comes off it`;
    body = `Your Blueprint is delivered. Book any Saabai build in the next 30 days and ${comesOff}.`;
    endsLine = `Ends 11:59 pm ${shortStamp(ends)}, Brisbane time`;
    ariaSummary = `${unit(parts.days, "day")}, ${unit(parts.hours, "hour")} and ${unit(parts.minutes, "minute")} left on your ${amount} credit. Ends 11:59 pm ${longDate(ends)}, Brisbane time.`;
  }

  const statusLabel = phase === "last_day" ? "Last day" : `${parts.days} ${parts.days === 1 ? "day" : "days"} left`;

  return {
    phase,
    tone: phase === "urgent" || phase === "last_day" ? "warm" : "calm",
    statusLabel,
    headline: `Your ${amount} ${tierName} Blueprint credit`,
    body,
    usedNote: usedCents > 0 ? `${formatAud(usedCents / 100)} of this credit is already on a build.` : null,
    endsLine,
    planTitle: "Your credit plan",
    planSource: fromBlueprint ? "From your Blueprint" : "Saabai services",
    items,
    fromBlueprint,
    alsoCovers: ALSO_COVERS,
    finePrint: BLUEPRINT_CREDIT_FINE_PRINT,
    showCountdown: true,
    days: parts.days,
    hours: parts.hours,
    minutes: parts.minutes,
    fraction,
    ariaSummary,
    remainingCents,
    fullCents,
    primaryLabel: BOOK_IMPLEMENTATION_CTA,
    secondaryLabel: SEE_CREDIT_CTA,
  };
}

export type CreditApplyResult =
  | { ok: true; applications: BlueprintCreditApplication[]; creditUsedCents: number; detail: string }
  | { ok: false; error: string };

/**
 * Plan a credit draw-down. Does not write. Kind must be a signed quote or a
 * deposit. Anything else, including a booked call, is rejected.
 */
export function planCreditApplication(
  engagement: CreditEngagementInput,
  input: { cents?: unknown; kind?: unknown; reference?: unknown },
  now: Date,
  id: string,
): CreditApplyResult {
  if (input.kind !== "signed_quote" && input.kind !== "deposit") {
    return { ok: false, error: "Record a signed quote or a deposit. A booked call does not use the credit." };
  }
  if (typeof input.cents !== "number" || !Number.isInteger(input.cents) || input.cents <= 0 || input.cents > 10_000_000) {
    return { ok: false, error: "Enter the amount in cents as a whole number." };
  }
  let reference: string | undefined;
  if (input.reference != null && input.reference !== "") {
    if (typeof input.reference !== "string") return { ok: false, error: "Reference must be text." };
    reference = input.reference.trim().slice(0, 80);
    if (!reference) reference = undefined;
  }

  const deliveredAt = resolveDeliveredAt(engagement);
  if (!deliveredAt) return { ok: false, error: "Credit starts when the Blueprint is delivered." };
  const ends = creditEndsAt(new Date(deliveredAt));
  if (now.getTime() >= ends.getTime()) {
    return { ok: false, error: "This credit window has closed, so it cannot be applied to a build." };
  }

  const tier = normalizeAuditTier(engagement.tier);
  const full = TIER_CREDIT_CENTS[tier];
  const opening = creditUsedCents(engagement);
  const remaining = full - opening;
  if (remaining <= 0) return { ok: false, error: "This credit is already fully used." };
  if (input.cents > remaining) {
    return { ok: false, error: `That is more than the ${formatAud(remaining / 100)} still available.` };
  }

  const existing = Array.isArray(engagement.creditApplications) ? engagement.creditApplications : [];
  if (existing.length >= 20) return { ok: false, error: "Too many credit records on this Blueprint." };

  const application: BlueprintCreditApplication = {
    id,
    cents: input.cents,
    kind: input.kind,
    recordedAt: now.toISOString(),
    ...(reference ? { reference } : {}),
  };
  const applications = [...existing, application];
  const used = opening + input.cents;
  const kindLabel = input.kind === "deposit" ? "Deposit" : "Signed quote";
  const detail = `${kindLabel} · ${formatAud(input.cents / 100)}${reference ? ` · ${reference}` : ""}`;
  return { ok: true, applications, creditUsedCents: used, detail };
}

export const CREDIT_PREVIEW_STATES = ["fresh", "mid", "urgent", "last", "hidden"] as const;
export type CreditPreviewState = (typeof CREDIT_PREVIEW_STATES)[number];

export function isCreditPreviewState(value: string | undefined | null): value is CreditPreviewState {
  return !!value && (CREDIT_PREVIEW_STATES as readonly string[]).includes(value);
}

/** Preview is for Vercel preview and local dev. Production saabai.ai does not serve it. */
export function creditPreviewEnabled(vercelEnv: string | undefined = process.env.VERCEL_ENV): boolean {
  return vercelEnv !== "production";
}

/** 9:14 am Monday 26 Oct 2026, Australia/Brisbane. The concept C sample clock. */
export const PREVIEW_DELIVERED_AT = new Date("2026-10-26T09:14:00+10:00");

const PREVIEW_RECOMMENDATIONS: { title: string; service: CreditServiceId }[] = [
  { title: "Answer website enquiries after hours", service: "lex" },
  { title: "Handle calls while you're with a client", service: "lachie" },
  { title: "Rebuild the site around online bookings", service: "website_growth" },
];

export function previewNow(state: Exclude<CreditPreviewState, "hidden">): Date {
  const ends = creditEndsAt(PREVIEW_DELIVERED_AT);
  if (state === "fresh") return new Date(PREVIEW_DELIVERED_AT.getTime());
  if (state === "mid") return new Date(ends.getTime() - (14 * DAY_MS + 9 * HOUR_MS + 32 * MINUTE_MS));
  if (state === "urgent") return new Date(ends.getTime() - (6 * DAY_MS + 3 * HOUR_MS + 20 * MINUTE_MS));
  return new Date(ends.getTime() - (7 * HOUR_MS + 12 * MINUTE_MS));
}

/** Static Coastline Physio sample. No Redis read or write. */
export function previewCreditModel(state: CreditPreviewState): BlueprintCreditModel | null {
  if (state === "hidden") return null;
  const now = previewNow(state);
  return {
    engagementId: "preview",
    tier: "pro",
    fullCents: TIER_CREDIT_CENTS.pro,
    usedCents: 0,
    deliveredAt: PREVIEW_DELIVERED_AT.toISOString(),
    endsAt: creditEndsAt(PREVIEW_DELIVERED_AT).toISOString(),
    serverNow: now.toISOString(),
    recommendations: PREVIEW_RECOMMENDATIONS,
  };
}
