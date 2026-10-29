import { requireAdmin } from "../../../../lib/require-admin";
import EngagementClient from "./EngagementClient";
import { getEngagement } from "../../../../lib/audit-store";
import { reviewRequired } from "../../../../lib/portal-blueprint/deliver";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blueprint - Saabai" };

export default async function EngagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/saabai-admin/audits");

  const { id } = await params;
  const e = await getEngagement(id);
  return <EngagementClient id={id} reviewRequired={e ? reviewRequired(e) : false} />;
}
