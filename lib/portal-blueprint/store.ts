/**
 * Portal data operations on top of the audit store: ownership, autosave with a
 * version check, a short write lock, submit (snapshot + lock) and admin unlock.
 */
import { randomBytes } from "crypto";
import { getRedis } from "../redis";
import { getEngagement, updateEngagement } from "../audit-store";
import { newId, type AuditEngagement, type AuditEvent, type FactFindResponse, type FactFindValue } from "../audit-types";
import { answersOf, cleanValue, computeProgress, planQuestions } from "./progress";

export type OwnedResult = { ok: true; engagement: AuditEngagement } | { ok: false };

/** Ownership: the session email must equal the engagement contact email. Anything else looks like "not found". */
export async function getOwnedEngagement(id: string, email: string): Promise<OwnedResult> {
  if (typeof id !== "string" || !/^aud_[a-z0-9]+$/i.test(id)) return { ok: false };
  const e = await getEngagement(id);
  if (!e || e.contactEmail.trim().toLowerCase() !== email.trim().toLowerCase()) return { ok: false };
  return { ok: true, engagement: e };
}

export function isLocked(e: AuditEngagement): boolean {
  return Boolean(e.portal?.submittedAt);
}

/** Run fn while holding a short per-engagement lock (SET NX). Returns null if the lock stayed busy. */
export async function withLock<T>(id: string, fn: () => Promise<T>): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  const key = `bp:lock:${id}`;
  const val = randomBytes(8).toString("hex");
  let got = false;
  for (let i = 0; i < 12 && !got; i++) {
    got = (await redis.set(key, val, { nx: true, ex: 5 })) === "OK";
    if (!got) await new Promise((r) => setTimeout(r, 120));
  }
  if (!got) return null;
  try {
    return await fn();
  } finally {
    try {
      if ((await redis.get(key)) === val) await redis.del(key);
    } catch {
      /* lock expires on its own */
    }
  }
}

function event(type: AuditEvent["type"], label: string, detail?: string): AuditEvent {
  return { id: newId("evt"), type, label, detail, at: new Date().toISOString() };
}

export type SaveOutcome =
  | { status: "ok"; engagement: AuditEngagement; saved: number }
  | { status: "locked" }
  | { status: "conflict"; engagement: AuditEngagement }
  | { status: "invalid"; fields: string[] }
  | { status: "busy" }
  | { status: "notfound" };

export async function saveClientAnswers(
  id: string,
  email: string,
  input: Record<string, unknown>,
  clientVersion: unknown
): Promise<SaveOutcome> {
  const r = await withLock(id, async (): Promise<SaveOutcome> => {
    const own = await getOwnedEngagement(id, email);
    if (!own.ok) return { status: "notfound" };
    const e = own.engagement;
    if (isLocked(e)) return { status: "locked" };
    const version = e.portal?.version ?? 0;
    if (typeof clientVersion !== "number" || clientVersion !== version) return { status: "conflict", engagement: e };

    const qmap = new Map(planQuestions(e).map((q) => [q.id, q]));
    const bad: string[] = [];
    const now = new Date().toISOString();
    const merged: Record<string, FactFindResponse> = { ...e.responses };
    let saved = 0;
    for (const [qid, raw] of Object.entries(input)) {
      const q = qmap.get(qid);
      if (!q) { bad.push(qid); continue; }
      const v = cleanValue(q, raw);
      if (v === undefined) { bad.push(qid); continue; }
      if (v === null) delete merged[qid];
      else merged[qid] = { questionId: qid, value: v as FactFindValue, answeredAt: now, mode: "client" };
      saved++;
    }
    if (bad.length) return { status: "invalid", fields: bad };

    const hadClient = Object.values(e.responses).some((x) => x.mode === "client");
    const timeline = !hadClient && saved > 0
      ? [event("factfind_started", "Client started the fact-find in the portal"), ...(e.timeline ?? [])]
      : e.timeline;
    const updated = await updateEngagement(id, {
      responses: merged,
      timeline,
      portal: { ...e.portal, version: version + 1, lastClientActivityAt: now },
    });
    return updated ? { status: "ok", engagement: updated, saved } : { status: "busy" };
  });
  return r ?? { status: "busy" };
}

export type SubmitOutcome =
  | { status: "ok"; engagement: AuditEngagement; already: boolean; blanks: number }
  | { status: "missing_required"; labels: string[] }
  | { status: "consent" }
  | { status: "busy" }
  | { status: "notfound" };

/** Submit for build: validates required answers and consent, snapshots, locks. Idempotent. */
export async function submitForBuild(id: string, email: string, consent: unknown): Promise<SubmitOutcome> {
  const r = await withLock(id, async (): Promise<SubmitOutcome> => {
    const own = await getOwnedEngagement(id, email);
    if (!own.ok) return { status: "notfound" };
    const e = own.engagement;
    const prog = computeProgress(e, answersOf(e));
    if (isLocked(e)) return { status: "ok", engagement: e, already: true, blanks: prog.blanks.length };
    if (consent !== true) return { status: "consent" };
    const missing = prog.blanks.filter((b) => b.required);
    if (missing.length) return { status: "missing_required", labels: missing.map((m) => m.label) };

    const now = new Date().toISOString();
    const patch: Partial<AuditEngagement> = {
      factFindCompletedAt: now,
      timeline: [
        event("portal_submitted", "Client submitted the fact-find for build", `${prog.answered} of ${prog.totalQuestions} answered`),
        event("factfind_completed", "Client completed the questionnaire", `${prog.answered} answers`),
        ...(e.timeline ?? []),
      ],
      portal: {
        ...e.portal,
        version: (e.portal?.version ?? 0) + 1,
        submittedAt: now,
        submittedBy: e.contactEmail,
        lockedSnapshot: { ...e.responses },
        lastClientActivityAt: now,
      },
    };
    if (e.status === "purchased" || e.status === "questionnaire_sent") patch.status = "factfind_complete";
    const updated = await updateEngagement(id, patch);
    return updated ? { status: "ok", engagement: updated, already: false, blanks: prog.blanks.length } : { status: "busy" };
  });
  return r ?? { status: "busy" };
}

/** Admin reopen after submit. Keeps an audit trail; the old snapshot stays until the next submit overwrites it. */
export async function unlockForEdits(id: string): Promise<AuditEngagement | null> {
  const r = await withLock(id, async () => {
    const e = await getEngagement(id);
    if (!e || !e.portal?.submittedAt) return null;
    const now = new Date().toISOString();
    return updateEngagement(id, {
      ...(e.status === "factfind_complete" ? { status: "questionnaire_sent" as const } : {}),
      factFindCompletedAt: undefined,
      timeline: [event("portal_unlocked", "Admin reopened the fact-find for edits"), ...(e.timeline ?? [])],
      portal: {
        ...e.portal,
        version: (e.portal.version ?? 0) + 1,
        submittedAt: undefined,
        submittedBy: undefined,
        reopenedAt: [...(e.portal.reopenedAt ?? []), now],
      },
    });
  });
  return r ?? null;
}

export async function recordLogin(id: string): Promise<void> {
  await withLock(id, async () => {
    const e = await getEngagement(id);
    if (!e) return;
    await updateEngagement(id, {
      portal: { ...e.portal, lastLoginAt: new Date().toISOString() },
      timeline: [event("portal_login", "Client signed in to the portal"), ...(e.timeline ?? [])].slice(0, 200),
    });
  });
}
