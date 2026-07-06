"use client";

import { useEffect, useState, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Mail, Package, FileText, LogOut, Menu, X, ChevronLeft } from "lucide-react";

const ADMIN_KEY = "wholesale_admin_auth";

const C = {
  bg: "#0d1b2a", hover: "#152238", active: "#1a2e4a",
  accent: "#0891b2", accentBg: "rgba(8,145,178,0.12)",
  text: "#e8edf5", muted: "#6b8299", dim: "#4a6080",
  border: "rgba(255,255,255,0.06)", contentBg: "#f5f5f7",
};

const NAV = [
  { label: "Dashboard",  href: "/admin",           icon: LayoutDashboard },
  { label: "Leads",      href: "/admin/leads",      icon: Mail },
  { label: "Users",      href: "/admin/users",      icon: Users },
  { label: "Packages",   href: "/admin/packages",   icon: Package },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) router.replace("/admin/login");
    else setAuthed(true);
  }, [router]);

  if (!authed) return null;

  function logout() {
    localStorage.removeItem(ADMIN_KEY);
    router.push("/admin/login");
  }

  const isActive = (href: string) => pathname === href;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.contentBg }}>
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.4)" }} />
      )}

      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: open ? 220 : 60,
        background: C.bg, borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", zIndex: 50,
        transition: "width 0.2s", overflow: "hidden",
        transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 14px", borderBottom: `1px solid ${C.border}`, minHeight: 56 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
            W
          </div>
          {open && <span style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: "nowrap" }}>Admin</span>}
        </div>

        <nav style={{ flex: 1, padding: "8px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = isActive(n.href);
            return (
              <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8,
                  textDecoration: "none", fontSize: 12, fontWeight: active ? 600 : 400,
                  color: active ? C.accent : C.muted, background: active ? C.accentBg : "transparent",
                  transition: "all 0.12s", whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.hover; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <Icon size={16} />
                {open && <span>{n.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "6px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 2 }}>
          {open && (
            <button onClick={() => setOpen(false)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, border: "none", background: "transparent", color: C.dim, fontSize: 12, cursor: "pointer" }}>
              <ChevronLeft size={16} /> <span>Collapse</span>
            </button>
          )}
          <button onClick={logout}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, border: "none", background: "transparent", color: C.dim, fontSize: 12, cursor: "pointer" }}>
            <LogOut size={16} /> {open && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, marginLeft: open ? 220 : 60, transition: "margin-left 0.2s", display: "flex", flexDirection: "column" }}>
        <header style={{ display: "flex", alignItems: "center", height: 56, padding: "0 20px", background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <button onClick={() => setMobileOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent", fontSize: 12, fontWeight: 600, color: "#1A2B3C", cursor: "pointer" }}>
            <Menu size={18} /> <span>Menu</span>
          </button>
        </header>
        <main style={{ flex: 1, padding: "24px" }}>{children}</main>
      </div>
    </div>
  );
}
