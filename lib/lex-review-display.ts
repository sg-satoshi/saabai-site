/**
 * Display helpers for the Lex doc review view (phase D). Pure functions over the unchanged /api/lex-review report.
 */
import { normaliseClauseId } from "./lex-draft-display";

export type ReviewSeverity = "critical" | "moderate" | "minor";
export type ReviewFinding = {
  id: string; severity: ReviewSeverity; axis: string; clauseRef: string;
  title: string; issue: string; recommendation: string; redline?: string;
};
export type ReviewMissingClause = { clause: string; reason: string; severity: ReviewSeverity };
export type ReviewLegislationConflict = { ref: string; clauseRef: string; issue: string };
export type ReviewReport = {
  documentType: string; direction: "incoming" | "outgoing"; actingFor?: string; jurisdiction: string;
  overallScore: number; riskLevel: "low" | "medium" | "high" | "critical";
  summary: string; findings: ReviewFinding[];
  missingClauses: ReviewMissingClause[]; legislationConflicts: ReviewLegislationConflict[];
  recommendedActions: string[]; wordCount: number; clauseCount: number;
};

export type IssueKind = "finding" | "missing" | "legislation";
export type ReviewIssue = {
  key: string; kind: IssueKind; severity: ReviewSeverity; title: string; detail: string;
  clauseRef?: string; clauseId?: string; axis?: string; recommendation?: string; redline?: string; law?: string;
};

export const SEVERITY: Record<ReviewSeverity, { label: string; tone: "bad" | "warn" | "info"; rank: number }> = {
  critical: { label: "High", tone: "bad", rank: 0 },
  moderate: { label: "Medium", tone: "warn", rank: 1 },
  minor: { label: "Low", tone: "info", rank: 2 },
};

export const RISK_LABEL: Record<ReviewReport["riskLevel"], string> = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };

const AXIS_LABEL: Record<string, string> = {
  risk: "Risk", missing: "Missing", legislation: "Legislation", market: "Market", accuracy: "Accuracy",
  completeness: "Completeness", compliance: "Compliance", tone: "Tone",
};
export const axisLabel = (a?: string) => (a ? AXIS_LABEL[a] ?? a[0].toUpperCase() + a.slice(1) : "");

/** Clause number in a reference such as "Clause 7.2", "cl 4.1(b)" or "7.2"; undefined for "General". */
export function clauseIdFromRef(ref?: string): string | undefined {
  if (!ref || !/\d/.test(ref)) return undefined;
  return normaliseClauseId(ref);
}

/** One issue list from findings, missing clauses and legislation conflicts, most severe first. */
export function buildIssues(r: ReviewReport): ReviewIssue[] {
  const sev = (s: string): ReviewSeverity => (s === "critical" || s === "moderate" || s === "minor" ? s : "moderate");
  const out: ReviewIssue[] = [
    ...(r.findings ?? []).map((f, i) => ({
      key: `f${i}`, kind: "finding" as const, severity: sev(f.severity), title: f.title, detail: f.issue,
      clauseRef: f.clauseRef, clauseId: clauseIdFromRef(f.clauseRef), axis: f.axis, recommendation: f.recommendation, redline: f.redline,
    })),
    ...(r.missingClauses ?? []).map((m, i) => ({
      key: `m${i}`, kind: "missing" as const, severity: sev(m.severity), title: `${m.clause} missing`, detail: m.reason,
    })),
    ...(r.legislationConflicts ?? []).map((l, i) => ({
      key: `l${i}`, kind: "legislation" as const, severity: "moderate" as const, title: l.ref, detail: l.issue,
      clauseRef: l.clauseRef, clauseId: clauseIdFromRef(l.clauseRef), law: l.ref,
    })),
  ];
  return out.sort((a, b) => SEVERITY[a.severity].rank - SEVERITY[b.severity].rank);
}

export function severityCounts(issues: ReviewIssue[]): Record<ReviewSeverity, number> {
  const c: Record<ReviewSeverity, number> = { critical: 0, moderate: 0, minor: 0 };
  for (const i of issues) c[i.severity]++;
  return c;
}

/** Highest-severity issue per clause id, for in-document highlights. */
export function issuesByClause(issues: ReviewIssue[]): Map<string, ReviewIssue[]> {
  const m = new Map<string, ReviewIssue[]>();
  for (const i of issues) if (i.clauseId) m.set(i.clauseId, [...(m.get(i.clauseId) ?? []), i]);
  return m;
}
