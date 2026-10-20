/**
 * Chatbots admin list: one canonical row per client, counts added across copies.
 * Display only: nothing is deleted.   npx tsx --test tests/chatbot-dedupe.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";
import { chatbotCanonicalRows, sumUsage } from "../lib/chatbot/canonical-rows";
import { combinedCopyNote } from "../lib/chatbot/combined-note";
import { matchesSite } from "../lib/chatbot/search";
import { capState, monthKey } from "../lib/chatbot/core";
import type { SiteConfig } from "../lib/site-registry";

const mock = createMockUpstash();
const ROOT = new URL("..", import.meta.url).pathname;
const bot = { enabled: true, name: "Bot", greeting: "Hi", systemPrompt: "Help." };
const site = (id: string, slug: string, name: string, createdAt: number, extra: Record<string, unknown> = {}): SiteConfig =>
  ({ id, slug, name, status: "live", source: "factory", url: `https://www.saabai.ai/sites/${slug}/`, business: { name }, chatbot: bot, createdAt, updatedAt: createdAt, ...extra }) as SiteConfig;

const heaven = [
  site("site_1_heav1", "heaven-thai-massage", "Heaven Thai Massage", 1),
  site("site_2_heav2", "heaven-thai-massage", "Heaven Thai Massage", 2),
  site("site_3_heav3", "heaven-thai-massage", "Heaven Thai Massage", 3),
];
const nico = [
  site("site_4_nico1", "nico-moretti", "Nico Moretti", 4),
  site("site_5_nico2", "nicomoretti-au", "Nico Moretti", 5, { externalUrl: "https://nicomoretti.au", domains: ["nicomoretti.au"] }),
];
const tributum = [
  site("site_6_trib1", "tributum-law", "Tributum Law", 6),
  site("site_7_trib2", "tributum-law", "Tributum Law", 7),
  site("site_8_trib3", "Tributum Law", "Tributum Law", 8, { url: "https://www.saabai.ai/sites/Tributum%20Law/" }),
];
const domain = site("site_9_tribdom", "tributum-law", "Tributum Law", 9, { externalUrl: "https://tributumlaw.com", domains: ["tributumlaw.com"] });
const quiet = site("site_quiet", "quiet-cafe", "Quiet Cafe", 1, { chatbot: { enabled: false, name: "", greeting: "", systemPrompt: "" } });

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
});
after(() => mock.server.close());

const none = { users: [] as string[], billing: false };

test("custom domain is the row shown, and tributum-law-v2 is folded when a stored record matches", async () => {
  const { APP_ROUTER_SITES } = await import("../lib/site-registry");
  const v2 = APP_ROUTER_SITES.find((s) => s.id === "tributum-law-v2")!;
  const hard = new Set(["tributum-law-v2"]);
  const links = (id: string) => id === "tributum-law-v2" ? { users: ["mathew"], billing: false } : id === "site_6_trib1" ? { users: [], billing: true } : none;
  const rows = chatbotCanonicalRows([...heaven, ...nico, ...tributum, domain, v2, quiet], links, hard);
  const byName = Object.fromEntries(rows.map((r) => [r.site.business?.name || r.site.name, r]));

  assert.equal(rows.length, 3, "quiet cafe has no chatbot, so it is not a row");
  assert.equal(byName["Heaven Thai Massage"].site.id, "site_3_heav3");
  assert.deepEqual(byName["Heaven Thai Massage"].slugs, ["heaven-thai-massage"]);
  assert.deepEqual(byName["Heaven Thai Massage"].folded.map((f) => f.id).sort(), ["site_1_heav1", "site_2_heav2"]);

  assert.equal(byName["Nico Moretti"].site.id, "site_5_nico2");
  assert.deepEqual([...byName["Nico Moretti"].slugs].sort(), ["nico-moretti", "nicomoretti-au"]);
  assert.deepEqual(byName["Nico Moretti"].folded.map((f) => f.id), ["site_4_nico1"]);
  assert.equal(byName["Nico Moretti"].site.slug === "nico-moretti", false);

  assert.equal(byName["Tributum Law"].site.id, "site_9_tribdom");
  assert.ok(!byName["Tributum Law"].folded.some((f) => f.id === "site_9_tribdom"));
  assert.ok(byName["Tributum Law"].folded.some((f) => f.id === "tributum-law-v2"));
  assert.ok(byName["Tributum Law"].folded.some((f) => f.id === "site_6_trib1"), "a billing copy is hidden on the page and left in storage");
  assert.ok(byName["Tributum Law"].slugs.includes("tributum-law-v2"));
  assert.ok(byName["Tributum Law"].slugs.includes("tributum-law"));
});

test("hardcoded v2 is the row when it is the canonical record", async () => {
  const { APP_ROUTER_SITES } = await import("../lib/site-registry");
  const v2 = APP_ROUTER_SITES.find((s) => s.id === "tributum-law-v2")!;
  const rows = chatbotCanonicalRows([...tributum, v2], (id) => ({ users: id === "tributum-law-v2" ? ["mathew"] : [], billing: false }), new Set(["tributum-law-v2"]));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].site.id, "tributum-law-v2");
  assert.deepEqual(rows[0].folded.map((f) => f.id).sort(), ["site_6_trib1", "site_7_trib2", "site_8_trib3"]);
});

test("a client still gets a row when only a folded copy has a chatbot", () => {
  const quietCanon = site("site_q", "quiet-co", "Quiet Co", 2, { chatbot: { enabled: false, name: "", greeting: "", systemPrompt: "" } });
  const loudCopy = site("site_q2", "quiet-co-old", "Quiet Co", 1);
  const rows = chatbotCanonicalRows([quietCanon, loudCopy], (id) => ({ users: id === "site_q" ? ["owner"] : [], billing: false }));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].site.id, "site_q");
  assert.deepEqual(rows[0].slugs.sort(), ["quiet-co", "quiet-co-old"]);
});

test("same slug is one row when the business names do not match", async () => {
  const { nameKey, normaliseSlug } = await import("../lib/site-dedupe");
  const redis = site("site_heaven_redis", "heaven-thai-massage", "Heaven Thai Massage", 2);
  const other = site("site_heaven_named", "heaven-thai-massage", "Heaven Thai Massage", 9, { business: { name: "Heaven Thai Massage Pty Ltd" }, source: "external" });
  assert.notEqual(nameKey(redis), nameKey(other));
  assert.equal(normaliseSlug(redis.slug), normaliseSlug(other.slug));
  const rows = chatbotCanonicalRows([redis, other], () => none);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].site.id, "site_heaven_named");
  assert.deepEqual(rows[0].slugs, ["heaven-thai-massage"]);
  assert.deepEqual(rows[0].folded.map((f) => f.id), ["site_heaven_redis"]);
});

test("heaven-thai-massage is not in the hardcoded app router list", async () => {
  const { APP_ROUTER_SITES } = await import("../lib/site-registry");
  assert.equal(APP_ROUTER_SITES.some((s) => s.slug === "heaven-thai-massage" || s.name === "Heaven Thai Massage"), false);
});

test("conversation and message counts add across distinct slugs, and a shared slug is counted once", () => {
  const usage = sumUsage([
    { conversations: 4, messages: 10, inputTokens: 1, outputTokens: 2 },
    { conversations: 2, messages: 3, inputTokens: 4, outputTokens: 5 },
  ]);
  assert.deepEqual(usage, { conversations: 6, messages: 13, inputTokens: 5, outputTokens: 7 });
  assert.equal(capState(usage.conversations, "presence").state, "ok");
  assert.equal(capState(201, "presence").state, "over");
  const same = site("a", "heaven-thai-massage", "Heaven Thai Massage", 1);
  const copy = site("b", "heaven-thai-massage", "Heaven Thai Massage", 2);
  const [row] = chatbotCanonicalRows([same, copy], () => none);
  assert.deepEqual(row.slugs, ["heaven-thai-massage"]);
});

test("combined row text has no em dashes and search still finds a folded slug", () => {
  assert.equal(combinedCopyNote("tributum-law", []), "");
  assert.equal(combinedCopyNote("heaven-thai-massage", [{ slug: "heaven-thai-massage" }, { slug: "heaven-thai-massage" }]), "2 other copies are combined into this row.");
  const line = combinedCopyNote("tributum-law", [{ slug: "tributum-law" }, { slug: "tributum-law-v2" }, { slug: "Tributum Law" }]);
  assert.equal(line, "3 other copies are combined into this row. Counts include tributum-law-v2, Tributum Law.");
  assert.ok(!/[\u2012-\u2015]/.test(line));
  const page = readFileSync(ROOT + "app/saabai-admin/chatbots/ChatbotsClient.tsx", "utf8");
  assert.ok(!page.includes("\u2014"), "chatbots page has an em dash");
  assert.match(page, /combinedCopyNote/);
  assert.ok(matchesSite("tributum-law-v2", { name: "Tributum Law", slug: "tributum-law", domains: ["tributumlaw.com"], aliases: ["Tributum Law v2", "tributum-law-v2"] }));
  assert.equal(matchesSite("missing", { name: "Tributum Law", slug: "tributum-law", aliases: ["tributum-law-v2"] }), false);
});

test("loader sums stored usage and does not delete the folded copies", async () => {
  const { getRedis } = await import("../lib/redis");
  const { APP_ROUTER_SITES, listRedisSites } = await import("../lib/site-registry");
  const { saveDirectoryUser } = await import("../lib/user-directory");
  const { listChatbotCanonical } = await import("../lib/chatbot/admin-list");
  const { getUsage } = await import("../lib/chatbot/store");
  const r = getRedis()!;
  const v2 = APP_ROUTER_SITES.find((s) => s.id === "tributum-law-v2")!;
  const stored = [...heaven, ...nico, ...tributum, domain, quiet];
  for (const s of stored) await r.hset("saabai:sites", { [s.id]: JSON.stringify(s) });
  await saveDirectoryUser({ id: "mathew", name: "Mathew", email: "m@tributum.test", role: "user", password: "x", dashboardUrl: "/dashboard", siteId: v2.id, approvedAt: "2026-01-01", createdAt: "2026-01-01" });
  const month = monthKey();
  await r.hset(`saabai:chatbot:usage:tributum-law:${month}`, { conversations: "4", messages: "10" });
  await r.hset(`saabai:chatbot:usage:tributum-law-v2:${month}`, { conversations: "2", messages: "3" });
  await r.hset(`saabai:chatbot:usage:heaven-thai-massage:${month}`, { conversations: "5", messages: "8" });
  await r.hset(`saabai:chatbot:usage:nico-moretti:${month}`, { conversations: "1", messages: "1" });
  await r.hset(`saabai:chatbot:usage:nicomoretti-au:${month}`, { conversations: "6", messages: "7" });

  const beforeIds = (await listRedisSites()).map((s) => s.id).sort();
  const rows = await listChatbotCanonical();
  const afterIds = (await listRedisSites()).map((s) => s.id).sort();
  assert.deepEqual(afterIds, beforeIds, "display dedupe does not delete");
  assert.ok(afterIds.includes("site_6_trib1"));
  assert.equal(afterIds.includes("tributum-law-v2"), false, "v2 is hardcoded, not a redis row");

  const ids = rows.map((row) => row.site.id);
  assert.equal(ids.filter((id) => heaven.some((h) => h.id === id)).length, 1);
  assert.ok(ids.includes("site_3_heav3"));
  assert.ok(!ids.includes("site_1_heav1") && !ids.includes("site_2_heav2"));
  assert.ok(ids.includes("site_5_nico2") && !ids.includes("site_4_nico1"));
  assert.ok(ids.includes("site_9_tribdom") && !ids.includes("tributum-law-v2"));
  assert.ok(!ids.includes("site_quiet"));
  assert.ok(ids.includes("cycle-repair") && ids.includes("bo-consultancy") && ids.includes("wholesale-homes"));

  const trib = rows.find((row) => row.site.id === "site_9_tribdom")!;
  const tribUsage = sumUsage(await Promise.all(trib.slugs.map((slug) => getUsage(slug))));
  assert.equal(tribUsage.conversations, 6);
  assert.equal(tribUsage.messages, 13);
  assert.equal(capState(tribUsage.conversations, "presence").state, "ok");

  const heav = rows.find((row) => row.site.id === "site_3_heav3")!;
  assert.deepEqual(heav.slugs, ["heaven-thai-massage"]);
  const heavUsage = sumUsage(await Promise.all(heav.slugs.map((slug) => getUsage(slug))));
  assert.equal(heavUsage.conversations, 5, "three records, one slug, counted once");
  assert.equal(heavUsage.messages, 8);

  const nicoRow = rows.find((row) => row.site.id === "site_5_nico2")!;
  const nicoUsage = sumUsage(await Promise.all(nicoRow.slugs.map((slug) => getUsage(slug))));
  assert.equal(nicoUsage.conversations, 7);
  assert.equal(nicoUsage.messages, 8);

  const api = readFileSync(ROOT + "app/api/admin/chatbots/route.ts", "utf8");
  assert.match(api, /listChatbotCanonical/);
  assert.match(api, /sumUsage\(parts\)/);
  assert.match(api, /capState\(usage\.conversations/);
  assert.doesNotMatch(api, /deleteSite|sites-dedupe|MERGE/);
  assert.match(readFileSync(ROOT + "lib/chatbot/admin-list.ts", "utf8"), /chatbotCanonicalRows/);
  assert.match(readFileSync(ROOT + "lib/chatbot/canonical-rows.ts", "utf8"), /canonicalGroups/);
  assert.doesNotMatch(readFileSync(ROOT + "lib/chatbot/admin-list.ts", "utf8"), /deleteSite/);
});
