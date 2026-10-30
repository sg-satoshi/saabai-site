/**
 * Reads engaged-chat counts and last chat time for the admin list.
 * Prefers the additive SQL functions in db/migrations/007_chatbot_list_stats.sql.
 * If those are not applied yet, falls back to a bounded read of the messages table.
 * Does nothing when Supabase is not configured. Never writes a chat or a lead.
 */
import { brisbaneMonthRange, summariseActivity, type UserTurn } from "./leads";

const FALLBACK_TURNS = 8000;
const FALLBACK_LAST = 2000;

type Raw = Record<string, unknown>;

function text(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

export async function loadChatActivity(now = new Date()): Promise<Map<string, { leads: number; lastChatAt: string | null }>> {
  const empty = new Map<string, { leads: number; lastChatAt: string | null }>();
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return empty;
  try {
    const { serviceClient } = await import("../agent-supabase");
    const db = serviceClient();
    const range = brisbaneMonthRange(now);
    const since = new Date(range.start).toISOString();

    let turns: UserTurn[] = [];
    const rpc = await db.rpc("chatbot_user_turns", { p_since: since });
    if (!rpc.error && Array.isArray(rpc.data)) {
      turns = (rpc.data as Raw[]).map((r) => ({
        bot: text(r.bot_slug),
        conversationId: text(r.conversation_id),
        content: text(r.content),
        at: text(r.created_at),
      }));
    } else {
      const q = await db.from("messages").select("bot_slug, conversation_id, content, created_at").eq("role", "user").gte("created_at", since).limit(FALLBACK_TURNS);
      if (!q.error && Array.isArray(q.data)) {
        turns = (q.data as Raw[]).map((r) => ({
          bot: text(r.bot_slug),
          conversationId: text(r.conversation_id),
          content: text(r.content),
          at: text(r.created_at),
        }));
      }
    }

    let last: { bot: string; at: string }[] = [];
    const lastRpc = await db.rpc("chatbot_last_chats");
    if (!lastRpc.error && Array.isArray(lastRpc.data)) {
      last = (lastRpc.data as Raw[]).map((r) => ({ bot: text(r.bot_slug), at: text(r.last_chat) }));
    } else {
      const q = await db.from("messages").select("bot_slug, created_at").not("bot_slug", "is", null).order("created_at", { ascending: false }).limit(FALLBACK_LAST);
      if (!q.error && Array.isArray(q.data)) {
        last = (q.data as Raw[]).map((r) => ({ bot: text(r.bot_slug), at: text(r.created_at) }));
      }
    }
    return summariseActivity(turns, last, range.start, range.end);
  } catch {
    return empty;
  }
}
