import { requireAdmin } from "../../../../lib/require-admin";
import { chatsCsv, costsCsv, parseHistoryQuery } from "../../../../lib/chat-history";
import { loadChatHistory } from "../../../../lib/chat-history-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function plain(message: string, status: number): Response {
  return new Response(`${message}\n`, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "private, no-store" },
  });
}

export async function GET(req: Request) {
  await requireAdmin("/saabai-admin/chat-history/export");
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  if (kind !== "costs" && kind !== "chats") return plain("Choose costs or chats.", 400);

  const query = parseHistoryQuery({
    bot: url.searchParams.get("bot") ?? undefined,
    site: url.searchParams.get("site") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });
  const loaded = await loadChatHistory(query, { exportAll: kind === "chats" });
  if (loaded.status === "unconfigured") return plain("Chat history is not connected yet.", 503);
  if (loaded.status !== "ok") return plain("Chat history could not be loaded.", 500);

  const filename = kind === "costs"
    ? `chat-costs-${query.from}-to-${query.to}.csv`
    : `chat-list-${query.from}-to-${query.to}.csv`;
  const body = kind === "costs" ? costsCsv(loaded.view) : chatsCsv(loaded.view);
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
      "x-saabai-truncated": loaded.view.truncated ? "1" : "0",
    },
  });
}
