import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../lib/auth";
import CustomersClient from "./CustomersClient";

export const metadata = { title: "Customers — Saabai" };

export default async function CustomersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login?redirect=/saabai-admin/customers");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/saabai-admin/customers");

  const isAdmin = await isAdminSession(session.clientId);
  if (!isAdmin) {
    redirect("/saabai-admin");
  }

  return <CustomersClient />;
}
