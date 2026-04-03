import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "../../lib/auth";
import { loadClients } from "../../lib/clients";
import { fetchRexStats } from "../../lib/rex-stats";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Saabai Admin" };

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export default async function SaabaiAdminPage() {
  // Verify session exists and belongs to the Saabai admin account
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) redirect("/login?redirect=/saabai-admin");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/saabai-admin");

  // Non-admin clients should not see this page — redirect them to their dashboard
  if (session.clientId !== ADMIN_ID) {
    const clients = loadClients();
    const client = clients.find(c => c.id === session.clientId);
    redirect(client?.dashboardUrl ?? "/rex-dashboard");
  }

  // Load all clients + Rex stats in parallel
  const [clients, rexStats] = await Promise.all([
    Promise.resolve(loadClients()),
    fetchRexStats(),
  ]);

  return <AdminClient clients={clients} rexStats={rexStats} adminId={ADMIN_ID} />;
}
