import { createHash } from "crypto";
import { getRedis } from "../redis";
import { addChangeLogEntry } from "../change-log";
import { readBotLock } from "./bot-lock";
import {
  DEFAULT_SKIN, effectiveEnabled, isPlan, monthKey, capState, auditSummary, type CapState, type ChatbotConfig, type Plan,
} from "./core";
import { eventKey, type ChatEventName } from "./events";

const cfgKey = (slug: string) => `saabai:chatbot:config:${slug}`;
const flagKey = (slug: string) => `saabai:chatbot:flag:${slug}`;
const metaKey = (slug: string) => `saabai:chatbot:meta:${slug}`;
const usageKey = (slug: string, month: string) => `saabai:chatbot:usage:${slug}:${month}`;
const convKey = (slug: string, month: string) => `saabai:chatbot:convs:${slug}:${month}`;

const killed = () => process.env.CHATBOTS_KILL === "1";

/** Thrown when a write must not guess. A missing or failed Redis read is not "unlocked". */
export class ChatbotConfigUnavailable extends Error {
  constructor() {
    super("Couldn't read the chatbot settings");
    this.name = "ChatbotConfigUnavailable";
  }
}

function configFrom(slug: string, v: unknown): ChatbotConfig {
  const base: ChatbotConfig = { schema: 1, slug, plan: "presence", skin: {} };
  const o = (typeof v === "string" ? JSON.parse(v) : v) as Partial<ChatbotConfig> | null;
  if (!o || typeof o !== "object") return base;
  const botLock = readBotLock((o as { botLock?: unknown }).botLock);
  return { ...base, plan: isPlan(o.plan) ? o.plan : "presence", skin: (o.skin as ChatbotConfig["skin"]) ?? {}, ...(o.tone ? { tone: o.tone } : {}), ...(o.knowledge ? { knowledge: o.knowledge } : {}), ...(o.goal && typeof o.goal === "object" ? { goal: o.goal } : {}), ...(o.engage && typeof o.engage === "object" ? { engage: o.engage } : {}), ...(botLock ? { botLock } : {}), updatedAt: o.updatedAt, updatedBy: o.updatedBy };
}

/**
 * Read a bot's config. Reads fail open (a widget still loads).
 * `strict` is for writes: if the lock cannot be read, throw instead of looking unlocked.
 */
export async function getConfig(slug: string, opts?: { strict?: boolean }): Promise<ChatbotConfig> {
  const base: ChatbotConfig = { schema: 1, slug, plan: "presence", skin: {} };
  try {
    const r = getRedis();
    if (!r) {
      if (opts?.strict) throw new ChatbotConfigUnavailable();
      return base;
    }
    return configFrom(slug, await r.get<unknown>(cfgKey(slug)));
  } catch (e) {
    if (e instanceof ChatbotConfigUnavailable) throw e;
    if (opts?.strict) throw new ChatbotConfigUnavailable();
    return base;
  }
}

/** Client write: refuse when Redis cannot say whether the bot is locked. */
export async function loadConfigForClientWrite(slug: string): Promise<{ ok: true; config: ChatbotConfig } | { ok: false; status: 503; error: string }> {
  try {
    return { ok: true, config: await getConfig(slug, { strict: true }) };
  } catch {
    return { ok: false, status: 503, error: "Couldn't check whether this chatbot is locked. Nothing was saved." };
  }
}

/**
 * Save a bot. Every write except an explicit lock change keeps the lock already stored.
 * A caller holding an older copy cannot clear botLock. If that stored lock cannot be read, nothing is written.
 */
function dropFieldLocks(c: ChatbotConfig): ChatbotConfig {
  const goal = c.goal ? { ...c.goal } : undefined;
  const engage = c.engage ? { ...c.engage } : undefined;
  if (goal && "locked" in goal) delete goal.locked;
  if (engage && "locked" in engage) delete engage.locked;
  return { ...c, ...(goal ? { goal } : {}), ...(engage ? { engage } : {}) };
}

export async function saveConfig(c: ChatbotConfig, opts?: { setLock?: boolean }): Promise<void> {
  const r = getRedis();
  if (!r) throw new Error("Redis is not configured");
  const next: ChatbotConfig = dropFieldLocks({ ...c, schema: 1 });
  if (!opts?.setLock) {
    let raw: unknown;
    try { raw = await r.get<unknown>(cfgKey(c.slug)); } catch { throw new ChatbotConfigUnavailable(); }
    let stored: ReturnType<typeof readBotLock>;
    try {
      const o = (typeof raw === "string" ? JSON.parse(raw) : raw) as { botLock?: unknown } | null;
      stored = o && typeof o === "object" ? readBotLock(o.botLock) : undefined;
    } catch {
      throw new ChatbotConfigUnavailable();
    }
    if (stored) next.botLock = stored;
    else delete next.botLock;
  }
  await r.set(cfgKey(c.slug), JSON.stringify({ ...next, schema: 1, updatedAt: new Date().toISOString() }));
}

/** Explicit admin flag: true, false, or null when never set. */
export async function getFlag(slug: string): Promise<boolean | null> {
  const r = getRedis();
  if (!r) return null;
  const v = await r.get<unknown>(flagKey(slug));
  if (v === null || v === undefined) return null;
  return v === "1" || v === 1 || v === true;
}

