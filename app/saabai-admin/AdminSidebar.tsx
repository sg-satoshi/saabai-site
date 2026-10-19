"use client";
import { FeedbackHost } from "./ui/Feedback";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string; icon: string; external?: boolean; count?: number; urgent?: boolean };
type NavGroup = { section: string; items: NavItem[]; collapsible?: boolean };

const ICONS: Record<string, React.ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  bag: <><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></>,
  doc: <><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h4"/></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>,
  box: <><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></>,
  users: <><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 010 8M22 21c0-3-2-5-4-5.5"/></>,
  flow: <><circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7 7l4 9M17 7l-4 9"/></>,
  inbox: <><path d="M3 13l3-9h12l3 9v7H3z"/><path d="M3 13h5l1 3h6l1-3h5"/></>,
  portal: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></>,
  layers: <><path d="M12 3L2 8l10 5 10-5z"/><path d="M2 13l10 5 10-5M2 18l10 5 10-5"/></>,
  bot: <><rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M9 13h.01M15 13h.01"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></>,
  home: <><path d="M3 11l9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/></>,
  in: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 014 0v4M12 10v7"/></>,
  ig: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></>,
  scale: <><path d="M12 3v18M5 21h14M5 7h14M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z"/></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></>,
  gear: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></>,
  menu: <><path d="M3 6h18M3 12h18M3 18h18"/></>,
  bell: <><path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></>,
};

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6">
      {ICONS[name]}
    </svg>
  );
}

const NAV: NavGroup[] = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard", href: "/saabai-admin", icon: "grid" },
      { label: "Analytics", href: "/saabai-admin/analytics", icon: "chart" },
      { label: "Split testing", href: "/saabai-admin/experiments", icon: "flow" },
      { label: "Roadmap", href: "/saabai-admin/roadmap", icon: "list" },
    ],
  },
  {
    section: "Sales",
    items: [
      { label: "Orders", href: "/saabai-admin/orders", icon: "bag" },
      { label: "Blueprints", href: "/saabai-admin/audits", icon: "doc" },
      { label: "Payments", href: "/saabai-admin/payments", icon: "card" },
      { label: "Plans & Add-ons", href: "/saabai-admin/plans", icon: "layers" },
      { label: "Products", href: "/saabai-admin/products", icon: "box" },
    ],
  },
  {
    section: "Clients",
    items: [
      { label: "Customers", href: "/saabai-admin/customers", icon: "users" },
      { label: "CRM", href: "/saabai-admin/crm", icon: "flow" },
      { label: "Journeys", href: "/saabai-admin/journey", icon: "chart" },
      { label: "Client Requests", href: "/saabai-admin/requests", icon: "inbox" },
      { label: "Change log", href: "/saabai-admin/change-log", icon: "list" },
      { label: "Client Portal", href: "/client-portal", icon: "portal", external: true },
    ],
  },
  {
    section: "Build",
    items: [
      { label: "Site Factory", href: "/saabai-admin/site-factory", icon: "layers" },
      { label: "Chatbots", href: "/saabai-admin/chatbots", icon: "bot" },
      { label: "AI Agents", href: "/ai-agent/portal", icon: "bot", external: true },
    ],
  },
  {
    section: "Marketing",
    items: [
      { label: "Drafts", href: "/saabai-admin/marketing", icon: "mail" },
      { label: "Announcements", href: "/saabai-admin/announcements", icon: "bell" },
      { label: "Website scanner", href: "/saabai-admin/website-scan", icon: "search" },
      { label: "Pulse", href: "/saabai-admin/marketing/pulse", icon: "bell" },
      { label: "Offers & Coupons", href: "/saabai-admin/marketing/offers", icon: "bag" },
    ],
  },
  {
    section: "Growth",
    collapsible: true,
    items: [
      { label: "Funnel", href: "/saabai-admin/growth/funnel", icon: "chart" },
      { label: "Upsells", href: "/saabai-admin/growth/upsells", icon: "flow" },
      { label: "Client health", href: "/saabai-admin/growth/health", icon: "bell" },
      { label: "Testimonials", href: "/saabai-admin/growth/testimonials", icon: "doc" },
      { label: "Referrals", href: "/saabai-admin/growth/referrals", icon: "users" },
      { label: "Attribution", href: "/saabai-admin/growth/attribution", icon: "layers" },
      { label: "Subscribers", href: "/saabai-admin/subscribers", icon: "mail" },
      { label: "Wholesale Leads", href: "/saabai-admin/wholesale-leads", icon: "home" },
      { label: "LinkedIn", href: "/saabai-admin/social/linkedin", icon: "in" },
      { label: "Instagram", href: "/saabai-admin/social/instagram", icon: "ig" },
    ],
  },
  {
    section: "Lex",
    collapsible: true,
    items: [
      { label: "Lex Clients", href: "/saabai-admin/lex-clients", icon: "scale" },
      { label: "Lex Orders", href: "/saabai-admin/orders?kind=lex", icon: "list" },
      { label: "LLM Config", href: "/saabai-admin/lex-settings", icon: "cpu" },
    ],
  },
  {
    section: "Settings",
    collapsible: true,
    items: [
      { label: "Users", href: "/saabai-admin/users", icon: "users" },
      { label: "Security", href: "/saabai-admin/security", icon: "gear" },
      { label: "Changelog", href: "/saabai-changelog", icon: "doc", external: true },
    ],
  },
];

