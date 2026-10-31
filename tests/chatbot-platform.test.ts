/**
 * Central chatbot platform (stage 2): config rules, on/off, audit, usage and log-only caps.
 * Runs against the in-memory Upstash mock. No real model or Redis is used.
 */
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";
import { BESPOKE_SLUGS, CAPS, SEED_OFF, auditSummary, canRemovePoweredBy, capState, effectiveEnabled, monthKey, offMessage, poweredByVisible, resolveSkin, validateSkin } from "../lib/chatbot/core";

const mock = createMockUpstash();
const realFetch = globalThis.fetch;
const ROOT = new URL("..", import.meta.url).pathname;
let modelCalls = 0;

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.CHAT_ORIGIN_MODE = "off";
  delete process.env.CHATBOTS_KILL;
  process.env.ANTHROPIC_API_KEY = "test-key"; // so the model call reaches fetch, which is blocked below
  // Only the Redis mock is reachable. Anything else (a model call) is counted and refused.
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("http://127.0.0.1")) return realFetch(input as RequestInfo, init);
    modelCalls++;
    throw new Error("network blocked in test");
  }) as typeof fetch;
});
after(() => { globalThis.fetch = realFetch; return new Promise<void>((r) => mock.server.close(() => r())); });

const SITE = {
  id: "acme", slug: "acme-plumbing", name: "Acme Plumbing", niche: "plumbing", status: "live", url: "https://www.saabai.ai/sites/acme-plumbing", source: "factory",
  business: { name: "Acme Plumbing", phone: "0400 111 222", email: "hi@acme.test" },
  chatbot: { enabled: true, name: "Annie", greeting: "Hi", systemPrompt: "You are Annie." },
  createdAt: 1, updatedAt: 1,
};
beforeEach(() => {
  mock.reset();
  mock.seed({ hashes: { "saabai:sites": { acme: JSON.stringify(SITE) } } });
  modelCalls = 0;
  delete process.env.CHATBOTS_KILL;
});

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest("https://www.saabai.ai/api/chat-platform/message", { method: "POST", headers: { "content-type": "application/json", origin: "https://www.saabai.ai", "user-agent": "t", ...headers }, body: JSON.stringify(body) });

// ── pure rules ────────────────────────────────────────────────────────────
test("caps are 200, 600, 2000 and are log-only states", () => {
  assert.deepEqual(CAPS, { presence: 200, growth: 600, signature: 2000 });
  assert.equal(capState(100, "presence").state, "ok");
  assert.equal(capState(160, "presence").state, "near");
  assert.equal(capState(200, "presence").state, "near");
  assert.equal(capState(201, "presence").state, "over");
  assert.equal(capState(601, "growth").state, "over");
  assert.equal(capState(2000, "signature").state, "near");
});

test("Powered by Saabai can only be removed on Growth and Signature", () => {
  assert.equal(canRemovePoweredBy("presence"), false);
  assert.equal(canRemovePoweredBy("growth"), true);
  assert.equal(canRemovePoweredBy("signature"), true);
  assert.equal(poweredByVisible("presence", false), true, "Presence always shows it");
  assert.equal(poweredByVisible("growth", false), false);
  assert.equal(poweredByVisible("growth", undefined), true);
  assert.equal(resolveSkin({ plan: "presence", skin: { showPoweredBy: false } }).poweredBy, true);
  assert.equal(resolveSkin({ plan: "signature", skin: { showPoweredBy: false } }).poweredBy, false);
});

test("effective on/off: default on, Stu seeded off, explicit flag wins, kill wins over all", () => {
  assert.ok(SEED_OFF.includes("cycle-repair"));
  assert.equal(effectiveEnabled({ flag: null, slug: "acme" }), true);
  assert.equal(effectiveEnabled({ flag: null, slug: "acme", siteChatbotEnabled: false }), false);
  assert.equal(effectiveEnabled({ flag: null, slug: "cycle-repair", siteChatbotEnabled: true }), false);
  assert.equal(effectiveEnabled({ flag: true, slug: "cycle-repair" }), true);
  assert.equal(effectiveEnabled({ flag: false, slug: "acme" }), false);
  assert.equal(effectiveEnabled({ flag: true, slug: "acme", kill: true }), false);
});

