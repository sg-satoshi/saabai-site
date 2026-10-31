/**
 * Sofia on the shared chatbot: DeepSeek with a platform-default fallback,
 * editing, origins, conversation ids, the sensitive-info flag, and the pass-through route.
 * The model call is intercepted. No real provider is contacted.
 */
import { test, before, after, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";
import { BESPOKE_SLUGS, toPublicConfig, validateSkin } from "../lib/chatbot/core";
import { botLockDenied, portalWriteGuard } from "../lib/chatbot/bot-lock";
import { decidePortalBot } from "../lib/chatbot/portal";
import { historyBotIds } from "../lib/chatbot/paths";
import { validateGoal } from "../lib/chatbot/goal";
import { summariseActivity } from "../lib/chatbot/leads";
import { DEFAULT_MODEL_FALLBACK, parseModelSpec } from "../lib/chat-config";
import {
  NICO_ENQUIRY_URL,
  NICO_GOAL,
  SENSITIVE_INFO_NOTICE,
  SOFIA_PERSONA,
  SOFIA_SYSTEM_PROMPT,
  buildSystemPrompt,
  getPersona,
  sensitiveInfoNoticeFor,
} from "../lib/chatbot/personas";
import { flushChatLog, setChatLogStoreForTests, type ChatLogStore } from "../lib/chat-log";

const mock = createMockUpstash();
const realFetch = globalThis.fetch;
const read = (f: string) => readFileSync(f, "utf8");

type Call = { url: string; body: string };
let calls: Call[] = [];
let deepseekStatus = 200;
let hangDeepseek = false;
const logged: Record<string, unknown>[] = [];

const store: ChatLogStore = {
  async upsertConversation(row) { logged.push(row); return { error: null }; },
  async insertMessages(rows) { logged.push(...rows); return { error: null }; },
};

function anthropicReply(text: string) {
  return new Response(JSON.stringify({
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5",
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    usage: { input_tokens: 8, output_tokens: 4 },
  }), { status: 200, headers: { "content-type": "application/json" } });
}

function deepseekReply(text: string) {
  return new Response(JSON.stringify({
    id: "chatcmpl-test",
    object: "chat.completion",
    model: "deepseek-v4-flash",
    choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
    usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 },
  }), { status: deepseekStatus, headers: { "content-type": "application/json" } });
}

async function bodyText(init?: RequestInit): Promise<string> {
  const b = init?.body;
  if (!b) return "";
  if (typeof b === "string") return b;
  if (b instanceof Uint8Array) return new TextDecoder().decode(b);
  if (typeof (b as { text?: () => Promise<string> }).text === "function") return (b as Blob).text();
  return String(b);
}

function hasPrompt(value: unknown): boolean {
  if (typeof value === "string") return value.includes(SOFIA_SYSTEM_PROMPT);
  if (Array.isArray(value)) return value.some(hasPrompt);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasPrompt);
  return false;
}

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.CHAT_ORIGIN_MODE = "enforce";
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.DEEPSEEK_API_KEY = "test-key";
  process.env.DEFAULT_CHAT_MODEL = "anthropic:claude-haiku-4-5";
  delete process.env.CHATBOTS_KILL;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("http://127.0.0.1")) return realFetch(input as RequestInfo, init);
    const body = await bodyText(init);
    calls.push({ url, body });
    if (url.includes("api.deepseek.com")) {
      if (hangDeepseek) {
        const signal = init?.signal;
        return new Promise((_resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("test hang exceeded")), 20_000);
          const onAbort = () => {
            clearTimeout(timer);
            const reason = signal?.reason;
            reject(reason instanceof Error ? reason : new Error("aborted"));
          };
          if (signal?.aborted) onAbort();
          else signal?.addEventListener("abort", onAbort, { once: true });
        });
      }
      if (deepseekStatus !== 200) {
        return new Response(JSON.stringify({ error: { message: "deepseek down" } }), {
          status: deepseekStatus,
          headers: { "content-type": "application/json" },
        });
      }
      return deepseekReply("from deepseek");
    }
    if (url.includes("api.anthropic.com")) return anthropicReply("from anthropic");
    return new Response("unexpected " + url, { status: 500 });
  }) as typeof fetch;
});

