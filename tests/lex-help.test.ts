/** Lex help assistant: routing, offers, knowledge, gateway and logging wiring.  npx tsx --test tests/lex-help.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isLegalQuestion, LEGAL_REFUSAL, parseHelpReply, normaliseHelpMessages, helpSystemPrompt, HELP_LABEL } from "../lib/lex-help";
import { LEX_TERMS_SUMMARY } from "../lib/lex-terms";
import { LEX_MATTERS_PRIVACY_COPY } from "../lib/lex-upload-copy";
import { CHAT_API } from "../lib/chat-guard";

test("routing: legal questions get the fixed refusal, product questions go to the assistant", () => {
  for (const q of ["Should my client sue the landlord?", "Is it legal to terminate an employee on leave?", "What does section 52 mean for my client?"]) assert.equal(isLegalQuestion(q), true, q);
  for (const q of ["How do I export a draft to Word?", "Where do I change my password?", "Can I add a fourth lawyer seat?", "The review page shows an error"]) assert.equal(isLegalQuestion(q), false, q);
  assert.match(LEGAL_REFUSAL, /not give legal advice/);
});

test("offers: parsed and hidden from the reply; feature wishes become ideas; junk ignored", () => {
  const a = parseHelpReply("Lex can't do bulk export yet.\nI can log that for the team.\nOFFER|idea|Bulk export of research threads");
  assert.deepEqual(a.offer, { type: "idea", summary: "Bulk export of research threads" });
  assert.doesNotMatch(a.reply, /OFFER/);
  assert.equal(parseHelpReply("Plain **answer** — here").reply, "Plain answer, here");
  assert.equal(parseHelpReply("x\nOFFER|delete|everything now").offer, null);
  assert.doesNotMatch(parseHelpReply("x\nOFFER|delete|everything now").reply, /OFFER/);
});

test("prompt: no legal advice, only-confirmed logging, idea for features, built from live terms and privacy", () => {
  const p = helpSystemPrompt();
  assert.match(p, /Never give legal advice/);
  assert.match(p, /Use idea for any feature request/);
  assert.match(p, /user must confirm first/);
  assert.ok(p.includes(LEX_TERMS_SUMMARY));
  assert.ok(p.includes(LEX_MATTERS_PRIVACY_COPY));
  assert.match(HELP_LABEL, /AI/);
});

test("input: only user/assistant strings, last 12, 2000 chars each", () => {
  const m = normaliseHelpMessages([{ role: "system", content: "x" }, ...Array.from({ length: 20 }, () => ({ role: "user", content: "a".repeat(3000) }))]);
  assert.equal(m.length, 12);
  assert.equal(m[0].content.length, 2000);
  assert.deepEqual(normaliseHelpMessages("nope"), []);
});

test("wiring: gateway only, shared chat rate limits, masked logging, confirmed filing, labelled panel", () => {
  const route = readFileSync("app/api/lex-help/route.ts", "utf8");
  assert.match(route, /LexGateway\.open\(\{ route: "lex-help"/);
  assert.doesNotMatch(route, /from "ai"|@ai-sdk/);
  assert.match(route, /resolveReviewActor\(req\)/);
  assert.match(route, /logChatTurn\(\{ bot: "lex-help".*userText: gw\.mask\(last\), assistantText: res\.maskedText/);
  assert.doesNotMatch(route, /saveFeedback|lex-feedback/);
  assert.ok(CHAT_API.includes("/api/lex-help"));
  const panel = readFileSync("app/lex/_components/HelpAssistant.tsx", "utf8");
  assert.match(panel, /Lex help assistant/);
  assert.match(panel, /Not legal advice/);
  assert.match(panel, /onClick=\{\(\) => confirmLog\(offer\)\}>Yes, log it/);
  assert.match(panel, /source: "assistant"/);
  assert.match(readFileSync("app/api/lex-feedback/route.ts", "utf8"), /body\?\.source === "assistant"/);
  assert.match(readFileSync("app/lex/layout.tsx", "utf8"), /<HelpAssistant \/>/);
});
