/** SUNDER chatbot persona: guardrails present, no banned claims. Run: npx tsx --test tests/sunder-bot.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SUNDER_PERSONA, SUNDER_GOAL } from "../lib/chatbot/sunder-bot";
import { buildSystemPrompt, getPersona, domainsForBot } from "../lib/chatbot/personas";
import { codeChatbotSites } from "../lib/chatbot/code-sites";

test("sunder persona is registered and allowed only on sunder hosts", () => {
  assert.equal(getPersona("sunder"), SUNDER_PERSONA);
  assert.deepEqual(domainsForBot("sunder"), ["sunder.com.au", "www.sunder.com.au"]);
  assert.ok(codeChatbotSites().some((s) => s.slug === "sunder" && s.chatbot?.enabled));
});

test("prompt keeps guardrails and no banned claims", () => {
  const p = buildSystemPrompt(SUNDER_PERSONA);
  assert.match(p, /12-month warranty on core and edge/);
  assert.match(p, /Never say or imply the paddle is made, designed or manufactured in Australia/);
  assert.match(p, /launch date, price, specs/);
  assert.doesNotMatch(p, /\$\d|A\$|made in Australia\b(?! )/);
  assert.doesNotMatch(p, /[\u2013\u2014]/);
});

test("CTA uses Pre-Launch List and points at the page form, never the API", () => {
  assert.equal(SUNDER_GOAL.cta?.label, "Join the Pre-Launch List");
  assert.equal(SUNDER_GOAL.cta?.url, "https://sunder.com.au/#f");
  assert.equal(SUNDER_PERSONA.model, undefined);
});

test("stored SUNDER factory row (chatbot off) gets the code chatbot, other fields kept", async () => {
  const { withCodeChatbotSites } = await import("../lib/site-registry");
  const { SUNDER_FACTORY_SEED } = await import("../lib/sunder-factory-seed");
  const stored = { ...SUNDER_FACTORY_SEED, id: "sunder", createdAt: 1, updatedAt: 1 } as never;
  const out = withCodeChatbotSites([stored]).filter((s) => s.slug === "sunder");
  assert.equal(out.length, 1);
  assert.equal(out[0].chatbot?.enabled, true);
  assert.equal(out[0].status, "draft");
  const nico = withCodeChatbotSites([{ id: "nico-moretti", slug: "nico-moretti", name: "x", chatbot: { enabled: false } } as never]).find((s) => s.slug === "nico-moretti");
  assert.equal(nico?.chatbot?.enabled, false);
});

test("spaced hyphen dashes are rewritten, bullets kept", async () => {
  const { noSpacedHyphen } = await import("../lib/chatbot/personas");
  assert.equal(noSpacedHyphen("built for power - we split it"), "built for power, we split it");
  assert.equal(noSpacedHyphen("- one\n- two"), "- one\n- two");
  assert.equal(noSpacedHyphen("12-month warranty"), "12-month warranty");
  assert.equal(SUNDER_PERSONA.noSpacedHyphen, true);
});

test("a11y widget fixes are opt-in: only SUNDER's public config sets a11y", async () => {
  const { toPublicConfig } = await import("../lib/chatbot/core");
  const cfg = { plan: "presence" as const, skin: undefined, goal: undefined, engage: undefined } as never;
  const site = { name: "x" };
  assert.equal(toPublicConfig({ slug: "sunder", active: true, config: cfg, site }).a11y, true);
  assert.equal(toPublicConfig({ slug: "nico-moretti", active: true, config: cfg, site }).a11y, undefined);
  assert.equal(toPublicConfig({ slug: "sunder", active: true, config: cfg, site }).poweredByLabel, "Saabai.ai");
  assert.equal(toPublicConfig({ slug: "nico-moretti", active: true, config: cfg, site }).poweredByLabel, undefined);
  // readFileSync imported at top
  const js = readFileSync("public/embed/chat.v1.js", "utf8");
  assert.match(js, /c\.a11y === true \? " a11y"/);
  assert.match(js, /100dvh/);
  assert.match(readFileSync("public/clients/sunder/index.html", "utf8"), /chat\.v1\.js\?v=1\.3\.2" data-site="sunder"/);
});

test("chatLimited: per-IP minute, per-IP day, bot day, and fails open", async () => {
  const { chatLimited } = await import("../lib/chatbot/ratelimit");
  const store = new Map<string, number>();
  const redis = { incr: async (k: string) => { const n = (store.get(k) ?? 0) + 1; store.set(k, n); return n; }, expire: async () => 1 };
  const req = new Request("https://x", { headers: { "x-forwarded-for": "1.2.3.4" } });
  const lim = { perIpMinute: 2, perIpDay: 3, botDay: 100 };
  const t = Date.UTC(2026, 10, 2, 1, 0, 0);
  assert.equal(await chatLimited(req, "sunder", lim, redis, t), null);
  assert.equal(await chatLimited(req, "sunder", lim, redis, t), null);
  assert.equal(await chatLimited(req, "sunder", lim, redis, t), "ip-minute");
  assert.equal(await chatLimited(req, "sunder", lim, redis, t + 61000), null);
  assert.equal(await chatLimited(req, "sunder", lim, redis, t + 122000), "ip-day");
  const req2 = new Request("https://x", { headers: { "x-forwarded-for": "9.9.9.9" } });
  assert.equal(await chatLimited(req2, "sunder", { perIpMinute: 9, perIpDay: 9, botDay: 0 }, redis, t), "bot-day");
  const broken = { incr: async () => { throw new Error("down"); }, expire: async () => 1 };
  assert.equal(await chatLimited(req, "sunder", lim, broken, t), null);
  assert.deepEqual(SUNDER_PERSONA.chatLimits, { perIpMinute: 6, perIpDay: 40, botDay: 400 });
});

test("sunder: rules and fun section is in the prompt, sparing and SUNDER-safe", async () => {
  const m = await import("../lib/chatbot/sunder-bot");
  const { buildSystemPrompt } = await import("../lib/chatbot/personas");
  const p = buildSystemPrompt(m.SUNDER_PERSONA);
  assert.match(p, /Two bounce rule/); assert.match(p, /Kitchen \(non volley zone\)/); assert.match(p, /Padel/);
  assert.match(p, /Bainbridge Island/); assert.match(p, /Erne Perry/); assert.match(p, /disputed/);
  assert.match(p, /never in every reply/); assert.match(p, /Never invent stats or facts about SUNDER/);
  assert.ok(m.SUNDER_FUN_FACTS.length >= 15 && m.SUNDER_FUN_FACTS.length <= 20);
  assert.ok(m.SUNDER_JOKES.length >= 10);
  assert.doesNotMatch(p, / - |[\u2013\u2014]/);
});

test("sunder: polish rules (90 word cap, kitchen opener, not public yet plus CTA)", () => {
  const p = buildSystemPrompt(SUNDER_PERSONA);
  assert.match(p, /Hard limit: every reply is 90 words or fewer/);
  assert.match(p, /you can stand in the kitchen, you just cannot volley from it/);
  assert.match(p, /price, cost, specs .* or the launch date, say plainly that it is not public yet and that the Pre-Launch List hears first/);
});

test("sunder: code-side 90 word cap trims at a sentence end and keeps the closing question", async () => {
  const { capReplyWords } = await import("../lib/chatbot/personas");
  const real = "Absolutely, champ. You can stand in the kitchen whenever you like. The rule is simple: you just can't volley from it.\n\nHere's the deal. The kitchen is the 7-foot zone on both sides of the net, lines included. You can't hit a volley while you're touching the kitchen or its line. And your momentum from a volley can't carry you into it, even after the ball is dead.\n\nBut if the ball has bounced? You're good to step in and play it however you want.\n\nSo dink battles often happen right at the kitchen line. That's where the soft game shines.\n\nWhat's your go-to kitchen shot?";
  const out = capReplyWords(real, 90);
  const n = (out.match(/\S+/g) || []).length;
  assert.ok(n <= 90, `words ${n}`);
  assert.match(out, /^Absolutely, champ\. You can stand in the kitchen/);
  assert.match(out, /\n\nWhat's your go-to kitchen shot\?$/);
  assert.match(out.replace(/\n\nWhat's your go-to kitchen shot\?$/, ""), /[.!?]$/);
  const short = "Easy, champ. Fill in the form. Ready?";
  assert.equal(capReplyWords(short, 90), short);
  const noEnd = Array(120).fill("word").join(" ");
  assert.equal(capReplyWords(noEnd, 90), noEnd);
  const noQ = Array(30).fill("This is three.").join(" ");
  const t = capReplyWords(noQ, 90);
  assert.equal((t.match(/\S+/g) || []).length, 90); assert.match(t, /\.$/);
  assert.equal(SUNDER_PERSONA.maxReplyWords, 90);
  const { getPersona } = await import("../lib/chatbot/personas");
  assert.equal(getPersona("nico-moretti")?.maxReplyWords, undefined);
  assert.match(readFileSync("lib/chatbot/handler.ts", "utf8"), /persona\?\.maxReplyWords\) parsed\.content = capReplyWords/);
});
