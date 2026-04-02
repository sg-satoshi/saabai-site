import { cookies } from "next/headers";
import { fetchRexStats } from "../../lib/rex-stats";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RexDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ pw?: string }>;
}) {
  const params = await searchParams;
  const PASSWORD = process.env.REX_DASHBOARD_PASSWORD ?? "";

  // Check auth — cookie or query param (read-only; writes go through /api/rex-dashboard-auth)
  const cookieStore = await cookies();
  const cookieAuth = cookieStore.get("rex_dash_auth")?.value;
  const queryAuth = params.pw;

  const isAuthed =
    !PASSWORD ||
    cookieAuth === PASSWORD ||
    queryAuth === PASSWORD;

  if (!isAuthed) {
    return <LoginScreen />;
  }

  const stats = await fetchRexStats();
  return <DashboardClient stats={stats} />;
}

function LoginScreen() {
  return (
    <div style={{
      minHeight: "100vh", background: "#0d1117",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    }}>
      <div style={{
        background: "#161b22", border: "1px solid #30363d",
        borderRadius: 16, padding: "40px 48px", textAlign: "center", maxWidth: 360,
      }}>
        <p style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: -1 }}>
          Plastic<span style={{ color: "#e13f00" }}>Online</span>
        </p>
        <p style={{ margin: "0 0 32px", fontSize: 12, color: "#666", letterSpacing: 2, textTransform: "uppercase" }}>
          Rex Dashboard
        </p>
        <form method="POST" action="/api/rex-dashboard-auth">
          <input
            name="pw"
            type="password"
            placeholder="Password"
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box",
              background: "#0d1117", border: "1px solid #30363d",
              borderRadius: 10, padding: "12px 16px", fontSize: 14,
              color: "#fff", outline: "none", marginBottom: 12,
            }}
          />
          <button
            type="submit"
            style={{
              width: "100%", padding: "12px", borderRadius: 10,
              background: "#e13f00", color: "#fff", fontSize: 14,
              fontWeight: 700, border: "none", cursor: "pointer",
            }}
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
