/**
 * Lex privacy Phase 3: matter parties are always masked, with variants, without over-matching.
 *   npx tsx --test tests/lex-privacy-p3-parties.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { LexMasker, LexPrivacyError } from "../lib/lex-privacy/mask";
import { parsePartiesText } from "../lib/lex-privacy/parties";
import { partiesFromMatter } from "../lib/lex-privacy/matter-parties";
import { cleanMatterInput } from "../lib/lex-matters";
import { cleanEntry } from "../lib/lex-privacy/redaction-log";

const masker = (lines: string) => { const m = new LexMasker(); m.addParties(parsePartiesText(lines)); return m; };

test("parses parties, aliases and kinds", () => {
  const p = parsePartiesText("Client: John Andrew Smith (Johnny)\nAcme Widgets Pty Ltd t/as Acme Plumbing\n- Jane Citizen aka JC Consulting");
  assert.equal(p.length, 3);
  assert.deepEqual(p[0], { name: "John Andrew Smith", kind: "person", aliases: ["Johnny"] });
  assert.equal(p[1].kind, "org");
  assert.deepEqual(p[1].aliases, ["Acme Plumbing"]);
  assert.deepEqual(p[2].aliases, ["JC Consulting"]);
});

test("person variants all become one placeholder", () => {
  const m = masker("John Andrew Smith (Johnny)");
  const t = "John Smith, JOHN SMITH, john smith, John Andrew Smith, J. A. Smith, JA Smith, J Smith, Smith, John, Mr Smith, Smith's car, SMITH. Johnny agreed.";
  const out = m.mask(t);
  assert.ok(!/smith|johnny/i.test(out), out);
  assert.equal(Object.keys(m.map).length, 1);
  assert.match(out, /\{\{PERSON_1\}\}'s car/);
  assert.equal(m.stats.sources.party, 1);
});

test("no over-matching: lower case single words and longer words stay", () => {
  const m = masker("Rose Will\nMary Long\nJohn Smith");
  const t = "She will rose to the occasion. A long walk to Smithfield. Long ago, May said.";
  assert.equal(m.mask(t), t);
  const out = m.mask("Mary Long and Ms Will signed. Rose Will's deed.");
  assert.ok(!/Mary Long|Ms Will|Rose Will/.test(out), out);
});

test("business variants with and without suffix", () => {
  const m = masker("Acme Widgets Pty Ltd (Acme Plumbing)");
  const out = m.mask("Acme Widgets Limited, ACME WIDGETS, acme widgets pty ltd, Acme Widgets' invoice, Acme Plumbing.");
  assert.ok(!/acme/i.test(out), out);
  assert.equal(Object.keys(m.map).length, 1);
  assert.equal(m.rehydrate("{{COMPANY_1}}"), "Acme Widgets Pty Ltd");
});

test("parties are masked in Saabai prompts too, and the leak check catches any variant", () => {
  const m = masker("John Smith");
  assert.ok(!m.maskKnown("Draft a letter for J. Smith").includes("Smith"));
  assert.throws(() => m.assertClean('{"x":"mr smith"}'.replace("mr smith", "Mr Smith")), LexPrivacyError);
});

test("matter client and parties fields feed the masker; input is cleaned", () => {
  assert.equal(partiesFromMatter({ client: "Smith Holdings Pty Ltd", parties: "Jane Citizen\nBob Example" }).length, 3);
  const r = cleanMatterInput({ parties: "Jane Citizen\n\n  Bob Example  \n" }, false);
  assert.ok("fields" in r && r.fields.parties === "Jane Citizen\nBob Example");
});

test("redaction log keeps source counts and party count only", () => {
  const e = cleanEntry({ requestId: "a1", ts: 1, route: "lex-chat", model: "m", masker: "lex-mask-3.0", outcome: "pass", types: { PERSON: 2 }, total: 2, sources: { party: 1, pattern: 1, "John Smith": 3 } as Record<string, number>, parties: 2, tools: { calls: 0, resultsMasked: 0, argsScrubbed: 0, errorsMasked: 0, resultsBlocked: 0 } });
  assert.deepEqual(e.sources, { party: 1, pattern: 1 });
  assert.equal(e.parties, 2);
  assert.ok(!JSON.stringify(e).includes("John"));
});

test("gateway: matter parties never reach the model, replies show the real name", async () => {
  const { LexGateway } = await import("../lib/lex-privacy/gateway");
  const { MockLanguageModelV3 } = await import("ai/test");
  let seen = "";
  const model = new MockLanguageModelV3({ doGenerate: async (opts: unknown) => {
    seen = JSON.stringify(opts);
    const tok = (seen.match(/\{\{PERSON_\d+\}\}/) ?? ["{{PERSON_1}}"])[0];
    return {
      content: [{ type: "text", text: `Advice for ${tok}.` }],
      finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } }, warnings: [],
    };
  } } as never);
  const gw = LexGateway.__forTests(model as never, { route: "lex-research", firm: "test", parties: parsePartiesText("Zebulon Quokkafield (Zeb)") });
  const { text } = await gw.generateText({ system: "Help the lawyer.", prompt: "Can quokkafield sue? zebulon quokkafield and Zeb say Quokkafield's lease ended. Z. Quokkafield agrees." });
  assert.ok(!/quokkafield|zeb\b/i.test(seen), "party leaked to the model");
  assert.equal(text, "Advice for Zebulon Quokkafield.");
});
