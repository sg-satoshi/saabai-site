/**
 * Lex model selection and the ART update.   npx tsx --test tests/lex-model.test.ts
 * No network: models are only constructed, never called.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

process.env.ANTHROPIC_API_KEY ||= "test";
process.env.OPENAI_API_KEY ||= "test";

const id = (m: unknown) => {
  const x = m as { provider?: string; modelId?: string };
  return `${(x.provider ?? "").split(".")[0]}:${x.modelId}`;
};

beforeEach(() => { delete process.env.LEX_RESEARCH_MODEL; delete process.env.PREMIUM_CHAT_MODEL; });

test("unset LEX_RESEARCH_MODEL falls back to PREMIUM_CHAT_MODEL (no production change)", async () => {
  const { getLexResearchModel, lexResearchModelSpec } = await import("../lib/lex-model");
  const { getPremiumModel } = await import("../lib/chat-config");
  process.env.PREMIUM_CHAT_MODEL = "openai:gpt-4o";
  assert.equal(id(getLexResearchModel()), "openai:gpt-4o");
  assert.equal(id(getLexResearchModel()), id(getPremiumModel()));
  assert.equal(lexResearchModelSpec(), "openai:gpt-4o");
  process.env.LEX_RESEARCH_MODEL = "   ";
  assert.equal(id(getLexResearchModel()), "openai:gpt-4o", "blank counts as unset");
});

test("LEX_RESEARCH_MODEL wins over PREMIUM_CHAT_MODEL and is trimmed", async () => {
  const { getLexResearchModel, lexResearchModelSpec } = await import("../lib/lex-model");
  process.env.PREMIUM_CHAT_MODEL = "openai:gpt-4o";
  process.env.LEX_RESEARCH_MODEL = "anthropic:claude-sonnet-4-6\n";
  assert.equal(id(getLexResearchModel()), "anthropic:claude-sonnet-4-6");
  assert.equal(lexResearchModelSpec(), "anthropic:claude-sonnet-4-6");
});

test("a bad LEX_RESEARCH_MODEL names the env var", async () => {
  const { getLexResearchModel } = await import("../lib/lex-model");
  process.env.LEX_RESEARCH_MODEL = "nope:model";
  assert.throws(() => getLexResearchModel(), /LEX_RESEARCH_MODEL/);
});

test("Mia's model resolution is unchanged", async () => {
  const { getPremiumModel } = await import("../lib/chat-config");
  assert.equal(id(getPremiumModel()), "anthropic:claude-sonnet-4-6", "code fallback");
  process.env.PREMIUM_CHAT_MODEL = " xai:grok-4.20-non-reasoning ";
  assert.equal(id(getPremiumModel()), "xai:grok-4.20-non-reasoning");
});

test("research and draft both use the firm model via the Lex gateway; no direct premium model left", () => {
  for (const f of ["app/api/lex-research/route.ts", "app/api/lex-draft/route.ts"]) {
    const src = readFileSync(f, "utf8");
    assert.ok(/kind: "firm", configId/.test(src), f);
    assert.ok(!src.includes("getPremiumModel"), f);
  }
  assert.ok(readFileSync("lib/lex-privacy/gateway.ts", "utf8").includes("getLexModelForFirm("), "gateway resolves the firm model");
  const draft = readFileSync("app/api/lex-draft/route.ts", "utf8");
  assert.ok(/runQAPass\(gw,/.test(draft), "QA pass uses the same gateway and model");
});

test("firm's own model wins when saved, Lex model otherwise (Redis unavailable here)", async () => {
  const { getLexModelForFirm } = await import("../lib/lex-model");
  process.env.LEX_RESEARCH_MODEL = "anthropic:claude-sonnet-4-6";
  assert.equal(id(await getLexModelForFirm("lex-internal")), "anthropic:claude-sonnet-4-6");
});

test("ART replaces AAT in Lex prompts and tools", async () => {
  const cfg = readFileSync("lib/lex-config.ts", "utf8");
  assert.ok(cfg.includes("Administrative Review Tribunal (ART) replaced the Administrative Appeals Tribunal (AAT) on 14 October 2024"));
  assert.ok(!/specialist tribunals \(AAT/.test(cfg));
  const tools = readFileSync("lib/lex-tools.ts", "utf8");
  assert.ok(tools.includes("au/cases/cth/ARTA") && tools.includes("au/cases/cth/AATA"));
  const { buildLexResearchTools } = await import("../lib/lex-research-tools");
  const { getLexConfig } = await import("../lib/lex-config");
  const t = buildLexResearchTools(getLexConfig()) as Record<string, { description?: string }>;
  assert.ok(t.searchART, "model sees searchART");
  assert.ok(!("searchAAT" in t));
  assert.match(t.searchART.description ?? "", /Administrative Review Tribunal/);
  for (const f of ["lib/lex-config.ts", "lib/lex-tools.ts", "lib/lex-research-tools.ts", "lib/lex-model.ts"]) {
    const src = readFileSync(f, "utf8");
    const added = src.split("\n").filter((l) => /ART|LEX_RESEARCH_MODEL/.test(l));
    for (const l of added) assert.ok(!/[\u2012-\u2015]/.test(l), `${f}: ${l}`);
  }
});

test("all research tools are still built", async () => {
  const { buildLexResearchTools } = await import("../lib/lex-research-tools");
  const { getLexConfig } = await import("../lib/lex-config");
  const keys = Object.keys(buildLexResearchTools(getLexConfig()));
  assert.deepEqual(keys.sort(), ["checkLegislationStatus", "searchASIC", "searchART", "searchATO", "searchAustLII", "searchCorporationsLaw", "searchFairWork", "searchFamilyLaw", "searchInternational", "searchLegislation", "searchStateLegislation", "verifySection"].sort());
  assert.deepEqual(Object.keys(buildLexResearchTools(getLexConfig("lex-external"))), ["captureMatter"]);
});

test("eval: 20 questions and the scorer counts key points, errors and ungrounded links", async () => {
  const { EVAL_QUESTIONS } = await import("../scripts/lex-eval/questions");
  const { scoreAnswer } = await import("../scripts/lex-eval/run-one");
  assert.equal(EVAL_QUESTIONS.length, 20);
  assert.equal(new Set(EVAL_QUESTIONS.map((q) => q.id)).size, 20);
  const q20 = EVAL_QUESTIONS.find((q) => q.id === "q20")!;
  const good = scoreAnswer(q20, "Apply to the Administrative Review Tribunal (ART) within 60 days. See https://www.austlii.edu.au/x/1.html", new Set(["https://austlii.edu.au/x/1.html"]));
  assert.equal(good.accuracy, 1);
  assert.equal(good.groundedUrls, 1);
  const bad = scoreAnswer(q20, "Lodge an application with the AAT within 28 days. https://made.up/case", new Set());
  assert.equal(bad.wrongHit.length, 1);
  assert.equal(bad.accuracy, 0);
  assert.deepEqual(bad.ungroundedUrls, ["https://made.up/case"]);
});

test("last research step must answer, not call another tool", async () => {
  const { finalStepAnswers, LEX_RESEARCH_MAX_STEPS } = await import("../lib/lex-research-tools");
  const f = finalStepAnswers(LEX_RESEARCH_MAX_STEPS);
  assert.equal(f({ stepNumber: 0 }), undefined);
  assert.deepEqual(f({ stepNumber: LEX_RESEARCH_MAX_STEPS - 1 }), { toolChoice: "none" });
});
