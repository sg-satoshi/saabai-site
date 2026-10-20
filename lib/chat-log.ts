/**
 * Shared chat logger. Writes one conversation and its latest turn to Supabase.
 * The chat reply is not blocked. The write promise is handed to Vercel waitUntil
 * (or Next after() when that context is missing) so the function stays alive
 * until the insert finishes. A failure never throws into the chat route.
 * Does nothing when SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.
 *
 * Redis conversation storage is not touched here.
 */
import { waitUntil } from "@vercel/functions";
import { after } from "next/server";
import { costUsd } from "./model-prices";

export const CHAT_LOG_RETENTION_DAYS = 90;
const CONTENT_LIMIT = 20_000;

export type TokenUsage = {
  inputTokens?: number | null;
  outputTokens?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
};

export type ChatTurn = {
  /** Bot slug: mia, rex, lex-research, or a client site slug. */
  bot: string;
  /** Client or site id, when the route has one. */
  siteId?: string | null;
  /** Stable id for the thread. Turns with the same bot and id share a conversation. */
  conversationId?: string | null;
  channel?: string;
  model: string;
  usage?: TokenUsage | null;
  userText?: string | null;
  assistantText?: string | null;
};

type Row = Record<string, unknown>;

export type ChatLogStore = {
  upsertConversation: (row: Row) => Promise<{ error: { message: string } | null }>;
  insertMessages: (rows: Row[]) => Promise<{ error: { message: string } | null }>;
};

type Rpc = (
  fn: string,
  args: { p_days: number }
) => Promise<{ data: unknown; error: { message: string } | null }>;

let storeForTests: ChatLogStore | null = null;
let attemptsForTests = 0;
const inflight = new Set<Promise<void>>();

/** How many turns were actually scheduled. Tests use this to prove the no-op path. */
export function chatLogAttemptsForTests(): number {
  return attemptsForTests;
}

/** Test hook. Production leaves this unset. */
export function setChatLogStoreForTests(store: ChatLogStore | null): void {
  storeForTests = store;
}

export function chatLogConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function shouldLog(): boolean {
  return storeForTests !== null || chatLogConfigured();
}

/** Wait for in-flight writes. Tests use this. Routes must not. */
export function flushChatLog(): Promise<void> {
  return Promise.all([...inflight]).then(() => undefined);
}

export function modelIdFrom(model: unknown): string {
  if (typeof model === "string" && model.trim()) return model.trim();
  if (model && typeof model === "object" && "modelId" in model) {
    const id = (model as { modelId?: unknown }).modelId;
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  return "unknown";
}

function asCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (value && typeof value === "object" && "total" in value) {
    return asCount((value as { total?: unknown }).total);
  }
  return 0;
}

export function readTokenUsage(usage: TokenUsage | null | undefined): { inputTokens: number; outputTokens: number } {
  return {
    inputTokens: asCount(usage?.inputTokens ?? usage?.promptTokens),
    outputTokens: asCount(usage?.outputTokens ?? usage?.completionTokens),
  };
}

export function lastUserText(messages: Array<{ role?: string; content?: unknown }> | null | undefined): string {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role === "user" && typeof message.content === "string") return message.content;
  }
  return "";
}

