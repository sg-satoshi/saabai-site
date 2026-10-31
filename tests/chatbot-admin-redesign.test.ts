/** Admin chatbots r1b: engaged-chat leads, list filter and paging, whole-bot lock. No network. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";
import { resetRedisForTests } from "./reset-redis";
import { countLeads, formatLastChat, isEngagedChat, isGreetingOnly, summariseActivity, brisbaneMonthRange } from "../lib/chatbot/leads";
import { activityIdsForRow, sumAliasActivity } from "../lib/chatbot/activity";
import { botLockDenied, clientWriteBlocked, portalWriteGuard, readBotLock } from "../lib/chatbot/bot-lock";
import {
  arrangeGroups, filterRows, multiSiteClients, pageBots, parseListQuery, serialiseListQuery, sortRows,
  type BotListRow,
} from "../lib/chatbot/list-view";

const read = (p: string) => readFileSync(p, "utf8");

function row(partial: Partial<BotListRow> & Pick<BotListRow, "slug" | "name">): BotListRow {
  return {
    domains: [], engine: "platform", enabled: true, plan: "presence", goal: "call_back",
    chats: 0, cap: 200, capState: "ok", leads: 0, lastChatAt: null, locked: false,
    clientKey: `site:${partial.slug}`, clientName: partial.name, ...partial,
  };
}

test("a lead is a chat that went past hello, and a goal click is not a lead", () => {
  assert.equal(isGreetingOnly("Hi"), true);
  assert.equal(isGreetingOnly("Hello!"), true);
  assert.equal(isGreetingOnly("G'day"), true);
  assert.equal(isGreetingOnly("Hi Ruby"), true);
  assert.equal(isGreetingOnly("Hi, my sink is blocked"), false);
  assert.equal(isEngagedChat(["Hi"], 9), false, "hello and a goal click is not a lead");
  assert.equal(isEngagedChat(["Hello", "Hi there"], 3), false, "only greetings, even with goal clicks");
  assert.equal(isEngagedChat(["Hi", "My sink is blocked"], 0), true, "a follow-up is a lead with no goal click");
  assert.equal(isEngagedChat(["Can you come today?"]), true);
  assert.equal(isEngagedChat([]), false);
  assert.equal(countLeads([
    { messages: ["Hi"], goalClicks: 4 },
    { messages: ["Hello", "Can someone come today?"], goalClicks: 0 },
    { messages: ["Hey"], goalClicks: 1 },
  ]), 1);
});

test("engaged counts are this month only, and last chat is the latest message", () => {
  const now = new Date("2026-10-30T02:00:00.000Z");
  const range = brisbaneMonthRange(now);
  assert.equal(range.key, "2026-10");
  const stats = summariseActivity(
    [
      { bot: "coast", conversationId: "a", content: "Hi", at: "2026-10-02T00:00:00.000Z" },
      { bot: "coast", conversationId: "b", content: "Hi", at: "2026-10-03T00:00:00.000Z" },
      { bot: "coast", conversationId: "b", content: "The drain is blocked", at: "2026-10-03T00:05:00.000Z" },
      { bot: "coast", conversationId: "old", content: "Need a quote", at: "2026-09-01T00:00:00.000Z" },
      { bot: "other", conversationId: "c", content: "Hello", at: "2026-10-04T00:00:00.000Z" },
    ],
    [{ bot: "coast", at: "2026-10-20T01:00:00.000Z" }, { bot: "quiet", at: "2026-08-01T00:00:00.000Z" }],
    range.start,
    range.end,
  );
  assert.equal(stats.get("coast")?.leads, 1, "one engaged chat this month, not the old quote and not the hello");
  assert.equal(stats.get("coast")?.lastChatAt, "2026-10-20T01:00:00.000Z");
  assert.equal(stats.get("other")?.leads, 0);
  assert.equal(stats.get("quiet")?.leads, 0);
  assert.equal(stats.get("quiet")?.lastChatAt, "2026-08-01T00:00:00.000Z");
  const blanks = summariseActivity(
    [
      { bot: "b", conversationId: "", content: "Blocked drain", at: "2026-10-05T00:00:00.000Z" },
      { bot: "b", conversationId: "  ", content: "Can you come today?", at: "2026-10-05T01:00:00.000Z" },
    ],
    [],
    range.start,
    range.end,
  );
  assert.equal(blanks.get("b")?.leads, 2, "blank conversation ids are not merged into one chat");
});

test("legacy short log ids count for leads and last chat", () => {
  const onlyShort = new Map([["lmm", { leads: 4, lastChatAt: "2026-10-09T00:00:00.000Z" }]]);
  const ids = activityIdsForRow("lmm-site", ["lmm-site"], []);
  assert.deepEqual(ids, ["lmm-site", "lmm"]);
  assert.equal(sumAliasActivity(ids, onlyShort).leads, 4);
  assert.equal(sumAliasActivity(ids, onlyShort).lastChatAt, "2026-10-09T00:00:00.000Z");
  for (const [slug, short] of [["bo-consultancy", "bo"], ["nico-moretti", "nico"], ["tributum-law", "tributum"]] as const) {
    const map = new Map([[short, { leads: 1, lastChatAt: "2026-10-11T00:00:00.000Z" }]]);
    const rowIds = activityIdsForRow(slug, [slug], [{ slug }]);
    assert.ok(rowIds.includes(short), short);
    assert.equal(new Set(rowIds).size, rowIds.length, "duplicate slugs are not counted twice");
    assert.equal(sumAliasActivity(rowIds, map).leads, 1);
  }
  const route = read("app/api/admin/chatbots/route.ts");
  assert.match(route, /activityIdsForRow\(s\.slug, slugs, folded\)/);
  assert.match(route, /sumAliasActivity\(/);
});

test("last chat labels use Brisbane time", () => {
  const now = new Date("2026-10-30T06:00:00.000Z"); // 4:00 pm Brisbane
  assert.equal(formatLastChat("2026-10-30T05:48:00.000Z", now), "12 min");
  assert.equal(formatLastChat("2026-10-30T05:00:00.000Z", now), "1 hr");
  assert.equal(formatLastChat("2026-10-29T23:40:00.000Z", now), "9:40 am");
  assert.equal(formatLastChat("2026-10-29T01:00:00.000Z", now), "Yesterday");
  assert.equal(formatLastChat("2026-10-24T01:00:00.000Z", now), "6 days");
  assert.equal(formatLastChat(null, now), "");
});

test("list filters, sort, multi-site groups and paging", () => {
  const rows = [
    row({ slug: "a", name: "Alpha Plumbing", plan: "growth", goal: "call_back", chats: 10, leads: 2, enabled: true, lastChatAt: "2026-10-01T00:00:00.000Z" }),
    row({ slug: "b", name: "Beta Electric", plan: "presence", goal: "quote", chats: 180, cap: 200, capState: "near", leads: 1, enabled: true, locked: true, lastChatAt: "2026-10-20T00:00:00.000Z" }),
    row({ slug: "c", name: "Harbourside Physio Manly", clientKey: "biz:harbourside", clientName: "Harbourside Physio", plan: "growth", chats: 251, leads: 19, lastChatAt: "2026-10-29T00:00:00.000Z" }),
    row({ slug: "d", name: "Harbourside Physio Wynnum", clientKey: "biz:harbourside", clientName: "Harbourside Physio", plan: "growth", chats: 164, leads: 12, enabled: false, lastChatAt: "2026-10-28T00:00:00.000Z" }),
    row({ slug: "e", name: "Own Route Solar", engine: "bespoke", enabled: null, leads: null, plan: "signature" }),
  ];
  assert.equal(filterRows(rows, { ...parseListQuery(new URLSearchParams()), status: "locked" }, false).map((r) => r.slug).join(), "b");
  assert.equal(filterRows(rows, { ...parseListQuery(new URLSearchParams()), status: "off" }, false)[0].slug, "d");
  assert.deepEqual(filterRows(rows, { ...parseListQuery(new URLSearchParams("plan=growth")), plan: "growth" }, false).map((r) => r.slug), ["a", "c", "d"]);
  assert.equal(filterRows(rows, { ...parseListQuery(new URLSearchParams("q=wynnum")), q: "wynnum" }, false)[0].slug, "d");
  const clients = multiSiteClients(rows);
  assert.equal(clients.length, 1);
  assert.equal(clients[0].name, "Harbourside Physio");
  assert.equal(filterRows(rows, { ...parseListQuery(new URLSearchParams()), client: "site:a" }, false).length, 0, "client filter ignores single-site keys");
  assert.deepEqual(filterRows(rows, { ...parseListQuery(new URLSearchParams()), client: "biz:harbourside" }, false).map((r) => r.slug), ["c", "d"]);
  const sorted = sortRows(filterRows(rows, parseListQuery(new URLSearchParams()), false), "leads", "desc");
  assert.equal(sorted[0].slug, "c");
  assert.equal(sorted.at(-1)?.slug, "e", "missing leads sort last when descending");
  const groups = arrangeGroups(sorted);
  const multi = groups.find((g) => g.multi);
  assert.ok(multi);
  assert.equal(multi?.sites, 2);
  assert.equal(multi?.chats, 415);
  assert.equal(multi?.leads, 31);
  assert.equal(groups[0].key, "biz:harbourside", "group is ordered by its first site");
  const many = Array.from({ length: 30 }, (_, i) => row({ slug: `s${i}`, name: `Site ${String(i).padStart(2, "0")}`, chats: i }));
  const page = pageBots(arrangeGroups(sortRows(many, "name", "asc")), 2, 25);
  assert.equal(page.total, 30);
  assert.equal(page.from, 26);
  assert.equal(page.to, 30);
  assert.equal(page.groups.reduce((n, g) => n + g.rows.length, 0), 5);
  assert.equal(page.pages, 2);
  const q = parseListQuery(new URLSearchParams("q=acme&status=locked&plan=presence&sort=leads&dir=asc&page=3&per=50"));
  assert.equal(q.status, "locked");
  assert.equal(q.per, 50);
  assert.equal(q.page, 3);
  assert.match(serialiseListQuery(q), /status=locked/);
  assert.match(serialiseListQuery(q), /per=50/);
  const back = parseListQuery(new URLSearchParams(serialiseListQuery(q)));
  assert.equal(back.q, "acme");
  assert.equal(back.sort, "leads");
  assert.equal(back.dir, "asc");
});

test("whole-bot lock blocks every client write and is ignored when unset", () => {
  assert.equal(clientWriteBlocked(undefined), false);
  assert.equal(clientWriteBlocked(readBotLock({ locked: false, by: "Sam" })), false);
  assert.equal(readBotLock({ nope: true }), undefined);
  const on = readBotLock({ locked: true, by: "Shane", at: "2026-10-30T00:00:00.000Z" });
  assert.equal(on?.locked, true);
  assert.equal(on?.by, "Shane");
  const blocked = portalWriteGuard(on);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.status, 403);
  assert.equal(portalWriteGuard(undefined).ok, true);
  const portal = read("app/api/portal/chatbot/route.ts");
  const guardAt = portal.indexOf("portalWriteGuard");
  const saveAt = portal.indexOf("clientSave(");
  assert.ok(guardAt > 0 && saveAt > guardAt, "the lock is checked before any client save");
  assert.match(portal, /loadConfigForClientWrite/);
  assert.ok(portal.indexOf("loadConfigForClientWrite") < portal.indexOf("saveConfig("));
  assert.match(portal, /clientSaveEngage\(cfg\.engage, body\.engage\)/);
  assert.match(portal, /rejectIfImpersonatingReadOnly/);
  assert.doesNotMatch(portal, /lead-capture|CHATBOT_LEAD_CAPTURE_ENABLED/);
  const admin = read("app/api/admin/chatbots/route.ts");
  assert.match(admin, /case "set_lock"/);
  assert.match(admin, /setLock: true/);
  assert.match(admin, /leads: bespoke \? null : leads/);
  assert.match(admin, /adminActor\(\)/);
  assert.match(admin, /botLockDenied\(/);
  assert.match(admin, /canLock/);
  assert.match(read("app/saabai-admin/chatbots/[slug]/BotDetailClient.tsx"), /canLock && !bespoke/);
  assert.doesNotMatch(read("lib/redis.ts"), /resetRedisForTests/);
});

test("the editor copy drops per-setting lock wording and the lock popover sits in the header", () => {
  const editor = read("app/saabai-admin/chatbots/ChatbotEditor.tsx");
  const detail = read("app/saabai-admin/chatbots/[slug]/BotDetailClient.tsx");
  const css = read("app/saabai-admin/chatbots/chatbots.css");
  assert.doesNotMatch(editor + detail, /Locks with the other nudges/);
  assert.match(editor, /Not on phones\./);
  assert.match(editor, /action: "save_all"/);
  assert.match(editor, /mode="admin"/);
  assert.match(detail, /cbed-lockpop/);
  assert.match(detail, /data-testid="link-history"/);
  assert.match(editor, /data-testid="preview-off"/);
  const rule = css.slice(css.indexOf(".cbed-lockpop{"), css.indexOf(".cbed-lockpop{") + 280);
  assert.match(rule, /position:relative/);
  assert.doesNotMatch(rule, /position:\s*absolute/);
  const sql = read("db/migrations/007_chatbot_list_stats.sql");
  assert.match(sql, /create index if not exists messages_user_bot_created_idx/);
  assert.match(sql, /create or replace function public\.chatbot_user_turns/);
  assert.match(sql, /create or replace function public\.chatbot_last_chats/);
  assert.doesNotMatch(sql, /drop column|drop table|delete from|truncate/i);
  for (const file of [
    "app/saabai-admin/chatbots/ChatbotsClient.tsx",
    "app/saabai-admin/chatbots/ChatbotEditor.tsx",
    "app/saabai-admin/chatbots/[slug]/BotDetailClient.tsx",
    "app/api/portal/chatbot/route.ts",
    "app/api/admin/chatbots/route.ts",
  ]) {
    assert.doesNotMatch(read(file), /\/api\/(?:leads|lead|signup|subscribe|draft)\b/, file);
  }
  assert.match(read("app/components/chatbot/InsightsPanel.tsx"), /transcriptsOn \?\? data\.transcriptsEnabled/);
  assert.match(read("app/saabai-admin/chatbots/ChatbotEditor.tsx"), /transcriptsOn=\{draft\.engage\.transcripts\}/);
  assert.doesNotMatch(editor, /kept for 90 days/);
  assert.doesNotMatch(editor, /sensitive details/);
  assert.match(editor, /aria-selected/);
  assert.match(editor, /Step \$\{stepAt \+ 1\} of/);
  assert.match(editor, /className="col"/);
  assert.match(css, /\.cbed \.col\{display:flex;flex-direction:column;gap:24px/);
  assert.match(css, /input:not\(\[type=checkbox\]\)/);
  assert.match(css, /\.cbed \.seg button/);
  assert.match(css, /\.tabs button\.tab\.on:after/);
  assert.match(read("app/api/portal/chatbot/route.ts"), /delete skinIn\.showPoweredBy/);
  assert.match(read("public/embed/chat.v1.js"), /els\.pv\.style\.display = note \? "" : "none"/);
});

test("only a full admin can lock or unlock; a staff save keeps the lock", async () => {
  assert.equal(botLockDenied(true, "set_lock"), null);
  assert.equal(botLockDenied(false, "set_lock")?.status, 403);
  assert.equal(botLockDenied(false, "save_goal"), null);
  assert.equal(botLockDenied(false, "save_all"), null);
  assert.equal(botLockDenied(false, "set_plan"), null);
  assert.equal(botLockDenied(false, "save_goal", true)?.status, 403, "a body that carries botLock is a lock change");

  const mock = createMockUpstash();
  const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
  const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  await new Promise<void>((resolve) => mock.server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  resetRedisForTests();
  try {
    const { getConfig, saveConfig, loadConfigForClientWrite } = await import("../lib/chatbot/store");
    const lock = { locked: true, by: "Shane", at: "2026-10-01T00:00:00.000Z" };
    await saveConfig({ schema: 1, slug: "locked-bot", plan: "presence", skin: {}, botLock: lock }, { setLock: true });
    assert.equal((await getConfig("locked-bot")).botLock?.locked, true);

    const staffLock = botLockDenied(false, "set_lock");
    assert.equal(staffLock?.status, 403);
    assert.equal((await getConfig("locked-bot")).botLock?.locked, true, "a refused lock change writes nothing");

    await saveConfig({ schema: 1, slug: "locked-bot", plan: "signature", skin: { botName: "Bea" }, botLock: { locked: false } });
    const kept = await getConfig("locked-bot");
    assert.equal(kept.plan, "signature");
    assert.equal(kept.skin.botName, "Bea");
    assert.equal(kept.botLock?.locked, true);
    assert.equal(kept.botLock?.by, "Shane");

    await saveConfig({ schema: 1, slug: "locked-bot", plan: "signature", skin: kept.skin, botLock: { locked: false, by: "Admin", at: "2026-10-02T00:00:00.000Z" } }, { setLock: true });
    assert.equal((await getConfig("locked-bot")).botLock?.locked, false);
    await saveConfig({ schema: 1, slug: "locked-bot", plan: "signature", skin: kept.skin, botLock: { locked: true, by: "Admin", at: "2026-10-03T00:00:00.000Z" } }, { setLock: true });
    assert.equal((await getConfig("locked-bot")).botLock?.locked, true);
    await saveConfig({
      schema: 1, slug: "locked-bot", plan: "signature", skin: kept.skin,
      goal: { primary: "quote", fallback: "none", questions: [], stages: [], quickReplies: [], locked: ["cta"] },
    });
    const cleaned = await getConfig("locked-bot");
    assert.equal(cleaned.goal?.primary, "quote");
    assert.equal(cleaned.goal?.locked, undefined, "a save drops legacy per-field locks");
    assert.equal(cleaned.botLock?.locked, true, "dropping field locks does not clear the whole-bot lock");

    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "down" }), { status: 500, headers: { "content-type": "application/json" } });
    resetRedisForTests();
    try {
      const denied = await loadConfigForClientWrite("locked-bot");
      assert.equal(denied.ok, false);
      if (!denied.ok) assert.equal(denied.status, 503);
      const open = await getConfig("locked-bot");
      assert.equal(open.botLock, undefined, "a normal read still fails open");
    } finally {
      globalThis.fetch = realFetch;
    }
  } finally {
    if (prevUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = prevUrl;
    if (prevToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
    resetRedisForTests();
    await new Promise<void>((resolve) => mock.server.close(() => resolve()));
  }
});
