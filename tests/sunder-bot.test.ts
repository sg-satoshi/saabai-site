/** SUNDER chatbot persona: guardrails present, no banned claims. Run: npx tsx --test tests/sunder-bot.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SUNDER_PERSONA, SUNDER_GOAL } from "../lib/chatbot/sunder-bot";
import { buildSystemPrompt, getPersona, domainsForBot } from "../lib/chatbot/personas";
import { codeChatbotSites } from "../lib/chatbot/code-sites";

test("sunder persona is registered and allowed only on sunder hosts", () => {
  assert.equal(getPersona("sunder"), SUNDER_PERSONA);
  assert.deepEqual(domainsForBot("sunder"), ["sunder.com.au", "www.sunder.com.au"]);
  assert.ok(codeChatbotSites().some((s) => s.slug === "sunder" && s.chatbot?.enabled));
});

test("prompt keeps guardrails and no banned claims", () => {
  const p = buildSystemPrompt(SUNDER_PERSONA);
  assert.match(p, /12-month warranty on core and edge/);
  assert.match(p, /Never say or imply the paddle is made, designed or manufactured in Australia/);
  assert.match(p, /launch date, price, specs/);
  assert.doesNotMatch(p, /\$\d|A\$|made in Australia\b(?! )/);
  assert.doesNotMatch(p, /[\u2013\u2014]/);
});

test("CTA uses Pre-Launch List and points at the page form, never the API", () => {
  assert.equal(SUNDER_GOAL.cta?.label, "Join the Pre-Launch List");
  assert.equal(SUNDER_GOAL.cta?.url, "https://sunder.com.au/#f");
  assert.equal(SUNDER_PERSONA.model, undefined);
});

test("stored SUNDER factory row (chatbot off) gets the code chatbot, other fields kept", async () => {
  const { withCodeChatbotSites } = await import("../lib/site-registry");
  const { SUNDER_FACTORY_SEED } = await import("../lib/sunder-factory-seed");
  const stored = { ...SUNDER_FACTORY_SEED, id: "sunder", createdAt: 1, updatedAt: 1 } as never;
  const out = withCodeChatbotSites([stored]).filter((s) => s.slug === "sunder");
  assert.equal(out.length, 1);
  assert.equal(out[0].chatbot?.enabled, true);
  assert.equal(out[0].status, "draft");
  const nico = withCodeChatbotSites([{ id: "nico-moretti", slug: "nico-moretti", name: "x", chatbot: { enabled: false } } as never]).find((s) => s.slug === "nico-moretti");
  assert.equal(nico?.chatbot?.enabled, false);
});
