/**
 * Admin chat history: filters, Brisbane dates, leads, cost, CSV, and the admin gate.
 * npx tsx --test tests/chat-history.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { decide, areaForPath } from "../lib/access";
import { ChatHistoryView } from "../app/saabai-admin/chat-history/ChatHistoryView";
import {
  HISTORY_EXPORT_LIMIT,
  HISTORY_PAGE_SIZE,
  addCalendarDays,
  brisbaneDayEndExclusiveUtc,
  brisbaneDayStartUtc,
  chatsCsv,
  costsCsv,
  defaultHistoryRange,
  formatBrisbane,
  formatUsd,
  historyHref,
  historyViewFromRpc,
  isRealDate,
  parseHistoryQuery,
  previewText,
  summariseChatHistory,
  type HistoryDataset,
  type HistoryQuery,
} from "../lib/chat-history";

const read = (path: string) => readFileSync(path, "utf8");
const NOW = new Date("2026-10-20T03:00:00.000Z");

function query(patch: Partial<HistoryQuery> = {}): HistoryQuery {
  return {
    bot: "",
    site: "",
    from: "2026-10-01",
    to: "2026-10-20",
    q: "",
    page: 1,
    id: "",
    ...patch,
  };
}

function dataset(): HistoryDataset {
  return {
    conversations: [
      { id: "mia:1", bot_slug: "mia", site_id: "stu", channel: "web", started_at: "2026-10-20T01:00:00.000Z" },
      { id: "rex:1", bot_slug: "rex", site_id: null, channel: "web", started_at: "2026-10-18T01:00:00.000Z" },
      { id: "mia:old", bot_slug: "mia", site_id: "stu", channel: "web", started_at: "2026-09-01T01:00:00.000Z" },
      { id: "mia:edge-in", bot_slug: "mia", site_id: "edge", channel: "web", started_at: "2026-09-30T14:00:00.000Z" },
      { id: "mia:edge-out", bot_slug: "mia", site_id: "edge", channel: "web", started_at: "2026-09-30T13:59:59.000Z" },
      { id: "mia:end-out", bot_slug: "mia", site_id: "edge", channel: "web", started_at: "2026-10-20T14:00:00.000Z" },
      { id: "mia:pct", bot_slug: "mia", site_id: "stu", channel: "web", started_at: "2026-10-19T01:00:00.000Z" },
      { id: "legacy", bot_slug: null, site_id: "stu", channel: "web", started_at: "2026-10-20T01:00:00.000Z" },
      { id: "blank", bot_slug: "  ", site_id: "stu", channel: "web", started_at: "2026-10-20T01:00:00.000Z" },
    ],
    messages: [
      { id: "m1", conversation_id: "mia:1", role: "user", content: "Need a quote for a deck", created_at: "2026-10-20T01:00:00.000Z" },
      { id: "m2", conversation_id: "mia:1", role: "assistant", content: "Deck quote is ready", created_at: "2026-10-20T01:00:01.000Z", input_tokens: 100, output_tokens: 40, cost_usd: 1.5, model: "grok-3-mini" },
      { id: "m3", conversation_id: "rex:1", role: "user", content: "Hello", created_at: "2026-10-18T01:00:00.000Z" },
      { id: "m4", conversation_id: "rex:1", role: "assistant", content: "Hi there", created_at: "2026-10-18T01:00:01.000Z", input_tokens: 10, output_tokens: 4, cost_usd: "0.25" },
      { id: "m5", conversation_id: "mia:old", role: "user", content: "old chat", created_at: "2026-09-01T01:00:00.000Z", cost_usd: 9 },
      { id: "m6", conversation_id: "legacy", role: "user", content: "secret legacy", created_at: "2026-10-20T01:00:00.000Z", cost_usd: 4 },
      { id: "m7", conversation_id: "mia:edge-in", role: "user", content: "edge in", created_at: "2026-09-30T14:00:00.000Z" },
      { id: "m8", conversation_id: "mia:edge-out", role: "user", content: "edge out", created_at: "2026-09-30T13:59:59.000Z" },
      { id: "m9", conversation_id: "mia:pct", role: "user", content: "save 100% today", created_at: "2026-10-19T01:00:00.000Z" },
      { id: "m10", conversation_id: "mia:1", role: "assistant", content: "=cmd|calc", created_at: "2026-10-20T01:00:02.000Z", input_tokens: 1, output_tokens: 1, cost_usd: 0 },
    ],
    leads: [
      { id: "l1", conversation_id: "mia:1", name: "Ada", email: "ada@example.com", phone: "0400000000", status: "new", created_at: "2020-01-01T00:00:00.000Z" },
      { id: "l1b", conversation_id: "mia:1", name: "Ada 2", status: "new", created_at: "2026-10-20T02:00:00.000Z" },
      { id: "l2", conversation_id: "mia:old", name: "Old", created_at: "2026-09-01T00:00:00.000Z" },
      { id: "l3", conversation_id: null, name: "Nowhere" },
      { id: "l4", conversation_id: "rex:1", name: "Bo", status: "new" },
      { id: "l5", conversation_id: "legacy", name: "Hidden" },
    ],
  };
}

test("Brisbane day bounds and the default 30 day range", () => {
  assert.equal(brisbaneDayStartUtc("2026-10-20"), "2026-10-19T14:00:00.000Z");
  assert.equal(brisbaneDayEndExclusiveUtc("2026-10-20"), "2026-10-20T14:00:00.000Z");
  assert.equal(brisbaneDayStartUtc("2026-02-31"), null);
  assert.equal(isRealDate("2026-02-31"), false);
  assert.equal(addCalendarDays("2026-10-20", -29), "2026-09-21");
  assert.deepEqual(defaultHistoryRange(NOW), { from: "2026-09-21", to: "2026-10-20" });
  assert.equal(formatBrisbane("2026-10-20T01:00:00.000Z"), "20 Oct 2026, 11:00");
});

test("query parsing clamps bad dates, swaps the range, and drops control characters", () => {
  const parsed = parseHistoryQuery({ from: "nope", to: "2026-10-02", page: "0", q: "  hi\u0000  ", bot: " mia " }, NOW);
  assert.equal(parsed.from, "2026-09-21");
  assert.equal(parsed.to, "2026-10-02");
  assert.equal(parsed.page, 1);
  assert.equal(parsed.q, "hi");
  assert.equal(parsed.bot, "mia");
  const swapped = parseHistoryQuery({ from: "2026-10-20", to: "2026-10-01" }, NOW);
  assert.deepEqual([swapped.from, swapped.to], ["2026-10-01", "2026-10-20"]);
  assert.equal(parseHistoryQuery({ page: "2", q: "x".repeat(250) }, NOW).q.length, 200);
});

test("range keeps logged chats, counts leads by conversation, and sums cost", () => {
  const view = summariseChatHistory(dataset(), query());
  assert.equal(view.totals.chats, 4);
  assert.equal(view.totals.messages, 7);
  assert.equal(view.totals.leads, 3);
  assert.equal(view.totals.inputTokens, 111);
  assert.equal(view.totals.outputTokens, 45);
  assert.equal(view.totals.costUsd, 1.75);
  assert.deepEqual(view.conversations.map((row) => row.id), ["mia:1", "mia:pct", "rex:1", "mia:edge-in"]);
  assert.deepEqual(view.byBot.map((row) => [row.bot, row.chats, row.messages, row.leads]), [
    ["mia", 3, 5, 2],
    ["rex", 1, 2, 1],
  ]);
  assert.deepEqual(view.bySite.map((row) => [row.site, row.inputTokens, row.outputTokens, row.costUsd]), [
    ["stu", 101, 41, 1.5],
    ["", 10, 4, 0.25],
    ["edge", 0, 0, 0],
  ]);
  const mia = view.conversations[0];
  assert.equal(mia.leads, 2);
  assert.equal(mia.preview, "=cmd|calc");
  assert.equal(view.bots.includes("mia") && view.bots.includes("rex"), true);
  assert.equal(view.transcript, null);
});

test("text search is a literal case-insensitive substring and opens the full transcript", () => {
  const deck = summariseChatHistory(dataset(), query({ q: "DECK", id: "mia:1" }));
  assert.deepEqual(deck.conversations.map((row) => row.id), ["mia:1"]);
  assert.equal(deck.conversations[0].preview, "Need a quote for a deck");
  assert.equal(deck.totals.leads, 2);
  assert.equal(deck.transcript?.messages.map((message) => message.id).join(","), "m1,m2,m10");
  assert.equal(deck.transcript?.leads.map((lead) => lead.name).join(","), "Ada,Ada 2");
  const pct = summariseChatHistory(dataset(), query({ q: "100%" }));
  assert.deepEqual(pct.conversations.map((row) => row.id), ["mia:pct"]);
  const outside = summariseChatHistory(dataset(), query({ id: "mia:old" }));
  assert.equal(outside.transcript?.id, "mia:old");
  assert.equal(summariseChatHistory(dataset(), query({ id: "legacy" })).transcript?.messages[0]?.content, "secret legacy");
  assert.equal(summariseChatHistory(dataset(), query({ id: "missing" })).transcript, null);
});

test("bot and site filters narrow chats, messages, leads and cost together", () => {
  const rex = summariseChatHistory(dataset(), query({ bot: "rex" }));
  assert.equal(rex.totals.chats, 1);
  assert.equal(rex.totals.messages, 2);
  assert.equal(rex.totals.leads, 1);
  assert.equal(rex.totals.costUsd, 0.25);
  const stu = summariseChatHistory(dataset(), query({ site: "stu" }));
  assert.deepEqual(stu.conversations.map((row) => row.id), ["mia:1", "mia:pct"]);
  assert.equal(stu.totals.leads, 2);
  assert.equal(stu.bySite.every((row) => row.site === "stu"), true);
});

test("pages are 25 rows and the chat export stops at 5000", () => {
  const conversations = Array.from({ length: HISTORY_PAGE_SIZE + 1 }, (_, i) => ({
    id: `p:${String(i).padStart(2, "0")}`,
    bot_slug: "page",
    site_id: "s",
    channel: "web",
    started_at: new Date(Date.parse("2026-10-02T00:00:00.000Z") + i * 1000).toISOString(),
  }));
  const page2 = summariseChatHistory({ conversations, messages: [], leads: [] }, query({ page: 2 }));
  assert.equal(page2.total, 26);
  assert.equal(page2.conversations.length, 1);
  assert.equal(page2.pageCount, 2);
  assert.equal(page2.conversations[0].id, "p:00");
  const many = Array.from({ length: HISTORY_EXPORT_LIMIT + 1 }, (_, i) => ({
    id: `e:${i}`,
    bot_slug: "page",
    site_id: "s",
    channel: "web",
    started_at: new Date(Date.parse("2026-10-02T00:00:00.000Z") + i * 1000).toISOString(),
  }));
  const exported = summariseChatHistory({ conversations: many, messages: [], leads: [] }, query(), { exportAll: true });
  assert.equal(exported.truncated, true);
  assert.equal(exported.conversations.length, HISTORY_EXPORT_LIMIT);
  assert.equal(exported.totals.chats, HISTORY_EXPORT_LIMIT + 1);
});

test("CSV exports cost rows and chats, and neutralises spreadsheet formulas", () => {
  const view = summariseChatHistory(dataset(), query());
  const costs = costsCsv(view);
  assert.match(costs, /group,name,input_tokens,output_tokens,cost_usd/);
  assert.match(costs, /bot,mia,101,41,1\.500000/);
  assert.match(costs, /bot,rex,10,4,0\.250000/);
  assert.match(costs, /site,No site,10,4,0\.250000/);
  assert.match(costs, /site,stu,101,41,1\.500000/);
  assert.match(costs, /site,edge,0,0,0\.000000/);
  const chats = chatsCsv(view);
  assert.match(chats, /id,bot,site,channel,started_at,messages,leads,input_tokens,output_tokens,cost_usd,preview/);
  assert.match(chats, /'=cmd\|calc/);
  const quoted = chatsCsv(summariseChatHistory({
    conversations: [{ id: "q:1", bot_slug: "mia", site_id: "stu", channel: "web", started_at: "2026-10-20T01:00:00.000Z" }],
    messages: [{ id: "mq", conversation_id: "q:1", role: "user", content: 'He said "hi"', created_at: "2026-10-20T01:00:00.000Z" }],
    leads: [],
  }, query()));
  assert.match(quoted, /"He said ""hi"""/);
  assert.equal(previewText("hello\n\n  there"), "hello there");
  assert.equal(formatUsd(1.5), "1.50");
  assert.equal(formatUsd(0.0013), "0.0013");
  assert.equal(formatUsd(1.5, "fixed"), "1.500000");
});

test("rpc payload maps numeric strings and ignores junk", () => {
  const view = historyViewFromRpc({
    total: 1,
    page: 1,
    pageSize: 25,
    truncated: false,
    bots: ["mia"],
    sites: ["stu"],
    totals: { chats: 1, messages: 2, leads: 1, inputTokens: "10", outputTokens: 4, costUsd: "1.500000" },
    byBot: [{ bot: "mia", chats: 1, messages: 2, leads: 1, inputTokens: 10, outputTokens: 4, costUsd: "1.500000" }],
    bySite: [{ site: "stu", inputTokens: 10, outputTokens: 4, costUsd: "1.500000" }],
    conversations: [{ id: "mia:1", bot: "mia", site: "stu", channel: "web", startedAt: "2026-10-20T01:00:00.000Z", messages: 1, leads: 1, inputTokens: 10, outputTokens: 4, costUsd: "1.500000", preview: "  hello   \n world ".repeat(20) }],
    transcript: null,
  }, query());
  assert.equal(view.totals.costUsd, 1.5);
  assert.equal(view.conversations[0].preview.endsWith("..."), true);
  assert.equal(view.conversations[0].preview.length <= 140, true);
  assert.equal(historyViewFromRpc(null, query()).total, 0);
  assert.equal(historyViewFromRpc("not-json", query()).conversations.length, 0);
});

test("chat history stays admin only and the service role stays on the server", () => {
  assert.equal(areaForPath("/saabai-admin/chat-history"), "admin-only");
  assert.equal(areaForPath("/saabai-admin/chat-history/export"), "admin-only");
  const staff = { role: "custom" as const, areas: { chatbots: "write" as const } };
  assert.equal(decide(staff, "GET", "/saabai-admin/chat-history").allow, false);
  assert.equal(decide(staff, "GET", "/saabai-admin/chat-history/export").allow, false);
  assert.equal(decide({ role: "admin" }, "GET", "/saabai-admin/chat-history").allow, true);
  const page = read("app/saabai-admin/chat-history/page.tsx");
  const route = read("app/saabai-admin/chat-history/export/route.ts");
  const server = read("lib/chat-history-server.ts");
  const view = read("app/saabai-admin/chat-history/ChatHistoryView.tsx");
  const pure = read("lib/chat-history.ts");
  assert.match(page, /await requireAdmin\("\/saabai-admin\/chat-history"\)/);
  assert.match(route, /await requireAdmin\("\/saabai-admin\/chat-history\/export"\)/);
  assert.match(server, /serviceClient\(\)/);
  assert.match(server, /chat_history_report/);
  assert.doesNotMatch(server + page + route + view + pure, /tenantClient\(/);
  assert.doesNotMatch(pure + view, /serviceClient|SUPABASE_SERVICE_ROLE|SUPABASE_ANON|createClient/);
  assert.doesNotMatch(page + view, /"use client"/);
  assert.doesNotMatch(view, /chat-history-server/);
  assert.match(read("app/saabai-admin/AdminSidebar.tsx"), /href: "\/saabai-admin\/chat-history"/);
  assert.match(read("app/saabai-admin/chatbots/ChatbotsClient.tsx"), /href="\/saabai-admin\/chat-history"/);
  const sql = read("db/migrations/006_chat_history_admin.sql");
  assert.match(sql, /security definer/);
  assert.match(sql, /revoke all on function public\.chat_history_report\(text, text, timestamptz, timestamptz, text, integer, integer, text, boolean\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.chat_history_report\(text, text, timestamptz, timestamptz, text, integer, integer, text, boolean\) to service_role/);
  assert.match(sql, /position\(lower\(v_q\) in lower\(m\.content\)\) > 0/);
  assert.match(sql, /from public\.leads l/);
  assert.match(sql, /l\.conversation_id/);
  assert.match(sql, /cost_usd/);
  assert.match(sql, /input_tokens/);
  assert.match(sql, /output_tokens/);
  assert.match(sql, /bot_slug is not null/);
  assert.doesNotMatch(sql, /grant execute on function public\.chat_history_report[\s\S]*to anon/);
  assert.doesNotMatch(sql, /grant execute on function public\.chat_history_report[\s\S]*to authenticated/);
});

test("the page renders filters, transcript and exports without em dashes", () => {
  const q = query({ id: "mia:1" });
  const view = summariseChatHistory({
    ...dataset(),
    messages: dataset().messages.map((message) => message.id === "m1" ? { ...message, content: '<img src=x onerror="alert(1)">' } : message),
  }, q);
  const html = renderToStaticMarkup(ChatHistoryView({ status: "ok", view, query: q }));
  assert.match(html, /Chat history/);
  assert.match(html, /Rows are kept for 90 days/);
  assert.match(html, /Dates are Brisbane time/);
  assert.match(html, /data-testid="history-chats"/);
  assert.match(html, /data-testid="history-transcript"/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /export\?[^"]*kind=costs/);
  assert.match(html, /export\?[^"]*kind=chats/);
  assert.match(html, /id=mia%3A1/);
  assert.doesNotMatch(html, /kind=costs[^"]*id=/);
  assert.equal(/[\u2012-\u2015]/.test(html), false);
  for (const file of [
    "app/saabai-admin/chat-history/page.tsx",
    "app/saabai-admin/chat-history/ChatHistoryView.tsx",
    "app/saabai-admin/chat-history/export/route.ts",
    "lib/chat-history.ts",
    "lib/chat-history-server.ts",
    "db/migrations/006_chat_history_admin.sql",
  ]) assert.equal(/[\u2012-\u2015]/.test(read(file)), false, file);
  const href = historyHref("/saabai-admin/chat-history/export", q, { id: null, page: 1, kind: "chats" });
  assert.match(href, /kind=chats/);
  assert.doesNotMatch(href, /id=/);
});