function isActive(pathname: string, href: string) {
  const path = href.split("?")[0];
  if (path === "/saabai-admin" || path === "/saabai-admin/marketing") return pathname === path;
  return pathname === path || pathname.startsWith(path + "/");
}

// Contextual top-right primary button. Only pages with a real create action are listed.
// (Orders and Customers have no create flow yet, so they show no button.)
const HEADER_ACTIONS: { match: string; label: string; href: string }[] = [
  { match: "/saabai-admin/payments", label: "New invoice", href: "/saabai-admin/payments?new=invoice" },
  { match: "/saabai-admin/experiments", label: "Add split test", href: "/saabai-admin/experiments?view=editor" },
];

function NavLinks({
  pathname,
  onNavigate,
  collapsedGroups,
  toggleGroup,
}: {
  pathname: string;
  onNavigate?: () => void;
  collapsedGroups: Record<string, boolean>;
  toggleGroup: (s: string) => void;
}) {
  return (
    <>
      {NAV.map((g) => {
        const collapsed = g.collapsible && collapsedGroups[g.section];
        return (
          <div key={g.section}>
            <button
              type="button"
              className="grp"
              style={{
                width: "100%",
                background: "none",
                border: 0,
                textAlign: "left",
                cursor: g.collapsible ? "pointer" : "default",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onClick={() => g.collapsible && toggleGroup(g.section)}
            >
              <span>{g.section}</span>
              {g.collapsible && (
                <span className="num" style={{ fontSize: 11, color: "#8f95c0" }}>
                  {g.items.length} {collapsed ? ">" : "v"}
                </span>
              )}
            </button>
            {!collapsed &&
              g.items.map((item) => {
                const on = isActive(pathname, item.href);
                const inner = (
                  <>
                    <Icon name={item.icon} />
                    {item.label}
                    {item.count != null && (
                      <span className={`ct ${item.urgent ? "t" : ""}`}>{item.count}</span>
                    )}
                  </>
                );
                if (item.external) {
                  return (
                    <a key={item.href + item.label} className={`it ${on ? "on" : ""}`} href={item.href} onClick={onNavigate}>
                      {inner}
                    </a>
                  );
                }
                return (
                  <Link key={item.href + item.label} className={`it ${on ? "on" : ""}`} href={item.href} onClick={onNavigate}>
                    {inner}
                  </Link>
                );
              })}
          </div>
        );
      })}
    </>
  );
}

const BOTTOM: { label: string; href: string; icon: string; more?: boolean }[] = [
  { label: "Home", href: "/saabai-admin", icon: "grid" },
  { label: "Orders", href: "/saabai-admin/orders", icon: "bag" },
  { label: "Clients", href: "/saabai-admin/customers", icon: "users" },
  { label: "Build", href: "/saabai-admin/site-factory", icon: "layers" },
  { label: "More", href: "#more", icon: "more", more: true },
];

export default function AdminShell({
  activePath,
  children,
  title,
}: {
  activePath?: string;
  children: React.ReactNode;
  title?: string;
}) {
  const pathname = usePathname() || activePath || "/saabai-admin";
  const [drawer, setDrawer] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    Growth: true,
    Lex: true,
    Settings: true,
  });

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  const crumb =
    title ||
    NAV.flatMap((g) => g.items).find((i) => isActive(pathname, i.href))?.label ||
    "Dashboard";

  const headerAction = HEADER_ACTIONS.find((a) => isActive(pathname, a.match));

  function toggleGroup(s: string) {
    setCollapsedGroups((c) => ({ ...c, [s]: !c[s] }));
  }

  const sideInner = (
    <>
      <div className="brand">
        <img src="/brand/saabai-logo.png" alt="Saabai" />
      </div>
      <div className="mc">Mission Control</div>
      <div className="search">
        <span>Search orders, clients</span>
        <kbd className="num">⌘K</kbd>
      </div>
      <NavLinks
        pathname={pathname}
        onNavigate={() => setDrawer(false)}
        collapsedGroups={collapsedGroups}
        toggleGroup={toggleGroup}
      />
      <div className="me">
        <div className="av">SG</div>
        <div style={{ lineHeight: 1.3, flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 500, fontSize: 13 }}>Shane Goldberg</div>
          <div style={{ fontSize: 12, color: "#8f95c0" }}>Owner · 2FA on</div>
        </div>
        <a href="/api/auth/logout" style={{ color: "#8f95c0", fontSize: 12, textDecoration: "none" }}>
          Sign out
        </a>
      </div>
    </>
  );

  return (
    <div className="app">
      <FeedbackHost />
      <aside className="side dt">{sideInner}</aside>

      <div className="main">
        <div className="top dt">
          <div className="crumb">
            <b>{crumb}</b>
          </div>
          <div className="tools">
            <div className="inp" style={{ width: 260 }}>
              <Icon name="search" />
              Search
              <span className="num" style={{ marginLeft: "auto", fontSize: 11 }}>
                ⌘K
              </span>
            </div>
            <button type="button" className="btn gh" style={{ padding: "0 8px" }} aria-label="Notifications">
              <Icon name="bell" />
            </button>
            {headerAction && (
              <Link href={headerAction.href} className="btn pri" style={{ textDecoration: "none" }}>
                <Icon name="plus" />
                {headerAction.label}
              </Link>
            )}
          </div>
        </div>

        <div className="mtop mo">
          <button type="button" aria-label="Open menu" onClick={() => setDrawer(true)} style={{ background: "none", border: 0, color: "#fff", padding: 4 }}>
            <Icon name="menu" />
          </button>
          <img src="/brand/saabai-logo.png" alt="Saabai" />
          <button type="button" aria-label="Notifications" style={{ background: "none", border: 0, color: "#fff", padding: 4 }}>
            <Icon name="bell" />
          </button>
        </div>

        <div className="pg">{children}</div>
      </div>

      <nav className="bbar mo" aria-label="Mobile primary">
        {BOTTOM.map((b) =>
          b.more ? (
            <button
              key={b.label}
              type="button"
              onClick={() => setDrawer(true)}
              style={{ background: "none", border: 0, padding: 0, font: "inherit", cursor: "pointer" }}
            >
              <div>
                <Icon name={b.icon} />
                {b.label}
              </div>
            </button>
          ) : (
            <Link key={b.label} href={b.href} className={isActive(pathname, b.href) ? "on" : ""}>
              <Icon name={b.icon} />
              {b.label}
            </Link>
          ),
        )}
      </nav>

      <div className={`mc-drawer mo ${drawer ? "open" : ""}`} role="dialog" aria-modal={drawer} aria-label="Menu">
        <div className="mc-drawer-backdrop" onClick={() => setDrawer(false)} />
        <div className="mc-drawer-panel">
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <div className="mc" style={{ paddingBottom: 0, flex: 1 }}>
              Mission Control
            </div>
            <button type="button" className="mc-drawer-close" aria-label="Close menu" onClick={() => setDrawer(false)}>
              ×
            </button>
          </div>
          {sideInner}
        </div>
      </div>
    </div>
  );
}
