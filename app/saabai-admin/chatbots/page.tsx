import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import ChatbotsClient from "./ChatbotsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Chatbots" };

export default async function ChatbotsPage() {
  await requireAdmin("/saabai-admin/chatbots");
  return (
    <AdminShell activePath="/saabai-admin/chatbots">
      <ChatbotsClient />
    </AdminShell>
  );
}