export function conversationKey(bot: string, raw?: string | null): string {
  const botPart = bot.toLowerCase().replace(/[^\w.-]/g, "").slice(0, 60) || "bot";
  const safe = (raw ?? "").replace(/[^\w:.-]/g, "").slice(0, 120);
  if (!safe) return `${botPart}:${makeId("turn")}`;
  if (safe === botPart || safe.startsWith(`${botPart}:`)) return safe.slice(0, 180);
  return `${botPart}:${safe}`.slice(0, 180);
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

function clip(value: string | null | undefined): string {
  if (!value) return "";
  const text = value.replace(/\u0000/g, "").trim();
  return text.length > CONTENT_LIMIT ? text.slice(0, CONTENT_LIMIT) : text;
}

async function supabaseStore(): Promise<ChatLogStore> {
  const { serviceClient } = await import("./agent-supabase");
  const db = serviceClient();
  return {
    async upsertConversation(row) {
      const { error } = await db.from("conversations").upsert(row, { onConflict: "id", ignoreDuplicates: true });
      return { error: error ? { message: error.message } : null };
    },
    async insertMessages(rows) {
      const { error } = await db.from("messages").insert(rows);
      return { error: error ? { message: error.message } : null };
    },
  };
}

async function persistChatTurn(turn: ChatTurn): Promise<void> {
  const bot = turn.bot.trim().slice(0, 80);
  if (!bot) return;
  const { inputTokens, outputTokens } = readTokenUsage(turn.usage);
  const model = (turn.model || "unknown").slice(0, 120);
  const cost = costUsd(model, inputTokens, outputTokens);
  const siteId = turn.siteId?.trim() ? turn.siteId.trim().slice(0, 160) : null;
  const conversationId = conversationKey(bot, turn.conversationId);
  const started = Date.now();
  const userText = clip(turn.userText);
  const assistantText = clip(turn.assistantText) || (inputTokens || outputTokens ? "(no text)" : "");
  if (!userText && !assistantText) return;

  const store = storeForTests ?? (await supabaseStore());
  const conversation = await store.upsertConversation({
    id: conversationId,
    tenant_id: null,
    bot_slug: bot,
    site_id: siteId,
    channel: turn.channel ?? "web",
    started_at: new Date(started).toISOString(),
  });
  if (conversation.error) throw new Error(conversation.error.message);

  const rows: Row[] = [];
  if (userText) {
    rows.push({
      id: makeId("msg"),
      conversation_id: conversationId,
      tenant_id: null,
      bot_slug: bot,
      site_id: siteId,
      role: "user",
      content: userText,
      created_at: new Date(started).toISOString(),
    });
  }
  if (assistantText) {
    rows.push({
      id: makeId("msg"),
      conversation_id: conversationId,
      tenant_id: null,
      bot_slug: bot,
      site_id: siteId,
      role: "assistant",
      content: assistantText,
      model,
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_est: cost,
      cost_usd: cost,
      created_at: new Date(started + 1).toISOString(),
    });
  }
  const inserted = await store.insertMessages(rows);
  if (inserted.error) throw new Error(inserted.error.message);
}

const VERCEL_REQUEST_CONTEXT = Symbol.for("@vercel/request-context");

/** True when this invocation can extend its lifetime with Vercel waitUntil. */
function vercelWaitUntilAvailable(): boolean {
  try {
    const holder = (globalThis as Record<symbol, { get?: () => { waitUntil?: unknown } } | undefined>)[VERCEL_REQUEST_CONTEXT];
    return typeof holder?.get?.()?.waitUntil === "function";
  } catch {
    return false;
  }
}

/**
 * Keep the serverless function alive for this promise without blocking the reply.
 * Vercel waitUntil first, then Next after(). If neither context exists (tests, scripts),
 * the promise still runs and flushChatLog can await it.
 */
function handOff(promise: Promise<unknown>): void {
  if (vercelWaitUntilAvailable()) {
    try {
      waitUntil(promise);
      return;
    } catch (err) {
      console.error("[chat-log] waitUntil failed", err instanceof Error ? err.message : err);
    }
  }
  try {
    after(promise);
  } catch {
    // No request context. The promise is already running.
  }
}

/** Schedule a write. Returns immediately. Never throws. */
export function logChatTurn(turn: ChatTurn): void {
  if (!shouldLog()) return;
  attemptsForTests += 1;
  const job = Promise.resolve()
    .then(() => persistChatTurn(turn))
    .catch((err) => {
      console.error("[chat-log]", err instanceof Error ? err.message : err);
    });
  inflight.add(job);
  void job.finally(() => inflight.delete(job));
  handOff(job);
}

type FinishEvent = {
  totalUsage?: TokenUsage;
  usage?: TokenUsage;
  text?: string;
  steps?: Array<{ text?: string }>;
  model?: { modelId?: string };
};

/** onFinish helper for streamText. Uses total usage across tool steps. */
export function logStreamFinish(event: FinishEvent, turn: Omit<ChatTurn, "usage" | "assistantText" | "model"> & { model?: string }): void {
  const fromSteps = (event.steps ?? []).map((step) => step.text ?? "").filter(Boolean).join("\n").trim();
  logChatTurn({
    ...turn,
    model: event.model?.modelId || turn.model || "unknown",
    usage: event.totalUsage ?? event.usage,
    assistantText: fromSteps || event.text || "",
  });
}

export function chatLogCutoff(now = new Date(), days = CHAT_LOG_RETENTION_DAYS): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

export type PurgeResult = {
  skipped: boolean;
  messages: number;
  conversations: number;
  cutoff: string;
};

/** Calls purge_chat_log. No-ops when Supabase env is missing. */
export async function purgeExpiredChatLogs(days = CHAT_LOG_RETENTION_DAYS, rpc?: Rpc): Promise<PurgeResult> {
  const cutoff = chatLogCutoff(new Date(), days);
  if (!rpc && !chatLogConfigured()) {
    return { skipped: true, messages: 0, conversations: 0, cutoff };
  }
  const call: Rpc = rpc ?? (async (fn, args) => {
    const { serviceClient } = await import("./agent-supabase");
    return serviceClient().rpc(fn, args);
  });
  const { data, error } = await call("purge_chat_log", { p_days: days });
  if (error) throw new Error(error.message);
  const row = (data && typeof data === "object" ? data : {}) as {
    messages?: unknown;
    conversations?: unknown;
    cutoff?: unknown;
  };
  return {
    skipped: false,
    messages: Number(row.messages) || 0,
    conversations: Number(row.conversations) || 0,
    cutoff: typeof row.cutoff === "string" ? row.cutoff : cutoff,
  };
}

export type ChatHistoryTurn = {
  id: string;
  bot: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: string;
  model: string | null;
};

export type ChatHistoryResult = {
  configured: boolean;
  error: boolean;
  turns: ChatHistoryTurn[];
};

type HistoryReader = (bots: string[], limit: number) => Promise<ChatHistoryTurn[]>;
let historyReaderForTests: HistoryReader | null = null;

/** Test hook. Production leaves this unset. */
export function setChatHistoryReaderForTests(reader: HistoryReader | null): void {
  historyReaderForTests = reader;
}

/** Recent logged turns for these bot ids, newest first. Does not throw. */
export async function listChatHistory(bots: string[], limit = 40): Promise<ChatHistoryResult> {
  const ids = [...new Set(bots.map((b) => b.trim()).filter(Boolean))].slice(0, 20);
  const empty = (configured: boolean, error = false): ChatHistoryResult => ({ configured, error, turns: [] });
  if (!ids.length) return empty(chatLogConfigured() || historyReaderForTests !== null);
  if (historyReaderForTests) {
    try {
      return { configured: true, error: false, turns: await historyReaderForTests(ids, limit) };
    } catch (err) {
      console.error("[chat-log] history", err instanceof Error ? err.message : err);
      return empty(true, true);
    }
  }
  if (!chatLogConfigured()) return empty(false);
  try {
    const { serviceClient } = await import("./agent-supabase");
    const { data, error } = await serviceClient()
      .from("messages")
      .select("id, bot_slug, conversation_id, role, content, created_at, model")
      .in("bot_slug", ids)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("[chat-log] history", error.message);
      return empty(true, true);
    }
    const turns = (Array.isArray(data) ? data : []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id ?? ""),
        bot: String(r.bot_slug ?? ""),
        conversationId: String(r.conversation_id ?? ""),
        role: String(r.role ?? ""),
        content: String(r.content ?? ""),
        createdAt: String(r.created_at ?? ""),
        model: r.model == null ? null : String(r.model),
      };
    }).filter((t) => t.id);
    return { configured: true, error: false, turns };
  } catch (err) {
    console.error("[chat-log] history", err instanceof Error ? err.message : err);
    return empty(true, true);
  }
}
