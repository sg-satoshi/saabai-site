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
