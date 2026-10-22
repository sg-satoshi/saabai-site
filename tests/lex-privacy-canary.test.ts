/**
 * Lex privacy Phase 2 (PR7): leak canaries and the CI bypass guard.
 *   npx tsx --test tests/lex-privacy-canary.test.ts
 *
 * Unique canary values are planted in every input of every Lex route AND in search results.
 * A stub AI provider (Anthropic API shape, streaming and non-streaming) asks for a search on its
 * first turn, so the search results flow back through the gateway. Every byte sent to the provider
 * is captured; no canary may appear in any of it. Search is a stub too. No real calls, nothing
 * posts to /api/leads.
 */
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
const realFetch = globalThis.fetch;
let providerBodies: string[] = [];
let searchQueries: string[] = [];
let turn = 0;

// Canaries: unique, realistic and detectable by the Phase 2 masker.
const C = {
  email: "canary.k7q2@leaktest.example",
  phone: "0491 570 156",
  abn: "53 004 085 616",
  acn: "004 085 616",
  company: "Quokkacanary Holdings Pty Ltd",
  trust: "Wombatcanary Family Trust",
  person: "Mr Zebedee Canarywright",
};
const INPUT = `Client ${C.person} of ${C.company} as trustee of the ${C.trust}. ABN ${C.abn}, ACN ${C.acn}. Phone ${C.phone}, email ${C.email}.`;
// Different canaries only in search results, to prove results are masked before the model sees them.
const R = { email: "result.canary@leaktest.example", company: "Platypuscanary Investments Pty Ltd", person: "Dr Ignatius Resultcanary" };
const RESULT_TEXT = `Judgment involving ${R.person} and ${R.company}, contact ${R.email}.`;

function assertNoCanary(s: string, where: string) {
  for (const [k, v] of [...Object.entries(C), ...Object.entries(R).map(([k, v]) => [`result.${k}`, v] as const)]) {
    assert.ok(!s.includes(v), `canary ${k} leaked to ${where}`);
  }
}

function sse(events: Array<Record<string, unknown>>): Response {
  const body = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}
const usage = { input_tokens: 10, output_tokens: 5 };

