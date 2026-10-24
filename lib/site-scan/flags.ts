import { randomUUID } from "node:crypto";
import { CHECKS } from "./checks";
import type { ScanReport } from "./types";

export type FalsePositiveFlag = {
  id: string;
  checkId: string;
  domain: string;
  reportId: string;
  note: string;
  createdAt: string;
  source: "panel" | "chat";
};

const CHECK_ID = /^[a-z0-9_]{1,40}$/;

export function allowedCheckIds(report: ScanReport): Set<string> {
  return new Set([
    ...CHECKS.map((c) => c.id),
    ...report.fixes.map((f) => f.id),
    ...report.passed.map((p) => p.id),
    ...report.unverified.map((u) => u.id),
  ]);
}

/** Pure check before anything is written. Domain always comes from the saved report. */
export function normaliseFalsePositive(input: {
  report: ScanReport;
  checkId: unknown;
  note: unknown;
  source: "panel" | "chat";
  now?: Date;
  id?: string;
}): { ok: true; flag: FalsePositiveFlag } | { ok: false; error: string } {
  const checkId = String(input.checkId ?? "").trim();
  if (!CHECK_ID.test(checkId) || !allowedCheckIds(input.report).has(checkId)) return { ok: false, error: "Unknown check." };
  const domain = input.report.domain.trim().toLowerCase().slice(0, 200);
  if (!domain) return { ok: false, error: "This scan has no site to attach the flag to." };
  if (!/^[0-9a-f-]{36}$/.test(input.report.id)) return { ok: false, error: "Missing scan." };
  const note = String(input.note ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
  if (note.length < 3) return { ok: false, error: "Add a short note about why this is a false positive." };
  return {
    ok: true,
    flag: {
      id: input.id ?? randomUUID(),
      checkId,
      domain,
      reportId: input.report.id,
      note,
      createdAt: (input.now ?? new Date()).toISOString(),
      source: input.source,
    },
  };
}
