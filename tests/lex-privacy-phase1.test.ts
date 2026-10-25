/**
 * Lex privacy Phase 1: every Lex model route masks client details and fails closed.
 *   npx tsx --test tests/lex-privacy-phase1.test.ts
 *
 * No real AI calls. Outbound requests to AI providers are captured by a fetch stub
 * (then refused with a 400), so the tests assert on exactly what a provider would receive.
 * Redis is the in-memory Upstash mock. Nothing posts to /api/leads.
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

const PII = {
  email: "jane.citizen@example.com",
  phone: "0412 345 678",
  abn: "51 824 753 556",
  company: "Bluegum Holdings Pty Ltd",
  person: "Mr John Smith",
};
const PII_TEXT = `My client ${PII.person} of ${PII.company} (ABN ${PII.abn}) can be reached on ${PII.phone} or ${PII.email}.`;

function assertNoPII(payload: string) {
  for (const [k, v] of Object.entries(PII)) {
    assert.ok(!payload.includes(v), `raw ${k} reached the AI provider`);
  }
  assert.match(payload, /\{\{EMAIL_\d+\}\}/);
}

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.SAABAI_ADMIN_ID = "saabai";
  process.env.SAABAI_SESSION_SECRET = "unit-test-secret-0123456789abcdef";
  process.env.PORTAL_SESSION_SECRET = "portal-test-secret-portal-test-secret";
  process.env.ANTHROPIC_API_KEY = "test";
  process.env.OPENAI_API_KEY = "test";
  process.env.LEX_RESEARCH_MODEL = "anthropic:claude-sonnet-4-6";
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
beforeEach(async () => {
  captured = [];
  const { __setTokenizerForTests } = await import("../lib/lex-privacy/mask");
  __setTokenizerForTests(null);
});

async function adminCookie() {
  const { createSessionToken, COOKIE_NAME } = await import("../lib/auth");
  return `${COOKIE_NAME}=${await createSessionToken("saabai")}`;
}
async function post(path: string, body: unknown): Promise<Response> {
  const mod = await import(`../app/api/${path}/route`);
  const req = new Request(`http://localhost/api/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: await adminCookie() },
    body: JSON.stringify(body),
  });
  const res: Response = await mod.POST(req);
  await res.text().catch(() => ""); // drain streams so the model call happens
  return res;
}
async function breakDetector() {
  const { __setTokenizerForTests } = await import("../lib/lex-privacy/mask");
  __setTokenizerForTests(() => { throw new Error("detector down"); });
}

const ROUTES: Array<{ name: string; path: string; body: unknown }> = [
  { name: "lex-research (main /lex app, no flag)", path: "lex-research", body: { messages: [{ role: "user", content: PII_TEXT }] } },
  { name: "lex-research ignores privacyMode:false", path: "lex-research", body: { messages: [{ role: "user", content: PII_TEXT }], privacyMode: false } },
  { name: "lex-chat", path: "lex-chat", body: { messages: [{ role: "user", content: PII_TEXT }] } },
  { name: "lex-draft (parties, instructions, messages)", path: "lex-draft", body: { documentType: "custom", parties: PII_TEXT, specialInstructions: PII_TEXT, messages: [{ role: "user", content: PII_TEXT }] } },
  { name: "lex-draft QA pass", path: "lex-draft", body: { requestQA: true, completedDraft: PII_TEXT } },
  { name: "lex-review (uploaded document text)", path: "lex-review", body: { documentText: PII_TEXT, documentType: "other", direction: "incoming", actingFor: PII.person, jurisdiction: "QLD" } },
  { name: "lex-compare (both documents)", path: "lex-compare", body: { documentA: PII_TEXT, documentB: `Second copy: ${PII_TEXT}` } },
];

for (const r of ROUTES) {
  test(`${r.name}: provider only ever sees placeholders`, async () => {
    await post(r.path, r.body);
    assert.ok(captured.length > 0, "expected an outbound model call");
    for (const body of captured) assertNoPII(body);
  });
  test(`${r.name}: fails closed when masking errors (nothing sent)`, async () => {
    await breakDetector();
    const res = await post(r.path, r.body);
    assert.equal(captured.length, 0, "a model call was made after a privacy failure");
    assert.equal(res.status, 503);
  });
}

test("answer check (buildAnswerMeta) goes through the gateway in lex-research", () => {
  const src = readFileSync("app/api/lex-research/route.ts", "utf8");
  assert.match(src, /buildAnswerMeta\(gw\.child\("lex-answer-check"\), text, registry\)/);
});

test("masker: shared placeholders, rehydration and leak check", async () => {
  const { LexMasker, LexPrivacyError, __setTokenizerForTests } = await import("../lib/lex-privacy/mask");
  const m = new LexMasker();
  const a = m.mask(PII_TEXT);
  const b = m.mask(`Email ${PII.email} again, plus other@example.com`);
  assertNoPII(a + b);
  assert.match(b, /\{\{EMAIL_1\}\}.*\{\{EMAIL_2\}\}/);
  assert.equal(m.rehydrate(a), PII_TEXT);
  // A detector that misses a value already known to the session is caught by the leak check.
  __setTokenizerForTests((t) => ({ tokenized: t, tokenMap: {}, stats: { tokensReplaced: 0, types: {} } }));
  assert.throws(() => m.assertClean(`leak ${PII.email}`), LexPrivacyError);
});

test("streaming rehydrator handles placeholders split across chunks", async () => {
  const { createRehydrator } = await import("../lib/lex-privacy/mask");
  const r = createRehydrator({ "{{PERSON_1}}": "Mr John Smith" });
  const out = ["Hello {", "{PERS", "ON_1", "}} today"].map((c) => r.push(c)).join("") + r.flush();
  assert.equal(out, "Hello Mr John Smith today");
});

test("no privacy toggle left in Lex clients", () => {
  for (const f of ["app/lex-widget/page.tsx", "app/lex/page.tsx", "app/api/lex-research/route.ts"]) {
    assert.ok(!/privacyMode/.test(readFileSync(f, "utf8").replace(/\/\/.*privacyMode.*$/gm, "")), `${f} still references privacyMode`);
  }
});

// ── Regression: PARTY false positive (live QA, 22 Oct) and placeholder-aware confidence check ──
import { streamText as __streamText, simulateReadableStream as __sim } from "ai";
import { MockLanguageModelV3 as __Mock } from "ai/test";
import { dropNarrationTransform as __dropNarr } from "../lib/lex-output";
import { noDashesTransform as __noDash } from "../lib/no-dashes";
import { rehydrateTransform as __rehyd, LexMasker as __Masker } from "../lib/lex-privacy/mask";
import { PLACEHOLDER_NOTE } from "../lib/lex-answer-meta";
import { readFileSync as __read } from "node:fs";

const __F = "Mr John Smith of Smith Holdings Pty Ltd, john@example.com, 0400 000 000, ABN 51 824 753 556";

async function __runStream(map: Record<string, string>, deltas: string[]): Promise<string> {
  const model = new __Mock({ doStream: async () => ({ stream: __sim({ chunks: [
    { type: "stream-start", warnings: [] }, { type: "text-start", id: "0" },
    ...deltas.map((delta) => ({ type: "text-delta", id: "0", delta })),
    { type: "text-end", id: "0" },
    { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } } },
  ] as never }) }) as never });
  const r = __streamText({ model, prompt: "x", experimental_transform: [__rehyd(map), __dropNarr(), __noDash()] });
  let s = "";
  for await (const p of r.fullStream) if (p.type === "text-delta") s += p.text;
  return s;
}

test("lowercase role phrases are not masked as a PARTY", () => {
  const m = new __Masker();
  m.mask(__F);
  const draftAsk = m.mask("Draft a 2 sentence letter heading naming the client with their email, phone and ABN.");
  assert.equal(draftAsk, "Draft a 2 sentence letter heading naming the client with their email, phone and ABN.");
  const r = new __Masker();
  const q = r.mask(`Repeat back exactly who my client is and their email, phone and ABN: ${__F}.`);
  assert.ok(q.startsWith("Repeat back exactly who my client is and their email"), q);
  assert.ok(!Object.values(r.map).includes("client is and their"));
});

test("a real party name after a role word is masked, the role word stays", () => {
  const m = new __Masker();
  const out = m.mask("Our client Jane Citizen and the respondent Bob Jones attended.");
  assert.match(out, /^Our client \{\{(PARTY|PERSON)_1\}\} and the respondent \{\{(PARTY|PERSON)_\d\}\} attended\.$/);
  assert.ok(!out.includes("Jane") && !out.includes("Bob"));
  assert.equal(m.rehydrate(out), "Our client Jane Citizen and the respondent Bob Jones attended.");
});

test("stream: placeholders at sentence start, split across chunks, restored through all transforms", async () => {
  const m = new __Masker();
  m.mask(__F);
  const s = await __runStream(m.map, ["{{PERS", "ON_1}} of {{COMPANY_1}}", ", {", "{EMAIL_1}} | {{PHONE_1}} | ABN {{ABN_1}}"]);
  assert.equal(s, __F.replace(", john", ", john").replace("john@example.com, 0400 000 000, ABN", "john@example.com | 0400 000 000 | ABN"));
  assert.ok(!/\{\{|\}\}/.test(s));
});

test("stream: placeholders right after a stripped narration paragraph are kept", async () => {
  const m = new __Masker();
  m.mask(__F);
  const s = await __runStream(m.map, ["Let me check the details.\n\n", "{{PERSON_1}}", " of {{COMP", "ANY_1}} — email {{EMAIL_1}}."]);
  assert.equal(s, "Mr John Smith of Smith Holdings Pty Ltd, email john@example.com.");
});

test("confidence check is told placeholders are deliberate privacy masks", () => {
  assert.match(PLACEHOLDER_NOTE, /\{\{PERSON_1\}\}/);
  assert.match(PLACEHOLDER_NOTE, /deliberate privacy masks/);
  assert.match(PLACEHOLDER_NOTE, /not unfilled template placeholders/);
  const src = __read(new URL("../lib/lex-answer-meta.ts", import.meta.url), "utf8");
  assert.match(src, /no em dashes\. " \+\s*PLACEHOLDER_NOTE/);
});
