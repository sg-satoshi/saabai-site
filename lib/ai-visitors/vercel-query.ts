/**
 * Read-only Vercel Observability query. Uses the existing access token.
 * The token is never logged or returned.
 */
import { BRISBANE_OFFSET_MS, OBSERVABILITY_LIMIT_MAX, OBSERVABILITY_MAX_PAGES, type MetricRow } from "./types";

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

function textOf(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) return JSON.stringify(value);
  return "";
}

/** Upstream observability errors, including Vercel's zod issues, are passed through. */
export function observabilityErrorText(body: unknown, status: number): string {
  if (Array.isArray(body)) {
    const text = JSON.stringify(body);
    if (text) return text.slice(0, 500);
  }
  if (body && typeof body === "object") {
    const record = body as { error?: unknown; message?: unknown };
    const direct = textOf(record.error);
    if (direct && !direct.startsWith("{") && !direct.startsWith("[")) return direct.slice(0, 500);
    if (record.error && typeof record.error === "object" && !Array.isArray(record.error)) {
      const nested = textOf((record.error as { message?: unknown }).message);
      if (nested) return nested.slice(0, 500);
    }
    if (direct) return direct.slice(0, 500);
    const message = textOf(record.message);
    if (message) return message.slice(0, 500);
  }
  return `Observability query failed (${status})`;
}

export function clampObservabilityLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return OBSERVABILITY_LIMIT_MAX;
  return Math.min(OBSERVABILITY_LIMIT_MAX, Math.max(1, Math.floor(limit)));
}

/** Cursor from the shapes this API has used. Absent when the page is only a hard cap. */
export function readPageCursor(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return;
  const record = payload as Record<string, unknown>;
  const pagination = record.pagination && typeof record.pagination === "object"
    ? record.pagination as Record<string, unknown>
    : null;
  for (const value of [pagination?.next, pagination?.cursor, record.cursor, record.nextCursor, record.next]) {
    const text = textOf(value);
    if (text && text !== "null") return text;
  }
}

export function paginationRejected(status: number, payload: unknown): boolean {
  if (status !== 400 && status !== 422) return false;
  const text = observabilityErrorText(payload, status).toLowerCase();
  return text.includes("offset") || text.includes("cursor") || text.includes("unrecognized");
}

function rowKey(row: MetricRow): string {
  return [
    row.timestamp ?? "",
    row.request_hostname ?? "",
    row.request_path ?? "",
    row.bot_category ?? "",
    row.bot_name ?? "",
    row.referrer_hostname ?? "",
    row.http_status ?? "",
    String(row.value),
  ].join("\u0000");
}

function samePage(left: MetricRow[], right: MetricRow[]): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    if (rowKey(left[i]) !== rowKey(right[i])) return false;
  }
  return true;
}

export type ObservabilityTransport = (body: Record<string, unknown>) => Promise<{ ok: boolean; status: number; parsed: unknown }>;

type QueryInput = {
  startTime: string;
  endTime: string;
  groupBy: string[];
  filter?: string;
  limit?: number;
};

type PageResult = { rows: MetricRow[]; truncated: boolean };

const MIN_SLICE_MS = 60 * 60 * 1000;

function requestBody(input: QueryInput, page: { limit: number; cursor?: string; offset?: number }, scope: { teamId: string; projectId: string } | null): Record<string, unknown> {
  const limit = clampObservabilityLimit(page.limit);
  if (limit > OBSERVABILITY_LIMIT_MAX) {
    throw new ObservabilityError(0, "Refusing to query observability with limit above 500");
  }
  return {
    metric: "vercel.request.count",
    ...(scope ? { scope: { type: "project", ownerId: scope.teamId, projectIds: [scope.projectId] } } : {}),
    aggregation: "sum",
    groupBy: input.groupBy,
    ...(input.filter ? { filter: input.filter } : {}),
    granularity: { days: 1 },
    bucketTimezone: "Australia/Brisbane",
    startTime: input.startTime,
    endTime: input.endTime,
    limit,
    ...(page.cursor ? { cursor: page.cursor } : {}),
    ...(page.offset && page.offset > 0 ? { offset: page.offset } : {}),
  };
}

async function defaultTransport(body: Record<string, unknown>): Promise<{ ok: boolean; status: number; parsed: unknown }> {
  const { token, teamId } = config();
  let last = { ok: false, status: 0, parsed: null as unknown };
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
    if (response.ok) return { ok: true, status: response.status, parsed };
    last = { ok: false, status: response.status, parsed };
    if (response.status !== 429 && response.status < 500) break;
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  return last;
}

type Budget = { left: number; allowOffset: boolean };

