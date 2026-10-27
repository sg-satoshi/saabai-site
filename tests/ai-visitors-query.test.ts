/**
 * Observability queries must stay within Vercel's limit of 500 and page the rest.
 * Run: npx tsx --test tests/ai-visitors-query.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildView } from "../lib/ai-visitors/snapshot";
import { OBSERVABILITY_LIMIT_MAX } from "../lib/ai-visitors/types";
import {
  clampObservabilityLimit,
  observabilityErrorText,
  queryRequests,
  type ObservabilityTransport,
} from "../lib/ai-visitors/vercel-query";

const ZOD_LIMIT = "[{ origin: 'number', code: 'too_big', maximum: 500, inclusive: true, path: ['limit'], message: 'Too big: expected number to be <=500' }]";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

test("the limit error is upstream zod, and this route does not declare that schema", () => {
  assert.equal(observabilityErrorText({ error: { message: ZOD_LIMIT } }, 400), ZOD_LIMIT);
  assert.equal(OBSERVABILITY_LIMIT_MAX, 500);
  assert.equal(clampObservabilityLimit(1000), 500);
  assert.equal(clampObservabilityLimit(undefined), 500);
  const route = read("app/api/admin/ai-visitors/route.ts");
  assert.doesNotMatch(route, /from ["']zod["']/);
  assert.doesNotMatch(route, /too_big/);
  assert.match(read("lib/ai-visitors/vercel-query.ts"), /api\.vercel\.com\/v2\/observability\/query/);
});

function rows(count: number, start: number) {
  return Array.from({ length: count }, (_, index) => ({
    request_path: `/p/${start + index}`,
    vercel_request_count_sum: 1,
  }));
}

function cursorTransport(total: number): { calls: Record<string, unknown>[]; transport: ObservabilityTransport } {
  const calls: Record<string, unknown>[] = [];
  const transport: ObservabilityTransport = async (body) => {
    calls.push(body);
    const limit = Number(body.limit);
    const cursor = typeof body.cursor === "string" ? Number(body.cursor) : 0;
    const page = rows(Math.min(limit, Math.max(0, total - cursor)), cursor);
    const next = cursor + page.length < total ? String(cursor + page.length) : undefined;
    return {
      ok: true,
      status: 200,
      parsed: { data: page, ...(next ? { pagination: { next } } : {}) },
    };
  };
  return { calls, transport };
}

test("7, 30 and 90 day windows page with cursor and never send limit above 500", async () => {
  const end = Date.parse("2026-10-26T14:00:00.000Z");
  for (const days of [7, 30, 90]) {
    const total = days * 40;
    const { calls, transport } = cursorTransport(total);
    const result = await queryRequests({
      startTime: new Date(end - days * 86_400_000).toISOString(),
      endTime: new Date(end).toISOString(),
      groupBy: ["request_path"],
      limit: 1000,
    }, { transport });
    assert.equal(result.rows.length, total, `${days}d rows`);
    assert.equal(result.truncated, false, `${days}d truncated`);
    assert.ok(calls.length >= 1, `${days}d calls`);
    for (const call of calls) {
      assert.equal(call.limit, 500, `${days}d limit`);
      assert.ok(!("limit" in call) || Number(call.limit) <= 500);
    }
    if (total > 500) {
      assert.ok(calls.some((call) => typeof call.cursor === "string"), `${days}d cursor`);
    }
  }
});

test("a full page without a cursor continues with offset", async () => {
  const calls: Record<string, unknown>[] = [];
  const transport: ObservabilityTransport = async (body) => {
    calls.push(body);
    const offset = typeof body.offset === "number" ? body.offset : 0;
    const count = offset === 0 ? 500 : 120;
    return { ok: true, status: 200, parsed: { data: rows(count, offset) } };
  };
  const result = await queryRequests({
    startTime: "2026-10-25T14:00:00.000Z",
    endTime: "2026-10-26T14:00:00.000Z",
    groupBy: ["request_hostname", "request_path"],
    limit: 5000,
  }, { transport });
  assert.equal(result.rows.length, 620);
  assert.equal(result.truncated, false);
  assert.deepEqual(calls.map((call) => call.limit), [500, 500]);
  assert.equal(calls[1]?.offset, 500);
  assert.equal(calls[0]?.offset, undefined);
});

test("when offset is rejected, the day is split instead of keeping a partial top 500", async () => {
  const calls: Record<string, unknown>[] = [];
  const transport: ObservabilityTransport = async (body) => {
    calls.push(body);
    assert.ok(Number(body.limit) <= 500);
    if (typeof body.offset === "number") {
      return { ok: false, status: 400, parsed: { error: { message: "Unrecognized key: offset" } } };
    }
    const hours = (Date.parse(String(body.endTime)) - Date.parse(String(body.startTime))) / 3_600_000;
    if (hours > 6) {
      return { ok: true, status: 200, parsed: { data: rows(500, 0).map((row) => ({ ...row, request_path: "/truncated-page" })) } };
    }
    return {
      ok: true,
      status: 200,
      parsed: {
        data: [
          { request_path: String(body.startTime), vercel_request_count_sum: 2 },
          { request_path: `${body.startTime}#b`, vercel_request_count_sum: 1 },
        ],
      },
    };
  };
  const result = await queryRequests({
    startTime: "2026-10-25T14:00:00.000Z",
    endTime: "2026-10-26T14:00:00.000Z",
    groupBy: ["request_path"],
    limit: 1000,
  }, { transport });
  assert.equal(result.truncated, false);
  assert.equal(result.rows.length, 8);
  assert.ok(result.rows.every((row) => row.request_path !== "/truncated-page"));
  assert.equal(new Set(result.rows.map((row) => row.request_path?.slice(0, 24))).size, 4);
  assert.ok(calls.some((call) => call.offset === 500));
  assert.ok(calls.every((call) => Number(call.limit) <= 500));
});

test("an upstream limit rejection is surfaced and is not turned into a zero report", async () => {
  await assert.rejects(
    () => queryRequests({
      startTime: "2026-10-25T14:00:00.000Z",
      endTime: "2026-10-26T14:00:00.000Z",
      groupBy: ["request_path"],
    }, {
      transport: async (body) => {
        assert.equal(body.limit, 500);
        return { ok: false, status: 400, parsed: { error: { message: ZOD_LIMIT } } };
      },
    }),
    (error: unknown) => error instanceof Error && error.message === ZOD_LIMIT,
  );
});

test("7, 30 and 90 day reports cover that many Brisbane dates", () => {
  const site = { key: "saabai", label: "saabai.ai", hosts: ["saabai.ai", "www.saabai.ai"], pathPrefix: null };
  for (const days of [7, 30, 90]) {
    const view = buildView({ sites: [site], snapshots: { saabai: [] }, days, today: "2026-10-26" });
    assert.equal(view.days, days);
    assert.equal(view.dates.length, days);
    assert.equal(view.to, "2026-10-26");
    assert.equal(view.from, view.dates[0]);
    assert.equal(view.dates.at(-1), "2026-10-26");
  }
});
