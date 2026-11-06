import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { chatbotEditorPath, chatbotHistoryPath, chatbotPagePath, chatbotPlanPath, historyBotIds, rowForSlug, slugBelongsToBots } from "../lib/chatbot/paths";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p: string) => readFileSync(ROOT + p, "utf8");

test("chatbot links use the canonical slug", () => {
  assert.equal(chatbotPagePath("cycle-repair"), "/saabai-admin/chatbots/cycle-repair");
  assert.equal(chatbotPagePath("nico moretti"), "/saabai-admin/chatbots/nico%20moretti");
  assert.equal(chatbotEditorPath("cycle-repair"), "/saabai-admin/chatbots/cycle-repair#editor");
  assert.equal(chatbotPlanPath("cycle-repair"), "/saabai-admin/chatbots/cycle-repair#plan");
  assert.equal(chatbotHistoryPath("cycle-repair"), "/saabai-admin/chat-history?bot=cycle-repair");
  assert.equal(chatbotHistoryPath("heaven-thai-massage"), "/saabai-admin/chat-history?bot=heaven-thai-massage");
  assert.equal(chatbotHistoryPath("Tributum Law"), "/saabai-admin/chat-history?bot=Tributum%20Law");
  assert.deepEqual(historyBotIds("lmm-site"), ["lmm-site", "lmm"]);
  assert.deepEqual(historyBotIds("nico-moretti"), ["nico-moretti", "nico"]);
  assert.deepEqual(historyBotIds("tributum-law-v2"), ["tributum-law-v2", "tributum"]);
  assert.deepEqual(historyBotIds("bo-consultancy"), ["bo-consultancy", "bo"]);
  assert.deepEqual(historyBotIds("cycle-repair"), ["cycle-repair"]);
  assert.deepEqual(historyBotIds("heaven-thai-massage"), ["heaven-thai-massage"]);
  const groups = [{ site: { slug: "lmm-site" }, slugs: ["lmm-site"], folded: [{ slug: "lifestyle-money" }] }];
  assert.equal(slugBelongsToBots("lmm-site", groups), true);
  assert.equal(slugBelongsToBots("lifestyle-money", groups), true);
  assert.equal(slugBelongsToBots("not-a-bot", groups), false);
  assert.equal(slugBelongsToBots("lmm", groups), false);
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

test("the list and detail page open the canonical bot, and chat history is the shared page", () => {
  const list = read("app/saabai-admin/chatbots/ChatbotsClient.tsx");
  assert.match(list, /chatbotPagePath\(r\.slug\)/);
  assert.match(list, /chatbotEditorPath\(r\.slug\)/);
  assert.match(list, /data-testid=\{`view-\$\{r\.slug\}`\}/);
  assert.match(list, /data-testid=\{`edit-\$\{r\.slug\}`\}/);
  assert.match(list, /data-testid=\{`open-\$\{r\.slug\}`\}/);
  const detail = read("app/saabai-admin/chatbots/[slug]/page.tsx");
  const detailClient = read("app/saabai-admin/chatbots/[slug]/BotDetailClient.tsx");
  const paths = read("lib/chatbot/paths.ts");
  assert.match(detail, /await requireAdmin\(/);
  assert.match(detailClient, /chatbotHistoryPath/);
  assert.match(detailClient, /data-testid="link-history"/);
  assert.match(detailClient, /id="plan"/);
  assert.match(detailClient, /id="editor"/);
  assert.match(paths, /\/saabai-admin\/chat-history\?bot=/);
  assert.equal(existsSync(ROOT + "app/saabai-admin/chatbots/history/page.tsx"), false);
  assert.equal(existsSync(ROOT + "app/saabai-admin/chat-history/page.tsx"), true);
  const history = read("app/saabai-admin/chat-history/page.tsx");
  const historyClient = read("app/saabai-admin/chat-history/ChatHistoryClient.tsx");
  assert.match(history, /await requireAdmin\(/);
  assert.match(historyClient, /variant="admin"/);
  assert.match(historyClient, /\/api\/admin\/chatbots\/insights\?slug=/);
  assert.doesNotMatch(history + historyClient, /method:\s*["']POST["']/);
  assert.doesNotMatch(history + historyClient, /\/api\/(?:chat|lead|signup|subscribe|draft)\b/);
  assert.doesNotMatch(historyClient, /maxWidth/);
  assert.doesNotMatch(read("app/saabai-admin/leadgen-clients/page.tsx"), /maxWidth/);
  assert.match(read("app/saabai-admin/admin.css"), /\.ch-split\{/);
  assert.doesNotMatch(read("app/components/chatbot/InsightsPanel.tsx"), /#[0-9a-fA-F]{3,8}/);
  for (const src of [list, detail, detailClient, paths]) {
    assert.ok(!src.includes("/saabai-admin/chatbots/history"), "old chat history page is still linked");
    assert.ok(!src.includes("\u2014"), "em dash in chatbot open UI");
  }
});
