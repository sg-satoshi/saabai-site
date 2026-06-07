/**
 * LeadGen Client Portal — Server-side auth & data loader
 *
 * Auth-protected. LeadGen clients log in via /login and get redirected here.
 * Matches the logged-in user to their LeadGen Redis client record.
 * Renders inside the unified SaabaiAppShell.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "../../../lib/auth";
import { loadClients } from "../../../lib/clients";
import { getClient, listClients } from "../../../lib/leadgen-config";
import { listDirectoryUsers } from "../../../lib/user-directory";
import { productsFromDashboardUrl, ALL_PRODUCTS } from "../../../lib/user-products";
import { getNotificationUsage } from "../../../lib/leadgen-notify";
import SaabaiAppShell from "../../components/SaabaiAppShell";
import LeadGenPortalContent from "./portal-content";

export const dynamic = "force-dynamic";

const LEADGEN_PREFIX = "leadgen_";

export default async function LeadGenPortalPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login?redirect=/leadgen/portal");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/leadgen/portal");

  const { clientId } = session;

  // Resolve user info for the shell
  let userName = "User";
  let userEmail = "";
  let userProducts: ReturnType<typeof productsFromDashboardUrl> = [];

  const envClient = loadClients().find((c) => c.id === clientId);
  if (envClient) {
    userName = envClient.name;
    userEmail = envClient.email;
    userProducts = productsFromDashboardUrl(envClient.dashboardUrl);
  } else {
    const allUsers = await listDirectoryUsers();
    const dirUser = allUsers.find((u) => u.id === clientId);
    if (dirUser) {
      userName = dirUser.name;
      userEmail = dirUser.email;
      userProducts = productsFromDashboardUrl(dirUser.dashboardUrl);
    }
  }

  const productInfos = userProducts.map((id) => ALL_PRODUCTS[id]);

  // Resolve LeadGen client data from the logged-in user
  let leadGenClient = null;

  try {
    if (clientId.startsWith(LEADGEN_PREFIX)) {
      const rawId = clientId.slice(LEADGEN_PREFIX.length);
      leadGenClient = await getClient(rawId);
    } else {
      const dirUsers = await listDirectoryUsers();
      const dirUser = dirUsers.find((u) => u.id === clientId);
      if (dirUser) {
        const all = await listClients();
        leadGenClient = all.find((c) => c.email.toLowerCase() === dirUser.email.toLowerCase()) ?? null;
        if (!userName) userName = dirUser.name;
      }
    }
  } catch (e) {
    console.error("[LeadGen Portal] Failed to load client data:", e);
  }

  if (!leadGenClient) {
    return (
      <div className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="text-4xl mb-4">🔐</div>
          <h1 className="text-xl font-bold mb-2">No LeadGen Account Found</h1>
          <p className="text-gray-400 text-sm mb-6">
            This account doesn&apos;t have a LeadGen subscription. If you think this is a mistake, contact us at hello@saabai.ai.
          </p>
          <a
            href="/leadgen"
            className="inline-block px-6 py-3 rounded-xl bg-saabai-gold text-black font-bold text-sm tracking-wide hover:brightness-125 transition-all"
          >
            Learn About LeadGen
          </a>
        </div>
      </div>
    );
  }

  // Fetch notification usage data for the portal
  const notificationUsage = await getNotificationUsage(leadGenClient);

  return (
    <SaabaiAppShell
      userName={userName || leadGenClient.businessName || "User"}
      userEmail={userEmail}
      products={productInfos}
    >
      <LeadGenPortalContent client={leadGenClient} userName={userName || leadGenClient.businessName} notificationUsage={notificationUsage} />
    </SaabaiAppShell>
  );
}
