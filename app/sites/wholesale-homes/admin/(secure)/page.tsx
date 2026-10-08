import { packageDetails } from "../../_data/member-packages";
import AdminDashboardClient from "./AdminDashboardClient";

export default function AdminDashboardPage() {
  return <AdminDashboardClient packageCount={packageDetails.length} />;
}
