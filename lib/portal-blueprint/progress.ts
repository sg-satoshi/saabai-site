/**
 * Pure helpers: per-plan question lists, answer validation and progress.
 * No I/O so they can be unit tested.
 */
import {
  FACTFIND_SECTIONS,
  questionsForTier,
  type FactFindQuestion,
  type FactFindSection,
} from "../audit-factfind";
import type { AuditEngagement, FactFindValue } from "../audit-types";

export const MAX_TEXT = 5000;

export function planQuestions(e: Pick<AuditEngagement, "tier" | "firmType">): FactFindQuestion[] {
  return questionsForTier(e.tier, e.firmType);
}

export function planSections(e: Pick<AuditEngagement, "tier" | "firmType">): FactFindSection[] {
  const qs = planQuestions(e);
  return FACTFIND_SECTIONS.filter((s) => qs.some((q) => q.section === s.id));
}

export function isAnswered(v: FactFindValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  return Number.isFinite(v);
}

/** Validate and normalise one answer. Returns undefined when invalid, null to clear. */
export function cleanValue(q: FactFindQuestion, v: unknown): FactFindValue | undefined {
  if (v === null || v === "") return null;
  switch (q.type) {
    case "text":
    case "textarea":
      return typeof v === "string" && v.length <= MAX_TEXT ? v : undefined;
    case "number":
      return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1e9 ? v : undefined;
    case "scale":
      return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5 ? v : undefined;
    case "select":
      return typeof v === "string" && (q.options ?? []).includes(v) ? v : undefined;
    case "multiselect": {
      if (!Array.isArray(v) || v.length > 50) return undefined;
      const opts = q.options ?? [];
      if (!v.every((x) => typeof x === "string" && opts.includes(x))) return undefined;
      return Array.from(new Set(v as string[]));
    }
  }
  return undefined;
}

export type SectionState = "empty" | "partial" | "done";

export interface SectionProgress {
  id: string;
  title: string;
  total: number;
  answered: number;
  requiredTotal: number;
  requiredAnswered: number;
  state: SectionState;
}

export interface PortalProgress {
  totalQuestions: number;
  answered: number;
  percent: number;
  sections: SectionProgress[];
  /** First section that still has an unanswered question (or null if all answered). */
  firstUnfinishedSectionId: string | null;
  /** Unanswered questions, in order. */
  blanks: { id: string; label: string; section: string; required: boolean }[];
  missingRequired: number;
}

export function computeProgress(
  e: Pick<AuditEngagement, "tier" | "firmType">,
  answers: Record<string, FactFindValue | undefined>
): PortalProgress {
  const qs = planQuestions(e);
  const sections = planSections(e).map((s): SectionProgress => {
    const sq = qs.filter((q) => q.section === s.id);
    const answered = sq.filter((q) => isAnswered(answers[q.id])).length;
    const req = sq.filter((q) => q.required);
    const requiredAnswered = req.filter((q) => isAnswered(answers[q.id])).length;
    return {
      id: s.id,
      title: s.title,
      total: sq.length,
      answered,
      requiredTotal: req.length,
      requiredAnswered,
      state: answered === 0 ? "empty" : answered === sq.length ? "done" : "partial",
    };
  });
  const blanks = qs
    .filter((q) => !isAnswered(answers[q.id]))
    .map((q) => ({ id: q.id, label: q.label, section: q.section, required: Boolean(q.required) }));
  const answered = qs.length - blanks.length;
  return {
    totalQuestions: qs.length,
    answered,
    percent: qs.length ? Math.round((answered / qs.length) * 100) : 0,
    sections,
    firstUnfinishedSectionId: sections.find((s) => s.state !== "done")?.id ?? null,
    blanks,
    missingRequired: blanks.filter((b) => b.required).length,
  };
}

export function answersOf(e: Pick<AuditEngagement, "responses">): Record<string, FactFindValue> {
  return Object.fromEntries(Object.entries(e.responses ?? {}).map(([k, r]) => [k, r.value]));
}

/** Short customer-facing order reference, same pattern as the confirmation page. */
export function orderRef(e: Pick<AuditEngagement, "id" | "stripeRef">): string {
  return e.stripeRef ? "SB-" + e.stripeRef.slice(-6).toUpperCase() : "SB-" + e.id.slice(-6).toUpperCase();
}

export const TIER_NAMES = { starter: "Starter", pro: "Pro", business: "Business" } as const;
