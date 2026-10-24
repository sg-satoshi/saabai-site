/**
 * Lex privacy Phase 2 (PR4): one gateway for every Lex model call.
 *   npx tsx --test tests/lex-privacy-gateway.test.ts
 * No real AI calls: provider requests are captured by a fetch stub and refused. Nothing posts to /api/leads.
 */
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
const AI_HOSTS = /anthropic\.com|openai\.com|x\.ai|googleapis\.com/;
const realFetch = globalThis.fetch;
let captured: string[] = [];

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.ANTHROPIC_API_KEY = "test";
  process.env.ENCRYPTION_KEY = "0".repeat(64);
  process.env.PORTAL_SESSION_SECRET = "portal-test-secret-portal-test-secret";
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (AI_HOSTS.test(url)) {
      captured.push(typeof init?.body === "string" ? init.body : String(init?.body ?? ""));
      return new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "test stub" } }), { status: 400, headers: { "content-type": "application/json" } });
    }
    return realFetch(input as RequestInfo, init);
  }) as typeof fetch;
});
after(() => {
  globalThis.fetch = realFetch;
  return new Promise<void>((r) => mock.server.close(() => r()));
});
beforeEach(() => { captured = []; });

test("lex-settings test call goes through the gateway (privacy note added, provider called once)", async () => {
  const mod = await import("../app/api/lex-settings/route");
  const req = new Request("http://localhost/api/lex-settings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "test", clientId: "lex-internal", provider: "anthropic", model: "claude-haiku-4-5-20251001", apiKey: "sk-ant-test-key" }),
  });
  const res = await mod.POST(req as never);
  const body = await res.json();
  assert.equal(body.ok, false); // the stub refuses the call
  assert.equal(captured.length, 1);
  assert.match(captured[0], /PRIVACY: Client details/);
  assert.ok(!captured[0].includes("sk-ant-test-key"), "key never in the request body");
});

test("gateway masks messages and prompt itself, and swaps known values out of the system prompt", async () => {
  const { LexGateway } = await import("../lib/lex-privacy/gateway");
  const gw = await LexGateway.open({ route: "lex-compare", firm: "test", model: { kind: "saabai", modelId: "claude-sonnet-4-6" } });
  assert.ok(gw);
  await gw.generateText({
    system: "Firm: Bluegum Holdings Pty Ltd is our client.",
    prompt: "Email jane.citizen@example.com about Bluegum Holdings Pty Ltd",
    maxRetries: 0,
  }).catch(() => {});
  assert.equal(captured.length, 1);
  assert.ok(!captured[0].includes("jane.citizen@example.com"));
  assert.ok(!captured[0].includes("Bluegum Holdings Pty Ltd"));
  assert.match(captured[0], /\{\{COMPANY_1\}\}/);
});

test("gateway fails closed before sending when masking breaks", async () => {
  const { LexGateway, __setTokenizerForTests, LexPrivacyError } = await import("../lib/lex-privacy/gateway");
  __setTokenizerForTests(() => { throw new Error("down"); });
  try {
    const gw = await LexGateway.open({ route: "lex-chat", firm: "test", model: { kind: "chat" } });
    assert.throws(() => gw!.streamText({ messages: [{ role: "user", content: "hello Mr John Smith" }] }), LexPrivacyError);
    await assert.rejects(gw!.generateText({ prompt: "x" }), LexPrivacyError);
    assert.equal(captured.length, 0);
  } finally {
    __setTokenizerForTests(null);
  }
});

test("gateway rehydrates structured output from the model", async () => {
  const { LexGateway } = await import("../lib/lex-privacy/gateway");
  const { MockLanguageModelV3 } = await import("ai/test");
  const { z } = await import("zod");
  let seen = "";
  const model = new MockLanguageModelV3({ doGenerate: async (opts: unknown) => {
    seen = JSON.stringify(opts);
    return {
      content: [{ type: "text", text: JSON.stringify({ who: "{{PERSON_1}} at {{EMAIL_1}}" }) }],
      finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } }, warnings: [],
    };
  } } as never);
  const gw = LexGateway.__forTests(model as never, { route: "lex-review", firm: "test" });
  const { object } = await gw.generateObject<{ who: string }>({ schema: z.object({ who: z.string() }) as never, prompt: "Mr John Smith, john@smith.example" });
  assert.ok(!seen.includes("john@smith.example"));
  assert.equal(object.who, "Mr John Smith at john@smith.example");
});

const LEX_MODEL_FILES = [
  "app/api/lex-chat/route.ts",
  "app/api/lex-research/route.ts",
  "app/api/lex-draft/route.ts",
  "app/api/lex-review/route.ts",
  "app/api/lex-compare/route.ts",
  "app/api/lex-settings/route.ts",
  "lib/lex-answer-meta.ts",
];
for (const f of LEX_MODEL_FILES) {
  test(`${f} uses the gateway, not the AI SDK or a provider directly`, () => {
    const src = readFileSync(f, "utf8");
    assert.match(src, /LexGateway/);
    const direct = src.replace(/gw!?\.(streamText|generateText|generateObject)/g, "");
    assert.doesNotMatch(direct, /\b(streamText|generateText|generateObject|streamObject)\s*(<[^>]*>)?\s*\(/);
    assert.doesNotMatch(src, /@ai-sdk\//);
    assert.doesNotMatch(src, /buildModelFromConfig\s*\(|getLexModelForFirm/);
  });
}
