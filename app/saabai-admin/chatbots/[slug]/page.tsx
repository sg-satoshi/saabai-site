import { requireAdmin } from "../../../../lib/require-admin";
import AdminShell from "../../AdminSidebar";
import BotDetailClient from "./BotDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Chatbot" };

export default async function ChatbotDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireAdmin(`/saabai-admin/chatbots/${slug}`);
  return (
    <AdminShell activePath="/saabai-admin/chatbots">
      <BotDetailClient slug={slug} />
    </AdminShell>
  );
}
