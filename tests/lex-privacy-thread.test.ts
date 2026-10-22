/**
 * Lex privacy Phase 2 (PR8): placeholders are stable across a whole thread, and streaming
 * rehydration handles them split across chunks.
 *   npx tsx --test tests/lex-privacy-thread.test.ts
 * Provider calls are captured by a fetch stub and refused. Nothing posts to /api/leads.
 */
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
const realFetch = globalThis.fetch;
let captured: string[] = [];

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  Object.assign(process.env, {
    UPSTASH_REDIS_REST_URL: `http://127.0.0.1:${port}`,
    UPSTASH_REDIS_REST_TOKEN: "test",
    PORTAL_SESSION_SECRET: "portal-test-secret-portal-test-secret",
    ANTHROPIC_API_KEY: "test",
    LEX_RESEARCH_MODEL: "anthropic:claude-sonnet-4-6",
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (/anthropic\.com|openai\.com|x\.ai|googleapis\.com/.test(url)) {
      captured.push(typeof init?.body === "string" ? init.body : "");
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

const EMAIL = "jane.citizen@example.com";
const COMPANY = "Bluegum Holdings Pty Ltd";

function tokenFor(masked: string, type: string): string {
  const m = masked.match(new RegExp(`\\{\\{${type}_\\d+\\}\\}`));
  assert.ok(m, `no ${type} token in ${masked}`);
  return m![0];
}

test("same firm and thread: the same value gets the same placeholder in every request, in any order", async () => {
  const { LexMasker, lexThreadKey } = await import("../lib/lex-privacy/mask");
  const key = lexThreadKey("firm.example", "id:t_1");
  const turn1 = new LexMasker(key).mask(`Email ${EMAIL} for ${COMPANY}`);
  // A later turn: other values first, history truncated, the value appears last.
  const turn2 = new LexMasker(lexThreadKey("firm.example", "id:t_1")).mask(`Call 0412 345 678, also Acme Widgets Pty Ltd, then ${COMPANY} and ${EMAIL}`);
  assert.equal(tokenFor(turn1, "EMAIL"), tokenFor(turn2, "EMAIL"));
  assert.equal(tokenFor(turn1, "COMPANY"), turn2.match(/\{\{COMPANY_\d+\}\}/g)!.find((t) => t === tokenFor(turn1, "COMPANY")));
});

test("different thread or different firm: different placeholders (no cross-thread linking)", async () => {
  const { LexMasker, lexThreadKey } = await import("../lib/lex-privacy/mask");
  const a = tokenFor(new LexMasker(lexThreadKey("firm.example", "id:t_1")).mask(EMAIL), "EMAIL");
  const b = tokenFor(new LexMasker(lexThreadKey("firm.example", "id:t_2")).mask(EMAIL), "EMAIL");
  const c = tokenFor(new LexMasker(lexThreadKey("other.example", "id:t_1")).mask(EMAIL), "EMAIL");
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});

test("two different values never share a placeholder, even on a hash collision", async () => {
  const { LexMasker, lexThreadKey } = await import("../lib/lex-privacy/mask");
  const m = new LexMasker(lexThreadKey("firm.example", "id:t_9"));
  const emails = Array.from({ length: 300 }, (_, i) => `person${i}@example.com`);
  const masked = m.mask(emails.join(" "));
  const tokens = masked.match(/\{\{EMAIL_\d+\}\}/g)!;
  assert.equal(new Set(tokens).size, 300);
  assert.equal(m.rehydrate(masked), emails.join(" "));
});

test("lex-research: two turns of one thread send the same placeholder to the provider", async () => {
  const mod = await import("../app/api/lex-research/route");
  const send = async (messages: unknown) => {
    const res: Response = await mod.POST(new Request("http://localhost/api/lex-research", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, threadId: "t_1729000000000" }),
    }));
    await res.text().catch(() => "");
  };
  await send([{ role: "user", content: `Advise ${COMPANY}, contact ${EMAIL}` }]);
  const first = captured.at(-1)!;
  await send([
    { role: "user", content: `Advise ${COMPANY}, contact ${EMAIL}` },
    { role: "assistant", content: `Here is advice for ${COMPANY}.` },
    { role: "user", content: `Also Acme Widgets Pty Ltd. Email ${EMAIL} again.` },
  ]);
  const second = captured.at(-1)!;
  assert.ok(!first.includes(EMAIL) && !second.includes(EMAIL));
  assert.equal(tokenFor(first, "EMAIL"), tokenFor(second, "EMAIL"));
  assert.equal(tokenFor(first, "COMPANY"), tokenFor(second, "COMPANY"));
});

test("lex-research sends the thread id from the /lex page", async () => {
  const { readFileSync } = await import("node:fs");
  assert.match(readFileSync("app/lex/page.tsx", "utf8"), /scope: useScope, threadId: finalId/);
});

test("streaming rehydration: 5 digit placeholders split across chunks, unknown tokens left as is", async () => {
  const { createRehydrator } = await import("../lib/lex-privacy/mask");
  const r = createRehydrator({ "{{PERSON_48213}}": "Mr John Smith", "{{EMAIL_10007}}": EMAIL });
  const chunks = ["Dear {", "{PERSON_", "482", "13}}, re {{EMAIL_1000", "7}} and {{PHONE_99999}} {"];
  const out = chunks.map((c) => r.push(c)).join("") + r.flush();
  assert.equal(out, `Dear Mr John Smith, re ${EMAIL} and {{PHONE_99999}} {`);
});
