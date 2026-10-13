/**
 * Per-site and global change logs for Mission Control.
 * Auto entries from request status changes + manual admin entries.
 */
import { randomUUID } from "crypto";
import { getRedis } from "./redis";

export const CHANGE_LOG_KEY = "saabai:change-log";

export type ChangeLogSource = "request" | "manual" | "system";

export interface ChangeLogEntry {
  id: string;
  siteId: string;
  siteName: string;
  summary: string;
  source: ChangeLogSource;
  requestId?: string;
  authorName: string;
  createdAt: string;
}

function requireRedis() {
  const redis = getRedis();
  if (!redis) throw new Error("Storage is not configured");
  return redis;
}

export async function addChangeLogEntry(
  input: Omit<ChangeLogEntry, "id" | "createdAt"> & { createdAt?: string },
): Promise<ChangeLogEntry> {
  const redis = requireRedis();
  const entry: ChangeLogEntry = {
    id: randomUUID(),
    createdAt: input.createdAt || new Date().toISOString(),
    siteId: input.siteId,
    siteName: input.siteName,
    summary: input.summary,
    source: input.source,
    requestId: input.requestId,
    authorName: input.authorName,
  };
  await redis.lpush(CHANGE_LOG_KEY, JSON.stringify(entry));
  await redis.ltrim(CHANGE_LOG_KEY, 0, 1999);
  return entry;
}

export async function listChangeLog(opts: {
  siteId?: string;
  limit?: number;
} = {}): Promise<ChangeLogEntry[]> {
  const redis = getRedis();
  if (!redis) return [];
  const limit = Math.min(opts.limit || 100, 500);
  const raw = await redis.lrange<string>(CHANGE_LOG_KEY, 0, limit * 3);
  const rows: ChangeLogEntry[] = [];
  for (const item of raw || []) {
    try {
      const e = typeof item === "string" ? (JSON.parse(item) as ChangeLogEntry) : (item as ChangeLogEntry);
      if (opts.siteId && e.siteId !== opts.siteId) continue;
      rows.push(e);
      if (rows.length >= limit) break;
    } catch {
      /* skip */
    }
  }
  return rows;
}
