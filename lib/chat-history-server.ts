/**
 * Loads chat history with the Supabase service role.
 * Import this only from server code (the admin page and its CSV route).
 * The service role key stays on the server. There is no browser client for this data.
 */
import {
  HISTORY_EXPORT_LIMIT,
  HISTORY_PAGE_SIZE,
  brisbaneDayEndExclusiveUtc,
  brisbaneDayStartUtc,
  historyViewFromRpc,
  type HistoryQuery,
  type HistoryView,
} from "./chat-history";

export type HistoryLoad =
  | { status: "ok"; view: HistoryView }
  | { status: "unconfigured" }
  | { status: "unavailable" };

export async function loadChatHistory(query: HistoryQuery, opts?: { exportAll?: boolean }): Promise<HistoryLoad> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { status: "unconfigured" };
  const from = brisbaneDayStartUtc(query.from);
  const to = brisbaneDayEndExclusiveUtc(query.to);
  if (!from || !to) return { status: "unavailable" };
  try {
    const { serviceClient } = await import("./agent-supabase");
    const { data, error } = await serviceClient().rpc("chat_history_report", {
      p_bot: query.bot || null,
      p_site: query.site || null,
      p_from: from,
      p_to: to,
      p_q: query.q || null,
      p_page: opts?.exportAll ? 1 : query.page,
      p_page_size: opts?.exportAll ? HISTORY_EXPORT_LIMIT : HISTORY_PAGE_SIZE,
      p_conversation_id: opts?.exportAll ? null : query.id || null,
      p_export: opts?.exportAll === true,
    });
    if (error) {
      console.error("[chat-history]", error.message);
      return { status: "unavailable" };
    }
    return { status: "ok", view: historyViewFromRpc(data, query) };
  } catch (err) {
    console.error("[chat-history]", err instanceof Error ? err.message : err);
    return { status: "unavailable" };
  }
}
