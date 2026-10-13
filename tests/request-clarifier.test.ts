/**
 * AI clarifier unit tests (mock LLM, mock Redis).
 * Example: "update our opening hours from 9-5 to 8-6"
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  delete process.env.RESEND_API_KEY;
});

after(() => new Promise<void>((r) => mock.server.close(() => r())));

async function seedRequest(overrides: Record<string, unknown> = {}) {
  const { createRequest } = await import("../lib/client-requests");
  return createRequest({
    clientId: "hours-client",
    clientName: "Jess",
    clientEmail: "jess@harbour.test",
    siteId: "harbour",
    siteName: "Harbour Physio",
    title: "Update opening hours",
    description: "update our opening hours from 9-5 to 8-6",
    type: "text_change",
    priority: "normal",
    screenshots: [],
    ...overrides,
  } as Parameters<typeof createRequest>[0]);
}

test("clarifier agrees when opening hours change is clear (mock LLM)", async () => {
  const { maybeClarifyRequest, buildClarifierPrompt } = await import("../lib/request-clarifier");
  const { getRequest, setClarifierEnabled } = await import("../lib/client-requests");
  await setClarifierEnabled("hours-client", true);
  const req = await seedRequest();
  const prompt = buildClarifierPrompt(req, "Site Harbour Physio. Niche: physio.");
  assert.match(prompt, /opening hours from 9-5 to 8-6/i);
  assert.match(prompt, /Never promise price, timeline, or scope/);
  assert.ok(!/\u2014/.test(prompt), "prompt has no em dashes");

  const next = await maybeClarifyRequest(req, "Site Harbour Physio", {
    llm: async () =>
      JSON.stringify({
        action: "agree",
        summary: "Update opening hours from 9am-5pm to 8am-6pm on the site (Contact / footer as applicable).",
      }),
  });
  assert.equal(next.status, "triaged");
  assert.match(next.agreedChange || "", /8am-6pm|8-6/i);
  assert.ok(next.timeline.some((t) => t.kind === "agreed_change" && t.internal));
  const stored = await getRequest(req.id);
  assert.equal(stored?.status, "triaged");
});

test("clarifier asks 1-2 questions and sets awaiting_client", async () => {
  const { maybeClarifyRequest } = await import("../lib/request-clarifier");
  const { setClarifierEnabled } = await import("../lib/client-requests");
  await setClarifierEnabled("hours-client", true);
  const req = await seedRequest({
    title: "Change something",
    description: "Please update the thing on the website somehow.",
  });
  const next = await maybeClarifyRequest(req, "Site Harbour Physio", {
    llm: async () =>
      JSON.stringify({
        action: "ask",
        questions: ["Which page should we update?", "What should the new wording be?"],
      }),
  });
  assert.equal(next.status, "awaiting_client");
  assert.equal(next.clarifierRounds, 1);
  const assistant = next.timeline.filter((t) => t.authorKind === "assistant" && t.kind === "comment");
  assert.equal(assistant.length, 1);
  assert.match(assistant[0]!.body, /Which page/);
  assert.ok(!/\u2014/.test(assistant[0]!.body));
});

test("Critical requests skip the clarifier", async () => {
  const { maybeClarifyRequest } = await import("../lib/request-clarifier");
  const req = await seedRequest({ priority: "critical", title: "Site down", description: "Booking page returns Error 500 for all patients." });
  assert.equal(req.autoHandle, true);
  assert.equal(req.discussWithShane, false);
  assert.equal(req.assignee, "chief_ai");
  let called = false;
  const next = await maybeClarifyRequest(req, "Site Harbour Physio", {
    llm: async () => {
      called = true;
      return JSON.stringify({ action: "ask", questions: ["Should never run"] });
    },
  });
  assert.equal(called, false);
  assert.equal(next.status, "new");
  assert.equal(next.clarifierRounds, 0);
});

test("clarifier off per client skips LLM", async () => {
  const { maybeClarifyRequest } = await import("../lib/request-clarifier");
  const { setClarifierEnabled } = await import("../lib/client-requests");
  await setClarifierEnabled("hours-client", false);
  const req = await seedRequest({ title: "Tweaks", description: "Please tweak the homepage banner text a bit." });
  let called = false;
  const next = await maybeClarifyRequest(req, "ctx", {
    llm: async () => {
      called = true;
      return "{}";
    },
  });
  assert.equal(called, false);
  assert.equal(next.status, "new");
  await setClarifierEnabled("hours-client", true);
});

test("after 3 clarifier rounds hands off to Shane", async () => {
  const { maybeClarifyRequest, MAX_CLARIFIER_ROUNDS } = await import("../lib/request-clarifier");
  const { setClarifierEnabled, saveRequest } = await import("../lib/client-requests");
  await setClarifierEnabled("hours-client", true);
  let req = await seedRequest({ description: "Need help with an unclear change please." });
  req.clarifierRounds = MAX_CLARIFIER_ROUNDS;
  req = await saveRequest(req);
  const next = await maybeClarifyRequest(req, "ctx", {
    llm: async () => JSON.stringify({ action: "ask", questions: ["More?"] }),
  });
  assert.equal(next.discussWithShane, true);
  assert.equal(next.autoHandle, false);
  assert.equal(next.status, "triaged");
  assert.ok(next.timeline.some((t) => /Handing this to Shane/i.test(t.body)));
});

test("clarifier never commits to price timeline or scope in prompt rules", async () => {
  const { buildClarifierPrompt } = await import("../lib/request-clarifier");
  const { createRequest } = await import("../lib/client-requests");
  const req = await createRequest({
    clientId: "c2",
    clientName: "A",
    clientEmail: "a@a.test",
    title: "Quote?",
    description: "How much and when can you do a redesign?",
    type: "other",
    priority: "normal",
    screenshots: [],
  });
  const prompt = buildClarifierPrompt(req, "");
  assert.match(prompt, /Ask questions only/i);
  assert.match(prompt, /Never promise price, timeline, or scope/i);
  assert.match(prompt, /No em dashes/);
});

test("Critical defaults to Chief auto-handle, not Discuss with Shane", async () => {
  const { createRequest } = await import("../lib/client-requests");
  const req = await createRequest({
    clientId: "crit-client",
    clientName: "Jess",
    clientEmail: "jess@harbour.test",
    title: "Site down",
    description: "Booking page returns Error 500 for all patients right now.",
    type: "bug",
    priority: "critical",
    screenshots: [],
  });
  assert.equal(req.autoHandle, true);
  assert.equal(req.discussWithShane, false);
  assert.equal(req.assignee, "chief_ai");
  assert.match(req.timeline[0]!.body, /Chief AI/i);
});
