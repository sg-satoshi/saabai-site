"use client";

import Link from "next/link";
import type { ProductInfo } from "../../lib/user-products";

interface DashboardContentProps {
  userName: string;
  products: ProductInfo[];
}

// ── Admin-matched card style ──────────────────────────────────────────────────

const C = {
  card:   "#ffffff",
  border: "rgba(0,0,0,0.08)",
  text:   "#111827",
  muted:  "#9ca3af",
  gold:   "#C9A84C",
  goldBg: "rgba(201,168,76,0.10)",
  goldBdr: "rgba(201,168,76,0.22)",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: "uppercase" }}>{children}</p>
      <span style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

export default function DashboardContent({
  userName,
  products,
}: DashboardContentProps) {
  return (
    <div style={{ padding: "32px 36px", maxWidth: 900 }}>
      {/* Welcome */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: -0.3 }}>
          Welcome back, {userName.split(" ")[0]}
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
          Here is an overview of your account and products.
        </p>
      </div>

      {/* Products */}
      {products.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>Your Products</SectionLabel>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {products.map((product) => (
              <Link
                key={product.id}
                href={product.href}
                style={{
                  display: "block",
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderTop: `3px solid ${C.gold}`,
                  borderRadius: 14,
                  padding: "22px 22px 20px",
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.goldBdr; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: C.goldBg, border: `1px solid ${C.goldBdr}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, flexShrink: 0,
                  }}>
                    {product.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: C.text }}>
                      {product.label}
                    </h3>
                    <p style={{ margin: "0 0 10px", fontSize: 11, color: C.muted }}>
                      {product.description}
                    </p>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>
                      Open {product.label} &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div>
        <SectionLabel>Quick Links</SectionLabel>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          <a
            href="/dashboard/settings"
            style={{
              display: "block",
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: "18px 20px",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.goldBdr; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>
              ⚙ Account Settings
            </div>
            <p style={{ margin: 0, fontSize: 11, color: C.muted }}>
              Update your profile, password, and preferences
            </p>
          </a>
          {products.length > 0 && (
            <a
              href={products[0].href}
              style={{
                display: "block",
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: "18px 20px",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.goldBdr; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                {products[0].icon} {products[0].label} Dashboard
              </div>
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>
                View analytics, manage settings, and track performance
              </p>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
