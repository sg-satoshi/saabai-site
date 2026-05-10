import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "../../../lib/auth";
import CustomersClient from "./CustomersClient";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export const metadata = { title: "Customers — Saabai" };

export default async function CustomersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login?redirect=/saabai-admin/customers");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/saabai-admin/customers");

  if (session.clientId !== ADMIN_ID) {
    redirect("/saabai-admin");
  }

  return <CustomersClient />;
}
