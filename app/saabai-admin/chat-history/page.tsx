import { requireAdmin } from "../../../lib/require-admin";
import { parseHistoryQuery } from "../../../lib/chat-history";
import { loadChatHistory } from "../../../lib/chat-history-server";
import AdminShell from "../AdminSidebar";
import { ChatHistoryView } from "./ChatHistoryView";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Chat history" };

export default async function ChatHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin("/saabai-admin/chat-history");
  const query = parseHistoryQuery(await searchParams);
  const loaded = await loadChatHistory(query);
  return (
    <AdminShell activePath="/saabai-admin/chat-history" title="Chat history">
      <ChatHistoryView
        status={loaded.status}
        view={loaded.status === "ok" ? loaded.view : null}
        query={query}
      />
    </AdminShell>
  );
}
