import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import ChatHistoryClient from "./ChatHistoryClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Chat history", robots: { index: false, follow: false } };

export default async function ChatHistoryPage({ searchParams }: { searchParams: Promise<{ bot?: string }> }) {
  const { bot } = await searchParams;
  const raw = typeof bot === "string" ? bot : "";
  const path = raw ? `/saabai-admin/chat-history?bot=${encodeURIComponent(raw)}` : "/saabai-admin/chat-history";
  await requireAdmin(path);
  return (
    <AdminShell activePath="/saabai-admin/chatbots" title="Chat history">
      <ChatHistoryClient bot={raw} />
    </AdminShell>
  );
}
