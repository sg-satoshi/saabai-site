/**
 * Per-bot model resolver.   npx tsx --test tests/bot-model.test.ts
 * No network: models are only constructed, never called.
 */
import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";
import { openai } from "@ai-sdk/openai";

process.env.ANTHROPIC_API_KEY ||= "test";
process.env.OPENAI_API_KEY ||= "test";
process.env.XAI_API_KEY ||= "test";

const ENV_KEYS = [
  "DEFAULT_CHAT_MODEL",
  "PREMIUM_CHAT_MODEL",
  "LEX_CHAT_MODEL",
  "LEX_CHAT_PREMIUM_MODEL",
  "LEX_COMPARE_MODEL",
  "LEX_COMPARE_PREMIUM_MODEL",
  "PORTAL_SETUP_MODEL",
  "PORTAL_SETUP_PREMIUM_MODEL",
  "PORTAL_INGEST_MODEL",
  "PORTAL_INGEST_PREMIUM_MODEL",
  "LEADS_MODEL",
  "LEADS_PREMIUM_MODEL",
  "LEADGEN_MODEL",
  "LEADGEN_PREMIUM_MODEL",
  "EDGE_CHAT_MODEL",
  "EDGE_CHAT_PREMIUM_MODEL",
  "EDGE_SUMMARISE_MODEL",
  "EDGE_SUMMARISE_PREMIUM_MODEL",
  "INSTAGRAM_MODEL",
  "INSTAGRAM_PREMIUM_MODEL",
  "LINKEDIN_MODEL",
  "LINKEDIN_PREMIUM_MODEL",
  "NICO_CHAT_MODEL",
  "NICO_CHAT_PREMIUM_MODEL",
  "TRIBUTUM_CHAT_MODEL",
  "TRIBUTUM_CHAT_PREMIUM_MODEL",
  "LMM_CHAT_MODEL",
  "LMM_CHAT_PREMIUM_MODEL",
  "NEXTINVESTMENT_CHAT_MODEL",
  "NEXTINVESTMENT_CHAT_PREMIUM_MODEL",
  "IMAGINE_MODEL",
  "IMAGINE_PREMIUM_MODEL",
  "SITE_FACTORY_IMAGE_MODEL",
  "SITE_FACTORY_IMAGE_PREMIUM_MODEL",
  "OPENROUTER_API_KEY",
  "DEEPSEEK_API_KEY",
  "AGENT_DEEPSEEK_API_KEY",
];

const saved: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) saved[key] = process.env[key];

