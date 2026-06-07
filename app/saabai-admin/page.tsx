import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../lib/auth";
import { loadClients } from "../../lib/clients";
import { fetchRexStats } from "../../lib/rex-stats";
import { listPendingRequests } from "../../lib/portal-users";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Saabai Admin" };

export default async function SaabaiAdminPage() {
  // Verify session exists and belongs to the Saabai admin account
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) redirect("/login?redirect=/saabai-admin");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/saabai-admin");

  // Non-admin clients should not see this page — redirect them to their dashboard
  const isAdmin = await isAdminSession(session.clientId);
  if (!isAdmin) {
    const clients = loadClients();
    const client = clients.find(c => c.id === session.clientId);
    redirect(client?.dashboardUrl ?? "/rex-dashboard");
  }

  const [clients, rexStats, pendingRequests] = await Promise.all([
    Promise.resolve(loadClients()),
    fetchRexStats(),
    listPendingRequests(),
  ]);

  return <AdminClient clients={clients} rexStats={rexStats} adminId={process.env.SAABAI_ADMIN_ID ?? "saabai"} pendingRequests={pendingRequests} />;
}
