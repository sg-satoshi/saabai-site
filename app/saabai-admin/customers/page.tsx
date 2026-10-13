import { requireAdmin } from "../../../lib/require-admin";
import CustomersClient from "./CustomersClient";

export const metadata = { title: "Customers — Saabai" };

export default async function CustomersPage() {
  await requireAdmin("/saabai-admin/customers");

  return <CustomersClient />;
}
