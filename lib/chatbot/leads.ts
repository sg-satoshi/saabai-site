/**
 * A lead is an engaged chat: the visitor sent more than a greeting before the chat ended.
 * Saying hello and leaving is not a lead. A goal click is not a lead.
 * The count is conversations this month, not button clicks.
 */

const GREETING_PHRASE = /\b(?:good morning|good afternoon|good evening|good day|hi there|hello there|hey there|howdy|hello|hiya|gday|hey|hi|yo)\b/g;

/** True when the text is only a greeting, optionally with one name ("Hi Ruby"). */
export function isGreetingOnly(text: string): boolean {
  const n = text
    .toLowerCase()
    .replace(/[\u2018\u2019`]/g, "'")
    .replace(/g'day/g, "gday")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!n) return true;
  const stripped = n.replace(GREETING_PHRASE, " ").replace(/\s+/g, " ").trim();
  if (!stripped) return true;
  if (/^(?:hi|hello|hey|hiya|howdy|yo|gday|good)\b/.test(n)) {
    const words = stripped.split(" ");
    if (words.length === 1 && words[0].length <= 20) return true;
  }
  return false;
}

/**
 * True when the visitor went past hello.
 * `goalClicks` is accepted and ignored so a button click cannot create a lead.
 */
export function isEngagedChat(userMessages: string[], goalClicks?: number): boolean {
  void goalClicks;
  const msgs = userMessages.map((s) => s.trim()).filter(Boolean);
  if (!msgs.length) return false;
  return msgs.some((m) => !isGreetingOnly(m));
}

export function countLeads(chats: { messages: string[]; goalClicks?: number }[]): number {
  return chats.filter((c) => isEngagedChat(c.messages, c.goalClicks)).length;
}

export type UserTurn = { bot: string; conversationId: string; content: string; at: string };

/** Brisbane month window as UTC milliseconds. Brisbane is UTC+10 with no daylight saving. */
export function brisbaneMonthRange(d = new Date()): { start: number; end: number; key: string } {
  const shifted = new Date(d.getTime() + 10 * 3600_000);
  const key = shifted.toISOString().slice(0, 7);
  const start = Date.parse(`${key}-01T00:00:00+10:00`);
  const [y, m] = key.split("-").map(Number);
  const nextKey = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const end = Date.parse(`${nextKey}-01T00:00:00+10:00`);
  return { start, end, key };
}

function stamp(at: string): number {
  const t = Date.parse(at);
  return Number.isFinite(t) ? t : NaN;
}

/**
 * Per bot: engaged chats whose user messages fall in the month, and the latest message time (any month).
 * Goal clicks are not an input.
 */
export function summariseActivity(
  turns: UserTurn[],
  lastChats: { bot: string; at: string }[],
  monthStart: number,
  monthEnd: number,
): Map<string, { leads: number; lastChatAt: string | null }> {
  const byBot = new Map<string, Map<string, string[]>>();
  const last = new Map<string, { at: string; ms: number }>();
  const noteLast = (bot: string, at: string) => {
    const ms = stamp(at);
    if (!bot || !Number.isFinite(ms)) return;
    const cur = last.get(bot);
    if (!cur || ms > cur.ms) last.set(bot, { at, ms });
  };
  for (const turn of turns) {
    const bot = turn.bot.trim();
    if (!bot) continue;
    noteLast(bot, turn.at);
    const ms = stamp(turn.at);
    if (!Number.isFinite(ms) || ms < monthStart || ms >= monthEnd) continue;
    let convs = byBot.get(bot);
    if (!convs) { convs = new Map(); byBot.set(bot, convs); }
    const id = turn.conversationId || "chat";
    const list = convs.get(id) ?? [];
    list.push(turn.content);
    convs.set(id, list);
  }
  for (const row of lastChats) noteLast(row.bot.trim(), row.at);
  const bots = new Set<string>([...byBot.keys(), ...last.keys()]);
  const out = new Map<string, { leads: number; lastChatAt: string | null }>();
  for (const bot of bots) {
    const convs = byBot.get(bot);
    let leads = 0;
    if (convs) for (const messages of convs.values()) if (isEngagedChat(messages)) leads += 1;
    out.set(bot, { leads, lastChatAt: last.get(bot)?.at ?? null });
  }
  return out;
}

function brisbaneDay(ms: number): string {
  return new Date(ms + 10 * 3600_000).toISOString().slice(0, 10);
}

function clock(ms: number): string {
  const hm = new Date(ms + 10 * 3600_000).toISOString().slice(11, 16);
  const [h, m] = hm.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ap}`;
}

/** Relative last-chat label in Brisbane time. Empty when there is no timestamp. */
export function formatLastChat(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diff = now.getTime() - t;
  const min = Math.round(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min`;
  if (min < 120) return "1 hr";
  const nowDay = brisbaneDay(now.getTime());
  const thenDay = brisbaneDay(t);
  if (nowDay === thenDay) return clock(t);
  const dayDiff = Math.round((Date.parse(nowDay) - Date.parse(thenDay)) / 86400000);
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff > 1 && dayDiff < 14) return `${dayDiff} days`;
  return clock(t);
}
