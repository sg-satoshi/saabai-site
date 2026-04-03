import { fetchRexStats } from "../../lib/rex-stats";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Auth is handled by proxy.ts — if we reach this page, the user is authenticated.
export default async function RexDashboardPage() {
  const stats = await fetchRexStats();
  return <DashboardClient stats={stats} />;
}
