import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "../../lib/auth";
import { loadClients } from "../../lib/clients";
import { listDirectoryUsers } from "../../lib/user-directory";
import { productsFromDashboardUrl, ALL_PRODUCTS } from "../../lib/user-products";
import SaabaiAppShell from "../components/SaabaiAppShell";
import type { ProductInfo } from "../../lib/user-products";
import DashboardContent from "./DashboardContent";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login?redirect=/dashboard");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/dashboard");

  const { clientId } = session;

  // Resolve user info and products
  let userName = "User";
  let userEmail = "";
  let userProducts: ReturnType<typeof productsFromDashboardUrl> = [];

  // Check env-var clients first
  const envClient = loadClients().find((c) => c.id === clientId);
  if (envClient) {
    userName = envClient.name;
    userEmail = envClient.email;
    userProducts = productsFromDashboardUrl(envClient.dashboardUrl);
  } else {
    // Check Redis user directory
    const allUsers = await listDirectoryUsers();
    const dirUser = allUsers.find((u) => u.id === clientId);
    if (dirUser) {
      userName = dirUser.name;
      userEmail = dirUser.email;
      userProducts = productsFromDashboardUrl(dirUser.dashboardUrl);
    }
  }

  const productInfos = userProducts.map((id) => ALL_PRODUCTS[id]);

  return (
    <SaabaiAppShell
      userName={userName}
      userEmail={userEmail}
      products={productInfos}
    >
      <DashboardContent userName={userName} products={productInfos} />
    </SaabaiAppShell>
  );
}
