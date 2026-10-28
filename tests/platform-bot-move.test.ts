/**
 * Christina (bo-consultancy) and Zara (lmm-site) move onto the shared chat platform.
 * The model call is intercepted: each bot's reply is produced only when that bot's own prompt was sent.
 */
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";
import {
  BO_DOMAINS, BO_SYSTEM_PROMPT, LMM_DOMAINS, ZARA_SYSTEM_PROMPT,
  applySeedActions, planPlatformSeed, runMode, type SeedAction, type StoredSite,
} from "../lib/chatbot/platform-bot-seed";

const mock = createMockUpstash();
const realFetch = globalThis.fetch;
const ROOT = new URL("..", import.meta.url).pathname;
const read = (f: string) => readFileSync(ROOT + f, "utf8");
let modelBodies: string[] = [];

function routePrompt(file: string): string {
  const src = read(file);
  const m = src.match(/const SYSTEM_PROMPT = `([\s\S]*?)`;\r?\n/);
  if (m) return m[1];
  if (src.includes("ZARA_SYSTEM_PROMPT")) return ZARA_SYSTEM_PROMPT;
  if (src.includes("BO_SYSTEM_PROMPT")) return BO_SYSTEM_PROMPT;
  assert.fail(`${file} still has its system prompt`);
}

function anthropicReply(text: string) {
  return new Response(JSON.stringify({
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5-20251001",
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 20, output_tokens: 12 },
  }), { status: 200, headers: { "content-type": "application/json" } });
}

async function bodyText(init?: RequestInit): Promise<string> {
  const b = init?.body;
  if (!b) return "";
  if (typeof b === "string") return b;
  if (b instanceof Uint8Array) return new TextDecoder().decode(b);
  if (typeof (b as { text?: () => Promise<string> }).text === "function") return (b as Blob).text();
  return String(b);
}

function voiceFromPrompt(body: string): string {
  const christina = body.includes("BO Consulting") && body.includes("blue-collar");
  const zara = body.includes("Lifestyle Money Management (LMM)") && body.includes("mortgage broking");
  if (christina && !body.includes("Lifestyle Money Management (LMM)")) {
    return "G'day, Christina here from BO Consulting. I place blue-collar workers across construction and mining.";
  }
  if (zara && !body.includes("1,000+ placements")) {
    return "I'm Zara at Lifestyle Money Management. I look at mortgage broking, affordability and downside protection.";
  }
  return "generic assistant";
}

const boSite = () => ({
  id: "bo1", slug: "bo-consultancy", name: "BO Consulting", niche: "professional-services", status: "live",
  url: "https://boconsulting.com.au", source: "factory",
  domains: ["boconsulting.com.au", "www.boconsulting.com.au"],
  business: { name: "BO Consulting", email: "info@boconsulting.com.au" },
  chatbot: { enabled: true, name: "Christina", greeting: "G'day", systemPrompt: BO_SYSTEM_PROMPT, avatarUrl: "/sites/bo-consultancy/christina-avatar.jpg" },
  createdAt: 1, updatedAt: 1,
});
const lmmSite = () => ({
  id: "lmm1", slug: "lmm-site", name: "Lifestyle Money Management", niche: "professional-services", status: "live",
  url: "https://lifestylemoneymanagement.com.au", source: "factory",
  domains: ["lifestylemoneymanagement.com.au", "www.lifestylemoneymanagement.com.au"],
  business: { name: "Lifestyle Money Management", email: "hello@lifestylemoneymanagement.com.au" },
  chatbot: { enabled: true, name: "Zara", greeting: "Hello", systemPrompt: ZARA_SYSTEM_PROMPT },
  createdAt: 1, updatedAt: 1,
});

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.CHAT_ORIGIN_MODE = "enforce";
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.DEFAULT_CHAT_MODEL = "anthropic:claude-haiku-4-5-20251001";
  delete process.env.CHATBOTS_KILL;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("http://127.0.0.1")) return realFetch(input as RequestInfo, init);
    const body = await bodyText(init);
    modelBodies.push(body);
    return anthropicReply(voiceFromPrompt(body));
  }) as typeof fetch;
});
after(() => { globalThis.fetch = realFetch; return new Promise<void>((r) => mock.server.close(() => r())); });
beforeEach(() => {
  mock.reset();
  mock.seed({ hashes: { "saabai:sites": { bo1: JSON.stringify(boSite()), lmm1: JSON.stringify(lmmSite()) } } });
  modelBodies = [];
  process.env.CHAT_ORIGIN_MODE = "enforce";
  delete process.env.CHATBOTS_KILL;
});

