import { requireAdmin } from "../../../lib/require-admin";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics | Saabai Admin" };

export default async function AnalyticsPage() {
  await requireAdmin("/saabai-admin/analytics");
  return <AnalyticsClient />;
}
