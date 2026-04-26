"use client";

import { useState, useEffect } from "react";
import AdminShell from "../AdminSidebar";
import type { OrderRecord } from "../../api/admin/orders/route";

// ── Colour palette ────────────────────────────────────────────────────────────

const C = {
  bg:       "#07091a",
  card:     "#0e1128",
  surface:  "#131729",
  border:   "rgba(255,255,255,0.07)",
  borderHi: "rgba(255,255,255,0.13)",
  text:     "#e2e4f0",
  muted:    "#525873",
  gold:     "#C9A84C",
  goldBg:   "rgba(201,168,76,0.08)",
  goldBdr:  "rgba(201,168,76,0.20)",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtAud(cents: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(cents / 100);
}

function daysUntil(unix: number) {
  return Math.ceil((unix * 1000 - Date.now()) / 86400000);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    active:   { label: "Active",   color: "#34d399", bg: "rgba(52,211,153,0.10)" },
    past_due: { label: "Past due", color: "#fbbf24", bg: "rgba(251,191,36,0.10)" },
    canceled: { label: "Cancelled",color: "#f87171", bg: "rgba(248,113,113,0.10)" },
    trialing: { label: "Trial",    color: "#818cf8", bg: "rgba(129,140,248,0.10)" },
    unpaid:   { label: "Unpaid",   color: "#f87171", bg: "rgba(248,113,113,0.10)" },
  };
  const s = map[status] ?? { label: status, color: C.muted, bg: "rgba(255,255,255,0.04)" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
      color: s.color, background: s.bg, letterSpacing: 0.5, textTransform: "uppercase",
    }}>
      {s.label}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const isGrowth = plan === "Growth";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
      color: isGrowth ? C.gold : "#9aa0b8",
      background: isGrowth ? C.goldBg : "rgba(255,255,255,0.05)",
      border: `1px solid ${isGrowth ? C.goldBdr : "rgba(255,255,255,0.08)"}`,
      letterSpacing: 0.4,
    }}>
      {isGrowth ? "Growth" : "Starter"}
    </span>
  );
}

// ── Invoice drawer ────────────────────────────────────────────────────────────

