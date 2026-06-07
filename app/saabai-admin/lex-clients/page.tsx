import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../lib/auth";
import LexClientsClient from "./LexClientsClient";
import AdminShell from "../AdminSidebar";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Lex Clients — Saabai Admin" };

export default async function LexClientsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login?redirect=/saabai-admin/lex-clients");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/saabai-admin/lex-clients");

  const isAdmin = await isAdminSession(session.clientId);
  if (!isAdmin) {
    redirect("/login?redirect=/saabai-admin/lex-clients");
  }

  return (
    <AdminShell activePath="/saabai-admin/lex-clients">
      <LexClientsClient />
    </AdminShell>
  );
}
