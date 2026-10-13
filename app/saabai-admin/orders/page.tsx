import { requireAdmin } from "../../../lib/require-admin";
import OrdersPage from "./OrdersPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders - Saabai Admin" };

export default async function Page() {
  await requireAdmin("/saabai-admin/orders");
  return <OrdersPage />;
}
