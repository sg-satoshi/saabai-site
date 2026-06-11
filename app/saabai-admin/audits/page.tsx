import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../lib/auth";
import AuditsClient from "./AuditsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI Audits — Saabai" };

export default async function AuditsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login?redirect=/saabai-admin/audits");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/saabai-admin/audits");

  const isAdmin = await isAdminSession(session.clientId);
  if (!isAdmin) redirect("/saabai-admin");

  return <AuditsClient />;
}