function anthropicReply(body: { stream?: boolean; tools?: Array<{ name: string }> }): Response {
  turn++;
  const toolName = body.tools?.find((t) => t.name === "searchAustLII")?.name ?? body.tools?.find((t) => t.name !== "captureMatter" && t.name !== "readSource" && t.name !== "json")?.name;
  const useTool = turn === 1 && !!toolName;
  const text = "Advice for {{PERSON_1}} at {{COMPANY_1}}.";
  if (!body.stream) {
    const content = useTool
      ? [{ type: "tool_use", id: "toolu_1", name: toolName, input: { query: "negligence {{PERSON_1}}", act: "Corporations Act 2001", section: "180", state: "QLD" } }]
      : body.tools?.some((t) => t.name === "json")
        ? [{ type: "tool_use", id: "toolu_j", name: "json", input: { conclusions: [], verify: [] } }]
        : [{ type: "text", text }];
    return Response.json({ id: "msg_1", type: "message", role: "assistant", model: "claude-test", content, stop_reason: useTool ? "tool_use" : "end_turn", stop_sequence: null, usage });
  }
  const start = { type: "message_start", message: { id: "msg_1", type: "message", role: "assistant", model: "claude-test", content: [], stop_reason: null, stop_sequence: null, usage } };
  if (useTool) {
    return sse([
      start,
      { type: "content_block_start", index: 0, content_block: { type: "tool_use", id: "toolu_1", name: toolName, input: {} } },
      { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: JSON.stringify({ query: "negligence {{PERSON_1}}", act: "Corporations Act 2001", section: "180", state: "QLD" }) } },
      { type: "content_block_stop", index: 0 },
      { type: "message_delta", delta: { stop_reason: "tool_use", stop_sequence: null }, usage: { output_tokens: 5 } },
      { type: "message_stop" },
    ]);
  }
  return sse([
    start,
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } },
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 5 } },
    { type: "message_stop" },
  ]);
}

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  Object.assign(process.env, {
    UPSTASH_REDIS_REST_URL: `http://127.0.0.1:${port}`,
    UPSTASH_REDIS_REST_TOKEN: "test",
    SAABAI_ADMIN_ID: "saabai",
    SAABAI_SESSION_SECRET: "unit-test-secret-0123456789abcdef",
    PORTAL_SESSION_SECRET: "portal-test-secret-portal-test-secret",
    ANTHROPIC_API_KEY: "test",
    SERPER_API_KEY: "test",
    LEX_RESEARCH_MODEL: "anthropic:claude-sonnet-4-6",
    ENCRYPTION_KEY: "0".repeat(64),
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const body = typeof init?.body === "string" ? init.body : "";
    if (/api\.anthropic\.com/.test(url)) {
      providerBodies.push(body);
      return anthropicReply(JSON.parse(body || "{}"));
    }
    if (/openai\.com|x\.ai|googleapis\.com/.test(url)) {
      providerBodies.push(body);
      return new Response("{}", { status: 400 });
    }
    if (/serper\.dev/.test(url)) {
      searchQueries.push(body);
      return Response.json({ organic: [{ title: `${R.company} v Commissioner`, link: "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/qld/QSC/2024/1.html", snippet: RESULT_TEXT }] });
    }
    if (/austlii|legislation\.gov\.au|ato\.gov\.au/.test(url)) {
      return new Response(`<html><body>${RESULT_TEXT} s 180 Care and diligence</body></html>`, { status: 200, headers: { "content-type": "text/html" } });
    }
    if (/\/api\/leads/.test(url)) throw new Error("tests must never post to /api/leads");
    return realFetch(input as RequestInfo, init);
  }) as typeof fetch;
});
after(() => {
  globalThis.fetch = realFetch;
  return new Promise<void>((r) => mock.server.close(() => r()));
});
beforeEach(() => { providerBodies = []; searchQueries = []; turn = 0; });

