/**
 * AI Audit Delivery System — core types.
 *
 * One AuditEngagement is the single source of truth for a client audit:
 * profile, fact-find responses, workflows, goals, assessment, status.
 */

/** Blueprint tiers. Legacy engagements stored as essential/professional/enterprise
 * (retired AI Audit tiers) are mapped on read via normalizeAuditTier. */
export type AuditTier = "starter" | "pro" | "business";

export const AUDIT_TIERS: AuditTier[] = ["starter", "pro", "business"];

const LEGACY_TIER_MAP: Record<string, AuditTier> = {
  essential: "starter",
  professional: "pro",
  enterprise: "business",
};

/** Map any stored/legacy tier value to a current Blueprint tier. Unknown values fall back to starter. */
export function normalizeAuditTier(v: unknown): AuditTier {
  if (typeof v === "string") {
    if ((AUDIT_TIERS as string[]).includes(v)) return v as AuditTier;
    if (LEGACY_TIER_MAP[v]) return LEGACY_TIER_MAP[v];
  }
  return "starter";
}

export function isAuditTierInput(v: unknown): boolean {
  return typeof v === "string" && ((AUDIT_TIERS as string[]).includes(v) || v in LEGACY_TIER_MAP);
}

export type FirmType =
  | "law"
  | "accounting"
  | "real-estate"
  | "financial-advisory"
  | "other";

export type AuditStatus =
  | "purchased"
  | "questionnaire_sent"
  | "factfind_complete"
  | "discovery"
  | "assessment"
  | "report"
  | "delivered"
  | "closed";

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  purchased: "Purchased",
  questionnaire_sent: "Questionnaire Sent",
  factfind_complete: "Fact-Find Complete",
  discovery: "Discovery Sessions",
  assessment: "Assessment",
  report: "Report Drafting",
  delivered: "Delivered",
  closed: "Closed",
};

export const AUDIT_TIER_LABELS: Record<AuditTier, string> = {
  starter: "Starter ($497)",
  pro: "Pro ($1,497)",
  business: "Business ($3,500)",
};

export interface AuditStakeholder {
  name: string;
  role: string;
  email?: string;
  interviewed?: boolean;
  notes?: string;
}

export interface AuditToolEntry {
  category: string; // e.g. "CRM", "Practice Management", "Email", "Documents"
  name: string;
  notes?: string;
}

export interface AuditWorkflow {
  id: string;
  name: string;
  department?: string;
  description?: string;
  hoursPerWeek?: number;
  peopleInvolved?: number;
  painLevel?: number; // 1–5
  frequency?: string;
  toolsUsed?: string[];
  notes?: string;
  source: "factfind" | "interview" | "admin";
}

export interface AuditGoal {
  id: string;
  text: string;
  priority?: "high" | "medium" | "low";
  horizon?: string; // e.g. "90 days", "12 months"
}

export type FactFindValue = string | string[] | number | null;

export interface FactFindResponse {
  questionId: string;
  value: FactFindValue;
  answeredAt: string; // ISO
  mode: "client" | "interview";
}

export interface AuditOpportunity {
  id: string;
  title: string;
  description: string;
  patternId?: string; // link to capability matrix pattern
  workflowIds?: string[];
  hoursSavedPerWeek?: number;
  complexity: "low" | "medium" | "high";
  costBandAud?: string; // e.g. "$15k–$25k"
  roiNotes?: string;
  rank?: number;
  status?: "proposed" | "approved" | "cut";
}

export interface AuditAssessment {
  generatedAt: string;
  summary: string;
  opportunities: AuditOpportunity[];
  risks?: string;
  quickWins?: string;
  modelNotes?: string;
}

export interface AuditNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export type AuditEventType =
  | "created"
  | "questionnaire_sent"
  | "factfind_started"
  | "factfind_completed"
  | "interview_updated"
  | "status_changed"
  | "assessment_generated"
  | "report_generated"
  | "report_delivered";

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  label: string;
  detail?: string;
  at: string; // ISO
}

export interface AuditReport {
  id: string;
  version: number;
  filename: string;
  url: string; // Vercel Blob URL (unguessable)
  generatedAt: string;
  deliveredAt?: string;
}

export interface AuditEngagement {
  id: string;
  createdAt: string;
  updatedAt: string;

  tier: AuditTier;
  status: AuditStatus;

  // Firm profile
  firmName: string;
  firmType: FirmType;
  firmSize?: string;
  website?: string;
  location?: string;

  // Primary contact
  contactName: string;
  contactEmail: string;
  contactPhone?: string;

  stakeholders: AuditStakeholder[];
  tools: AuditToolEntry[];
  workflows: AuditWorkflow[];
  goals: AuditGoal[];

  // Fact-find
  factFindToken: string;
  factFindSentAt?: string;
  factFindCompletedAt?: string;
  responses: Record<string, FactFindResponse>;

  assessment?: AuditAssessment;
  reports?: AuditReport[];
  timeline?: AuditEvent[];
  notes: AuditNote[];

  stripeRef?: string;
  /** Stripe PaymentIntent id when paid via Checkout */
  paymentIntentId?: string;
  /** Stripe Customer id */
  stripeCustomerId?: string;
  /** Hosted invoice URL when Stripe created one */
  invoiceUrl?: string;
  /** Amount paid in the smallest currency unit (cents) */
  amountTotal?: number;
  currency?: string;
  /** Billing address summary from Stripe customer_details */
  billingAddress?: string;
  calendlyRef?: string;
  /** Promo code redeemed at checkout, and the discount it gave (cents) */
  couponCode?: string;
  discountCents?: number;
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
