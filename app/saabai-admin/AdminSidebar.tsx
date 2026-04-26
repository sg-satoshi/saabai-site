"use client";

// Shared sidebar for all /saabai-admin pages.
// Usage: <AdminShell activePath="/saabai-admin/lex-clients">...</AdminShell>

const C = {
  bg:      "#07091a",
  sidebar: "#06081a",
  border:  "rgba(255,255,255,0.07)",
  gold:    "#C9A84C",
  goldBg:  "rgba(201,168,76,0.10)",
  goldBdr: "rgba(201,168,76,0.22)",
  text:    "#e2e4f0",
  muted:   "#505570",
  dim:     "#2a2d47",
};

const NAV: {
  section: string;
  items: { label: string; href: string; icon: React.ReactNode; external?: boolean }[];
}[] = [
  {
    section: "Lex Platform",
    items: [
      {
        label: "Dashboard",
        href: "/saabai-admin",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="8" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="1" y="8" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="8" y="8" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        ),
      },
      {
        label: "Clients",
        href: "/saabai-admin/lex-clients",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M1.5 11.5c0-1.933 1.567-3.5 3.5-3.5s3.5 1.567 3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="10.5" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M12.5 11c0-1.38-.895-2.5-2-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        label: "Client Portal",
        href: "/client-portal",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1.5H3a1.5 1.5 0 00-1.5 1.5v8A1.5 1.5 0 003 12.5h8a1.5 1.5 0 001.5-1.5V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M9 1.5h3.5V5M12.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
        external: true,
      },
    ],
  },
  {
    section: "Operations",
    items: [
      {
        label: "LinkedIn",
        href: "/saabai-admin/social/linkedin",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M4 5.5V10M4 3.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M7 10V7.5c0-.83.67-1.5 1.5-1.5S10 6.67 10 7.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M7 5.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        label: "Instagram",
        href: "/saabai-admin/social/instagram",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="10.5" cy="3.5" r="0.75" fill="currentColor"/>
          </svg>
        ),
      },
      {
        label: "Subscribers",
        href: "/saabai-admin/subscribers",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 4L7 8l5.5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        ),
      },
    ],
  },
  {
    section: "System",
    items: [
      {
        label: "LLM Config",
        href: "/saabai-admin/lex-settings",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        label: "Rex Analytics",
        href: "/rex-analytics",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 10.5l3-3.5 3 2 3.5-5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1.5 12.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        label: "Changelog",
        href: "/rex-changelog",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 3.5h10M2 7h7M2 10.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        ),
      },
    ],
  },
];

import React from "react";

function Sidebar({ activePath }: { activePath: string }) {
  return (
    <div
      style={{
        width: 228,
        minHeight: "100vh",
        background: C.sidebar,
        borderRight: `1px solid ${C.border}`,
        position: "fixed",
        left: 0, top: 0, bottom: 0,
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
        overflowY: "auto",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${C.border}` }}>
        <a href="/saabai-admin" style={{ display: "inline-block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/saabai-logo-full.png"
            alt="Saabai"
            style={{ height: 28, width: "auto", opacity: 0.92 }}
          />
        </a>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: C.gold,
            background: C.goldBg, border: `1px solid ${C.goldBdr}`,
            padding: "2px 7px", borderRadius: 4,
          }}>
            Admin
          </span>
        </div>
      </div>

      {/* Nav sections */}
      <div style={{ flex: 1, padding: "14px 12px" }}>
        {NAV.map(section => (
          <div key={section.section} style={{ marginBottom: 22 }}>
            <p style={{
              fontSize: 9, fontWeight: 700, color: C.muted,
              letterSpacing: "0.12em", textTransform: "uppercase",
              margin: "0 8px 6px",
            }}>
              {section.section}
            </p>
            {section.items.map(item => {
              const active = activePath === item.href || (item.href !== "/saabai-admin" && activePath.startsWith(item.href));
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "8px 10px", marginBottom: 2, borderRadius: 8,
                    textDecoration: "none",
                    background: active ? C.goldBg : "transparent",
                    border: `1px solid ${active ? C.goldBdr : "transparent"}`,
                    color: active ? C.gold : "#9aa0c0",
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    transition: "all 0.15s ease",
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
                      e.currentTarget.style.color = "#9aa0c0";
                    }
                  }}
                >
                  <span style={{ opacity: active ? 1 : 0.65, flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                  {item.external && (
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ marginLeft: "auto", opacity: 0.4 }}>
                      <path d="M1 8L8 1M5 1h3v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </a>
              );
            })}
          </div>
        ))}
      </div>

      {/* Profile footer */}
      <div style={{
        padding: "14px 16px",
        borderTop: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.gold}, #9a6f1e)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, color: "#07091a", flexShrink: 0,
        }}>
          S
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Shane Goldberg
          </p>
          <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Saabai Admin</p>
        </div>
        <form method="POST" action="/api/auth/logout" style={{ margin: 0 }}>
          <button
            type="submit"
            title="Sign out"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: C.muted, fontSize: 14, padding: "4px",
              lineHeight: 1, borderRadius: 4,
            }}
          >
            ↩
          </button>
        </form>
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
  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      display: "flex",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <Sidebar activePath={activePath} />
      <div style={{ marginLeft: 228, flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
