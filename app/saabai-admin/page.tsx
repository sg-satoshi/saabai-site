import { requireAdmin } from "../../lib/require-admin";
import { loadClients } from "../../lib/clients";
import { listPendingRequests } from "../../lib/portal-users";
import AdminClient from "./AdminClient";
import { twoFactorStatus } from "../../lib/admin-2fa";
import { brisbaneTodayLabel, brisbaneGreeting } from "../../lib/brisbane-time";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Saabai Admin" };

export default async function SaabaiAdminPage() {
  const adminClientId = await requireAdmin("/saabai-admin");
  const now = new Date();

  const [clients, pendingRequests] = await Promise.all([
    // Strip passwords: this list is serialised into the page for the browser.
    Promise.resolve(loadClients().map(({ password: _password, ...c }) => c)),
    listPendingRequests(),
  ]);

  // Banner tracks enrolment in Redis, not the env break-glass flag.
  const twoFactorOn = await twoFactorStatus(adminClientId).then((s) => s.enabled).catch(() => true);

  return (
    <>
      {!twoFactorOn && (
        <div role="status" className="banner-2fa">
          Protect your admin sign in with 2FA.{" "}
          <a href="/saabai-admin/security">Set it up now</a>
        </div>
      )}
      <AdminClient clients={clients} adminId={process.env.SAABAI_ADMIN_ID ?? "saabai"} pendingRequests={pendingRequests} todayLabel={brisbaneTodayLabel(now)} greeting={brisbaneGreeting(now)} />
    </>
  );
}
