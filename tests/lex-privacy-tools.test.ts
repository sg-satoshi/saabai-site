/**
 * Lex privacy Phase 2 (PR5): tool calls and search results are masked both ways by the gateway.
 *   npx tsx --test tests/lex-privacy-tools.test.ts
 * Mock model only, no network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tool, jsonSchema, stepCountIs } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { LexGateway } from "../lib/lex-privacy/gateway";

const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } };

function scriptedModel(toolName: string, args: unknown) {
  const prompts: string[] = [];
  let n = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async (opts: { prompt: unknown }) => {
      prompts.push(JSON.stringify(opts.prompt));
      n++;
      if (n === 1) {
        return { content: [{ type: "tool-call", toolCallId: "c1", toolName, input: JSON.stringify(args) }], finishReason: { unified: "tool-calls", raw: "tool_use" }, usage, warnings: [] };
      }
      return { content: [{ type: "text", text: "Found it for {{PERSON_1}}." }], finishReason: { unified: "stop", raw: "stop" }, usage, warnings: [] };
    },
  } as never);
  return { model, prompts };
}

test("search tool: model args keep placeholders, results are masked before the model sees them", async () => {
  const { model, prompts } = scriptedModel("searchAustLII", { query: "duty of care {{PERSON_1}} Mr John Smith" });
  const gw = LexGateway.__forTests(model as never, { route: "lex-research", firm: "test" });
  let toolSaw = "";
  const res = await gw.generateText({
    messages: [{ role: "user", content: "Advise Mr John Smith on negligence" }],
    stopWhen: stepCountIs(3),
    tools: {
      searchAustLII: tool<{ query: string }, unknown>({
        description: "search",
        inputSchema: jsonSchema<{ query: string }>({ type: "object", properties: { query: { type: "string" } }, required: ["query"] }),
        execute: async (input) => {
          toolSaw = JSON.stringify(input);
          return { results: [{ title: "Smith case", snippet: "Contact Ms Alice Brown at alice.brown@example.org or 0412 345 678 at Gumtree Holdings Pty Ltd" }] };
        },
      }),
    },
  });
  assert.ok(!toolSaw.includes("Mr John Smith"), "search provider got a real name");
  assert.match(toolSaw, /\{\{PERSON_1\}\}/);
  const second = prompts[1];
  for (const raw of ["Ms Alice Brown", "alice.brown@example.org", "0412 345 678", "Gumtree Holdings Pty Ltd", "Mr John Smith"]) {
    assert.ok(!second.includes(raw), `raw value reached the model: ${raw}`);
  }
  assert.equal(res.text, "Found it for Mr John Smith.");
  assert.equal(gw.toolStats.calls, 1);
  assert.equal(gw.toolStats.resultsMasked, 1);
  assert.equal(gw.toolStats.argsScrubbed, 1);
});

test("tool errors are masked before the model sees them", async () => {
  const { model, prompts } = scriptedModel("readSource", { id: "S1" });
  const gw = LexGateway.__forTests(model as never, { route: "lex-research", firm: "test" });
  await gw.generateText({
    messages: [{ role: "user", content: "hi" }],
    stopWhen: stepCountIs(3),
    tools: {
      readSource: tool<{ id: string }, unknown>({
        description: "read",
        inputSchema: jsonSchema<{ id: string }>({ type: "object", properties: { id: { type: "string" } }, required: ["id"] }),
        execute: async () => { throw new Error("failed for bob.jones@example.net"); },
      }),
    },
  });
  assert.ok(!prompts[1].includes("bob.jones@example.net"));
  assert.equal(gw.toolStats.errorsMasked, 1);
});

test("first-party captureMatter gets real details (firm's own records), result still masked", async () => {
  const { model } = scriptedModel("captureMatter", { name: "{{PERSON_1}}", email: "{{EMAIL_1}}" });
  const gw = LexGateway.__forTests(model as never, { route: "lex-research", firm: "test" });
  let saw: Record<string, string> = {};
  await gw.generateText({
    messages: [{ role: "user", content: "I am Mr John Smith, jsmith@example.com" }],
    stopWhen: stepCountIs(3),
    tools: {
      captureMatter: tool<{ name: string; email: string }, unknown>({
        description: "capture",
        inputSchema: jsonSchema<{ name: string; email: string }>({ type: "object", properties: { name: { type: "string" }, email: { type: "string" } }, required: ["name"] }),
        execute: async (input) => { saw = input; return { ok: true }; },
      }),
    },
  });
  assert.equal(saw.name, "Mr John Smith");
  assert.equal(saw.email, "jsmith@example.com");
});

test("research and draft pass their tools through the gateway (no unwrapped tool path)", () => {
  for (const f of ["app/api/lex-research/route.ts", "app/api/lex-draft/route.ts"]) {
    const src = readFileSync(f, "utf8");
    assert.match(src, /gw\.streamText\(/, f);
  }
  const gw = readFileSync("lib/lex-privacy/gateway.ts", "utf8");
  assert.match(gw, /tools: this\.wrapTools\(params\.tools\)/);
});
