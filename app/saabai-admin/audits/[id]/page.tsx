import { requireAdmin } from "../../../../lib/require-admin";
import EngagementClient from "./EngagementClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blueprint - Saabai" };

export default async function EngagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/saabai-admin/audits");

  const { id } = await params;
  return <EngagementClient id={id} />;
}
