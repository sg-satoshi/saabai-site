"use client";

import React, { useState, useEffect } from "react";

const C = {
  bg:      "#f5f5f7",
  sidebar: "#06081a",
  border:  "rgba(255,255,255,0.07)",
  gold:    "#C9A84C",
  goldBg:  "rgba(201,168,76,0.10)",
  goldBdr: "rgba(201,168,76,0.22)",
  text:    "#e2e4f0",
  muted:   "#505570",
  dim:     "#2a2d47",
};

const EXPANDED_W = 228;
const COLLAPSED_W = 56;

const NAV: {
  section: string;
  items: { label: string; href: string; icon: React.ReactNode; external?: boolean }[];
}[] = [
  {
    section: "Saabai",
    items: [
      {
        label: "Dashboard",
        href: "/saabai-admin",
        icon: (
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="8" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="1" y="8" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="8" y="8" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        ),
      },
      {
        label: "Site Factory",
        href: "/saabai-admin/site-factory",
        icon: (
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <path d="M7 1.5L1.5 5l5.5 3.5 5.5-3.5-5.5-3.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M1.5 9l5.5 3.5 5.5-3.5M1.5 7l5.5 3.5 5.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          </svg>
        ),
      },
      {
        label: "Subscribers",
        href: "/saabai-admin/subscribers",
        icon: (
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 4L7 8l5.5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        ),
      },
      {
        label: "Customers",
        href: "/saabai-admin/customers",
        icon: (
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <circle cx="5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M1.5 11.5c0-1.933 1.567-3.5 3.5-3.5s3.5 1.567 3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="10.5" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M12.5 11c0-1.38-.895-2.5-2-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        label: "AI Audits",
        href: "/saabai-admin/audits",
        icon: (
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M4.5 6h3M6 4.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        label: "Users",
        href: "/saabai-admin/users",
        icon: (
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M1.5 12c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        ),
      },
    ],
  },
  {
    section: "Marketing",
    items: [
      {
        label: "LinkedIn",
        href: "/saabai-admin/social/linkedin",
        icon: (
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M4 5.5V10M4 3.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M7 10V7.5c0-.83.67-1.5 1.5-1.5S10 6.67 10 7.5V10M7 5.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        label: "Instagram",
        href: "/saabai-admin/social/instagram",
        icon: (
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="10.5" cy="3.5" r="0.75" fill="currentColor"/>
          </svg>
        ),
      },
    ],
  },
  {
    section: "Lex",
    items: [
      {
        label: "Clients",
        href: "/saabai-admin/lex-clients",
        icon: (
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M4.5 7h5M4.5 9.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M4.5 3V2.5a1 1 0 011-1h3a1 1 0 011 1V3" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
        ),
      },
      {
        label: "Orders",
        href: "/saabai-admin/orders",
        icon: (
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="2" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M4.5 5.5h5M4.5 8h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        label: "LLM Config",
        href: "/saabai-admin/lex-settings",
        icon: (
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        label: "Client Portal",
        href: "/client-portal",
        external: true,
        icon: (
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <path d="M7 1.5H3a1.5 1.5 0 00-1.5 1.5v8A1.5 1.5 0 003 12.5h8a1.5 1.5 0 001.5-1.5V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M9 1.5h3.5V5M12.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
      },
    ],
  },
  {
    section: "Rex",
    items: [
      {
        label: "Analytics",
        href: "/rex-analytics",
        icon: (
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 10.5l3-3.5 3 2 3.5-5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1.5 12.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        label: "Changelog",
        href: "/rex-changelog",
        icon: (
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <path d="M2 3.5h10M2 7h7M2 10.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        ),
      },
    ],
  },
];

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      {collapsed
        ? <path d="M5 2.5l4.5 4.5L5 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        : <path d="M9 2.5L4.5 7 9 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      }
    </svg>
  );
}

function Sidebar({ activePath, collapsed, onToggle }: {
  activePath: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const w = collapsed ? COLLAPSED_W : EXPANDED_W;

  return (
    <div style={{
      width: w,
      minHeight: "100vh",
      background: C.sidebar,
      borderRight: `1px solid ${C.border}`,
      position: "fixed",
      left: 0, top: 0, bottom: 0,
      display: "flex",
      flexDirection: "column",
      zIndex: 100,
      overflowY: "auto",
      overflowX: "hidden",
      transition: "width 0.22s cubic-bezier(.4,0,.2,1)",
    }}>

      {/* Logo */}
      <div style={{
        height: 60,
        padding: collapsed ? "0 12px" : "0 20px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        flexShrink: 0,
      }}>
        {collapsed ? (
          <a href="/saabai-admin" title="Saabai Admin" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: C.goldBg, border: `1px solid ${C.goldBdr}`, textDecoration: "none" }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: C.gold, letterSpacing: "-0.02em" }}>S</span>
          </a>
        ) : (
          <>
            <a href="/saabai-admin" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/saabai-logo-full.png" alt="Saabai" style={{ height: 26, width: "auto", opacity: 0.92 }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.gold, background: C.goldBg, border: `1px solid ${C.goldBdr}`, padding: "2px 7px", borderRadius: 4 }}>
                Admin
              </span>
            </a>
          </>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: collapsed ? "10px 8px" : "12px 10px", overflowY: "auto" }}>
        {NAV.map((section, si) => (
          <div key={section.section} style={{ marginBottom: collapsed ? 4 : 20 }}>
            {!collapsed ? (
              <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 6px 5px" }}>
                {section.section}
              </p>
            ) : si > 0 ? (
              <div style={{ height: 1, background: C.border, margin: "6px 4px 8px" }} />
            ) : null}

            {section.items.map(item => {
              const active = activePath === item.href || (item.href !== "/saabai-admin" && activePath.startsWith(item.href));
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: collapsed ? "9px 0" : "7px 10px",
                    marginBottom: 1,
                    borderRadius: 8,
                    textDecoration: "none",
                    background: active ? C.goldBg : "transparent",
                    border: `1px solid ${active ? C.goldBdr : "transparent"}`,
                    color: active ? C.gold : "#8a90b0",
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    transition: "all 0.12s ease",
                    justifyContent: collapsed ? "center" : "flex-start",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.color = C.text;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#8a90b0";
                    }
                  }}
                >
                  <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0, display: "flex", alignItems: "center" }}>{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
                      {item.external && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ opacity: 0.35, flexShrink: 0 }}>
                          <path d="M1 8L8 1M5 1h3v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </>
                  )}
                </a>
              );
            })}
          </div>
        ))}
      </div>

      {/* Collapse toggle */}
      <div style={{ padding: collapsed ? "10px 8px" : "10px 10px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            width: "100%",
            padding: collapsed ? "8px 0" : "7px 10px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: "transparent",
            color: C.muted,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 9,
            fontSize: 12,
            transition: "all 0.12s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = C.text; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = C.muted; }}
        >
          <CollapseIcon collapsed={collapsed} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* Profile footer */}
      <div style={{
        padding: collapsed ? "12px 8px" : "12px 14px",
        borderTop: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        gap: collapsed ? 0 : 10,
        justifyContent: collapsed ? "center" : "flex-start",
        flexShrink: 0,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.gold}, #9a6f1e)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 800, color: "#07091a", flexShrink: 0,
        }}>
          S
        </div>
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Saabai Admin</p>
              <p style={{ margin: 0, fontSize: 10, color: C.muted }}>hello@saabai.ai</p>
            </div>
            <form method="POST" action="/api/auth/logout" style={{ margin: 0 }}>
              <button type="submit" title="Sign out" style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 16, padding: "4px", lineHeight: 1, borderRadius: 4 }}>↩</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminShell({
  children,
  activePath,
}: {
  children: React.ReactNode;
  activePath: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem("admin:sidebar:collapsed") === "1") setCollapsed(true);
    } catch { /* ignore */ }
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("admin:sidebar:collapsed", next ? "1" : "0"); } catch { /* ignore */ }
  }

  const sidebarW = collapsed ? COLLAPSED_W : EXPANDED_W;

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      display: "flex",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <Sidebar activePath={activePath} collapsed={collapsed} onToggle={toggle} />
      <div style={{
        marginLeft: mounted ? sidebarW : EXPANDED_W,
        flex: 1,
        minWidth: 0,
        transition: mounted ? "margin-left 0.22s cubic-bezier(.4,0,.2,1)" : "none",
      }}>
        {children}
      </div>
    </div>
  );
}