test("skin validation: hex colours, safe avatar URL, lengths, position", () => {
  assert.ok(validateSkin({ primary: "#0F2A4A", position: "left", botName: "Annie", avatarUrl: "https://x.test/a.png" }).ok);
  for (const bad of [{ primary: "red" }, { accent: "#12345" }, { avatarUrl: "javascript:alert(1)" }, { avatarUrl: "data:text/html,x" }, { avatarUrl: "//evil.test/a.png" }, { position: "top" }, { botName: "x".repeat(41) }, { showPoweredBy: "no" }]) {
    assert.equal(validateSkin(bad).ok, false, JSON.stringify(bad));
  }
  const v = validateSkin({ botName: "A<b>nnie</b>" });
  assert.ok(!(v.ok && /[<>]/.test(v.value.botName ?? "")));
});

test("off message uses the business phone and email, month key is Brisbane, audit text", () => {
  assert.match(offMessage({ phone: "0400 111 222", email: "hi@acme.test" }), /call 0400 111 222 or email hi@acme.test/);
  assert.match(offMessage(), /taking a break/);
  assert.equal(monthKey(new Date("2026-10-31T15:00:00Z")), "2026-11", "1 Nov in Brisbane");
  assert.equal(auditSummary(false, "client request"), "Chatbot turned OFF. Reason: client request");
});

// ── store and handler against the mock ───────────────────────────────────
test("toggle writes the flag, last-change record and an audit entry, and only when it changed", async () => {
  const { setEnabled, isEnabled, getMeta } = await import("../lib/chatbot/store");
  assert.equal(await isEnabled("acme-plumbing", true), true, "default on");
  const r1 = await setEnabled({ slug: "acme-plumbing", siteName: "Acme Plumbing", siteChatbotEnabled: true, on: false, actor: "saabai", reason: "test" });
  assert.equal(r1.changed, true);
  assert.equal(await isEnabled("acme-plumbing", true), false);
  assert.equal((await getMeta("acme-plumbing")).by, "saabai");
  const r2 = await setEnabled({ slug: "acme-plumbing", siteName: "Acme Plumbing", siteChatbotEnabled: true, on: false, actor: "saabai" });
  assert.equal(r2.changed, false, "no duplicate audit entry");
  const log = (await mock.exec(["LRANGE", "saabai:change-log", "0", "-1"])) as string[];
  assert.equal(log.length, 1);
  assert.match(log[0], /Chatbot turned OFF\. Reason: test/);
  await setEnabled({ slug: "acme-plumbing", siteName: "Acme Plumbing", siteChatbotEnabled: true, on: true, actor: "saabai" });
  assert.equal(((await mock.exec(["LRANGE", "saabai:change-log", "0", "-1"])) as string[]).length, 2);
});

test("Stu's Cycle Repairs starts OFF and a seeded site stays off until an admin turns it on", async () => {
  const { isEnabled, setEnabled } = await import("../lib/chatbot/store");
  assert.equal(await isEnabled("cycle-repair", true), false);
  await setEnabled({ slug: "cycle-repair", siteName: "Stu's Cycle Repairs", on: true, actor: "saabai" });
  assert.equal(await isEnabled("cycle-repair", false), true);
});

test("when OFF the chat API answers politely with no model call and counts nothing", async () => {
  const { setEnabled, getUsage } = await import("../lib/chatbot/store");
  const { handleChat } = await import("../lib/chatbot/handler");
  await setEnabled({ slug: "acme-plumbing", siteName: "Acme", siteChatbotEnabled: true, on: false, actor: "saabai" });
  const res = await handleChat(post({ slug: "acme-plumbing", messages: [{ role: "user", content: "hello" }] }));
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.chatbotOff, true);
  assert.match(j.content, /call 0400 111 222/);
  assert.equal(modelCalls, 0, "no model call");
  assert.equal((await getUsage("acme-plumbing")).messages, 0, "nothing counted");
});

test("kill switch turns every platform bot off", async () => {
  process.env.CHATBOTS_KILL = "1";
  const { handleChat } = await import("../lib/chatbot/handler");
  const j = await (await handleChat(post({ slug: "acme-plumbing", messages: [{ role: "user", content: "hi" }] }))).json();
  assert.equal(j.chatbotOff, true);
  assert.equal(modelCalls, 0);
});