export interface ToggleMeta { by?: string; at?: string; reason?: string }
export async function getMeta(slug: string): Promise<ToggleMeta> {
  try { return ((await getRedis()?.hgetall<Record<string, string>>(metaKey(slug))) ?? {}) as ToggleMeta; } catch { return {}; }
}

/** Is this bot on? Fails open on Redis errors (except seeded and killed sites). */
export async function isEnabled(slug: string, siteChatbotEnabled?: boolean): Promise<boolean> {
  let flag: boolean | null = null;
  try { flag = await getFlag(slug); } catch { flag = null; }
  return effectiveEnabled({ flag, slug, siteChatbotEnabled, kill: killed() });
}

/** Turn a bot on or off. Writes the flag, the last-change record and an audit entry. No entry if nothing changed. */
export async function setEnabled(opts: { slug: string; siteName: string; siteChatbotEnabled?: boolean; on: boolean; actor: string; reason?: string }): Promise<{ changed: boolean }> {
  const r = getRedis();
  if (!r) throw new Error("Redis is not configured");
  const before = effectiveEnabled({ flag: await getFlag(opts.slug), slug: opts.slug, siteChatbotEnabled: opts.siteChatbotEnabled });
  await r.set(flagKey(opts.slug), opts.on ? "1" : "0");
  if (before === opts.on) return { changed: false };
  const at = new Date().toISOString();
  await r.hset(metaKey(opts.slug), { by: opts.actor, at, reason: (opts.reason ?? "").slice(0, 200) });
  try {
    await addChangeLogEntry({ siteId: opts.slug, siteName: opts.siteName, summary: auditSummary(opts.on, opts.reason), source: "manual", authorName: opts.actor });
  } catch (e) {
    console.error("chatbot audit log failed:", e);
  }
  return { changed: true };
}

/**
 * Anonymous conversation id when the widget does not send one.
 * SHA-256 of the IP, user agent, day, and the existing site session secret.
 * The stored value is a short hash. It does not contain the raw IP or the secret.
 * An empty secret leaves the hash unsalted.
 */
export function fallbackSessionId(
  ip: string,
  ua: string,
  day = new Date().toISOString().slice(0, 10),
  pepper = process.env.SAABAI_SESSION_SECRET || "",
): string {
  return "v:" + createHash("sha256").update(`${ip}|${ua}|${day}|${pepper}`).digest("hex").slice(0, 24);
}

export interface Usage { conversations: number; messages: number; inputTokens: number; outputTokens: number }

/** Count one message, and one conversation per distinct session per month. Log-only: never blocks. */
export async function recordUsage(slug: string, plan: Plan, sessionId: string): Promise<{ isNewConversation: boolean; conversations: number; state: CapState }> {
  const month = monthKey();
  const empty = { isNewConversation: false, conversations: 0, state: "ok" as CapState };
  try {
    const r = getRedis();
    if (!r) return empty;
    const added = await r.sadd(convKey(slug, month), sessionId);
    await r.expire(convKey(slug, month), 70 * 86400);
    const pipe = r.pipeline();
    pipe.hincrby(usageKey(slug, month), "messages", 1);
    if (added) pipe.hincrby(usageKey(slug, month), "conversations", 1);
    pipe.expire(usageKey(slug, month), 400 * 86400);
    const res = (await pipe.exec()) as unknown[];
    const convs = Number(added ? res[1] : (await r.hget<number>(usageKey(slug, month), "conversations")) ?? 0);
    const cs = capState(convs, plan);
    if (added && cs.state !== "ok") console.warn(`chatbot cap ${cs.state}: ${slug} ${convs}/${cs.cap} (${plan}), log-only`);
    return { isNewConversation: !!added, conversations: convs, state: cs.state };
  } catch (e) {
    console.error("chatbot usage record failed (ignored):", e);
    return empty;
  }
}

/** Count one monitoring event. Does not send email or Telegram. */
export async function recordChatEvent(slug: string, event: ChatEventName): Promise<void> {
  try {
    const r = getRedis();
    if (!r) return;
    const key = eventKey(slug, monthKey());
    await r.hincrby(key, event, 1);
    await r.expire(key, 400 * 86400);
  } catch {
    /* counting only */
  }
}

export async function recordTokens(slug: string, input: number, output: number): Promise<void> {
  try {
    const r = getRedis();
    if (!r || (!input && !output)) return;
    const p = r.pipeline();
    p.hincrby(usageKey(slug, monthKey()), "inputTokens", Math.round(input));
    p.hincrby(usageKey(slug, monthKey()), "outputTokens", Math.round(output));
    await p.exec();
  } catch { /* ignored */ }
}

export async function getUsage(slug: string, month = monthKey()): Promise<Usage> {
  try {
    const o = (await getRedis()?.hgetall<Record<string, unknown>>(usageKey(slug, month))) ?? {};
    const n = (k: string) => Number(o[k] ?? 0) || 0;
    return { conversations: n("conversations"), messages: n("messages"), inputTokens: n("inputTokens"), outputTokens: n("outputTokens") };
  } catch {
    return { conversations: 0, messages: 0, inputTokens: 0, outputTokens: 0 };
  }
}

export { DEFAULT_SKIN };
