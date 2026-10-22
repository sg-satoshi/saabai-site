/**
 * Lex privacy Phase 3: open-source name model, with graceful fallback.
 *   npx tsx --test tests/lex-privacy-p3-ner.test.ts
 * Uses the real model when scripts/fetch-ner-model.mjs has fetched it (CI does), else only the stubs run.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { __setNerForTests, aggregate, chunks, detectNames, NER_MODEL } from "../lib/lex-privacy/ner";
import { LexMasker } from "../lib/lex-privacy/mask";

const HAVE_MODEL = existsSync(join(process.cwd(), "models", NER_MODEL, "onnx", "model_quantized.onnx"));
after(() => __setNerForTests(undefined));

test("aggregate joins word pieces into entities", () => {
  const e = aggregate([
    { entity: "B-PER", score: 0.99, index: 1, word: "Margaret" }, { entity: "I-PER", score: 1, index: 2, word: "Ok" }, { entity: "I-PER", score: 1, index: 3, word: "##afor" },
    { entity: "B-ORG", score: 1, index: 5, word: "River" }, { entity: "B-ORG", score: 0.99, index: 6, word: "##bend" }, { entity: "I-ORG", score: 1, index: 7, word: "Logistics" },
    { entity: "B-MISC", score: 1, index: 9, word: "Corporations" },
  ]);
  assert.deepEqual(e.map((x) => [x.kind, x.text]), [["person", "Margaret Okafor"], ["org", "Riverbend Logistics"]]);
});

test("chunks never exceed the window and keep every character", () => {
  const t = "Sentence one is here. ".repeat(400);
  const c = chunks(t);
  assert.ok(c.every((x) => x.length <= 1500));
  assert.equal(c.join(""), t);
});

test("model that will not load: falls back, nothing breaks, status unavailable", async () => {
  __setNerForTests(null);
  const r = await detectNames(["Margaret Okafor met Brendan Walsh."]);
  assert.equal(r.status, "unavailable");
  assert.deepEqual(r.parties, []);
  __setNerForTests(undefined);
});

test("model that throws: status failed, request continues", async () => {
  __setNerForTests(async () => { throw new Error("onnx boom Margaret Okafor"); });
  const r = await detectNames(["Margaret Okafor met Brendan Walsh."]);
  assert.equal(r.status, "failed");
  __setNerForTests(undefined);
});

test("time budget: long input is marked partial", async () => {
  __setNerForTests(async () => { await new Promise((r) => setTimeout(r, 30)); return []; });
  const r = await detectNames(["Text. ".repeat(3000)], { budgetMs: 50 });
  assert.equal(r.status, "partial");
  __setNerForTests(undefined);
});

test("gateway: model failure never blocks masking or the request", async () => {
  const { LexGateway } = await import("../lib/lex-privacy/gateway");
  const { MockLanguageModelV3 } = await import("ai/test");
  __setNerForTests(null);
  let seen = "";
  const model = new MockLanguageModelV3({ doGenerate: async (o: unknown) => { seen = JSON.stringify(o); return { content: [{ type: "text", text: "ok" }], finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } }, warnings: [] }; } } as never);
  const gw = LexGateway.__forTests(model as never, { route: "lex-chat", firm: "test" });
  assert.equal(await gw.scanNames(["Email jo@leak.example"]), "unavailable");
  await gw.generateText({ prompt: "Email jo@leak.example" });
  assert.ok(!seen.includes("jo@leak.example"));
  __setNerForTests(undefined);
});

test("real model: finds untitled names, keeps courts, states and cited cases readable", { skip: !HAVE_MODEL && "model not fetched" }, async () => {
  const text = "Yesterday Margaret Okafor met with Brendan Walsh from Riverbend Logistics in Toowoomba about the lease. "
    + "The Federal Court of Australia and the ATO in Queensland applied Donoghue v Stevenson and section 180 of the Corporations Act.";
  const r = await detectNames([text]);
  assert.equal(r.status, "on");
  const names = r.parties.map((p) => p.name);
  for (const n of ["Margaret Okafor", "Brendan Walsh", "Riverbend Logistics", "Toowoomba"]) assert.ok(names.includes(n), `missed ${n}: ${names}`);
  for (const n of ["Federal Court of Australia", "ATO", "Queensland", "Donoghue", "Stevenson"]) assert.ok(!names.includes(n), `over masked ${n}`);
  const m = new LexMasker();
  m.addParties(r.parties, "ner");
  const out = m.mask(text + " Later, Okafor and WALSH agreed.");
  for (const v of ["Margaret", "Okafor", "Walsh", "WALSH", "Riverbend", "Toowoomba"]) assert.ok(!out.includes(v), `${v} leaked: ${out}`);
  for (const v of ["Federal Court of Australia", "Queensland", "Donoghue v Stevenson", "Corporations Act"]) assert.ok(out.includes(v), `${v} lost`);
  assert.ok(m.stats.sources.ner >= 4);
});

test("real model through the gateway: untitled names never reach the provider", { skip: !HAVE_MODEL && "model not fetched" }, async () => {
  const { LexGateway } = await import("../lib/lex-privacy/gateway");
  const { MockLanguageModelV3 } = await import("ai/test");
  let seen = "";
  const model = new MockLanguageModelV3({ doGenerate: async (o: unknown) => { seen = JSON.stringify(o); return { content: [{ type: "text", text: "ok" }], finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } }, warnings: [] }; } } as never);
  const gw = LexGateway.__forTests(model as never, { route: "lex-research", firm: "test" });
  const messages = [{ role: "user", content: "My client Philippa Wrenfield-Osei signed a lease with Harbourline Freight in Maroochydore. Can she terminate early?" }];
  assert.equal(await gw.scanNames([messages]), "on");
  await gw.generateText({ system: "Help.", messages });
  for (const v of ["Philippa", "Wrenfield", "Harbourline", "Maroochydore"]) assert.ok(!seen.includes(v), `${v} reached the provider`);
});
