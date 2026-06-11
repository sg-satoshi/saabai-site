/**
 * AI Audit Delivery System — core types.
 *
 * One AuditEngagement is the single source of truth for a client audit:
 * profile, fact-find responses, workflows, goals, assessment, status.
 */

export type AuditTier = "essential" | "professional" | "enterprise";

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
  essential: "Essential ($3,500)",
  professional: "Professional ($7,500)",
  enterprise: "Enterprise ($15,000)",
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
  notes: AuditNote[];

  stripeRef?: string;
  calendlyRef?: string;
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