after(() => {
  setChatLogStoreForTests(null);
  globalThis.fetch = realFetch;
  return new Promise<void>((r) => mock.server.close(() => r()));
});

beforeEach(() => {
  mock.reset();
  calls = [];
  logged.length = 0;
  deepseekStatus = 200;
  hangDeepseek = false;
  process.env.DEEPSEEK_API_KEY = "test-key";
  process.env.DEFAULT_CHAT_MODEL = "anthropic:claude-haiku-4-5";
  process.env.CHAT_ORIGIN_MODE = "enforce";
  setChatLogStoreForTests(store);
});

describe("sofia on the platform", { concurrency: false }, () => {

const post = (slug: string, origin: string, extra: Record<string, unknown> = {}) =>
  new NextRequest("https://www.saabai.ai/api/chat-platform/message", {
    method: "POST",
    headers: { "content-type": "application/json", origin, "user-agent": "t" },
    body: JSON.stringify({
      slug,
      sessionId: "sess-nico-0001",
      messages: [{ role: "user", content: "where is the form" }],
      ...extra,
    }),
  });

test("the prompt is verbatim, DeepSeek is code-only, and other bots stay off it", () => {
  assert.equal(buildSystemPrompt(SOFIA_PERSONA), SOFIA_SYSTEM_PROMPT);
  assert.equal(getPersona("nico-moretti")?.model, "deepseek:deepseek-v4-flash");
  assert.equal(getPersona("nico-moretti")?.fallbackModel, "anthropic:claude-haiku-4-5");
  assert.equal(getPersona("lmm-site")?.fallbackModel, undefined);
  assert.equal(getPersona("lmm-site")?.model, undefined);
  assert.equal(getPersona("bo-consultancy")?.model, undefined);
  assert.equal(sensitiveInfoNoticeFor("lmm-site"), "");
  assert.equal(sensitiveInfoNoticeFor("bo-consultancy"), "");
  assert.equal(sensitiveInfoNoticeFor(undefined), "");
  assert.equal(SOFIA_PERSONA.sensitiveInfoNotice, true);
  assert.equal(sensitiveInfoNoticeFor("nico-moretti"), SENSITIVE_INFO_NOTICE);
  assert.equal(validateGoal(NICO_GOAL).ok, true);
  assert.equal(NICO_GOAL.cta?.url, NICO_ENQUIRY_URL);
  assert.equal(parseModelSpec(undefined, DEFAULT_MODEL_FALLBACK).provider, "anthropic");
  assert.equal(parseModelSpec(undefined, DEFAULT_MODEL_FALLBACK).modelId, "claude-haiku-4-5");
  const skin = validateSkin({ model: "deepseek:deepseek-v4-flash" });
  assert.equal(skin.ok, true);
  if (skin.ok) assert.equal("model" in skin.value, false);
  assert.doesNotMatch(read("app/api/admin/chatbots/route.ts"), /deepseek|sensitiveInfoNotice|verbatimPrompt/);
  assert.doesNotMatch(read("app/api/portal/chatbot/route.ts"), /deepseek|sensitiveInfoNotice/);
  assert.doesNotMatch(read("lib/chatbot/bot-lock.ts"), /nico-moretti/);
});

test("admin and portal can edit nico, and the whole-bot lock stays admin-only", () => {
  assert.equal(BESPOKE_SLUGS.includes("nico-moretti"), false);
  assert.ok(BESPOKE_SLUGS.includes("tributum-law-v2"));
  const portal = decidePortalBot({ site: { slug: "nico-moretti", name: "N" } });
  assert.equal(portal.ok, true);
  const bespoke = decidePortalBot({ site: { slug: "nextinvestment", name: "X" } });
  assert.equal(bespoke.ok, false);
  if (!bespoke.ok) assert.equal(bespoke.status, 409);
  assert.equal(botLockDenied(false, "set_lock")?.status, 403);
  assert.equal(botLockDenied(true, "set_lock"), null);
  assert.equal(portalWriteGuard({ locked: true }).ok, false);
  assert.equal(portalWriteGuard({ locked: false }).ok, true);
  assert.match(read("app/api/admin/chatbots/route.ts"), /BESPOKE_SLUGS\.includes\(site\.slug\)/);
  assert.match(read("app/api/portal/chatbot/route.ts"), /portalWriteGuard/);
});

test("registry entry is enabled and the origin allow-list includes both hosts", async () => {
  const { listSites } = await import("../lib/site-registry");
  const { handleChat } = await import("../lib/chatbot/handler");
  const { domainsForBot } = await import("../lib/chatbot/personas");
  const site = (await listSites()).find((s) => s.slug === "nico-moretti");
  assert.ok(site);
  assert.equal(site?.chatbot.enabled, true);
  assert.equal(site?.chatbot.name, "Sofia");
  const hosts = domainsForBot("nico-moretti", site?.domains);
  assert.ok(hosts.includes("nicomoretti.au"));
  assert.ok(hosts.includes("www.nicomoretti.au"));

  for (const origin of ["https://nicomoretti.au", "https://www.nicomoretti.au"]) {
    calls = [];
    const res = await handleChat(post("nico-moretti", origin));
    assert.equal(res.status, 200, origin);
    const body = await res.json();
    assert.equal(body.content, "from deepseek");
    assert.ok(calls.some((c) => c.url.includes("api.deepseek.com") && c.url.includes("/chat/completions")));
    assert.equal(calls.some((c) => c.url.includes("api.anthropic.com")), false);
    assert.ok(calls.some((c) => hasPrompt(JSON.parse(c.body))));
  }

  calls = [];
  const blocked = await handleChat(post("nico-moretti", "https://evil.example"));
  assert.equal(blocked.status, 403);
  assert.equal(calls.length, 0);
});

test("DeepSeek failure falls back to the platform default and the log names the provider", async () => {
  const { handleChat, loggedModel } = await import("../lib/chatbot/handler");
  assert.equal(loggedModel("deepseek", { modelId: "deepseek-v4-flash" }), "deepseek:deepseek-v4-flash");
  assert.equal(loggedModel("anthropic", { modelId: "claude-haiku-4-5" }), "anthropic:claude-haiku-4-5");

  deepseekStatus = 400;
  const res = await handleChat(post("nico-moretti", "https://nicomoretti.au"));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).content, "from anthropic");
  assert.ok(calls.some((c) => c.url.includes("api.deepseek.com")));
  assert.ok(calls.some((c) => c.url.includes("api.anthropic.com")));
  await flushChatLog();
  const assistant = logged.find((row) => row.role === "assistant");
  assert.equal(assistant?.model, "anthropic:claude-haiku-4-5");

  calls = [];
  logged.length = 0;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.AGENT_DEEPSEEK_API_KEY;
  const missing = await handleChat(post("nico-moretti", "https://nicomoretti.au"));
  assert.equal(missing.status, 200);
  assert.equal((await missing.json()).content, "from anthropic");
  assert.equal(calls.some((c) => c.url.includes("api.deepseek.com")), false);
  assert.ok(calls.some((c) => c.url.includes("api.anthropic.com")));
});