const post = (slug: string, origin: string) =>
  new NextRequest("https://www.saabai.ai/api/chat-platform/message", {
    method: "POST",
    headers: { "content-type": "application/json", origin, "user-agent": "t" },
    body: JSON.stringify({ slug, messages: [{ role: "user", content: "Who are you and how do you help?" }] }),
  });

test("seed prompts are the route prompts, word for word, and the bots stay on", () => {
  assert.equal(BO_SYSTEM_PROMPT, routePrompt("app/api/bo-chat/route.ts"));
  assert.equal(ZARA_SYSTEM_PROMPT, routePrompt("app/api/lmm-chat/route.ts"));
  assert.match(BO_SYSTEM_PROMPT, /You are Christina, an AI assistant for BO Consulting/);
  assert.match(ZARA_SYSTEM_PROMPT, /You are Zara, an AI assistant for Lifestyle Money Management \(LMM\)/);
  assert.doesNotMatch(read("app/api/lmm-chat/route.ts"), /const SYSTEM_PROMPT = `/);
  assert.doesNotMatch(read("app/api/bo-chat/route.ts"), /const SYSTEM_PROMPT = `/);
  assert.deepEqual([...BO_DOMAINS], ["boconsulting.com.au", "www.boconsulting.com.au"]);
  assert.deepEqual([...LMM_DOMAINS], ["lifestylemoneymanagement.com.au", "www.lifestylemoneymanagement.com.au"]);
  assert.equal(runMode([]), "dry-run");
  assert.equal(runMode(["--apply"]), "apply");
  assert.equal(runMode(["--apply", "--dry-run"]), "dry-run");
  const script = read("scripts/seed-platform-prompts.ts");
  assert.match(script, /--apply/);
  assert.match(script, /Dry run/);
  assert.doesNotMatch(read("package.json"), /seed-platform-prompts/);
});

