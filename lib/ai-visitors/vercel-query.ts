/**
 * Read-only Vercel Observability query. Uses the existing access token.
 * The token is never logged or returned.
 */
import { BRISBANE_OFFSET_MS, QUERY_ROW_LIMIT, type MetricRow } from "./types";

const ENDPOINT = "https://api.vercel.com/v2/observability/query";

export class ObservabilityError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ObservabilityError";
  }
}

function config(): { token: string; teamId: string; projectId: string } {
  const token = process.env.VERCEL_ACCESS_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !teamId || !projectId) {
    throw new ObservabilityError(0, "Observability is not configured");
  }
  return { token, teamId, projectId };
}

function rowValue(row: Record<string, unknown>): number {
  const direct = row.vercel_request_count_sum;
  if (typeof direct === "number") return direct;
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith("_sum") && typeof value === "number") return value;
  }
  return 0;
}

function asText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

export function parseMetricRows(payload: unknown): MetricRow[] {
  const data = payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
    ? (payload as { data: unknown[] }).data
    : [];
  const rows: MetricRow[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    rows.push({
      timestamp: asText(row.timestamp),
      value: rowValue(row),
      request_hostname: asText(row.request_hostname),
      request_path: asText(row.request_path),
      bot_category: asText(row.bot_category),
      bot_name: asText(row.bot_name),
      referrer_hostname: asText(row.referrer_hostname),
      http_status: asText(row.http_status),
    });
  }
  return rows;
}

function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const record = body as { error?: { message?: string } | string; message?: string };
    if (typeof record.error === "string" && record.error) return record.error;
    if (record.error && typeof record.error === "object" && record.error.message) return record.error.message;
    if (record.message) return record.message;
  }
  return `Observability query failed (${status})`;
}

export async function queryRequests(input: {
  startTime: string;
  endTime: string;
  groupBy: string[];
  filter?: string;
  limit?: number;
}): Promise<{ rows: MetricRow[]; truncated: boolean }> {
  const { token, teamId, projectId } = config();
  const limit = input.limit ?? QUERY_ROW_LIMIT;
  const body = {
    metric: "vercel.request.count",
    scope: { type: "project", ownerId: teamId, projectIds: [projectId] },
    aggregation: "sum",
    groupBy: input.groupBy,
    ...(input.filter ? { filter: input.filter } : {}),
    granularity: { days: 1 },
    bucketTimezone: "Australia/Brisbane",
    startTime: input.startTime,
    endTime: input.endTime,
    limit,
  };

  let lastError = new ObservabilityError(0, "Observability query failed");
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(`${ENDPOINT}?teamId=${encodeURIComponent(teamId)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    if (response.ok) {
      const rows = parseMetricRows(parsed);
      return { rows, truncated: rows.length >= limit };
    }
    lastError = new ObservabilityError(response.status, errorMessage(parsed, response.status));
    if (response.status !== 429 && response.status < 500) break;
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  throw lastError;
}

/** Brisbane calendar day as an exclusive UTC window aligned to midnight in Brisbane. */
export function brisbaneWindow(date: string): { startTime: string; endTime: string } {
  const [year, month, day] = date.split("-").map(Number);
  const start = Date.UTC(year, month - 1, day) - BRISBANE_OFFSET_MS;
  return {
    startTime: new Date(start).toISOString(),
    endTime: new Date(start + 86_400_000).toISOString(),
  };
}
