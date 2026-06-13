"use client";

import { useState, useEffect } from "react";

// ── Theme (matching saabai-admin) ─────────────────────────────────────────────

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

const EXPANDED_W  = 228;
const COLLAPSED_W = 56;

// ── Icon components (matching admin) ──────────────────────────────────────────

function DashboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="8" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="1" y="8" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="8" y="8" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

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

function ExternalIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ opacity: 0.35, flexShrink: 0 }}>
      <path d="M1 8L8 1M5 1h3v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Product icon mapping ──────────────────────────────────────────────────────

function productIcon(icon: string) {
  const svgStyle = { width: 15, height: 15, display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const };
  return (
    <span style={svgStyle}>{icon}</span>
  );
}

// ── Interface ─────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  external?: boolean;
}

interface NavSection {
  section: string;
  items: NavItem[];
}

import type { ProductInfo } from "../../lib/user-products";

export interface SaabaiAppShellProps {
  userName: string;
  userEmail: string;
  products: ProductInfo[];
  children: React.ReactNode;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({
  collapsed,
  onToggle,
  navSections,
  activePath,
  userName,
  userEmail,
}: {
  collapsed: boolean;
  onToggle: () => void;
  navSections: NavSection[];
  activePath: string;
  userName: string;
  userEmail: string;
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
          <a href="/dashboard" title="Saabai" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: C.goldBg, border: `1px solid ${C.goldBdr}`, textDecoration: "none" }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: C.gold, letterSpacing: "-0.02em" }}>S</span>
          </a>
        ) : (
          <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/saabai-logo-full.png" alt="Saabai" style={{ height: 26, width: "auto", opacity: 0.92 }} />
          </a>
        )}
      </div>

      {/* Nav sections */}
      <div style={{ flex: 1, padding: collapsed ? "10px 8px" : "12px 10px", overflowY: "auto" }}>
        {navSections.map((section, si) => (
          <div key={section.section} style={{ marginBottom: collapsed ? 4 : 20 }}>
            {!collapsed ? (
              <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 6px 5px" }}>
                {section.section}
              </p>
            ) : si > 0 ? (
              <div style={{ height: 1, background: C.border, margin: "6px 4px 8px" }} />
            ) : null}

            {section.items.map(item => {
              const active = activePath === item.href || (item.href !== "/dashboard" && activePath.startsWith(item.href));
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
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                      (e.currentTarget as HTMLElement).style.color = C.text;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "#8a90b0";
                    }
                  }}
                >
                  <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0, display: "flex", alignItems: "center" }}>{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
                      {item.external && <ExternalIcon />}
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
        padding: collapsed ? "10px 8px" : "12px 14px",
        borderTop: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: collapsed ? "column" : "row",
        alignItems: "center",
        gap: collapsed ? 6 : 10,
        justifyContent: collapsed ? "center" : "flex-start",
        flexShrink: 0,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.gold}, #9a6f1e)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 800, color: "#07091a", flexShrink: 0,
        }}>
          {(userName || "U").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U"}
        </div>
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName || "Client"}</p>
              <p style={{ margin: 0, fontSize: 10, color: C.muted }}>Client</p>
            </div>
          </>
        )}
        <form method="POST" action="/api/auth/logout" style={{ margin: 0 }}>
          <button
            type="submit"
            title="Sign out"
            style={{
              background: "none", border: collapsed ? `1px solid ${C.border}` : "none",
              cursor: "pointer", color: C.muted,
              fontSize: collapsed ? 11 : 10,
              padding: collapsed ? "6px 4px" : "2px 4px",
              lineHeight: 1, borderRadius: 6,
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            {collapsed ? "Logout" : "Sign out"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildNavSections(products: ProductInfo[], activePath: string): NavSection[] {
  const section: NavSection = {
    section: "Saabai",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: <DashboardIcon />,
      },
    ],
  };

  for (const p of products) {
    section.items.push({
      label: p.label,
      href: p.href,
      icon: productIcon(p.icon),
      external: p.href.startsWith("http"),
    });
  }

  const sections: NavSection[] = [section];

  sections.push({
    section: "Account",
    items: [
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: <SettingsIcon />,
      },
    ],
  });

  return sections;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SaabaiAppShell({
  userName,
  userEmail,
  products,
  children,
}: SaabaiAppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activePath, setActivePath] = useState("/dashboard");

  useEffect(() => {
    setMounted(true);
    setActivePath(window.location.pathname);
    try {
      if (localStorage.getItem("client:sidebar:collapsed") === "1") setCollapsed(true);
    } catch { /* ignore */ }
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("client:sidebar:collapsed", next ? "1" : "0"); } catch { /* ignore */ }
  }

  const navSections = buildNavSections(products, activePath);
  const sidebarW = collapsed ? COLLAPSED_W : EXPANDED_W;

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      display: "flex",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={toggle}
        navSections={navSections}
        activePath={activePath}
        userName={userName}
        userEmail={userEmail}
      />
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
