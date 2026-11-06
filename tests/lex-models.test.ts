import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LEX_PICKER_MODELS, LEX_PICKER_DEFAULT, LEX_RETIRED_MODELS, LEX_RESEARCH_FALLBACK, LEX_SONNET } from "../lib/lex-models";
import { lexResearchModelSpec } from "../lib/lex-model";

const retired = Object.keys(LEX_RETIRED_MODELS);

test("no picker offers a retired or retiring model", () => {
  for (const [prov, models] of Object.entries(LEX_PICKER_MODELS)) {
    for (const m of models) assert.ok(!retired.includes(m.id), `${prov} still offers ${m.id}`);
  }
});

test("every retired model maps to a model the picker offers", () => {
  const offered: string[] = Object.values(LEX_PICKER_MODELS).flat().map(m => m.id);
  for (const [old, next] of Object.entries(LEX_RETIRED_MODELS)) assert.ok(offered.includes(next), `${old} -> ${next}`);
});

test("each provider default is offered and badged Recommended", () => {
  for (const [prov, id] of Object.entries(LEX_PICKER_DEFAULT)) {
    const m = LEX_PICKER_MODELS[prov as keyof typeof LEX_PICKER_MODELS].find(x => x.id === id);
    assert.ok(m, `${prov} default ${id} not offered`);
    assert.equal(m!.badge, "Recommended");
  }
});

test("exactly one Recommended per provider", () => {
  for (const [prov, models] of Object.entries(LEX_PICKER_MODELS)) {
    assert.equal(models.filter(m => m.badge === "Recommended").length, 1, prov);
  }
});

test("Lex research fallback is unchanged (Sonnet 4.6)", () => {
  assert.equal(LEX_RESEARCH_FALLBACK, "anthropic:claude-sonnet-4-6");
  assert.equal(LEX_SONNET, "claude-sonnet-4-6");
  const saved = { l: process.env.LEX_RESEARCH_MODEL, p: process.env.PREMIUM_CHAT_MODEL };
  delete process.env.LEX_RESEARCH_MODEL; delete process.env.PREMIUM_CHAT_MODEL;
  assert.equal(lexResearchModelSpec(), "anthropic:claude-sonnet-4-6");
  if (saved.l !== undefined) process.env.LEX_RESEARCH_MODEL = saved.l;
  if (saved.p !== undefined) process.env.PREMIUM_CHAT_MODEL = saved.p;
});

test("pickers read from the config, not hardcoded IDs", () => {
  for (const f of ["app/client-portal/LexWorkspace.tsx", "app/saabai-admin/lex-settings/LexSettingsClient.tsx"]) {
    const src = readFileSync(f, "utf8");
    assert.match(src, /lib\/lex-models/);
    for (const id of retired) assert.ok(!src.includes(`"${id}"`), `${f} hardcodes ${id}`);
  }
});

test("saved firm configs on retired models resolve to the replacement at read time", async () => {
  const { resolveRetiredModel } = await import("../lib/client-config");
  for (const [old, next] of Object.entries(LEX_RETIRED_MODELS)) {
    const saved = { provider: "x", model: old, encryptedKey: "k", keyHint: "1234", updatedAt: 1 };
    const out = resolveRetiredModel(saved);
    assert.equal(out.model, next);
    assert.equal(saved.model, old, "stored record not mutated");
  }
  const live = { provider: "anthropic", model: "claude-sonnet-4-6" };
  assert.equal(resolveRetiredModel(live), live);
  assert.equal(resolveRetiredModel(null), null);
});

test("getClientLLMConfig and buildModelFromConfig use the resolver", () => {
  const src = readFileSync("lib/client-config.ts", "utf8");
  assert.match(src, /return resolveRetiredModel\(await redis\.get/);
  assert.match(src, /const model = resolveRetiredModel\(config\)\.model;/);
  assert.ok(!/\(config\.model\)/.test(src), "a provider still builds from the raw saved model");
});

test("retired map has no chains and every target is a current picker ID", () => {
  const offered: string[] = Object.values(LEX_PICKER_MODELS).flat().map(m => m.id);
  for (const [old, next] of Object.entries(LEX_RETIRED_MODELS)) {
    assert.ok(!(next in LEX_RETIRED_MODELS), `${old} -> ${next} chains`);
    assert.ok(offered.includes(next), `${next} not offered`);
  }
  assert.equal(LEX_RETIRED_MODELS["gpt-4o"], "gpt-6-luna");
  assert.equal(LEX_RETIRED_MODELS["gpt-4o-mini"], "gpt-6-luna");
  assert.equal(LEX_RETIRED_MODELS["gemini-2.0-flash"], "gemini-3.6-flash");
});

test("buildModelFromConfig builds the replacement for a retired saved model", async () => {
  process.env.ENCRYPTION_KEY ??= "0".repeat(64); // test-only dummy key
  const { buildModelFromConfig, encryptKey } = await import("../lib/client-config");
  let enc: string;
  enc = encryptKey("sk-test");
  const m = buildModelFromConfig({ provider: "google", model: "gemini-2.0-flash", encryptedKey: enc, keyHint: "test", updatedAt: 1 }) as unknown as { modelId: string } | null;
  assert.equal(m?.modelId, "gemini-3.6-flash");
  const bad = buildModelFromConfig({ provider: "nope", model: "whatever", encryptedKey: enc, keyHint: "test", updatedAt: 1 });
  assert.equal(bad, null, "unbuildable config returns null so Lex falls back");
});

test("both the Lex model lookup and the gateway chat path read through the resolver", () => {
  for (const f of ["lib/lex-model.ts", "lib/lex-privacy/gateway.ts"]) {
    const src = readFileSync(f, "utf8");
    assert.match(src, /getClientLLMConfig\(/, f);
    assert.match(src, /buildModelFromConfig\(/, f);
  }
  const lm = readFileSync("lib/lex-model.ts", "utf8");
  assert.match(lm, /if \(built\) return built;[\s\S]*return getLexResearchModel\(\);/, "falls back to Lex research model (Sonnet 4.6)");
});