test("plan is idempotent, dry run writes nothing, and a switched-off record is turned on", async () => {
  const stale: StoredSite[] = [
    {
      id: "bo-old", slug: "bo-consultancy", domains: ["https://boconsulting.com.au/"],
      chatbot: { enabled: false, name: "Christina", greeting: "G'day", systemPrompt: "short christina prompt", avatarUrl: "/a.jpg" },
    },
    {
      id: "bo-copy", slug: "bo-consultancy", domains: ["jobs.example"],
      chatbot: { enabled: true, name: "Christina", greeting: "Hi", systemPrompt: "another short prompt" },
    },
  ];
  const first = planPlatformSeed(stale);
  assert.equal(first.filter((a) => a.kind === "create" && a.slug === "lmm-site").length, 1);
  const updates = first.filter((a) => a.kind === "update");
  assert.equal(updates.length, 2);
  for (const u of updates) {
    assert.equal(u.kind, "update");
    assert.equal(u.chatbot.enabled, true);
    assert.equal(u.chatbot.systemPrompt, BO_SYSTEM_PROMPT);
    assert.ok(u.chatbot.name === "Christina");
    assert.ok(u.domains.includes("boconsulting.com.au") && u.domains.includes("www.boconsulting.com.au"));
    assert.ok(u.changes.includes("systemPrompt") && u.changes.includes("domains"));
  }
  assert.ok(updates[0].kind === "update" && updates[0].changes.includes("enabled"));
  assert.ok(updates[0].kind === "update" && updates[0].domains.includes("boconsulting.com.au"));
  assert.ok(updates[1].kind === "update" && updates[1].domains.includes("jobs.example"), "existing hosts stay");

  let writes = 0;
  const dry = await applySeedActions(first, {
    dryRun: true,
    update: async () => { writes++; throw new Error("dry run must not write"); },
    create: async () => { writes++; throw new Error("dry run must not write"); },
  });
  assert.equal(dry.writes, 0);
  assert.equal(writes, 0);

  const stored = materialise(stale, first);
  const second = planPlatformSeed(stored);
  assert.ok(second.every((a) => a.kind === "noop"));
  const again = await applySeedActions(second, {
    dryRun: false,
    update: async () => { writes++; },
    create: async () => { writes++; },
  });
  assert.equal(again.writes, 0);

  const applied = await applySeedActions(first, {
    dryRun: false,
    update: async () => { writes++; },
    create: async () => { writes++; },
  });
  assert.equal(applied.writes, 3, "two BO updates and one LMM create");
  const lmm = first.find((a) => a.kind === "create" && a.slug === "lmm-site");
  assert.ok(lmm && lmm.kind === "create");
  assert.equal(lmm.site.chatbot.enabled, true);
  assert.equal(lmm.site.chatbot.systemPrompt, ZARA_SYSTEM_PROMPT);
  assert.deepEqual(lmm.site.domains, ["lifestylemoneymanagement.com.au", "www.lifestylemoneymanagement.com.au"]);
});

test("widgets call the platform with the slug, fallbacks remain, contact forms stay put", () => {
  const bo = read("app/sites/bo-consultancy/layout.tsx");
  const widget = read("app/components/BOChatWidget.tsx");
  const lmm = read("public/clients/lmm-site/assets/chat-widget.js");
  for (const src of [bo, widget]) {
    assert.match(src, /\/api\/chat-platform\/message/);
    assert.match(src, /\/api\/chat-platform\/config\?site=/);
    assert.match(src, /bo-consultancy/);
    assert.doesNotMatch(src, /\/api\/bo-chat/);
  }
  assert.match(lmm, /slug: 'lmm-site'/);
  assert.match(lmm, /https:\/\/www\.saabai\.ai\/api\/chat-platform\/message/);
  assert.match(lmm, /https:\/\/www\.saabai\.ai\/api\/chat-platform\/config\?site=lmm-site/);
  assert.doesNotMatch(lmm, /\/api\/lmm-chat/);
  assert.match(read("public/clients/lmm-site/index.html"), /chat-widget\.js\?v=11/);
  for (const f of ["app/api/bo-chat/route.ts", "app/api/lmm-chat/route.ts"]) {
    assert.match(read(f), /Delete this route after 27 October 2026/);
    assert.match(read(f), /export async function POST/);
  }
  assert.doesNotMatch(read("app/api/bo-contact/route.ts"), /chat-platform|bo-chat/);
  assert.doesNotMatch(read("app/api/lmm-contact/route.ts"), /chat-platform|lmm-chat/);
  assert.match(read("proxy.ts"), /\/api\/bo-chat/);
  assert.match(read("proxy.ts"), /\/api\/lmm-chat/);
});