test("a hung DeepSeek call falls back after about 12 seconds, and the fallback stays pinned", async () => {
  const { handleChat, PERSONA_PRIMARY_TIMEOUT_MS } = await import("../lib/chatbot/handler");
  const { fallbackSessionId } = await import("../lib/chatbot/store");
  assert.equal(PERSONA_PRIMARY_TIMEOUT_MS, 12_000);
  const salted = fallbackSessionId("1.2.3.4", "ua", "2026-10-31", "salt-a");
  assert.notEqual(salted, fallbackSessionId("1.2.3.4", "ua", "2026-10-31", ""));
  assert.notEqual(salted, fallbackSessionId("1.2.3.4", "ua", "2026-10-31", "salt-b"));
  assert.ok(!salted.includes("1.2.3.4"));

  process.env.DEFAULT_CHAT_MODEL = "xai:grok-3-mini";
  deepseekStatus = 400;
  const pinned = await handleChat(post("nico-moretti", "https://nicomoretti.au"));
  assert.equal((await pinned.json()).content, "from anthropic");
  assert.equal(calls.some((c) => c.url.includes("api.x.ai")), false);

  calls = [];
  hangDeepseek = true;
  deepseekStatus = 200;
  const started = Date.now();
  const hung = await handleChat(post("nico-moretti", "https://nicomoretti.au"));
  const elapsed = Date.now() - started;
  assert.equal((await hung.json()).content, "from anthropic");
  assert.ok(elapsed >= 11_000 && elapsed < 16_000, `elapsed ${elapsed}`);
  assert.ok(calls.some((c) => c.url.includes("api.deepseek.com")));
  assert.ok(calls.some((c) => c.url.includes("api.anthropic.com")));
});

