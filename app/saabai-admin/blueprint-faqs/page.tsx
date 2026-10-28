import { requireAdmin } from "../../../lib/require-admin";
import FaqQueueClient from "./FaqQueueClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blueprint FAQ drafts - Saabai" };

export default async function BlueprintFaqQueuePage() {
  await requireAdmin("/saabai-admin/blueprint-faqs");
  return <FaqQueueClient />;
}