function InvoiceDrawer({ order, onClose }: { order: OrderRecord; onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: C.card, border: `1px solid ${C.borderHi}`, borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>{order.name ?? order.email ?? "Unknown"}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>{order.email} · Lex {order.plan}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.muted, padding: 4 }}>✕</button>
        </div>

        {/* Invoices */}
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 22px" }}>
          {order.invoices.length === 0 ? (
            <p style={{ margin: 0, color: C.muted, fontSize: 13, textAlign: "center", padding: "24px 0" }}>No invoices found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Date", "Description", "Amount", "Status"].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase", padding: "0 8px 10px", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.invoices.map((inv, i) => (
                  <tr key={inv.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                    <td style={{ padding: "10px 8px", fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(inv.date)}</td>
                    <td style={{ padding: "10px 8px", fontSize: 12, color: C.text, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {inv.description}
                    </td>
                    <td style={{ padding: "10px 8px", fontSize: 12, fontWeight: 700, color: "#34d399", whiteSpace: "nowrap" }}>{fmtAud(inv.amount)}</td>
                    <td style={{ padding: "10px 8px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,0.10)", padding: "2px 7px", borderRadius: 20 }}>
                        Paid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
            {order.invoices.length} invoice{order.invoices.length !== 1 ? "s" : ""}
          </p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.gold }}>
            Total paid: {fmtAud(order.totalPaid)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<OrderRecord | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "past_due" | "canceled">("all");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch (e) {
      setError(`Failed to load orders: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = orders.filter(o => filter === "all" || o.status === filter);

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalPaid, 0);
  const activeCount = orders.filter(o => o.status === "active").length;
  const pastDueCount = orders.filter(o => o.status === "past_due").length;
  const mrr = orders
    .filter(o => o.status === "active")
    .reduce((sum, o) => sum + (o.monthlyAmount ?? 0), 0);

  const th: React.CSSProperties = {
    textAlign: "left", padding: "0 16px 12px", fontSize: 10, fontWeight: 700,
    letterSpacing: 1, color: C.muted, textTransform: "uppercase", borderBottom: `1px solid ${C.border}`,
  };

  const td: React.CSSProperties = {
    padding: "14px 16px", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}`,
  };

  return (
    <AdminShell activePath="/saabai-admin/orders">
      {/* Page header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: -0.3 }}>Orders</h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>Stripe subscriptions and payment history</p>
        </div>
        <button
          onClick={load}
          style={{ fontSize: 12, fontWeight: 600, color: C.muted, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}
        >
          ↻ Refresh
        </button>
      </div>

      <div style={{ padding: "28px 32px 64px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            { label: "Total clients",  value: orders.length.toString(),      sub: "all time" },
            { label: "Active",         value: activeCount.toString(),         sub: "subscriptions" },
            { label: "MRR",            value: fmtAud(mrr),                   sub: "monthly recurring", highlight: true },
            { label: "Total collected",value: fmtAud(totalRevenue),           sub: "all invoices" },
          ].map(s => (
            <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
              <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>{s.label}</p>
              <p style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 800, color: s.highlight ? C.gold : C.text, letterSpacing: -0.5 }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8 }}>
          {([["all", "All"], ["active", "Active"], ["past_due", "Past due"], ["canceled", "Cancelled"]] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              style={{
                fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                border: `1px solid ${filter === v ? C.goldBdr : C.border}`,
                background: filter === v ? C.goldBg : "rgba(255,255,255,0.03)",
                color: filter === v ? C.gold : C.muted,
              }}
            >
              {l}
              {v !== "all" && (
                <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>
                  {v === "active" ? activeCount : v === "past_due" ? pastDueCount : orders.filter(o => o.status === "canceled").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          {loading ? (
            <p style={{ margin: 0, padding: "32px", textAlign: "center", color: C.muted, fontSize: 13 }}>Loading…</p>
          ) : error ? (
            <p style={{ margin: 0, padding: "32px", textAlign: "center", color: "#f87171", fontSize: 13 }}>{error}</p>
          ) : filtered.length === 0 ? (
            <p style={{ margin: 0, padding: "32px", textAlign: "center", color: C.muted, fontSize: 13 }}>No orders found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Client</th>
                  <th style={th}>Plan</th>
                  <th style={th}>Status</th>
                  <th style={th}>Next billing</th>
                  <th style={th}>Monthly</th>
                  <th style={th}>Total paid</th>
                  <th style={th}>Client since</th>
                  <th style={{ ...th, textAlign: "right" as const }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => {
                  const days = order.currentPeriodEnd ? daysUntil(order.currentPeriodEnd) : null;
                  const billingUrgent = days !== null && days <= 7 && order.status === "active";
                  return (
                    <tr key={order.customerId} style={{ cursor: "default" }}>
                      <td style={td}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text }}>{order.name ?? "—"}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>{order.email ?? "—"}</p>
                      </td>
                      <td style={td}><PlanBadge plan={order.plan} /></td>
                      <td style={td}><StatusBadge status={order.status} /></td>
                      <td style={{ ...td, color: billingUrgent ? "#fbbf24" : C.muted, fontWeight: billingUrgent ? 700 : 400 }}>
                        {order.currentPeriodEnd ? (
                          <>
                            {fmtDate(order.currentPeriodEnd)}
                            {days !== null && (
                              <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>
                                {days <= 0 ? "today" : `in ${days}d`}
                              </span>
                            )}
                          </>
                        ) : "—"}
                      </td>
                      <td style={{ ...td, fontWeight: 600, color: C.text }}>
                        {order.monthlyAmount ? fmtAud(order.monthlyAmount) : "—"}
                      </td>
                      <td style={{ ...td, fontWeight: 700, color: C.gold }}>
                        {order.totalPaid > 0 ? fmtAud(order.totalPaid) : "—"}
                      </td>
                      <td style={{ ...td, color: C.muted }}>{fmtDate(order.createdAt)}</td>
                      <td style={{ ...td, textAlign: "right" as const }}>
                        <button
                          onClick={() => setViewing(order)}
                          style={{
                            fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 7, cursor: "pointer",
                            border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.04)", color: C.muted,
                          }}
                        >
                          Invoices ({order.invoices.length})
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {pastDueCount > 0 && (
          <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.20)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <p style={{ margin: 0, fontSize: 13, color: "#fbbf24" }}>
              <strong>{pastDueCount} subscription{pastDueCount > 1 ? "s" : ""}</strong> past due — check Stripe for failed payment details.
            </p>
          </div>
        )}

      </div>

      {viewing && <InvoiceDrawer order={viewing} onClose={() => setViewing(null)} />}
    </AdminShell>
  );
}
