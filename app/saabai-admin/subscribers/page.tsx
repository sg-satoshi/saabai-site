import { requireAdmin } from "../../../lib/require-admin";
import SubscriberDashboard from "./SubscriberDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Subscribers | Saabai Admin" };
export default async function Page() {
  await requireAdmin("/saabai-admin/subscribers");
  return <SubscriberDashboard />;
}