test("ON: one conversation per session per month, messages counted, caps are log-only", async () => {
  const { handleChat } = await import("../lib/chatbot/handler");
  const { getUsage, saveConfig } = await import("../lib/chatbot/store");
  const sid = "session-abcdef12";
  for (let i = 0; i < 3; i++) await handleChat(post({ slug: "acme-plumbing", sessionId: sid, messages: [{ role: "user", content: "hi " + i }] }));
  await handleChat(post({ slug: "acme-plumbing", sessionId: "session-other-99", messages: [{ role: "user", content: "yo" }] }));
  const u = await getUsage("acme-plumbing");
  assert.equal(u.conversations, 2);
  assert.equal(u.messages, 4);
  assert.ok(modelCalls >= 1, "model is attempted when on (blocked here)");
  // Push past the Presence cap: still not blocked (no enforcement).
  await saveConfig({ schema: 1, slug: "acme-plumbing", plan: "presence", skin: {} });
  for (let i = 0; i < 201; i++) await mock.exec(["SADD", `saabai:chatbot:convs:acme-plumbing:${monthKey()}`, `x${i}`]);
  await mock.exec(["HSET", `saabai:chatbot:usage:acme-plumbing:${monthKey()}`, "conversations", "250"]);
  const before = modelCalls;
  const res = await handleChat(post({ slug: "acme-plumbing", sessionId: "session-new-0001", messages: [{ role: "user", content: "still answering?" }] }));
  assert.ok(modelCalls > before, "over the cap still reaches the model");
  assert.notEqual((await res.json().catch(() => ({}))).chatbotOff, true);
});

test("a missing session id falls back to an anonymous visitor-and-day id (no raw IP stored)", async () => {
  const { fallbackSessionId } = await import("../lib/chatbot/store");
  const a = fallbackSessionId("1.2.3.4", "ua", "2026-10-18");
  assert.equal(a, fallbackSessionId("1.2.3.4", "ua", "2026-10-18"));
  assert.notEqual(a, fallbackSessionId("1.2.3.4", "ua", "2026-10-19"));
  assert.ok(!a.includes("1.2.3.4"));
});

test("wiring: admin API writes need adminActor, bespoke sites cannot be toggled, routes are registered", () => {
  const api = readFileSync(ROOT + "app/api/admin/chatbots/route.ts", "utf8");
  assert.match(api, /export async function POST[\s\S]*adminActor\(\)/);
  assert.match(api, /BESPOKE_SLUGS\.includes\(site\.slug\)/);
  const proxy = readFileSync(ROOT + "proxy.ts", "utf8");
  assert.equal((proxy.match(/\/api\/chat-platform\/message/g) ?? []).length >= 2, true);
  assert.match(readFileSync(ROOT + "lib/chat-guard.ts", "utf8"), /\/api\/chat-platform\/message/);
  assert.ok(!BESPOKE_SLUGS.includes("bo-consultancy") && !BESPOKE_SLUGS.includes("lmm-site"), "Christina and Zara are on the platform");
  for (const slug of ["tributum-law-v2", "nextinvestment"]) assert.ok(BESPOKE_SLUGS.includes(slug));
  assert.equal(BESPOKE_SLUGS.includes("nico-moretti"), false);
  for (const f of ["tributum-chat", "nextinvestment-chat"]) {
    assert.doesNotMatch(readFileSync(ROOT + `app/api/${f}/route.ts`, "utf8"), /chatbot\/(store|handler)/, `${f} is untouched`);
  }
  assert.match(readFileSync(ROOT + "app/api/nico-chat/route.ts", "utf8"), /handleChat/);
  for (const f of ["bo-chat", "lmm-chat"]) {
    const src = readFileSync(ROOT + `app/api/${f}/route.ts`, "utf8");
    assert.match(src, /Delete this route after 27 October 2026/, `${f} stays as a one-week fallback`);
    assert.doesNotMatch(src, /chatbot\/(store|handler)/, `${f} fallback still has its own prompt`);
  }
});
