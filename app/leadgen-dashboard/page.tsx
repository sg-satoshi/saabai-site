import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../lib/auth";
import { loadClients } from "../../lib/clients";
import { listDirectoryUsers } from "../../lib/user-directory";
import { ALL_PRODUCTS, userProducts } from "../../lib/user-products";
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
  let userRecord: { products?: string[]; dashboardUrl?: string } | null = null;

  const envClient = loadClients().find((c) => c.id === clientId);
  if (envClient) {
    userName = envClient.name;
    userEmail = envClient.email;
    userRecord = { dashboardUrl: envClient.dashboardUrl };
  } else {
    const allUsers = await listDirectoryUsers();
    const dirUser = allUsers.find((u) => u.id === clientId);
    if (dirUser) {
      userName = dirUser.name;
      userEmail = dirUser.email;
      userRecord = dirUser;
    }
  }

  const productIds = userRecord ? userProducts(userRecord) : [];
  const productInfos = productIds.map((id) => ALL_PRODUCTS[id]);

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

  // ── Admin-matched card style ─────────────────────────────────────────────
  const C = {
    card:   "#ffffff",
    border: "rgba(0,0,0,0.08)",
    text:   "#111827",
    muted:  "#9ca3af",
    gold:   "#C9A84C",
    goldBg: "rgba(201,168,76,0.10)",
    goldBdr: "rgba(201,168,76,0.22)",
  };

  return (
    <SaabaiAppShell
      userName={userName}
      userEmail={userEmail}
      products={productInfos}
    >
      <div style={{ padding: "32px 36px", maxWidth: 900 }}>
        <h1 style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: -0.3 }}>
          LeadGen Dashboard
        </h1>
        <p style={{ margin: "0 0 32px", fontSize: 13, color: C.muted }}>
          Welcome back, {email}
        </p>

        {/* Embed Widget Section */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
          padding: "22px 24px", marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>Embed Widget</h2>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: C.muted }}>Copy and paste this script into your website</p>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
              color: C.gold, background: C.goldBg, border: `1px solid ${C.goldBdr}`,
              padding: "2px 8px", borderRadius: 20,
            }}>
              {client.tier.toUpperCase()}
            </span>
          </div>

          <div style={{
            background: "#f3f4f6", borderRadius: 10, padding: "14px 16px",
            fontFamily: "ui-monospace, monospace", fontSize: 13, color: C.text,
            border: `1px solid ${C.border}`, marginBottom: 14, wordBreak: "break-all",
          }}>
            {embedScript}
          </div>

          <CopyButton text={embedScript} />

          <p style={{ margin: "12px 0 0", fontSize: 11, color: C.muted }}>
            This script is unique to your account. Do not share it.
          </p>
        </div>

        {/* Customize Section */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
          padding: "22px 24px", marginBottom: 16,
        }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Customize
          </h2>
          <CustomizeForm initialBusinessName={client.businessName} />
        </div>

        {/* Account Info */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
          padding: "22px 24px",
        }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Account Details
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>Business</div>
              <div style={{ fontSize: 14, color: C.text }}>{client.businessName}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>Slug</div>
              <div style={{ fontSize: 14, fontFamily: "ui-monospace, monospace", color: C.gold }}>{client.slug}</div>
            </div>
          </div>
        </div>
      </div>
    </SaabaiAppShell>
  );
}
