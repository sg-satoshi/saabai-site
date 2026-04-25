"use client";

// Shared sidebar for all /saabai-admin pages.
// Usage: wrap page content in <AdminShell activePath="/saabai-admin/social/linkedin">...</AdminShell>

const C = {
  bg:      "#07091a",
  sidebar: "#080b1e",
  border:  "rgba(255,255,255,0.07)",
  teal:    "#25D366",
  orange:  "#ff6635",
  blue:    "#4d8ef6",
  muted:   "#525873",
};

const NAV_WORKSPACE = [
  { label: "Dashboard", href: "/saabai-admin" },
  { label: "Agents",    href: "/mission-control" },
  { label: "Growth",    href: "/rex-analytics" },
  { label: "Changelog", href: "/rex-changelog" },
];

const NAV_BUILD = [
  { label: "Social",      href: "/saabai-admin/social/linkedin" },
  { label: "Subscribers", href: "/saabai-admin/subscribers" },
  { label: "Actions",     href: "#actions" },
];

function Sidebar({ activePath }: { activePath: string }) {
  return (
    <div style={{
      width: 220,
      minHeight: "100vh",
      background: C.sidebar,
      borderRight: `1px solid ${C.border}`,
      position: "fixed",
      left: 0, top: 0, bottom: 0,
      display: "flex",
      flexDirection: "column",
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${C.border}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <a href="/saabai-admin" style={{ display: "inline-block" }}>
          <img src="/brand/saabai-logo.png" alt="Saabai" style={{ width: 110, height: "auto", opacity: 0.9 }} />
        </a>
      </div>

      {/* Venture dots — visual only on sub-pages */}
      <div style={{ padding: "16px 14px 10px" }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: "uppercase" as const, margin: "0 6px 8px" }}>Ventures</p>
        {(["All", "Rex", "Lex"] as const).map(v => {
          const dot = v === "Rex" ? C.orange : v === "Lex" ? C.blue : C.teal;
          return (
            <div key={v} style={{ display: "flex", alignItems: "center", padding: "7px 10px", marginBottom: 2, fontSize: 13, fontWeight: 500, color: "#ffffff" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, marginRight: 9, flexShrink: 0 }} />
              {v}
            </div>
          );
        })}
      </div>

      {/* Workspace nav */}
      <div style={{ padding: "12px 14px 8px" }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: "uppercase" as const, margin: "0 6px 8px" }}>Workspace</p>
        {NAV_WORKSPACE.map(item => {
          const active = activePath === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: "flex", alignItems: "center",
                padding: "7px 10px", marginBottom: 2,
                background: active ? "#0891b2" : "transparent",
                border: active ? "1px solid #0891b2" : "1px solid transparent",
                borderRadius: 8, textDecoration: "none",
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: "#ffffff",
              }}
            >
              {item.label}
            </a>
          );
        })}
      </div>

      {/* Build nav */}
      <div style={{ padding: "10px 14px 8px" }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: "uppercase" as const, margin: "0 6px 8px" }}>Build</p>
        {NAV_BUILD.map(item => {
          const active = activePath === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: "flex", alignItems: "center",
                padding: "7px 10px", marginBottom: 2,
                background: active ? "#0891b2" : "transparent",
                border: active ? "1px solid #0891b2" : "1px solid transparent",
                borderRadius: 8, textDecoration: "none",
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: "#ffffff",
              }}
            >
              {item.label}
            </a>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* New venture CTA */}
      <div style={{ padding: "0 14px 14px" }}>
        <button style={{
          width: "100%", padding: "9px 14px",
          background: "rgba(37,211,102,0.1)",
          border: "1px solid rgba(37,211,102,0.22)",
          borderRadius: 8, cursor: "pointer",
          color: C.teal, fontSize: 11, fontWeight: 700,
          letterSpacing: 0.3, textAlign: "center" as const,
        }}>
          + New venture
        </button>
      </div>

      {/* Profile + sign out */}
      <div style={{ padding: "14px 18px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "linear-gradient(135deg, #25D366, #1aab52)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0,
        }}>
          S
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#eef0ff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>Shane Pearl</p>
          <p style={{ margin: 0, fontSize: 11, color: "#9aa0b8" }}>Admin</p>
        </div>
        <form method="POST" action="/api/auth/logout" style={{ margin: 0 }}>
          <button
            type="submit"
            title="Sign out"
            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 14, padding: "2px 4px", lineHeight: 1 }}
          >
            ↩
          </button>
        </form>
      </div>
    </div>
  );
}

// Shell — wraps page content with the sidebar
export default function AdminShell({ children, activePath }: { children: React.ReactNode; activePath: string }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <Sidebar activePath={activePath} />
      <div style={{ marginLeft: 220, flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