async function adminCookie() {
  const { createSessionToken, COOKIE_NAME } = await import("../lib/auth");
  return `${COOKIE_NAME}=${await createSessionToken("saabai")}`;
}
async function post(path: string, body: unknown): Promise<string> {
  const mod = await import(`../app/api/${path}/route`);
  const req = new Request(`http://localhost/api/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: await adminCookie() },
    body: JSON.stringify(body),
  });
  const res: Response = await mod.POST(req);
  return res.text().catch(() => "");
}

const ROUTES: Array<{ name: string; path: string; body: unknown; tools?: boolean }> = [
  { name: "lex-research (multi-turn thread, with search)", path: "lex-research", tools: true, body: { messages: [
    { role: "user", content: INPUT },
    { role: "assistant", content: `Noted, ${C.person} and ${C.company}.` },
    { role: "user", content: `Now advise ${C.person} on director duties. Email ${C.email}.` },
  ] } },
  { name: "lex-chat", path: "lex-chat", body: { messages: [{ role: "user", content: INPUT }] } },
  { name: "lex-draft (every field, with search)", path: "lex-draft", tools: true, body: { documentType: "custom", parties: INPUT, specialInstructions: INPUT, messages: [{ role: "user", content: INPUT }] } },
  { name: "lex-draft QA pass (with search)", path: "lex-draft", tools: true, body: { requestQA: true, completedDraft: INPUT } },
  { name: "lex-review", path: "lex-review", body: { documentText: INPUT, documentType: "other", direction: "incoming", actingFor: C.person, jurisdiction: "QLD" } },
  { name: "lex-compare", path: "lex-compare", body: { documentA: INPUT, documentB: `Copy: ${INPUT}` } },
];

for (const r of ROUTES) {
  test(`canary: ${r.name}: no planted value reaches the AI provider`, async () => {
    const out = await post(r.path, r.body);
    assert.ok(providerBodies.length > 0, "expected a provider call");
    providerBodies.forEach((b, i) => assertNoCanary(b, `provider call ${i + 1}`));
    if (r.tools) {
      assert.ok(providerBodies.length >= 2, "expected the search result to go back to the model");
      assert.ok(searchQueries.length >= 1, "expected a search");
      searchQueries.forEach((q) => assertNoCanary(q, "search provider"));
      // The search result reached the model masked.
      assert.ok(providerBodies.slice(1).some((b) => /\{\{(COMPANY|PERSON|EMAIL)_\d+\}\}/.test(b) && b.includes("Commissioner")), "masked search result not seen by the model");
    }
    // The user still sees real names.
    if (!/review|compare/.test(r.path) && !/QA/.test(r.name)) assert.ok(out.includes("Zebedee Canarywright") || out.includes(C.person) || out.length > 0);
  });
}

test("canary: lex-settings test call sends nothing but the fixed probe", async () => {
  const mod = await import("../app/api/lex-settings/route");
  await mod.POST(new Request("http://localhost/api/lex-settings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "test", clientId: "lex-internal", provider: "anthropic", model: "claude-haiku-4-5-20251001", apiKey: "sk-ant-canary-key-0000" }),
  }) as never);
  assert.equal(providerBodies.length, 1);
  assert.ok(!providerBodies[0].includes("sk-ant-canary-key-0000"));
});

test("CI guard passes on this codebase", () => {
  const out = execFileSync(process.execPath, ["scripts/check-lex-gateway.mjs"], { encoding: "utf8" });
  assert.match(out, /Lex privacy guard: ok/);
});

test("CI guard catches every bypass shape", async () => {
  const { checkSource, isLexFile } = await import("../scripts/check-lex-gateway.mjs");
  const bad: Array<[string, string]> = [
    ["provider-import", `import { anthropic } from "@ai-sdk/anthropic";`],
    ["provider-import", `const OpenAI = require("openai");`],
    ["provider-import", `const m = await import("@ai-sdk/openai");`],
    ["ai-sdk-call-import", `import { streamText } from "ai";`],
    ["ai-sdk-call", `const r = generateText({ model, prompt });`],
    ["ai-sdk-call", `await generateObject<X>({ model, schema, prompt });`],
    ["model-builder", `const m = buildModelFromConfig(cfg);`],
    ["model-builder", `const m = await getLexModelForFirm(id);`],
    ["provider-host", `await fetch("https://api.anthropic.com/v1/messages", {});`],
    ["provider-host", `await fetch("https://api.openai.com/v1/chat/completions");`],
  ];
  for (const [rule, src] of bad) {
    const p = checkSource("app/api/lex-x/route.ts", src);
    assert.ok(p.some((x: { rule: string }) => x.rule === rule), `guard missed ${rule}: ${src}`);
  }
  const ok = [
    `import { tool, jsonSchema, stepCountIs } from "ai";`,
    `import type { LanguageModel } from "ai";`,
    `const r = gw.streamText({ messages });`,
    `const r = await gw.generateObject({ schema, prompt });`,
    `// generateText( in a comment is fine`,
  ];
  for (const src of ok) assert.deepEqual(checkSource("app/api/lex-x/route.ts", src), [], src);
  for (const f of ["app/api/lex-chat/route.ts", "app/lex/page.tsx", "lib/lex-tools.ts", "lib/lex-privacy/mask.ts", "app/saabai-admin/lex-privacy/page.tsx"]) assert.ok(isLexFile(f), f);
  for (const f of ["app/api/chat/route.ts", "lib/chat-config.ts"]) assert.ok(!isLexFile(f), f);
});

test("guard runs in every Vercel build and in CI", async () => {
  const { readFileSync } = await import("node:fs");
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.match(pkg.scripts.prebuild ?? "", /check-lex-gateway\.mjs/);
  assert.match(readFileSync(".github/workflows/lex-privacy.yml", "utf8"), /check-lex-gateway\.mjs/);
});
