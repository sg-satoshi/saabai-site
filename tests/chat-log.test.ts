import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { costUsd, priceForModel } from "../lib/model-prices";
import {
  CHAT_LOG_RETENTION_DAYS,
  chatLogCutoff,
  conversationKey,
  chatLogAttemptsForTests,
  flushChatLog,
  logChatTurn,
  modelIdFrom,
  purgeExpiredChatLogs,
  readTokenUsage,
  setChatLogStoreForTests,
  type ChatLogStore,
} from "../lib/chat-log";

const savedEnv = {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  cron: process.env.CRON_SECRET,
};

afterEach(() => {
  setChatLogStoreForTests(null);
  if (savedEnv.url === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = savedEnv.url;
  if (savedEnv.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = savedEnv.key;
  if (savedEnv.cron === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = savedEnv.cron;
});

function captureStore() {
  const conversations: Record<string, unknown>[] = [];
  const messages: Record<string, unknown>[] = [];
  const store: ChatLogStore = {
    async upsertConversation(row) {
      conversations.push(row);
      return { error: null };
    },
    async insertMessages(rows) {
      messages.push(...rows);
      return { error: null };
    },
  };
  setChatLogStoreForTests(store);
  return { conversations, messages };
}

test("prices the models in use today, per million tokens", () => {
  assert.deepEqual(priceForModel("grok-3-mini"), { input: 0.3, output: 0.5 });
  assert.deepEqual(priceForModel("xai:grok-3-mini"), { input: 0.3, output: 0.5 });
  assert.deepEqual(priceForModel("claude-haiku-4-5-20251001"), { input: 1, output: 5 });
  assert.deepEqual(priceForModel("anthropic:claude-sonnet-4-6"), { input: 3, output: 15 });
  assert.deepEqual(priceForModel("claude-opus-4-6"), { input: 5, output: 25 });
  assert.deepEqual(priceForModel("grok-4"), { input: 3, output: 15 });
  assert.deepEqual(priceForModel("deepseek-v4-flash"), { input: 0.15, output: 0.6 });
  assert.deepEqual(priceForModel("deepseek-v4-pro"), { input: 0.66, output: 1.98 });
  assert.equal(priceForModel("not-a-model"), null);
});

test("cost is USD from input and output tokens, rounded to 6 decimals", () => {
  // 1,000,000 haiku input tokens at $1 / million, plus 500,000 output at $5 / million.
  assert.equal(costUsd("claude-haiku-4-5", 1_000_000, 500_000), 3.5);
  // grok-3-mini: 1,000 in * $0.30 + 2,000 out * $0.50, per million.
  assert.equal(costUsd("grok-3-mini", 1_000, 2_000), 0.0013);
  assert.equal(costUsd("deepseek-v4-pro", 1_000_000, 0), 0.66);
  assert.equal(costUsd("unknown-model", 50_000, 50_000), 0);
  assert.equal(costUsd("grok-3-mini", 0, 0), 0);
  assert.equal(costUsd("grok-3-mini", -10, 100), costUsd("grok-3-mini", 0, 100));
});

test("token usage accepts AI SDK counts and raw prompt/completion counts", () => {
  assert.deepEqual(readTokenUsage({ inputTokens: 12, outputTokens: 4 }), { inputTokens: 12, outputTokens: 4 });
  assert.deepEqual(readTokenUsage({ promptTokens: 8, completionTokens: 3 }), { inputTokens: 8, outputTokens: 3 });
  assert.deepEqual(readTokenUsage(undefined), { inputTokens: 0, outputTokens: 0 });
});

test("model id is read from a provider model object", () => {
  assert.equal(modelIdFrom("grok-3-mini"), "grok-3-mini");
  assert.equal(modelIdFrom({ modelId: "claude-sonnet-4-6" }), "claude-sonnet-4-6");
  assert.equal(modelIdFrom({}), "unknown");
});

test("conversation ids are scoped to the bot", () => {
  assert.equal(conversationKey("mia", "thread_1"), "mia:thread_1");
  assert.equal(conversationKey("Mia", "mia:thread_1"), "mia:thread_1");
  assert.match(conversationKey("acme-plumbing", ""), /^acme-plumbing:turn_/);
});

test("logger does nothing when supabase env is missing", async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  setChatLogStoreForTests(null);
  const before = chatLogAttemptsForTests();
  logChatTurn({
    bot: "mia",
    model: "grok-3-mini",
    usage: { inputTokens: 10, outputTokens: 5 },
    userText: "hi",
    assistantText: "hello",
  });
  await flushChatLog();
  assert.equal(chatLogAttemptsForTests(), before);
});

test("DeepSeek rates are noted as off-peak", () => {
  const src = readFileSync("lib/model-prices.ts", "utf8");
  assert.match(src, /DeepSeek rates are off-peak/);
  assert.match(src, /deepseek-v4-flash \$0\.15 \/ \$0\.60 off-peak/);
  assert.match(src, /deepseek-v4-pro \$0\.66 \/ \$1\.98 off-peak/);
});

test("the write promise is handed to Vercel waitUntil when that context exists", async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const seen: Promise<unknown>[] = [];
  const symbol = Symbol.for("@vercel/request-context");
  const previous = (globalThis as Record<symbol, unknown>)[symbol];
  (globalThis as Record<symbol, unknown>)[symbol] = {
    get: () => ({ waitUntil: (promise: Promise<unknown>) => { seen.push(promise); } }),
  };
  setChatLogStoreForTests({
    async upsertConversation() { return { error: null }; },
    async insertMessages() { return { error: null }; },
  });
  try {
    logChatTurn({
      bot: "mia",
      model: "grok-3-mini",
      usage: { inputTokens: 1, outputTokens: 1 },
      userText: "hi",
      assistantText: "hello",
    });
    assert.equal(seen.length, 1);
    await flushChatLog();
    await seen[0];
  } finally {
    if (previous === undefined) delete (globalThis as Record<symbol, unknown>)[symbol];
    else (globalThis as Record<symbol, unknown>)[symbol] = previous;
  }
});

test("logger writes the turn with cost and does not block the caller", async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const conversations: Record<string, unknown>[] = [];
  const messages: Record<string, unknown>[] = [];
  setChatLogStoreForTests({
    async upsertConversation(row) {
      await gate;
      conversations.push(row);
      return { error: null };
    },
    async insertMessages(rows) {
      messages.push(...rows);
      return { error: null };
    },
  });

  const started = Date.now();
  logChatTurn({
    bot: "mia",
    siteId: "saabai",
    conversationId: "thread_9",
    model: "grok-3-mini",
    usage: { inputTokens: 1_000, outputTokens: 2_000 },
    userText: "What does it cost?",
    assistantText: "Presence starts at a flat monthly fee.",
  });
  assert.ok(Date.now() - started < 50, "logChatTurn returned without waiting for the store");
  assert.equal(messages.length, 0);
  release();
  await flushChatLog();

  assert.equal(conversations.length, 1);
  assert.equal(conversations[0].id, "mia:thread_9");
  assert.equal(conversations[0].bot_slug, "mia");
  assert.equal(conversations[0].site_id, "saabai");
  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, "user");
  assert.equal(messages[0].cost_usd, undefined);
  assert.equal(messages[1].role, "assistant");
  assert.equal(messages[1].model, "grok-3-mini");
  assert.equal(messages[1].input_tokens, 1000);
  assert.equal(messages[1].output_tokens, 2000);
  assert.equal(messages[1].prompt_tokens, 1000);
  assert.equal(messages[1].completion_tokens, 2000);
  assert.equal(messages[1].cost_usd, 0.0013);
  assert.equal(messages[1].cost_est, 0.0013);
});