test("a bot without a persona model never calls DeepSeek", async () => {
  mock.seed({
    hashes: {
      "saabai:sites": {
        acme: JSON.stringify({
          id: "acme", slug: "acme-plumbing", name: "Acme Plumbing", status: "live", source: "factory",
          url: "https://acme.example", business: { name: "Acme Plumbing" },
          chatbot: { enabled: true, name: "Ada", greeting: "Hi", systemPrompt: "You are Ada." },
          domains: ["acme.example"], createdAt: 1, updatedAt: 1,
        }),
      },
    },
  });
  const { handleChat } = await import("../lib/chatbot/handler");
  const res = await handleChat(post("acme-plumbing", "https://acme.example"));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).content, "from anthropic");
  assert.equal(calls.some((c) => c.url.includes("api.deepseek.com")), false);
  await flushChatLog();
  const assistant = logged.find((row) => row.role === "assistant");
  assert.equal(assistant?.model, "anthropic:claude-haiku-4-5");
});

test("every message is logged with a conversation id, and an engaged chat counts as one lead", async () => {
  const { handleChat } = await import("../lib/chatbot/handler");
  const first = await handleChat(post("nico-moretti", "https://nicomoretti.au"));
  assert.equal(first.status, 200);
  const second = await handleChat(post("nico-moretti", "https://nicomoretti.au", {
    messages: [{ role: "user", content: "hello" }, { role: "user", content: "where is the form" }],
  }));
  assert.equal(second.status, 200);
  await flushChatLog();
  const users = logged.filter((row) => row.role === "user");
  assert.ok(users.length >= 2);
  const ids = new Set(users.map((row) => row.conversation_id));
  assert.equal(ids.size, 1);
  const id = [...ids][0];
  assert.equal(typeof id, "string");
  assert.match(String(id), /sess-nico-0001/);
  assert.equal(users.every((row) => row.bot_slug === "nico-moretti"), true);
  const month = summariseActivity(
    users.map((row) => ({
      bot: String(row.bot_slug),
      conversationId: String(row.conversation_id),
      content: String(row.content),
      at: "2026-10-31T01:00:00.000Z",
    })),
    [],
    Date.parse("2026-10-01T00:00:00+10:00"),
    Date.parse("2026-11-01T00:00:00+10:00"),
  );
  assert.equal(month.get("nico-moretti")?.leads, 1);
  assert.deepEqual(historyBotIds("nico-moretti"), ["nico-moretti", "nico"]);
});

