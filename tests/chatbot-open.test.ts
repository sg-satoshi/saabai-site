import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chatbotEditorPath, chatbotHistoryPath, chatbotPagePath, chatbotPlanPath, historyBotIds, rowForSlug } from "../lib/chatbot/paths";
import { listChatHistory, setChatHistoryReaderForTests } from "../lib/chat-log";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p: string) => readFileSync(ROOT + p, "utf8");

test("chatbot links use the canonical slug", () => {
  assert.equal(chatbotPagePath("cycle-repair"), "/saabai-admin/chatbots/cycle-repair");
  assert.equal(chatbotPagePath("nico moretti"), "/saabai-admin/chatbots/nico%20moretti");
  assert.equal(chatbotEditorPath("cycle-repair"), "/saabai-admin/chatbots/cycle-repair#editor");
  assert.equal(chatbotPlanPath("cycle-repair"), "/saabai-admin/chatbots/cycle-repair#plan");
  assert.equal(chatbotHistoryPath("cycle-repair"), "/saabai-admin/chatbots/history?bot=cycle-repair");
  assert.equal(chatbotHistoryPath("Tributum Law"), "/saabai-admin/chatbots/history?bot=Tributum%20Law");
});

test("a folded slug resolves to the canonical row", () => {
  const rows = [
    { slug: "nicomoretti-au", folded: [{ slug: "nico-moretti" }] },
    { slug: "cycle-repair" },
  ];
  assert.equal(rowForSlug(rows, "cycle-repair")?.slug, "cycle-repair");
  assert.equal(rowForSlug(rows, "nico-moretti")?.slug, "nicomoretti-au");
  assert.equal(rowForSlug(rows, encodeURIComponent("nico-moretti"))?.slug, "nicomoretti-au");
  assert.equal(rowForSlug(rows, "missing"), null);
  assert.equal(rowForSlug(rows, "  "), null);
});

test("history reads the site slug, folded copies, and the bespoke log id", () => {
  assert.deepEqual(
    historyBotIds("tributum-law-v2", ["tributum-law", "Tributum Law"]),
    ["tributum-law-v2", "tributum", "tributum-law", "Tributum Law"],
  );
  assert.deepEqual(historyBotIds("bo-consultancy"), ["bo-consultancy", "bo"]);
  assert.deepEqual(historyBotIds("lmm-site"), ["lmm-site", "lmm"]);
  assert.deepEqual(historyBotIds("nico-moretti", ["nicomoretti-au"]), ["nico-moretti", "nico", "nicomoretti-au"]);
  assert.deepEqual(historyBotIds("cycle-repair", ["cycle-repair"]), ["cycle-repair"]);
  assert.deepEqual(historyBotIds("  ", [""]), []);
});

test("chat history uses the test reader and stays empty when logging is off", async () => {
  const savedUrl = process.env.SUPABASE_URL;
  const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  setChatHistoryReaderForTests(null);
  try {
    const off = await listChatHistory(["cycle-repair"]);
    assert.deepEqual(off, { configured: false, error: false, turns: [] });
    const blank = await listChatHistory([" ", ""]);
    assert.deepEqual(blank, { configured: false, error: false, turns: [] });
    setChatHistoryReaderForTests(async (bots, limit) => {
      assert.deepEqual(bots, ["cycle-repair"]);
      assert.equal(limit, 5);
      return [{ id: "1", bot: "cycle-repair", conversationId: "c", role: "user", content: "Hi", createdAt: "2026-10-01T00:00:00.000Z", model: null }];
    });
    const on = await listChatHistory(["cycle-repair", "cycle-repair", " "], 5);
    assert.equal(on.configured, true);
    assert.equal(on.error, false);
    assert.equal(on.turns[0]?.content, "Hi");
    setChatHistoryReaderForTests(async () => { throw new Error("down"); });
    const failed = await listChatHistory(["cycle-repair"]);
    assert.deepEqual(failed, { configured: true, error: true, turns: [] });
  } finally {
    setChatHistoryReaderForTests(null);
    if (savedUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = savedUrl;
    if (savedKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;
  }
});

test("the list, detail page, and history page open the canonical bot", () => {
  const list = read("app/saabai-admin/chatbots/ChatbotsClient.tsx");
  assert.match(list, /chatbotPagePath\(r\.slug\)/);
  assert.match(list, /chatbotEditorPath\(r\.slug\)/);
  assert.match(list, /data-testid=\{`view-\$\{r\.slug\}`\}/);
  assert.match(list, /data-testid=\{`edit-\$\{r\.slug\}`\}/);
  assert.match(list, /data-testid=\{`open-\$\{r\.slug\}`\}/);
  const detail = read("app/saabai-admin/chatbots/[slug]/page.tsx");
  const detailClient = read("app/saabai-admin/chatbots/[slug]/BotDetailClient.tsx");
  const history = read("app/saabai-admin/chatbots/history/page.tsx");
  assert.match(detail, /await requireAdmin\(/);
  assert.match(history, /await requireAdmin\(/);
  assert.match(detailClient, /chatbotHistoryPath/);
  assert.match(detailClient, /id="plan"/);
  assert.match(detailClient, /id="editor"/);
  assert.match(history, /listChatHistory/);
  assert.match(history, /historyBotIds/);
  for (const src of [list, detail, detailClient, history, read("lib/chatbot/paths.ts")]) {
    assert.ok(!src.includes("\u2014"), "em dash in chatbot open UI");
  }
});
