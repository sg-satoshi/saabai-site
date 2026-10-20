/**
 * Doc review output. generateObject asks for this schema. parseReviewOutput is the
 * fallback for a fenced or prefaced JSON blob, so a stray ```json fence is not a 500.
 */
import { z } from "zod";
import { noDashes } from "./no-dashes";

export const ReviewSeveritySchema = z.enum(["critical", "moderate", "minor"]);

const FindingSchema = z.object({
  id: z.string().nullish(),
  severity: ReviewSeveritySchema,
  axis: z.enum(["risk", "missing", "legislation", "market", "accuracy", "completeness", "compliance", "tone"]),
  clauseRef: z.string(),
  title: z.string(),
  issue: z.string(),
  recommendation: z.string(),
  redline: z.string().nullish(),
});

export const ReviewReportSchema = z.object({
  documentType: z.string(),
  direction: z.enum(["incoming", "outgoing"]),
  actingFor: z.string().nullish(),
  jurisdiction: z.string(),
  overallScore: z.number(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  summary: z.string(),
  findings: z.array(FindingSchema),
  missingClauses: z.array(z.object({
    clause: z.string(),
    reason: z.string(),
    severity: ReviewSeveritySchema,
  })),
  legislationConflicts: z.array(z.object({
    ref: z.string(),
    clauseRef: z.string(),
    issue: z.string(),
  })),
  recommendedActions: z.array(z.string()),
  wordCount: z.number(),
  clauseCount: z.number(),
});

export type ParsedReview = z.infer<typeof ReviewReportSchema>;

export type NormalisedReview = Omit<ParsedReview, "actingFor" | "findings"> & {
  actingFor?: string;
  findings: Array<Omit<ParsedReview["findings"][number], "id" | "redline"> & { id: string; redline?: string }>;
};

const clean = (s: string) => noDashes(s).trim();

/** Strips a markdown fence and any prose around the JSON object, then parses. */
export function parseReviewOutput(text: string): unknown {
  let t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no json object");
  return JSON.parse(t.slice(start, end + 1));
}

/** Validates a review object and rewrites dashes in every string the lawyer reads. */
export function normaliseReview(raw: unknown): NormalisedReview {
  const parsed = ReviewReportSchema.parse(raw);
  const score = Math.max(0, Math.min(100, Math.round(parsed.overallScore)));
  return {
    ...parsed,
    documentType: clean(parsed.documentType),
    actingFor: parsed.actingFor ? clean(parsed.actingFor) : undefined,
    jurisdiction: clean(parsed.jurisdiction),
    overallScore: score,
    summary: clean(parsed.summary),
    findings: parsed.findings.map((f, i) => ({
      id: f.id?.trim() || `f${i + 1}`,
      severity: f.severity,
      axis: f.axis,
      clauseRef: clean(f.clauseRef),
      title: clean(f.title),
      issue: clean(f.issue),
      recommendation: clean(f.recommendation),
      redline: f.redline ? clean(f.redline) : undefined,
    })),
    missingClauses: parsed.missingClauses.map((c) => ({
      clause: clean(c.clause),
      reason: clean(c.reason),
      severity: c.severity,
    })),
    legislationConflicts: parsed.legislationConflicts.map((c) => ({
      ref: clean(c.ref),
      clauseRef: clean(c.clauseRef),
      issue: clean(c.issue),
    })),
    recommendedActions: parsed.recommendedActions.map((a) => clean(a)),
  };
}