test("public config keeps Sofia's look, greeting, goal and the sensitive-info line", () => {
  const pub = toPublicConfig({
    slug: "nico-moretti",
    active: true,
    config: { plan: "presence", skin: {} },
    site: { name: "Nico Moretti", business: { name: "Nico Moretti" }, chatbot: { name: "Wrong name", greeting: "Wrong greeting" } },
  });
  assert.equal(pub.botName, "Sofia");
  assert.match(pub.greeting, /AI assistant/);
  assert.match(pub.greeting, /How may I assist you/);
  assert.equal(pub.primary, "#0f1b2e");
  assert.equal(pub.accent, "#d4af37");
  assert.equal(pub.bg, "#faf8f5");
  assert.match(pub.avatarUrl, /sofia-avatar\.png/);
  assert.equal(pub.sensitiveNotice, SENSITIVE_INFO_NOTICE);
  assert.equal(pub.privacyUrl, "https://nicomoretti.au/privacy-policy");
  assert.equal(pub.goal?.cta?.url, NICO_ENQUIRY_URL);
  assert.equal(pub.goal?.cta?.label, "Send an enquiry");
  const saved = toPublicConfig({
    slug: "nico-moretti",
    active: true,
    config: { plan: "presence", skin: { primary: "#112233", botName: "Renamed" } },
    site: { name: "Nico Moretti", business: { name: "Nico Moretti" } },
  });
  assert.equal(saved.primary, "#112233");
  assert.equal(saved.botName, "Renamed");
  const other = toPublicConfig({ slug: "lmm-site", active: true, config: { plan: "presence", skin: {} }, site: { name: "Lifestyle Money Management" } });
  assert.equal(other.sensitiveNotice, "");
  assert.equal(other.privacyUrl, "");
  const widget = read("public/embed/chat.v1.js");
  assert.match(widget, /1\.3\.1/);
  assert.match(widget, /sensitiveNotice/);
  assert.match(widget, /privacyUrl/);
  assert.match(widget, /"Privacy policy"/);
  assert.doesNotMatch(widget, /DeepSeek/);
  for (const file of readdirSync("public/clients/nico-moretti").filter((name) => name.endsWith(".html"))) {
    const html = read(`public/clients/nico-moretti/${file}`);
    assert.match(html, /https:\/\/www\.saabai\.ai\/embed\/chat\.v1\.js\?v=1\.3\.1/, file);
    assert.match(html, /data-site="nico-moretti"/, file);
    assert.doesNotMatch(html, /DeepSeek in China/, file);
  }
  assert.doesNotMatch(read("public/clients/nico-moretti/chat-widget.js"), /DeepSeek in China/);
});

test("the old route is a thin pass-through and still logs a conversation id", async () => {
  const route = read("app/api/nico-chat/route.ts");
  assert.match(route, /handleChat/);
  assert.match(route, /Delete this route after 7 November 2026/);
  assert.doesNotMatch(route, /const SYSTEM_PROMPT/);
  assert.doesNotMatch(route, /api\.deepseek\.com/);
  const { POST } = await import("../app/api/nico-chat/route");
  const req = new NextRequest("https://www.saabai.ai/api/nico-chat", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://www.nicomoretti.au", "user-agent": "old" },
    body: JSON.stringify({
      messages: [
        { role: "user", content: "where is the form" },
        { role: "bot", content: "earlier-assistant-line" },
        { role: "user", content: "thanks, the form" },
      ],
    }),
  });
  const res = await POST(req);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).content, "from deepseek");
  const body = calls.find((c) => c.url.includes("api.deepseek.com"))?.body ?? "";
  assert.match(body, /earlier-assistant-line/);
  assert.match(body, /thanks, the form/);
  await flushChatLog();
  const users = logged.filter((row) => row.role === "user");
  assert.ok(users.length >= 1);
  assert.ok(users.every((row) => typeof row.conversation_id === "string" && String(row.conversation_id).length > 0));
  assert.equal(users[0].bot_slug, "nico-moretti");
});

});