after(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

type Built = { provider?: string; modelId?: string; config?: { url?: (opts: { path: string }) => string } };

const id = (m: unknown) => {
  const x = m as Built;
  return `${(x.provider ?? "").split(".")[0]}:${x.modelId}`;
};

const HAIKU_DATED = "anthropic:claude-haiku-4-5-20251001";
const HAIKU_SHARED = "anthropic:claude-haiku-4-5";
const SONNET = "anthropic:claude-sonnet-4-6";

test("unset envs keep the model each route used before the resolver", async () => {
  const { resolveBotModel } = await import("../lib/chat-config");
  const expected: Record<string, string> = {
    "lex-chat": HAIKU_DATED,
    "lex-compare": SONNET,
    "portal-setup": SONNET,
    "portal-ingest": SONNET,
    leads: HAIKU_DATED,
    leadgen: HAIKU_DATED,
    edge: "xai:grok-4",
    "edge-summarise": HAIKU_DATED,
    instagram: HAIKU_DATED,
    linkedin: HAIKU_DATED,
    nico: "deepseek:deepseek-v4-flash",
    tributum: HAIKU_SHARED,
    lmm: HAIKU_SHARED,
    nextinvestment: HAIKU_SHARED,
    imagine: "xai:grok-imagine-image",
    "site-factory-image": "openai:gpt-image-1",
  };
  for (const [bot, value] of Object.entries(expected)) {
    assert.equal(resolveBotModel(bot as "leads").value, value, bot);
    assert.equal(resolveBotModel(bot as "leads", "premium").value, bot === "tributum" || bot === "lmm" || bot === "nextinvestment" ? SONNET : value, `${bot} premium`);
  }
});

test("dated Haiku routes stay on the dated id, shared default stays undated", async () => {
  const { resolveBotModel, getDefaultModel, getBotModel } = await import("../lib/chat-config");
  assert.equal(resolveBotModel("leads").modelId, "claude-haiku-4-5-20251001");
  assert.equal(resolveBotModel("tributum").modelId, "claude-haiku-4-5");
  assert.equal(id(getBotModel("leads")), id(anthropic("claude-haiku-4-5-20251001")));
  assert.equal(id(getBotModel("lex-compare")), id(anthropic("claude-sonnet-4-6")));
  assert.equal(id(getBotModel("edge")), id(xai("grok-4")));
  assert.equal(id(getBotModel("imagine")), id(xai("grok-imagine-image")));
  assert.equal(id(getBotModel("site-factory-image")), id(openai("gpt-image-1")));
  assert.equal(id(getBotModel("tributum")), id(getDefaultModel()));
  assert.equal(id(getBotModel("lmm")), id(getDefaultModel()));
  assert.equal(id(getBotModel("nextinvestment")), id(getDefaultModel()));
});

test("a bot env overrides the fallback and is trimmed; blank falls through", async () => {
  const { resolveBotModel } = await import("../lib/chat-config");
  process.env.EDGE_CHAT_MODEL = " xai:grok-3 \r\n";
  assert.deepEqual(resolveBotModel("edge"), { provider: "xai", modelId: "grok-3", value: "xai:grok-3" });
  process.env.EDGE_CHAT_MODEL = " \n ";
  assert.equal(resolveBotModel("edge").value, "xai:grok-4");
  process.env.EDGE_CHAT_PREMIUM_MODEL = "anthropic:claude-sonnet-4-6";
  assert.equal(resolveBotModel("edge", "premium").value, "anthropic:claude-sonnet-4-6");
  assert.equal(resolveBotModel("edge").value, "xai:grok-4", "default tier ignores the premium env");
});

test("Tributum, LMM and NextInvestment follow the shared chat model unless their own env is set", async () => {
  const { resolveBotModel, getDefaultModel, getPremiumModel, getBotModel } = await import("../lib/chat-config");
  process.env.DEFAULT_CHAT_MODEL = "xai:grok-3-mini\n";
  process.env.PREMIUM_CHAT_MODEL = " openai:gpt-4o ";
  assert.equal(resolveBotModel("tributum").value, "xai:grok-3-mini");
  assert.equal(resolveBotModel("lmm").value, "xai:grok-3-mini");
  assert.equal(id(getBotModel("nextinvestment")), id(getDefaultModel()));
  assert.equal(resolveBotModel("tributum", "premium").value, "openai:gpt-4o");
  assert.equal(id(getBotModel("lmm", "premium")), id(getPremiumModel()));
  process.env.TRIBUTUM_CHAT_MODEL = "anthropic:claude-sonnet-4-6";
  assert.equal(resolveBotModel("tributum").modelId, "claude-sonnet-4-6");
  assert.equal(resolveBotModel("lmm").modelId, "grok-3-mini", "one bot's env does not move the others");
});

test("OpenRouter is opt-in through the bot env and uses chat completions", async () => {
  const { resolveBotModel, getBotModel } = await import("../lib/chat-config");
  process.env.TRIBUTUM_CHAT_MODEL = "openrouter:anthropic/claude-3.5-haiku\n";
  assert.equal(resolveBotModel("tributum").value, "openrouter:anthropic/claude-3.5-haiku");
  assert.throws(() => getBotModel("tributum"), /OPENROUTER_API_KEY/);
  process.env.OPENROUTER_API_KEY = "test";
  const built = getBotModel("tributum") as Built;
  assert.equal(built.provider, "openai.chat");
  assert.equal(built.modelId, "anthropic/claude-3.5-haiku");
  assert.equal(built.config?.url?.({ path: "/chat/completions" }), "https://openrouter.ai/api/v1/chat/completions");
});

test("Nico stays on DeepSeek V4 Flash and a bad provider names the env var", async () => {
  const { resolveBotModel, getBotModel, getDeepSeekModel } = await import("../lib/chat-config");
  assert.equal(resolveBotModel("nico").modelId, "deepseek-v4-flash");
  assert.throws(() => getBotModel("nico"), /DEEPSEEK_API_KEY/);
  process.env.DEEPSEEK_API_KEY = "test";
  assert.equal(id(getBotModel("nico")), id(getDeepSeekModel("default")));
  process.env.LEX_COMPARE_MODEL = "nope:model";
  assert.throws(() => getBotModel("lex-compare"), /LEX_COMPARE_MODEL/);
});

test("an unknown bot is rejected", async () => {
  const { resolveBotModel } = await import("../lib/chat-config");
  assert.throws(() => resolveBotModel("nope" as "leads"), /Unknown bot/);
});

test("shared getModel(tier) is unchanged", async () => {
  const { getModel, getDefaultModel, getPremiumModel } = await import("../lib/chat-config");
  assert.equal(id(getModel()), id(getDefaultModel()));
  assert.equal(id(getModel("premium")), id(getPremiumModel()));
  process.env.PREMIUM_CHAT_MODEL = "xai:grok-4";
  assert.equal(id(getModel("premium")), "xai:grok-4");
});

test("moved routes call the resolver and no longer hardcode the model", () => {
  const moved: Array<[string, string, string]> = [
    ["app/api/lex-chat/route.ts", 'getBotModel("lex-chat")', "claude-haiku-4-5-20251001"],
    ["app/api/lex-compare/route.ts", 'getBotModel("lex-compare")', "claude-sonnet-4-6"],
    ["app/api/portal/setup-chat/route.ts", 'getBotModel("portal-setup")', "claude-sonnet-4-6"],
    ["app/api/portal/ingest-pdf/route.ts", 'getBotModel("portal-ingest")', "claude-sonnet-4-6"],
    ["app/api/leads/route.ts", 'getBotModel("leads")', "claude-haiku-4-5-20251001"],
    ["app/api/leadgen/chat/route.ts", 'getBotModel("leadgen")', "claude-haiku-4-5-20251001"],
    ["app/api/edge/chat/route.ts", 'getBotModel("edge")', "grok-4"],
    ["app/api/edge/summarise/route.ts", 'getBotModel("edge-summarise")', "claude-haiku-4-5-20251001"],
    ["app/api/instagram/generate/route.ts", 'resolveBotModel("instagram")', "claude-haiku-4-5-20251001"],
    ["app/api/linkedin/generate/route.ts", 'resolveBotModel("linkedin")', "claude-haiku-4-5-20251001"],
    ["app/api/nico-chat/route.ts", 'resolveBotModel("nico")', "deepseek-v4-flash"],
    ["app/api/tributum-chat/route.ts", 'getBotModel("tributum")', "openrouter.ai"],
    ["app/api/lmm-chat/route.ts", 'getBotModel("lmm")', "openrouter.ai"],
    ["app/api/nextinvestment-chat/route.ts", 'getBotModel("nextinvestment")', "openrouter.ai"],
    ["app/api/imagine/route.ts", 'resolveBotModel("imagine")', "grok-imagine-image"],
    ["app/api/site-factory/generate-image/route.ts", 'resolveBotModel("site-factory-image")', "gpt-image-1"],
  ];
  for (const [file, call, gone] of moved) {
    const src = readFileSync(file, "utf8");
    assert.ok(src.includes(call), file);
    assert.ok(!src.includes(gone), `${file} still mentions ${gone}`);
  }
  for (const f of ["app/api/lex-review/route.ts", "lib/lex-answer-meta.ts", "app/api/lex-draft/route.ts", "lib/lex-config.ts"]) {
    const src = readFileSync(f, "utf8");
    assert.ok(!src.includes("getBotModel") && !src.includes("resolveBotModel"), f);
  }
});