async function fetchPage(
  input: QueryInput,
  page: { limit: number; cursor?: string; offset?: number },
  transport: ObservabilityTransport,
  budget: Budget,
): Promise<{ ok: true; rows: MetricRow[]; parsed: unknown } | { ok: false; status: number; parsed: unknown; message: string }> {
  if (budget.left <= 0) {
    return { ok: false, status: 0, parsed: null, message: "Observability page budget exhausted" };
  }
  budget.left -= 1;
  const response = await transport(requestBody(input, page, null));
  if (!response.ok) {
    return { ok: false, status: response.status, parsed: response.parsed, message: observabilityErrorText(response.parsed, response.status) };
  }
  return { ok: true, rows: parseMetricRows(response.parsed), parsed: response.parsed };
}

async function followCursor(
  input: QueryInput,
  limit: number,
  rows: MetricRow[],
  cursor: string,
  transport: ObservabilityTransport,
  budget: Budget,
): Promise<PageResult> {
  const seen = new Set<string>([cursor]);
  let next = cursor;
  const merged = [...rows];
  while (budget.left > 0) {
    const page = await fetchPage(input, { limit, cursor: next }, transport, budget);
    if (!page.ok) {
      if (page.status === 0) return { rows: merged, truncated: true };
      throw new ObservabilityError(page.status, page.message);
    }
    if (page.rows.length === 0 || samePage(rows, page.rows)) {
      return { rows: merged, truncated: page.rows.length >= limit };
    }
    merged.push(...page.rows);
    if (page.rows.length < limit) return { rows: merged, truncated: false };
    const step = readPageCursor(page.parsed);
    if (!step || seen.has(step)) return { rows: merged, truncated: true };
    seen.add(step);
    next = step;
  }
  return { rows: merged, truncated: true };
}

async function followOffset(
  input: QueryInput,
  limit: number,
  rows: MetricRow[],
  transport: ObservabilityTransport,
  budget: Budget,
): Promise<{ result: PageResult; rejected: boolean }> {
  const merged = [...rows];
  let offset = rows.length;
  let previous = rows;
  let stepped = false;
  while (budget.left > 0) {
    const page = await fetchPage(input, { limit, offset }, transport, budget);
    if (!page.ok) {
      if (page.status === 0) return { result: { rows: merged, truncated: true }, rejected: false };
      if (paginationRejected(page.status, page.parsed)) {
        return { result: { rows: stepped ? merged : rows, truncated: true }, rejected: !stepped };
      }
      throw new ObservabilityError(page.status, page.message);
    }
    if (page.rows.length === 0) return { result: { rows: merged, truncated: false }, rejected: false };
    if (samePage(previous, page.rows)) {
      return { result: { rows: stepped ? merged : rows, truncated: true }, rejected: !stepped };
    }
    stepped = true;
    merged.push(...page.rows);
    if (page.rows.length < limit) return { result: { rows: merged, truncated: false }, rejected: false };
    previous = page.rows;
    offset += page.rows.length;
  }
  return { result: { rows: merged, truncated: true }, rejected: false };
}

async function collectWindow(input: QueryInput, transport: ObservabilityTransport, budget: Budget): Promise<PageResult> {
  const limit = clampObservabilityLimit(input.limit);
  const first = await fetchPage(input, { limit }, transport, budget);
  if (!first.ok) {
    if (first.status === 0) return { rows: [], truncated: true };
    throw new ObservabilityError(first.status, first.message);
  }
  if (first.rows.length < limit) return { rows: first.rows, truncated: false };

  const cursor = readPageCursor(first.parsed);
  if (cursor) return followCursor(input, limit, first.rows, cursor, transport, budget);

  if (budget.allowOffset) {
    const paged = await followOffset(input, limit, first.rows, transport, budget);
    if (!paged.rejected) return paged.result;
    budget.allowOffset = false;
  }

  const start = Date.parse(input.startTime);
  const end = Date.parse(input.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end - start <= MIN_SLICE_MS || budget.left < 2) {
    return { rows: first.rows, truncated: true };
  }
  const mid = new Date(start + Math.floor((end - start) / 2)).toISOString();
  const left = await collectWindow({ ...input, endTime: mid }, transport, budget);
  const right = await collectWindow({ ...input, startTime: mid }, transport, budget);
  return {
    rows: [...left.rows, ...right.rows],
    truncated: left.truncated || right.truncated,
  };
}

export async function queryRequests(
  input: QueryInput,
  options?: { transport?: ObservabilityTransport },
): Promise<{ rows: MetricRow[]; truncated: boolean }> {
  const transport = options?.transport ?? (async (body) => {
    const { teamId, projectId } = config();
    const withScope = { ...body, scope: { type: "project", ownerId: teamId, projectIds: [projectId] } };
    return defaultTransport(withScope);
  });
  return collectWindow(input, transport, { left: OBSERVABILITY_MAX_PAGES, allowOffset: true });
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
