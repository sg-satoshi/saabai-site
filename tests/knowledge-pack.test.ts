import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { knowledgePackEnabled, validatePack, packPrompt, packLlmsSection } from "../lib/knowledge-pack/core";
import { SAABAI_PACK } from "../lib/knowledge-pack/saabai";

test("flag off by default, accepts 1 or true", () => {
  assert.equal(knowledgePackEnabled({}), false);
  assert.equal(knowledgePackEnabled({ KNOWLEDGE_PACK_ENABLED: "0" }), false);
  assert.equal(knowledgePackEnabled({ KNOWLEDGE_PACK_ENABLED: "1" }), true);
  assert.equal(knowledgePackEnabled({ KNOWLEDGE_PACK_ENABLED: "true" }), true);
});
test("saabai pack is valid and sourced", () => assert.deepEqual(validatePack(SAABAI_PACK), []));
test("pack matches live llms.txt facts", () => {
  const llms = readFileSync("public/llms.txt", "utf8");
  for (const s of ["$100/month", "$497", "$1,497", "$3,500", "$299", "1 business day"]) assert.ok(llms.includes(s), s);
  const all = packPrompt(SAABAI_PACK);
  assert.ok(all.includes("1 business day"));
  assert.ok(!/2 business days/.test(all + packLlmsSection(SAABAI_PACK)));
  assert.ok(!/blueprint is free/i.test(all.replace("Is the Blueprint free?", "")));
});
test("validator catches missing source and em dash", () => {
  const bad = { ...SAABAI_PACK, faqs: [{ q: "x", a: "a \u2014 b", source: "" }] };
  assert.equal(validatePack(bad).length, 2);
});
test("validator catches en dash and mustNotSay dashes", () => {
  assert.equal(validatePack({ ...SAABAI_PACK, faqs: [{ q: "x", a: "a \u2013 b", source: "https://x.au" }] }).length, 1);
  assert.equal(validatePack({ ...SAABAI_PACK, mustNotSay: ["no \u2014 way", "ok \u2013 no"] }).length, 2);
});
test("no /score time claim", () => assert.ok(!/minute/i.test(packPrompt(SAABAI_PACK))));
