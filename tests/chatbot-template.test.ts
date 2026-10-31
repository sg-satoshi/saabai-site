import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { disclosureCount, greetingFollowOn, openingGreeting } from "../lib/chatbot/disclosure";
import { isNotSureReply, isWidgetEvent } from "../lib/chatbot/events";
import { LEAD_ENDPOINTS, mockLeadPost, questionsFor, runAllEvals, spokenFactIds } from "../lib/chatbot/eval-set";
import { lmmLicensingLine } from "../lib/lmm-legal";
import { BO_PERSONA, ZARA_PERSONA, buildSystemPrompt, personaGreeting } from "../lib/chatbot/personas";
import { BO_SYSTEM_PROMPT, ZARA_SYSTEM_PROMPT } from "../lib/chatbot/platform-bot-seed";

const read = (file: string) => readFileSync(file, "utf8");

test("AI disclosure is one sentence, and saying it again does not double it", () => {
  const once = personaGreeting(ZARA_PERSONA);
  assert.equal(disclosureCount(once), 1);
  assert.equal(disclosureCount(openingGreeting({ botName: "Zara", businessName: "Lifestyle Money Management (LMM)", extra: once })), 1);
  assert.match(personaGreeting(BO_PERSONA), /Hi, I'm Christina, an AI assistant for BO Consulting\./);
  assert.equal(disclosureCount(personaGreeting(BO_PERSONA)), 1);
  assert.equal(greetingFollowOn("Hi! How can I help?", "Ava"), "How can I help?");
  assert.equal(greetingFollowOn("Hello, how can I help?", "Ava"), "How can I help?");
  assert.equal(openingGreeting({ botName: "Ava", businessName: "Northside Physio", extra: "Hi! How can I help with your recovery today?" }), "Hi, I'm Ava, an AI assistant for Northside Physio. How can I help with your recovery today?");
});

test("each bot has about 20 normal and 10 trick questions, and the eval passes without a lead POST", () => {
  for (const slug of ["lmm-site", "bo-consultancy"]) {
    const questions = questionsFor(slug);
    assert.equal(questions.filter((q) => q.kind === "normal").length, 20, slug);
    assert.equal(questions.filter((q) => q.kind === "trick").length, 10, slug);
  }
  for (const report of runAllEvals()) {
    assert.equal(report.failed, 0, JSON.stringify(report.hits.filter((hit) => !hit.pass)));
    assert.equal(report.greetingDisclosure, 1);
  }
  for (const path of LEAD_ENDPOINTS) {
    assert.throws(() => mockLeadPost(`https://www.saabai.ai${path}`), /Blocked lead POST/);
  }
  const script = read("scripts/chatbot-eval.ts");
  const evalLib = read("lib/chatbot/eval-set.ts");
  for (const path of LEAD_ENDPOINTS) assert.match(evalLib, new RegExp(path.replace(/\//g, "\\/")));
  assert.match(script, /LEAD_ENDPOINTS/);
  assert.doesNotMatch(script, /generateText|ANTHROPIC_API_KEY/);
});

test("spoken facts have a source and a verified date, and unpublished claims are not in the prompt", () => {
  for (const persona of [ZARA_PERSONA, BO_PERSONA]) {
    const prompt = buildSystemPrompt(persona);
    for (const fact of persona.facts) {
      assert.ok(fact.source.trim(), fact.id);
      if (fact.speak) {
        assert.match(fact.verified, /^\d{4}-\d{2}-\d{2}$/, fact.id);
        assert.match(prompt, new RegExp(fact.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      } else if (fact.text) {
        assert.equal(prompt.includes(fact.text), false, fact.id);
      }
    }
  }
  assert.equal(lmmLicensingLine(), "Lifestyle Money Management is the trading name of Foale Group Pty Ltd (ABN 26 648 878 862). Credit assistance is provided under Australian Credit Licence 530067. AFCA member number: 82253.");
  assert.equal(spokenFactIds(ZARA_PERSONA).includes("licence"), true);
  assert.match(ZARA_SYSTEM_PROMPT, /Australian Credit Licence 530067/);
  assert.match(ZARA_SYSTEM_PROMPT, /AFCA member number: 82253/);
  assert.match(ZARA_SYSTEM_PROMPT, /Do not give personal financial, credit, tax or legal advice/);
  assert.doesNotMatch(ZARA_SYSTEM_PROMPT, /\[ACL|\[AFCA|AFSL/);
  assert.doesNotMatch(ZARA_SYSTEM_PROMPT, /Brisbane/);
  assert.match(ZARA_SYSTEM_PROMPT, /Never mention these names: Jeff, Lily, Andy/);
  assert.doesNotMatch(BO_SYSTEM_PROMPT, /95%|1,000|48hr|Fully compliant labour hire/);
  assert.equal(ZARA_SYSTEM_PROMPT, buildSystemPrompt(ZARA_PERSONA));
  assert.equal(BO_SYSTEM_PROMPT, buildSystemPrompt(BO_PERSONA));
});

test("widgets take the greeting from shared config code and do not keep a private persona", () => {
  const lmm = read("public/clients/lmm-site/assets/chat-widget.js");
  const bo = read("app/sites/bo-consultancy/layout.tsx");
  const embed = read("public/embed/chat.v1.js").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(lmm, /systemPrompt/);
  assert.doesNotMatch(lmm, /Hello! I'm Zara from Lifestyle Money Management/);
  assert.match(lmm, /c\.greeting/);
  assert.match(lmm, /\/api\/chat-platform\/event/);
  assert.doesNotMatch(bo, /G'day! I'm Christina, the BO Consulting assistant/);
  assert.match(bo, /c\.greeting/);
  assert.match(embed, /c\.greeting/);
  assert.match(embed, /\/api\/chat-platform\/event/);
  assert.doesNotMatch(embed, /lead/i);
  assert.match(read("lib/chat-widget-template.ts"), /configUrl/);
  assert.match(read("lib/chat-widget-template.ts"), /CFG\.greeting=""/);
});

test("monitoring events are counted and not sent to a client channel", () => {
  assert.equal(isNotSureReply("I am not sure about that."), true);
  assert.equal(isNotSureReply("Yes, Nick can help."), false);
  assert.equal(isWidgetEvent("handoff"), true);
  assert.equal(isWidgetEvent("not_sure"), false);
  const event = read("app/api/chat-platform/event/route.ts");
  assert.match(event, /recordChatEvent/);
  assert.doesNotMatch(event, /api\.telegram\.org|\/api\/leads|site-factory\/lead|cycle-repair\/lead/);
  const handler = read("lib/chatbot/handler.ts");
  assert.match(handler, /conversation_started/);
  assert.match(handler, /not_sure/);
  assert.match(handler, /return "block"/);
  assert.doesNotMatch(handler, /return "miss"/);
  const home = read("public/clients/lmm-site/index.html");
  const reviews = read("public/clients/lmm-site/assets/reviews.json");
  for (const name of ["Jeff", "Lily", "Andy"]) {
    assert.equal(home.includes(name), false, name);
    assert.equal(reviews.includes(name), false, name);
  }
});
