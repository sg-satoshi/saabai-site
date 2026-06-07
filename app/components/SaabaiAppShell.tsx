"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ProductInfo } from "../../lib/user-products";

// ── Props ───────────────────────────────────────────────────────────────────

export interface SaabaiAppShellProps {
  userName: string;
  userEmail: string;
  products: ProductInfo[];
  children: React.ReactNode;
}

// ── Sidebar items ───────────────────────────────────────────────────────────

interface SidebarItem {
  label: string;
  href: string;
  icon?: string;
  divider?: boolean;
}

function buildSidebar(
  products: ProductInfo[],
  pathname: string
): SidebarItem[] {
  const items: SidebarItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: "◉" },
  ];

  // Add product links
  for (const p of products) {
    items.push({ label: p.label, href: p.href, icon: p.icon });
  }

  // Settings + divider
  items.push(
    { label: "Account", href: "/dashboard/settings", icon: "⚙", divider: true }
  );

  return items;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

// ── Component ───────────────────────────────────────────────────────────────

export default function SaabaiAppShell({
  userName,
  userEmail,
  products,
  children,
}: SaabaiAppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarItems = buildSidebar(products, pathname);

  return (
    <div className="min-h-screen bg-[#0a0c10] flex">
      {/* ── Mobile overlay ─────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 z-50 h-screen w-64
          bg-[#0e1117] border-r border-white/[0.06]
          flex flex-col
          transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <a href="/dashboard" className="flex items-center gap-2 no-underline">
            <span className="text-xl font-black text-white/90 tracking-tight">
              Saabai<span className="text-[#62C5D1]">.ai</span>
            </span>
          </a>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item, i) => {
            const active = isActive(pathname, item.href);
            return (
              <div key={item.href}>
                {item.divider && (
                  <div className="my-3 border-t border-white/[0.06]" />
                )}
                <a
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                    transition-all duration-150 no-underline
                    ${
                      active
                        ? "bg-[#62C5D1]/10 text-[#62C5D1] font-semibold"
                        : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                    }
                  `}
                >
                  {item.icon && (
                    <span className="w-5 text-center text-base">{item.icon}</span>
                  )}
                  <span>{item.label}</span>
                </a>
              </div>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 border-t border-white/[0.06] pt-3">
          <form method="POST" action="/api/auth/logout">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                text-white/40 hover:text-white/60 hover:bg-white/[0.04]
                transition-all duration-150 cursor-pointer"
            >
              <span className="w-5 text-center">↩</span>
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#0a0c10]/80 backdrop-blur-lg border-b border-white/[0.06]">
          <div className="flex items-center justify-between h-14 px-4 md:px-8">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-white/50 hover:text-white/80 p-2 -ml-2"
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2.5 5h15M2.5 10h15M2.5 15h15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Spacer on mobile when hamburger is gone */}
            <div className="md:hidden" />

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* User info */}
              <div className="text-right hidden sm:block">
                <div className="text-xs text-white/70 font-medium">{userName}</div>
                <div className="text-[10px] text-white/30">{userEmail}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#62C5D1]/20 flex items-center justify-center text-[#62C5D1] text-xs font-bold">
                {userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
