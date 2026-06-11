/**
 * AI Audit Delivery System — Redis persistence.
 *
 * Keys:
 *   audit:engagements          — hash: id → JSON(AuditEngagement)
 *   audit:token:{token}        — string: engagement id (public fact-find link lookup)
 */

import { getRedis } from "./redis";
import {
  AuditEngagement,
  AuditEvent,
  AuditEventType,
  AuditNote,
  FactFindResponse,
  newId,
} from "./audit-types";

const ENGAGEMENTS_KEY = "audit:engagements";
const TOKEN_PREFIX = "audit:token:";

function parse<T>(raw: unknown): T | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  return raw as T;
}

export function generateFactFindToken(): string {
  // 32 hex chars — unguessable public link token
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createEngagement(
  input: Pick<
    AuditEngagement,
    "tier" | "firmName" | "firmType" | "contactName" | "contactEmail"
  > &
    Partial<AuditEngagement>
): Promise<AuditEngagement | null> {
  const redis = getRedis();
  if (!redis) return null;

  const now = new Date().toISOString();
  const engagement: AuditEngagement = {
    id: newId("aud"),
    createdAt: now,
    updatedAt: now,
    status: "purchased",
    stakeholders: [],
    tools: [],
    workflows: [],
    goals: [],
    responses: {},
    notes: [],
    timeline: [
      {
        id: newId("evt"),
        type: "created",
        label: "Engagement created",
        detail: `${input.tier} tier`,
        at: now,
      },
    ],
    factFindToken: generateFactFindToken(),
    ...input,
  };

  await redis.hset(ENGAGEMENTS_KEY, {
    [engagement.id]: JSON.stringify(engagement),
  });
  await redis.set(`${TOKEN_PREFIX}${engagement.factFindToken}`, engagement.id);
  return engagement;
}

export async function getEngagement(
  id: string
): Promise<AuditEngagement | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.hget(ENGAGEMENTS_KEY, id);
  return parse<AuditEngagement>(raw);
}

export async function getEngagementByToken(
  token: string
): Promise<AuditEngagement | null> {
  const redis = getRedis();
  if (!redis) return null;
  const id = await redis.get<string>(`${TOKEN_PREFIX}${token}`);
  if (!id) return null;
  return getEngagement(id);
}

export async function listEngagements(): Promise<AuditEngagement[]> {
  const redis = getRedis();
  if (!redis) return [];
  const raw = await redis.hgetall<Record<string, string>>(ENGAGEMENTS_KEY);
  if (!raw) return [];
  const items = Object.values(raw)
    .map((v) => parse<AuditEngagement>(v))
    .filter(Boolean) as AuditEngagement[];
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateEngagement(
  id: string,
  patch: Partial<AuditEngagement>
): Promise<AuditEngagement | null> {
  const existing = await getEngagement(id);
  if (!existing) return null;
  const redis = getRedis();
  if (!redis) return null;

  const updated: AuditEngagement = {
    ...existing,
    ...patch,
    id: existing.id, // immutable
    createdAt: existing.createdAt,
    factFindToken: existing.factFindToken,
    updatedAt: new Date().toISOString(),
  };
  await redis.hset(ENGAGEMENTS_KEY, { [id]: JSON.stringify(updated) });
  return updated;
}

export async function deleteEngagement(id: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const existing = await getEngagement(id);
  if (!existing) return false;
  await redis.hdel(ENGAGEMENTS_KEY, id);
  await redis.del(`${TOKEN_PREFIX}${existing.factFindToken}`);
  return true;
}

/** Append a timeline event to an engagement (most recent first). */
export async function logEvent(
  id: string,
  type: AuditEventType,
  label: string,
  detail?: string
): Promise<AuditEngagement | null> {
  const existing = await getEngagement(id);
  if (!existing) return null;
  const event: AuditEvent = {
    id: newId("evt"),
    type,
    label,
    detail,
    at: new Date().toISOString(),
  };
  return updateEngagement(id, {
    timeline: [event, ...(existing.timeline ?? [])],
  });
}

/** Merge fact-find responses (partial saves supported). Auto-logs timeline. */
export async function saveResponses(
  id: string,
  responses: FactFindResponse[],
  options?: { markComplete?: boolean }
): Promise<AuditEngagement | null> {
  const existing = await getEngagement(id);
  if (!existing) return null;

  const merged = { ...existing.responses };
  for (const r of responses) merged[r.questionId] = r;

  const patch: Partial<AuditEngagement> = { responses: merged };

  // Timeline auto-events
  const events: AuditEvent[] = [];
  const now = new Date().toISOString();
  const hadClientResponses = Object.values(existing.responses).some(
    (r) => r.mode === "client"
  );
  const savingClient = responses.some((r) => r.mode === "client");
  const savingInterview = responses.some((r) => r.mode === "interview");

  if (savingClient && !hadClientResponses && responses.length > 0) {
    events.push({
      id: newId("evt"),
      type: "factfind_started",
      label: "Client started the questionnaire",
      at: now,
    });
  }
  if (savingInterview && responses.length > 0) {
    events.push({
      id: newId("evt"),
      type: "interview_updated",
      label: "Discovery interview answers updated",
      detail: `${responses.length} answer${responses.length === 1 ? "" : "s"}`,
      at: now,
    });
  }
  if (options?.markComplete) {
    patch.factFindCompletedAt = now;
    if (
      existing.status === "purchased" ||
      existing.status === "questionnaire_sent"
    ) {
      patch.status = "factfind_complete";
    }
    events.push({
      id: newId("evt"),
      type: "factfind_completed",
      label: "Client completed the questionnaire",
      detail: `${Object.keys(merged).length} answers`,
      at: now,
    });
  }
  if (events.length > 0) {
    patch.timeline = [...events, ...(existing.timeline ?? [])];
  }

  return updateEngagement(id, patch);
}

export async function addEngagementNote(
  id: string,
  text: string,
  author = "Admin"
): Promise<AuditEngagement | null> {
  const existing = await getEngagement(id);
  if (!existing) return null;
  const note: AuditNote = {
    id: newId("note"),
    text: text.trim(),
    author,
    createdAt: new Date().toISOString(),
  };
  return updateEngagement(id, { notes: [note, ...existing.notes] });
}
