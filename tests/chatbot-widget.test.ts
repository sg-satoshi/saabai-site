/** Chatbot platform stage 3: public config, widget script, knowledge and tone, factory flag, Stu installed but off. */
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";
import { LIMITS, promptAdditions, toPublicConfig, validateContent } from "../lib/chatbot/core";

const mock = createMockUpstash();
const ROOT = new URL("..", import.meta.url).pathname;
const read = (f: string) => readFileSync(ROOT + f, "utf8");

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.CHAT_ORIGIN_MODE = "off";
  delete process.env.CHATBOTS_KILL;
});
after(() => new Promise<void>((r) => mock.server.close(() => r())));

const SITE = {
  id: "acme", slug: "acme-plumbing", name: "Acme Plumbing", niche: "plumbing", status: "live", url: "https://x", source: "factory", domains: ["acmeplumbing.test"],
  business: { name: "Acme Plumbing", phone: "0400 111 222", email: "hi@acme.test" },
  chatbot: { enabled: true, name: "Annie", greeting: "Hi there", systemPrompt: "SECRET PROMPT DO NOT LEAK" }, createdAt: 1, updatedAt: 1,
};
beforeEach(() => {
  mock.reset();
  mock.seed({ hashes: { "saabai:sites": { acme: JSON.stringify(SITE) } } });
  delete process.env.CHATBOTS_KILL; process.env.CHAT_ORIGIN_MODE = "off";
});
const get = (qs: string, origin = "https://acmeplumbing.test") => new NextRequest(`https://www.saabai.ai/api/chat-platform/config${qs}`, { headers: { origin } });

test("content validation: tone, facts and FAQ limits", () => {
  assert.ok(validateContent({ tone: "professional", facts: "Open 8 to 5", faqs: [{ q: "Hours?", a: "8 to 5" }] }).ok);
  for (const bad of [{ tone: "angry" }, { facts: "x".repeat(LIMITS.facts + 1) }, { faqs: Array.from({ length: LIMITS.faqs + 1 }, () => ({ q: "a", a: "b" })) }, { faqs: [{ q: "only question", a: "" }] }, { faqs: [{ q: "q".repeat(LIMITS.q + 1), a: "a" }] }, { faqs: "nope" }]) {
    assert.equal(validateContent(bad).ok, false, JSON.stringify(bad).slice(0, 60));
  }
  const v = validateContent({ faqs: [{ q: "", a: "" }, { q: "Hours?", a: "8 to 5" }] });
  assert.ok(v.ok && v.value.knowledge?.faqs.length === 1, "empty rows are dropped");
});

test("prompt additions: tone, facts and FAQs, with a do-not-invent rule; empty when nothing set", () => {
  assert.equal(promptAdditions({}), "");
  const p = promptAdditions({ tone: "concise", knowledge: { facts: "Open 8 to 5 weekdays", faqs: [{ q: "Call-out fee?", a: "$99" }] } });
  assert.match(p, /brief and direct/); assert.match(p, /Open 8 to 5 weekdays/); assert.match(p, /Q: Call-out fee\?\nA: \$99/); assert.match(p, /not sure/);
  assert.match(read("lib/chatbot/handler.ts"), /promptAdditions\(config\)/);
});

test("public config: skin, plan rule, off message, and never the prompt or knowledge", () => {
  const base = { active: true, site: SITE as never };
  const pres = toPublicConfig({ ...base, config: { plan: "presence", skin: { showPoweredBy: false, primary: "#112233" } } });
  assert.equal(pres.poweredBy, true, "Presence always shows Powered by"); assert.equal(pres.primary, "#112233"); assert.equal(pres.botName, "Annie");
  assert.equal(toPublicConfig({ ...base, config: { plan: "growth", skin: { showPoweredBy: false } } }).poweredBy, false);
  assert.equal(toPublicConfig({ ...base, config: { plan: "signature", skin: {} } }).poweredBy, true, "default stays on");
  const json = JSON.stringify(pres);
  assert.doesNotMatch(json, /SECRET PROMPT|systemPrompt|knowledge|facts/);
  assert.match(pres.offMessage, /0400 111 222/);
});