test("a store failure does not reject the logger", async () => {
  const { messages } = captureStore();
  setChatLogStoreForTests({
    async upsertConversation() {
      throw new Error("db down");
    },
    async insertMessages() {
      return { error: null };
    },
  });
  logChatTurn({
    bot: "rex",
    model: "claude-sonnet-4-6",
    usage: { inputTokens: 10, outputTokens: 10 },
    userText: "price",
    assistantText: "here",
  });
  await flushChatLog();
  assert.equal(messages.length, 0);
});

test("migration adds bot, site, tokens, cost and a 90 day purge", () => {
  const sql = readFileSync("db/migrations/005_chat_log.sql", "utf8");
  for (const piece of ["bot_slug", "site_id", "input_tokens", "output_tokens", "cost_usd", "messages_bot_created_idx", "conversations_bot_started_idx", "purge_chat_log"]) {
    assert.ok(sql.includes(piece), piece);
  }
  assert.match(sql, /p_days int default 90/);
  assert.match(sql, /bot_slug is not null/);
});

test("retention cutoff is 90 days and the purge reports the rpc counts", async () => {
  assert.equal(CHAT_LOG_RETENTION_DAYS, 90);
  assert.equal(chatLogCutoff(new Date("2026-10-20T00:00:00.000Z"), 90), "2026-07-22T00:00:00.000Z");

  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const skipped = await purgeExpiredChatLogs(90);
  assert.equal(skipped.skipped, true);
  assert.equal(skipped.messages, 0);

  const result = await purgeExpiredChatLogs(90, async () => ({
    data: { messages: 4, conversations: 2, cutoff: "2026-07-22T00:00:00.000Z" },
    error: null,
  }));
  assert.equal(result.skipped, false);
  assert.equal(result.messages, 4);
  assert.equal(result.conversations, 2);
});

test("retention cron requires CRON_SECRET and skips when supabase is unset", async () => {
  process.env.CRON_SECRET = "test-secret";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { GET } = await import("../app/api/cron/chat-log-retention/route");
  const denied = await GET(new Request("https://www.saabai.ai/api/cron/chat-log-retention"));
  assert.equal(denied.status, 401);
  const wrong = await GET(new Request("https://www.saabai.ai/api/cron/chat-log-retention", {
    headers: { authorization: "Bearer no" },
  }));
  assert.equal(wrong.status, 401);
  const ok = await GET(new Request("https://www.saabai.ai/api/cron/chat-log-retention", {
    headers: { authorization: "Bearer test-secret" },
  }));
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.ok, true);
  assert.equal(body.skipped, true);

  delete process.env.CRON_SECRET;
  const unset = await GET(new Request("https://www.saabai.ai/api/cron/chat-log-retention", {
    headers: { authorization: "Bearer undefined" },
  }));
  assert.equal(unset.status, 401);
});
