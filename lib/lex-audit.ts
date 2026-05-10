import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export type AuditEventType =
  | "research_start" | "draft_generate" | "draft_export" | "draft_email"
  | "review_submit" | "review_compare" | "lead_capture" | "intake_complete"
  | "settings_changed";

export interface AuditEvent {
  id: string;
  timestamp: number;
  clientId?: string;
  userId?: string;
  eventType: AuditEventType;
  metadata: Record<string, unknown>;
}

export async function logAuditEvent(
  eventType: AuditEventType,
  metadata: Record<string, unknown> = {},
  clientId?: string,
  userId?: string
): Promise<void> {
  const event: AuditEvent = {
    id: `audit:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    clientId,
    userId,
    eventType,
    metadata,
  };
  Promise.resolve(
    redis.lpush("lex:audit:events", JSON.stringify(event))
      .then(() => redis.ltrim("lex:audit:events", 0, 4999))
      .catch(() => {})
  );
}

export async function getAuditEvents(limit = 100): Promise<AuditEvent[]> {
  const events = await redis.lrange("lex:audit:events", 0, limit - 1);
  return events.map(e => JSON.parse(e as string));
}
