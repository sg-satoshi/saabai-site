import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../lib/auth";
import { loadClients } from "../../lib/clients";
import { listDirectoryUsers } from "../../lib/user-directory";
import { productsFromDashboardUrl, ALL_PRODUCTS } from "../../lib/user-products";
import { getAllLeadGenClients, generateSlug, saveLeadGenClient } from "../../lib/leadgen-clients";
import SaabaiAppShell from "../components/SaabaiAppShell";
import CustomizeForm from "./CustomizeForm";
import CopyButton from "./CopyButton";

export const dynamic = "force-dynamic";

export default async function LeadGenDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?redirect=/leadgen-dashboard");
  }

  const session = await verifySessionToken(token);
  if (!session) {
    redirect("/login?redirect=/leadgen-dashboard");
  }

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

  // Use clientId as email fallback for LeadGen matching
  const email = userEmail || (session as any).email || "demo@saabai.ai";

  let clients = await getAllLeadGenClients();
  let client = clients.find(c => c.email === email);

  if (!client) {
    client = {
      id: crypto.randomUUID(),
      email,
      businessName: "Demo Plumbing",
      slug: generateSlug("Demo Plumbing"),
      tier: "starter",
      createdAt: new Date().toISOString(),
      active: true,
    };
    await saveLeadGenClient(client);
  }

  const embedScript = `<script src="https://www.saabai.ai/api/leadgen/widget?slug=${client.slug}"></script>`;

  return (
    <SaabaiAppShell
      userName={userName}
      userEmail={userEmail}
      products={productInfos}
    >
      <div className="p-6 md:p-8 max-w-5xl">
        <h1 className="text-2xl font-bold text-white/90 mb-1">LeadGen Dashboard</h1>
        <p className="text-white/40 text-sm mb-8">Welcome back, {email}</p>

        {/* Embed Widget Section */}
        <div className="bg-[#0e1117] border border-white/[0.06] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white/80 font-semibold text-base">Embed Widget</h2>
              <p className="text-white/40 text-sm mt-1">Copy and paste this script into your website</p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-[#62C5D1]/10 text-[#62C5D1] border border-[#62C5D1]/30">
              {client.tier.toUpperCase()}
            </span>
          </div>

          <div className="bg-black/60 rounded-xl p-5 font-mono text-sm text-[#62C5D1] border border-white/10 mb-4">
            {embedScript}
          </div>

          <CopyButton text={embedScript} />

          <p className="text-xs text-white/40 mt-3">
            This script is unique to your account. Do not share it.
          </p>
        </div>

        {/* Customize Section */}
        <div className="bg-[#0e1117] border border-white/[0.06] rounded-2xl p-6 mb-6">
          <h2 className="text-white/80 font-semibold text-base mb-4">Customize</h2>
          <CustomizeForm initialBusinessName={client.businessName} />
        </div>

        {/* Account Info */}
        <div className="bg-[#0e1117] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-white/70 font-semibold text-sm mb-4">Account Details</h3>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-white/40">Business</div>
              <div className="text-white/80">{client.businessName}</div>
            </div>
            <div>
              <div className="text-white/40">Slug</div>
              <div className="font-mono text-[#62C5D1]">{client.slug}</div>
            </div>
          </div>
        </div>
      </div>
    </SaabaiAppShell>
  );
}
