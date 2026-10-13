import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../lib/auth";
import { loadClients } from "../../lib/clients";
import { listPendingRequests } from "../../lib/portal-users";
import AdminClient from "./AdminClient";
import { isTwoFactorEnabled } from "../../lib/admin-2fa";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Saabai Admin" };

export default async function SaabaiAdminPage() {
  // Verify session exists and belongs to the Saabai admin account
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) redirect("/saabai-admin/login?redirect=/saabai-admin");

  const session = await verifySessionToken(token);
  if (!session) redirect("/saabai-admin/login?redirect=/saabai-admin");

  // Non-admin clients should not see this page — redirect them to their dashboard
  const isAdmin = await isAdminSession(session.clientId);
  if (!isAdmin) {
    const clients = loadClients();
    const client = clients.find(c => c.id === session.clientId);
    redirect(client?.dashboardUrl ?? "/dashboard");
  }

  const [clients, pendingRequests] = await Promise.all([
    // Strip passwords: this list is serialised into the page for the browser.
    Promise.resolve(loadClients().map(({ password: _password, ...c }) => c)),
    listPendingRequests(),
  ]);

  const twoFactorOn = await isTwoFactorEnabled(session.clientId).catch(() => true);

  return (
    <>
      {!twoFactorOn && (
        <div role="status" className="banner-2fa">
          Protect your admin sign in with 2FA.{" "}
          <a href="/saabai-admin/security">Set it up now</a>
        </div>
      )}
      <AdminClient clients={clients} adminId={process.env.SAABAI_ADMIN_ID ?? "saabai"} pendingRequests={pendingRequests} />
    </>
  );
}
