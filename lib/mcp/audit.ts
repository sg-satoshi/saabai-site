/**
 * Append-only audit log for gateway tool executions.
 *
 * Every call records an event so a future Saabai dashboard can show exactly what
 * AI workers did across tenants. Sensitive args are redacted before persist.
 */
import { kvListAppend, kvListRange } from "./store";
import type { Risk } from "./schema";

export interface AuditEvent {
  timestamp: string;
  tenantId: string;
  agent: string;
  tool: string;
  toolKey: string;
  args: unknown;
  risk: Risk;
  approvalState?: string;
  connector?: string;
  result?: unknown;
  latencyMs: number;
  error?: string;
}

const KEY = "audit:events";

/** Best-effort redaction of secret-like argument keys (non-exhaustive). */
export function redactArgs(args: unknown): unknown {
  if (!args || typeof args !== "object") return args;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args as Record<string, unknown>)) {
    if (/secret|token|password|apikey|authorization|bearer/i.test(k)) out[k] = "[REDACTED]";
    else out[k] = v;
  }
  return out;
}

export async function recordAudit(evt: Omit<AuditEvent, "timestamp">): Promise<void> {
  const event: AuditEvent = {
    ...evt,
    args: redactArgs(evt.args),
    timestamp: new Date().toISOString(),
  };
  await kvListAppend(KEY, event);
  void event;
}

export async function readAudit(limit = 50): Promise<AuditEvent[]> {
  const events = await kvListRange(KEY, -limit, -1);
  return events as AuditEvent[];
}
