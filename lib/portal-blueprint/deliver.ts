/**
 * Blueprint review and deliver (issue #363). Pure helpers so the rules are testable.
 *
 * - For buyers the Blueprint portal flag covers, a report version must be marked
 *   reviewed before it can be delivered. With the flag off nothing changes.
 * - The client only ever sees delivered versions, never the raw Blob URL in a list.
 */
import type { AuditEngagement, AuditReport } from "../audit-types";
import { portalAllowed } from "./flag";

export function reviewRequired(e: Pick<AuditEngagement, "contactEmail">, env: NodeJS.ProcessEnv = process.env): boolean {
  return portalAllowed(e.contactEmail || "", env);
}

export type DeliverCheck = { ok: true } | { ok: false; status: number; error: string };

export function canDeliver(e: Pick<AuditEngagement, "contactEmail" | "reports">, reportId: string, env: NodeJS.ProcessEnv = process.env): DeliverCheck {
  const r = (e.reports ?? []).find((x) => x.id === reportId);
  if (!r) return { ok: false, status: 404, error: "Report not found" };
  if (reviewRequired(e, env) && !r.reviewedAt) return { ok: false, status: 409, error: "Mark this report reviewed before delivering it." };
  return { ok: true };
}

export function markReviewed(reports: AuditReport[], reportId: string, now = new Date().toISOString()): AuditReport[] | null {
  if (!reports.some((r) => r.id === reportId)) return null;
  return reports.map((r) => (r.id === reportId && !r.reviewedAt ? { ...r, reviewedAt: now } : r));
}

export type PublicReport = { id: string; version: number; deliveredAt: string };

/** Delivered versions only, newest first. No URL, the download goes through an owned route. */
export function deliveredReports(e: Pick<AuditEngagement, "reports">): PublicReport[] {
  return (e.reports ?? [])
    .filter((r): r is AuditReport & { deliveredAt: string } => Boolean(r.deliveredAt))
    .sort((a, b) => b.version - a.version)
    .map((r) => ({ id: r.id, version: r.version, deliveredAt: r.deliveredAt }));
}

export function deliveredReportUrl(e: Pick<AuditEngagement, "reports">, reportId: string): string | null {
  const r = (e.reports ?? []).find((x) => x.id === reportId && x.deliveredAt);
  return r ? r.url : null;
}
