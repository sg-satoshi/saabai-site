"use client";

import React, { useEffect, useState } from "react";

export type NavItem = {
  label: string;
  id: string;
  icon: string;
  count?: number;
  urgent?: boolean;
};

export type NavGroup = {
  label?: string;
  items: NavItem[];
};

const ICONS: Record<string, React.ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  layers: <><path d="M12 3L2 8l10 5 10-5z"/><path d="M2 13l10 5 10-5M2 18l10 5 10-5"/></>,
  doc: <><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h4"/></>,
  scale: <><path d="M12 3v18M5 21h14M5 7h14M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z"/></>,
  users: <><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>,
  inbox: <><path d="M3 13l3-9h12l3 9v7H3z"/><path d="M3 13h5l1 3h6l1-3h5"/></>,
  gear: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></>,
  menu: <><path d="M3 6h18M3 12h18M3 18h18"/></>,
  bell: <><path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></>,
};

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6">
      {ICONS[name] || ICONS.grid}
    </svg>
  );
}

function NavButtons({
  groups,
  active,
  onNavigate,
}: {
  groups: NavGroup[];
  active: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <>
      {groups.map((g, gi) => (
        <React.Fragment key={gi}>
          {g.label ? <div className="grp">{g.label}</div> : null}
          {g.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`it ${active === item.id ? "on" : ""}`}
              onClick={() => onNavigate(item.id)}
              style={{ width: "100%", background: "none", border: 0, textAlign: "left", cursor: "pointer", font: "inherit" }}
            >
              <Icon name={item.icon} />
              {item.label}
              {item.count != null && item.count > 0 && (
                <span className={`ct ${item.urgent ? "t" : ""}`}>{item.count}</span>
              )}
            </button>
          ))}
        </React.Fragment>
      ))}
    </>
  );
}

export function PortalShell({
  business,
  personName,
  role,
  navGroups,
  bottomNav,
  active,
  onNavigate,
  children,
  title,
  impersonating,
  onExitImpersonation,
}: {
  business: string;
  personName: string;
  role: string;
  navGroups: NavGroup[];
  bottomNav: NavItem[];
  active: string;
  onNavigate: (id: string) => void;
  children: React.ReactNode;
  title?: string;
  impersonating?: { name: string } | null;
  onExitImpersonation?: () => void;
}) {
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    setDrawer(false);
  }, [active]);

  const initials = personName.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "CP";
  const flat = navGroups.flatMap((g) => g.items);
  const crumb = title || flat.find((n) => n.id === active)?.label || "Overview";

  const side = (
    <>
      <div className="brand">
        <img src="/brand/saabai-logo.png" alt="Saabai" />
      </div>
      <div className="mc" style={{ color: "var(--teal-300)" }}>
        Client Portal
      </div>
      <div className="search" style={{ color: "#e3e5f6" }}>
        <span>{business || "Your workspace"}</span>
      </div>
      <NavButtons groups={navGroups} active={active} onNavigate={onNavigate} />
      <div className="me">
        <div className="av">{initials}</div>
        <div style={{ lineHeight: 1.3, flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 500, fontSize: 13 }}>{personName}</div>
          <div style={{ fontSize: 12, color: "#8f95c0" }}>
            {business} · {role}
          </div>
        </div>
      </div>
    </>
  );

  const bottomItems: NavItem[] = [
    ...bottomNav.slice(0, 4),
    { id: "more", label: "More", icon: "more" },
  ];

  return (
    <div className="app">
      {impersonating ? (
        <div
          role="status"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 80,
            gridColumn: "1 / -1",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 16px",
            background: "#c9a227",
            color: "#0b092e",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <span>Viewing as {impersonating.name}. Read-only.</span>
          <button
            type="button"
            onClick={onExitImpersonation}
            style={{
              background: "#0b092e",
              color: "#c9a227",
              border: 0,
              borderRadius: 8,
              padding: "6px 12px",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Exit
          </button>
        </div>
      ) : null}
      <aside className="side dt">{side}</aside>
      <div className="main">
        <div className="top dt">
          <div className="crumb">
            <b>{crumb}</b>
          </div>
          <div className="tools">
            <a className="btn" href="mailto:hello@saabai.ai">
              Contact Saabai
            </a>
            <button type="button" className="btn gh" style={{ padding: "0 8px" }} aria-label="Notifications">
              <Icon name="bell" />
            </button>
            <button type="button" className="btn pri" onClick={() => onNavigate("requests")}>
              <Icon name="plus" />
              New request
            </button>
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
        {bottomItems.map((b) =>
          b.id === "more" ? (
            <button
              key="more"
              type="button"
              onClick={() => setDrawer(true)}
              style={{ background: "none", border: 0, padding: 0, font: "inherit", cursor: "pointer", width: "100%" }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 11, color: "var(--n-500)" }}>
                <Icon name="more" />
                More
              </div>
            </button>
          ) : (
            <button
              key={b.id}
              type="button"
              className={active === b.id ? "on" : ""}
              onClick={() => onNavigate(b.id)}
              style={{ background: "none", border: 0, padding: 0, font: "inherit", cursor: "pointer", width: "100%", color: "inherit" }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 11,
                  fontWeight: 500,
                  color: active === b.id ? "var(--navy-900)" : "var(--n-500)",
                }}
              >
                <Icon name={b.icon} />
                {b.label}
              </div>
            </button>
          ),
        )}
      </nav>
      <div className={`mc-drawer mo ${drawer ? "open" : ""}`} role="dialog" aria-modal={drawer}>
        <div className="mc-drawer-backdrop" onClick={() => setDrawer(false)} />
        <div className="mc-drawer-panel">{side}</div>
      </div>
    </div>
  );
}
