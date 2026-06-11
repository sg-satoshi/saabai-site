import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../../lib/auth";
import EngagementClient from "./EngagementClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit Engagement — Saabai" };

export default async function EngagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login?redirect=/saabai-admin/audits");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/saabai-admin/audits");

  const isAdmin = await isAdminSession(session.clientId);
  if (!isAdmin) redirect("/saabai-admin");

  const { id } = await params;
  return <EngagementClient id={id} />;
}
