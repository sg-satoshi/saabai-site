import { dashboardPackages } from "../../_data/member-packages";
import DashboardClient from "./DashboardClient";

// Server component: the package list is loaded here (members only, see
// layout.tsx) and passed down, so it is never part of the public JS bundle.
export default function ClientDashboardPage() {
  return <DashboardClient allPackages={dashboardPackages} />;
}
