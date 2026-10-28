import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import FaqQueueClient from "./FaqQueueClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Blueprint FAQs" };

export default async function BlueprintFaqQueuePage() {
  await requireAdmin("/saabai-admin/blueprint-faqs");
  return (
    <AdminShell activePath="/saabai-admin/blueprint-faqs">
      <FaqQueueClient />
    </AdminShell>
  );
}