test("Christina answers in her own voice from both BO domains, and a foreign origin is refused", async () => {
  const { handleChat } = await import("../lib/chatbot/handler");
  const { APP_ROUTER_SITES } = await import("../lib/site-registry");
  const hardcoded = APP_ROUTER_SITES.find((s) => s.slug === "bo-consultancy");
  assert.equal(hardcoded?.chatbot.enabled, true);
  assert.equal(hardcoded?.chatbot.systemPrompt, BO_SYSTEM_PROMPT);
  assert.ok(hardcoded?.domains?.includes("boconsulting.com.au") && hardcoded?.domains?.includes("www.boconsulting.com.au"));

  for (const origin of ["https://boconsulting.com.au", "https://www.boconsulting.com.au"]) {
    modelBodies = [];
    const res = await handleChat(post("bo-consultancy", origin));
    assert.equal(res.status, 200, origin);
    const j = await res.json();
    assert.match(j.content, /Christina/);
    assert.match(j.content, /blue-collar/);
    assert.doesNotMatch(j.content, /Zara|mortgage broking/);
    assert.equal(modelBodies.length, 1);
    assert.match(modelBodies[0], /blue-collar/);
    assert.doesNotMatch(modelBodies[0], /1,000\+ placements|95%/);
    assert.doesNotMatch(modelBodies[0], /Lifestyle Money Management \(LMM\)/);
  }

  modelBodies = [];
  const blocked = await handleChat(post("bo-consultancy", "https://evil.example"));
  assert.equal(blocked.status, 403);
  assert.equal(modelBodies.length, 0);
});

test("a stale stored prompt does not override the persona", async () => {
  const stale = boSite();
  stale.chatbot = { ...stale.chatbot, systemPrompt: "1,000+ placements, 95% retention rate. Based in Brisbane. Portfolio management and retirement planning." };
  mock.seed({ hashes: { "saabai:sites": { bo1: JSON.stringify(stale), lmm1: JSON.stringify(lmmSite()) } } });
  const { handleChat } = await import("../lib/chatbot/handler");
  modelBodies = [];
  const res = await handleChat(post("bo-consultancy", "https://boconsulting.com.au"));
  assert.equal(res.status, 200);
  assert.match(modelBodies[0], /blue-collar/);
  assert.doesNotMatch(modelBodies[0], /95%|1,000\+ placements|Brisbane|portfolio management/i);
});

test("Zara answers in her own voice from both LMM domains, and stays off when the record is switched off", async () => {
  const { handleChat } = await import("../lib/chatbot/handler");
  for (const origin of ["https://lifestylemoneymanagement.com.au", "https://www.lifestylemoneymanagement.com.au"]) {
    modelBodies = [];
    const res = await handleChat(post("lmm-site", origin));
    assert.equal(res.status, 200, origin);
    const j = await res.json();
    assert.match(j.content, /Zara/);
    assert.match(j.content, /Lifestyle Money Management/);
    assert.match(j.content, /mortgage broking/);
    assert.doesNotMatch(j.content, /Christina|blue-collar/);
    assert.match(modelBodies[0], /You are Zara/);
    assert.doesNotMatch(modelBodies[0], /1,000\+ placements/);
  }

  mock.seed({ hashes: { "saabai:sites": { lmm1: JSON.stringify({ ...lmmSite(), chatbot: { ...lmmSite().chatbot, enabled: false } }) } } });
  modelBodies = [];
  const off = await handleChat(post("lmm-site", "https://www.lifestylemoneymanagement.com.au"));
  const body = await off.json();
  assert.equal(body.chatbotOff, true);
  assert.equal(modelBodies.length, 0, "a switched-off record does not call the model");
});

function materialise(sites: StoredSite[], actions: SeedAction[]): StoredSite[] {
  const next = sites.map((s) => ({ ...s, domains: s.domains ? [...s.domains] : undefined, chatbot: s.chatbot ? { ...s.chatbot } : undefined }));
  for (const action of actions) {
    if (action.kind === "update") {
      const site = next.find((s) => s.id === action.id);
      assert.ok(site);
      site.domains = action.domains;
      site.chatbot = action.chatbot;
    } else if (action.kind === "create") {
      next.push({ id: `new-${action.slug}`, slug: action.slug, domains: action.site.domains, chatbot: action.site.chatbot });
    }
  }
  return next;
}
