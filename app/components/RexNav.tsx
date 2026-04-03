"use client";

import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/rex-dashboard", label: "Dashboard" },
  { href: "/rex-analytics", label: "Analytics" },
  { href: "/rex-changelog", label: "Changelog" },
];

export default function RexNav() {
  const pathname = usePathname();

  return (
    <div style={{
      background: "#fff",
      borderBottom: "1px solid #e5e7eb",
      padding: "0 32px",
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 52,
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <a href="/rex-dashboard" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#111", letterSpacing: -0.5 }}>
              Plastic<span style={{ color: "#e13f00" }}>Online</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", marginLeft: 8, letterSpacing: 0 }}>Rex</span>
            </span>
          </a>

          {/* Nav links */}
          <nav style={{ display: "flex", gap: 2 }}>
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <a
                  key={href}
                  href={href}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    color: active ? "#e13f00" : "#6b7280",
                    background: active ? "#e13f0010" : "transparent",
                    textDecoration: "none",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Right side — live indicator + sign out */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9ca3af" }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: "#22c55e",
              boxShadow: "0 0 0 2px #22c55e30",
              display: "inline-block",
            }} />
            Live
          </div>
          <form method="POST" action="/api/auth/logout" style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                fontSize: 11, fontWeight: 600, color: "#9ca3af",
                background: "none", border: "none", cursor: "pointer",
                padding: "4px 8px", borderRadius: 6,
                transition: "color 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "#374151")}
              onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