test("config endpoint: active site, off site, unknown and bad slugs, kill switch", async () => {
  const { GET } = await import("../app/api/chat-platform/config/route");
  const j = async (r: Response) => r.json() as Promise<Record<string, unknown>>;
  const on = await j(await GET(get("?site=acme-plumbing")));
  assert.equal(on.active, true); assert.equal(on.botName, "Annie"); assert.doesNotMatch(JSON.stringify(on), /SECRET PROMPT/);
  assert.equal((await j(await GET(get("?site=nope-nope")))).active, false);
  assert.equal((await j(await GET(get("?site=../etc")))).active, false);
  assert.equal((await j(await GET(get("")))).active, false);
  const { setEnabled } = await import("../lib/chatbot/store");
  await setEnabled({ slug: "cycle-repair", siteName: "Stu", on: false, actor: "t" });
  assert.equal((await j(await GET(get("?site=cycle-repair")))).active, false, "Stu is OFF");
});

test("config endpoint honours off flag (after cache window) and origin enforce mode", async () => {
  const { GET } = await import("../app/api/chat-platform/config/route");
  process.env.CHAT_ORIGIN_MODE = "enforce";
  const ok = (await (await GET(get("?site=acme-plumbing", "https://acmeplumbing.test"))).json()) as { active: boolean };
  assert.equal(ok.active, true, "the site's own domain is allowed");
  const bad = (await (await GET(get("?site=acme-plumbing", "https://evil.test"))).json()) as { active: boolean };
  assert.equal(bad.active, false, "another website gets nothing");
  const own = (await (await GET(get("?site=acme-plumbing", "https://www.saabai.ai"))).json()) as { active: boolean };
  assert.equal(own.active, true, "saabai.ai preview is allowed");
});

