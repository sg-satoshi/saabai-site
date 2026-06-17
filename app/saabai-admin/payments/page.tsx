import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../lib/auth";
import { getPublishableKey } from "../../../lib/stripe";
import PaymentsClient from "./PaymentsClient";

export const metadata = { title: "Payments — Saabai Admin" };

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login?redirect=/saabai-admin/payments");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/saabai-admin/payments");

  const isAdmin = await isAdminSession(session.clientId);
  if (!isAdmin) redirect("/saabai-admin");

  return <PaymentsClient publishableKey={getPublishableKey()} />;
}
