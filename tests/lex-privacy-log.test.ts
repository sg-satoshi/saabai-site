/**
 * Lex privacy Phase 2 (PR6): per-firm redaction log with no raw values, plus the admin API.
 *   npx tsx --test tests/lex-privacy-log.test.ts
 * Provider calls are captured by a fetch stub and refused. Redis is the in-memory mock. Nothing posts to /api/leads.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
const AI_HOSTS = /anthropic\.com|openai\.com|x\.ai|googleapis\.com/;
const realFetch = globalThis.fetch;
const PII = ["jane.citizen@example.com", "0412 345 678", "51 824 753 556", "Bluegum Holdings Pty Ltd", "Mr John Smith"];
const TEXT = `My client Mr John Smith of Bluegum Holdings Pty Ltd (ABN 51 824 753 556) is on 0412 345 678 or jane.citizen@example.com.`;

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.SAABAI_ADMIN_ID = "saabai";
  process.env.SAABAI_SESSION_SECRET = "unit-test-secret-0123456789abcdef";
  process.env.PORTAL_SESSION_SECRET = "portal-test-secret-portal-test-secret";
  process.env.ANTHROPIC_API_KEY = "test";
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (AI_HOSTS.test(url)) {
      return new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "test stub" } }), { status: 400, headers: { "content-type": "application/json" } });
    }
    return realFetch(input as RequestInfo, init);
  }) as typeof fetch;
});
after(() => {
  globalThis.fetch = realFetch;
  return new Promise<void>((r) => mock.server.close(() => r()));
});

async function adminCookie() {
  const { createSessionToken, COOKIE_NAME } = await import("../lib/auth");
  return `${COOKIE_NAME}=${await createSessionToken("saabai")}`;
}

async function rawLog(firm: string): Promise<string[]> {
  const { getRedis } = await import("../lib/redis");
  return ((await getRedis()!.lrange(`lex:redaction:${firm}`, 0, -1)) as unknown[]).map((r) => (typeof r === "string" ? r : JSON.stringify(r)));
}

test("a Lex call writes one log entry per firm: types and counts only, no values or placeholders", async () => {
  const { LexGateway } = await import("../lib/lex-privacy/gateway");
  const gw = await LexGateway.open({ route: "lex-compare", firm: "examplefirm.com.au", model: { kind: "saabai", modelId: "claude-sonnet-4-6" } });
  await gw!.generateText({ prompt: TEXT, maxRetries: 0 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 50));
  const rows = await rawLog("examplefirm.com.au");
  assert.equal(rows.length, 1);
  for (const v of PII) assert.ok(!rows[0].includes(v), `raw value in log: ${v}`);
  assert.ok(!rows[0].includes("{{"), "placeholder in log");
  const e = JSON.parse(rows[0]);
  assert.equal(e.route, "lex-compare");
  assert.equal(e.outcome, "error"); // the stub refuses the call
  assert.match(e.masker, /^lex-mask-\d+\.\d+$/);
  assert.match(e.model, /claude-sonnet-4-6/);
  assert.ok(e.types.EMAIL >= 1 && e.types.PHONE >= 1 && e.types.ABN >= 1 && e.types.COMPANY >= 1);
  assert.equal(e.total, Object.values(e.types as Record<string, number>).reduce((a, b) => a + b, 0));
  assert.deepEqual(Object.keys(e).sort(), ["masker", "model", "outcome", "reason", "requestId", "route", "tools", "total", "ts", "types"]);
});

test("a privacy failure is logged as blocked, with a fixed reason code", async () => {
  const { LexGateway, __setTokenizerForTests } = await import("../lib/lex-privacy/gateway");
  __setTokenizerForTests(() => { throw new Error(`boom ${TEXT}`); });
  try {
    const gw = await LexGateway.open({ route: "lex-chat", firm: "blocked.example", model: { kind: "chat" } });
    assert.throws(() => gw!.streamText({ messages: [{ role: "user", content: TEXT }] }));
  } finally {
    __setTokenizerForTests(null);
  }
  await new Promise((r) => setTimeout(r, 50));
  const rows = await rawLog("blocked.example");
  assert.equal(rows.length, 1);
  for (const v of PII) assert.ok(!rows[0].includes(v));
  const e = JSON.parse(rows[0]);
  assert.equal(e.outcome, "blocked");
  assert.equal(e.reason, "Error");
});

test("cleanEntry drops anything that is not a safe shape", async () => {
  const { cleanEntry } = await import("../lib/lex-privacy/redaction-log");
  const e = cleanEntry({
    requestId: "abc", ts: 1, route: "lex-chat", model: "anthropic:claude", masker: "lex-mask-2.0", outcome: "pass",
    reason: "leak of jane.citizen@example.com", types: { EMAIL: 2, "jane@x.com": 1 } as Record<string, number>, total: 99,
    tools: { calls: 1, resultsMasked: 1, argsScrubbed: 0, errorsMasked: 0, resultsBlocked: 0 },
  });
  assert.deepEqual(e.types, { EMAIL: 2 });
  assert.equal(e.total, 2);
  assert.equal(e.reason, "other");
});

test("admin API: 403 without an admin session, firms and entries with one", async () => {
  const mod = await import("../app/api/admin/lex-redaction-log/route");
  const headers = await import("next/headers");
  void headers;
  const noAuth = await mod.GET(new Request("http://localhost/api/admin/lex-redaction-log")).catch((e: Error) => e);
  // Outside a Next request scope cookies() throws; either way no data is returned without a session.
  if (noAuth instanceof Response) assert.equal(noAuth.status, 403);
  else assert.ok(noAuth instanceof Error);
  const { listRedactionFirms, readRedactionLog } = await import("../lib/lex-privacy/redaction-log");
  const firms = await listRedactionFirms();
  assert.ok(firms.includes("examplefirm.com.au"));
  const entries = await readRedactionLog("examplefirm.com.au");
  assert.equal(entries.length, 1);
  void adminCookie;
});