test("widget script: one line install, session id, off, limit and error messages, no lead capture, safe rendering", () => {
  const js = read("public/embed/chat.v1.js").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(js, /data-site/); assert.match(js, /\/api\/chat-platform\/config\?site=/); assert.match(js, /\/api\/chat-platform\/message/);
  assert.match(js, /sessionId: state\.sid/); assert.match(js, /sessionStorage/); assert.match(js, /IDLE_MS = 30 \* 60 \* 1000/);
  assert.match(js, /j\.chatbotOff/); assert.match(js, /o\.s === 429/); assert.match(js, /o\.s === 403 \|\| o\.s === 404/); assert.match(js, /couldn't connect/);
  assert.match(js, /c\.active/, "stays hidden unless active"); assert.match(js, /poweredBy === false/);
  // Since the conversion playbook (#468): localStorage holds only nudge and review caps, and the
  // end-of-chat email form shows only when the bot's emailCopy toggle AND the lead-capture flag are on.
  assert.doesNotMatch(js, /lead|phone number|document\.cookie/i, "no lead capture wording, no cookies");
  assert.match(js, /if \(eg\.emailCopy\) endForm = followForm\(\)/, "email form gated by config");
  // localStorage keys are limited to the per-bot nudge cap, review-asked and returning-visitor flags. No ids or chat text.
  const lsKeys = [...js.matchAll(/localStorage\.(?:getItem|setItem)\(([^,)]+)/g)].map((m) => m[1].trim());
  assert.ok(lsKeys.length > 0);
  for (const k of lsKeys) assert.match(k, /^KEY \+ ":(nd|rv|seen)"$/, `unexpected localStorage key ${k}`);
  assert.doesNotMatch(js, /localStorage\.setItem\([^)]*(state|msgs|email|sid)/, "no chat text, email or session id in localStorage");
  assert.match(js, /attachShadow/);
  assert.doesNotMatch(js, /innerHTML\s*=\s*[^;'"<]*\b(m\.c|c\.botName|c\.greeting|j\.content)\b/, "visitor and bot text never goes through innerHTML");
  assert.match(js, /textContent/);
  assert.match(js, /e\.source !== window\.parent/, "preview messages only from the parent window");
});

test("factory template: old inline widget by default, one-line v2 script behind CHAT_WIDGET_V2", async () => {
  const { buildChatWidget } = await import("../lib/chat-widget-template");
  const cfg = { slug: "acme-plumbing", botName: "Annie", greeting: "Hi", primaryColor: "#111111", accentColor: "#c9a227", bgColor: "#ffffff", textColor: "#222222" };
  delete process.env.CHAT_WIDGET_V2;
  assert.match(buildChatWidget(cfg), /<script id="sf-chat-widget">/);
  process.env.CHAT_WIDGET_V2 = "1";
  try {
    const v2 = buildChatWidget(cfg);
    assert.equal(v2, '<script id="saabai-chat-v2" src="https://www.saabai.ai/embed/chat.v1.js" data-site="acme-plumbing" async></script>');
    assert.match(buildChatWidget({ ...cfg, slug: 'x"><script>' }), /sf-chat-widget/, "a bad slug never reaches an attribute");
  } finally { delete process.env.CHAT_WIDGET_V2; }
});

test("seeding keeps a saved skin and gives new sites their starting colours", async () => {
  const { seedPlatformSkin } = await import("../lib/chatbot/seed");
  const { getConfig, saveConfig } = await import("../lib/chatbot/store");
  await seedPlatformSkin("new-site", { botName: "Nia", greeting: "Hello", primaryColor: "#102030", accentColor: "#c0a020", bgColor: "#ffffff", textColor: "#111111" });
  const c = await getConfig("new-site");
  assert.equal(c.skin.primary, "#102030"); assert.equal(c.skin.botName, "Nia");
  await saveConfig({ ...c, skin: { ...c.skin, primary: "#aa0000" } });
  await seedPlatformSkin("new-site", { botName: "Other", greeting: "x", primaryColor: "#000001", accentColor: "#000002", bgColor: "#000003", textColor: "#000004" });
  assert.equal((await getConfig("new-site")).skin.primary, "#aa0000", "never overwrites an admin's skin");
});

test("wiring: Stu installed (and OFF), remaining bespoke bots untouched, BO and LMM on the platform, admin-only content save, routes registered", () => {
  assert.match(read("app/sites/cycle-repair/layout.tsx"), /embed\/chat\.v1\.js"[^>]*data-site="cycle-repair"/);
  for (const f of ["tributum-chat", "nextinvestment-chat"]) assert.doesNotMatch(read(`app/api/${f}/route.ts`), /chatbot\//, `${f} untouched`);
  assert.match(read("app/api/nico-chat/route.ts"), /chatbot\/handler/);
  assert.doesNotMatch(read("public/clients/nextinvestment/assets/chat-widget.js"), /embed\/chat\.v1|chat-platform/);
  assert.match(read("public/clients/nico-moretti/index.html"), /embed\/chat\.v1\.js/);
  for (const f of ["public/clients/lmm-site/assets/chat-widget.js", "app/components/BOChatWidget.tsx", "app/sites/bo-consultancy/layout.tsx"]) {
    const src = read(f);
    assert.match(src, /\/api\/chat-platform\/message/, `${f} posts to the platform`);
    assert.match(src, /\/api\/chat-platform\/config/, `${f} reads platform config`);
  }
  assert.match(read("public/clients/lmm-site/assets/chat-widget.js"), /lmm-site/);
  assert.match(read("app/components/BOChatWidget.tsx"), /bo-consultancy/);
  assert.match(read("app/sites/bo-consultancy/layout.tsx"), /bo-consultancy/);
  const api = read("app/api/admin/chatbots/route.ts");
  assert.match(api, /export async function POST[\s\S]*adminActor\(\)[\s\S]*case "save_content"[\s\S]*case "save_all"/);
  assert.match(read("app/saabai-admin/chatbots/ChatbotEditor.tsx"), /action: "save_all"/, "the editor saves skin and content in one go");
  assert.equal((read("proxy.ts").match(/\/api\/chat-platform\/config/g) ?? []).length >= 2, true);
  assert.match(read("next.config.ts"), /\/embed\/:path\*/);
  assert.match(read("app/api/site-factory/inject-chatbot/route.ts"), /saabai-chat-v2/);
});
