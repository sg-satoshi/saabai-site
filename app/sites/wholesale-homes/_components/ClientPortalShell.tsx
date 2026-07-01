"use client";

import { useState, useEffect, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Home,
  Calculator,
  BookOpen,
  User,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { AUTH_KEY } from "../_lib/portal";

const SIDEBAR_STORAGE_KEY = "wh_client_sidebar";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  sidebarBg:     "#0d1b2a",
  sidebarHover:  "#152238",
  sidebarActive: "#1a2e4a",
  accent:        "#0891b2",
  accentDim:     "rgba(8,145,178,0.12)",
  textLight:     "#e8edf5",
  textMuted:     "#6b8299",
  textDim:       "#4a6080",
  border:        "rgba(255,255,255,0.06)",
  contentBg:     "#f8f6f2",
  cardBg:        "#ffffff",
};

const NAV: { label: string; href: string; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard",   href: "/client/dashboard",   icon: LayoutDashboard },
  { label: "Packages",    href: "/client/dashboard",    icon: Home },
  { label: "Calculators", href: "/client/calculators",  icon: Calculator },
  { label: "Resources",   href: "/client/resources",    icon: BookOpen },
  { label: "Account",     href: "/client/account",      icon: User },
];

interface Props {
  children: ReactNode;
  userName?: string;
}

export function ClientPortalShell({ children, userName }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 1024);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Persist sidebar state
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved !== null) setSidebarOpen(saved === "true");
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) {
      router.replace("/client-login");
    } else {
      setAuthed(true);
    }
  }, [router]);

  function toggleSidebar() {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_KEY);
    router.push("/client-login");
  }

  if (!authed) return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const sidebarWidth = sidebarOpen ? 240 : 64;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.contentBg }}>

      {/* ── Mobile overlay ───────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 40,
            background: "rgba(0,0,0,0.4)",
          }}
        />
      )}

      {/* ── Sidebar ── desktop pinned, mobile slides in ── */}
      <aside
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0,
          width: sidebarOpen ? 240 : 64,
          background: C.sidebarBg,
          borderRight: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
          transition: "width 0.2s ease, transform 0.25s ease",
          overflow: "hidden",
          transform: isMobile
            ? mobileOpen ? "translateX(0)" : "translateX(-100%)"
            : "none",
        }}
      >
        {/* Logo area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "18px 16px",
            borderBottom: `1px solid ${C.border}`,
            minHeight: 60,
          }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: C.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0,
            }}
          >
            W
          </div>
          {sidebarOpen && (
            <span style={{ fontSize: 15, fontWeight: 700, color: C.textLight, whiteSpace: "nowrap" }}>
              Wholesale Homes
            </span>
          )}
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? C.accent : C.textMuted,
                  background: active ? C.accentDim : "transparent",
                  transition: "all 0.12s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = C.sidebarHover;
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
                {sidebarOpen && <span>{n.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: collapse toggle (desktop) + logout */}
        <div
          style={{
            padding: "10px 8px",
            borderTop: `1px solid ${C.border}`,
            display: "flex", flexDirection: "column", gap: 2,
          }}
        >
          {/* Collapse toggle — desktop only */}
          <button
            onClick={toggleSidebar}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: 10,
              border: "none", background: "transparent",
              color: C.textDim, fontSize: 13, cursor: "pointer",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.sidebarHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <ChevronLeft
              style={{
                width: 18, height: 18, flexShrink: 0,
                transform: sidebarOpen ? "rotate(0)" : "rotate(180deg)",
                transition: "transform 0.2s",
              }}
            />
            {sidebarOpen && <span>Collapse</span>}
          </button>
          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: 10,
              border: "none", background: "transparent",
              color: C.textDim, fontSize: 13, cursor: "pointer",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.sidebarHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut style={{ width: 18, height: 18, flexShrink: 0 }} />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : sidebarWidth,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          transition: "margin-left 0.2s ease",
        }}
      >
        {/* Top bar */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 60,
            padding: "0 24px",
            background: C.cardBg,
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              border: "none", background: "transparent",
              fontSize: 13, fontWeight: 600, color: "#1A2B3C",
              cursor: "pointer",
            }}
          >
            <Menu style={{ width: 20, height: 20 }} />
            <span>Menu</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "#5C6670" }}>
              {userName || "Client"}
            </span>
            <div
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: C.accentDim, color: C.accent,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700,
              }}
            >
              {(userName || "C")[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: "24px 24px 32px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
