"use client";

import { useState, useEffect } from "react";
import AdminShell from "../AdminSidebar";
import type { OrderRecord } from "../../api/admin/orders/route";

const C = {
  bg: "#f5f5f7",
  card: "#ffffff",
  surface: "#f3f4f6",
  border: "rgba(0,0,0,0.08)",
  borderHi: "rgba(0,0,0,0.12)",
  text: "#111827",
  muted: "#9ca3af",
  gold: "#b45309",
  goldBg: "rgba(180,83,9,0.08)",
  goldBdr: "rgba(180,83,9,0.25)",
  teal: "#0f766e",
  tealBg: "rgba(15,118,110,0.08)",
  tealBdr: "rgba(15,118,110,0.25)",
};

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtAud(cents: number | null | undefined) {
  if (cents == null) return "-";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}

function KindBadge({ kind }: { kind: OrderRecord["kind"] }) {
  const isBp = kind === "blueprint";
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 20,
        color: isBp ? C.teal : C.gold,
        background: isBp ? C.tealBg : C.goldBg,
        border: `1px solid ${isBp ? C.tealBdr : C.goldBdr}`,
        letterSpacing: 0.4,
        textTransform: "uppercase",
      }}
    >
      {isBp ? "Blueprint" : "Lex"}
    </span>
  );
}

function StatusBadge({ label }: { label: string }) {
  const lower = label.toLowerCase();
  let color = C.muted;
  let bg = "rgba(0,0,0,0.04)";
  if (lower.includes("active") || lower.includes("delivered") || lower.includes("paid")) {
    color = "#16a34a";
    bg = "rgba(22,163,74,0.10)";
  } else if (lower.includes("past") || lower.includes("missing") || lower.includes("questionnaire")) {
    color = "#d97706";
    bg = "rgba(217,119,6,0.10)";
  } else if (lower.includes("cancel") || lower.includes("closed") || lower.includes("unpaid")) {
    color = "#dc2626";
    bg = "rgba(220,38,38,0.10)";
  }
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 20,
        color,
        background: bg,
        letterSpacing: 0.4,
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}

function DetailDrawer({ order, onClose }: { order: OrderRecord; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.borderHi}`,
          borderRadius: 16,
          width: "100%",
          maxWidth: 560,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>{order.name ?? "Name missing"}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>
              {order.productLabel} · {order.email ?? "-"}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.muted, padding: 4 }}>
            ✕
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "16px 22px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            {(
              [
                ["Full name", order.name || "MISSING"],
                ["Email", order.email || "-"],
                ["Phone", order.phone || "-"],
                ["Business", order.business || "-"],
                ["Website", order.website || "-"],
                ["Address", order.billingAddress || "-"],
                ["Amount", order.kind === "lex_subscription" ? `${fmtAud(order.amountTotal)} total · ${fmtAud(order.monthlyAmount)}/mo` : fmtAud(order.amountTotal)],
                ["Status", order.statusLabel],
                ["Intake", order.intakeStatus || "-"],
                ["Stripe session", order.stripeSessionId || "-"],
                ["Payment intent", order.paymentIntentId || "-"],
                ["Ordered", fmtDate(order.createdAt)],
              ] as [string, string][]
            ).map(([k, v]) => (
              <tr key={k}>
                <td style={{ padding: "8px 0", color: C.muted, width: 140, verticalAlign: "top" }}>{k}</td>
                <td style={{ padding: "8px 0", color: C.text, fontWeight: k === "Full name" && v === "MISSING" ? 700 : 500 }}>{v}</td>
              </tr>
            ))}
          </table>

          {order.invoices.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>
                Invoices
              </p>
              {order.invoices.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: C.muted }}>{fmtDate(inv.date)} · {inv.description}</span>
                  <span style={{ fontWeight: 700, color: "#16a34a" }}>{fmtAud(inv.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "14px 22px",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          {order.stripeUrl && (
            <a
              href={order.stripeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 14px",
                borderRadius: 8,
                background: C.goldBg,
                color: C.gold,
                border: `1px solid ${C.goldBdr}`,
                textDecoration: "none",
              }}
            >
              Open in Stripe
            </a>
          )}
          {order.intakeUrl && (
            <a
              href={order.intakeUrl}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 14px",
                borderRadius: 8,
                background: C.tealBg,
                color: C.teal,
                border: `1px solid ${C.tealBdr}`,
                textDecoration: "none",
              }}
            >
              Open intake / audit
            </a>
          )}
          {order.invoiceUrl && (
            <a
              href={order.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 14px",
                borderRadius: 8,
                background: "rgba(0,0,0,0.04)",
                color: C.muted,
                border: `1px solid ${C.border}`,
                textDecoration: "none",
              }}
            >
              Invoice
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<OrderRecord | null>(null);
  const [filter, setFilter] = useState<"all" | "blueprint" | "lex_subscription">("all");

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

  useEffect(() => {
    load();
  }, []);

  const filtered = orders.filter((o) => filter === "all" || o.kind === filter);
  const blueprintCount = orders.filter((o) => o.kind === "blueprint").length;
  const lexCount = orders.filter((o) => o.kind === "lex_subscription").length;
  const blueprintRevenue = orders
    .filter((o) => o.kind === "blueprint")
    .reduce((sum, o) => sum + (o.amountTotal ?? 0), 0);
  const mrr = orders
    .filter((o) => o.kind === "lex_subscription" && o.status === "active")
    .reduce((sum, o) => sum + (o.monthlyAmount ?? 0), 0);
  const missingName = orders.filter((o) => !o.name?.trim()).length;

  const th: React.CSSProperties = {
    textAlign: "left",
    padding: "0 14px 12px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
    borderBottom: `1px solid ${C.border}`,
  };
  const td: React.CSSProperties = {
    padding: "12px 14px",
    fontSize: 13,
    color: C.text,
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: "top",
  };

  return (
    <AdminShell activePath="/saabai-admin/orders">
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: -0.3 }}>Orders</h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>
            Blueprint one-offs and Lex subscriptions · full name required on new checkouts
          </p>
        </div>
        <button
          onClick={load}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.muted,
            background: "rgba(0,0,0,0.04)",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "7px 14px",
            cursor: "pointer",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      <div style={{ padding: "28px 32px 64px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            { label: "All orders", value: orders.length.toString(), sub: "Blueprint + Lex" },
            { label: "Blueprints", value: blueprintCount.toString(), sub: fmtAud(blueprintRevenue) + " collected" },
            { label: "Lex MRR", value: fmtAud(mrr), sub: `${lexCount} subscriptions`, highlight: true },
            { label: "Missing name", value: missingName.toString(), sub: "older orders only" },
          ].map((s) => (
            <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
              <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>{s.label}</p>
              <p style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 800, color: s.highlight ? C.gold : C.text, letterSpacing: -0.5 }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{s.sub}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {(
            [
              ["all", "All"],
              ["blueprint", "Blueprint"],
              ["lex_subscription", "Lex"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: 20,
                cursor: "pointer",
                border: `1px solid ${filter === v ? C.goldBdr : C.border}`,
                background: filter === v ? C.goldBg : C.card,
                color: filter === v ? C.gold : C.muted,
              }}
            >
              {l}
              <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>
                {v === "all" ? orders.length : v === "blueprint" ? blueprintCount : lexCount}
              </span>
            </button>
          ))}
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          {loading ? (
            <p style={{ margin: 0, padding: "32px", textAlign: "center", color: C.muted, fontSize: 13 }}>Loading…</p>
          ) : error ? (
            <p style={{ margin: 0, padding: "32px", textAlign: "center", color: "#f87171", fontSize: 13 }}>{error}</p>
          ) : filtered.length === 0 ? (
            <p style={{ margin: 0, padding: "32px", textAlign: "center", color: C.muted, fontSize: 13 }}>No orders found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
                <thead>
                  <tr>
                    <th style={th}>Client</th>
                    <th style={th}>Product</th>
                    <th style={th}>Status / intake</th>
                    <th style={th}>Amount</th>
                    <th style={th}>Ordered</th>
                    <th style={{ ...th, textAlign: "right" as const }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order) => (
                    <tr key={`${order.kind}-${order.id}`}>
                      <td style={td}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: order.name ? C.text : "#dc2626" }}>
                          {order.name?.trim() || "Name missing"}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>{order.email ?? "-"}</p>
                        {order.phone && <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>{order.phone}</p>}
                        {order.business && order.business !== order.name && (
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>{order.business}</p>
                        )}
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                          <KindBadge kind={order.kind} />
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{order.productLabel}</span>
                        </div>
                      </td>
                      <td style={td}>
                        <StatusBadge label={order.statusLabel} />
                        {order.intakeStatus && order.kind === "blueprint" && (
                          <p style={{ margin: "6px 0 0", fontSize: 11, color: C.muted }}>Intake: {order.intakeStatus}</p>
                        )}
                      </td>
                      <td style={{ ...td, fontWeight: 700, color: C.gold, whiteSpace: "nowrap" }}>
                        {order.kind === "lex_subscription" ? (
                          <>
                            {fmtAud(order.monthlyAmount)}
                            <span style={{ display: "block", fontSize: 11, fontWeight: 500, color: C.muted }}>
                              total {fmtAud(order.amountTotal)}
                            </span>
                          </>
                        ) : (
                          fmtAud(order.amountTotal)
                        )}
                      </td>
                      <td style={{ ...td, color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(order.createdAt)}</td>
                      <td style={{ ...td, textAlign: "right" as const, whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => setViewing(order)}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "5px 12px",
                            borderRadius: 7,
                            cursor: "pointer",
                            border: `1px solid ${C.border}`,
                            background: "rgba(0,0,0,0.04)",
                            color: C.muted,
                            marginRight: 6,
                          }}
                        >
                          Details
                        </button>
                        {order.stripeUrl && (
                          <a
                            href={order.stripeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "5px 12px",
                              borderRadius: 7,
                              border: `1px solid ${C.goldBdr}`,
                              background: C.goldBg,
                              color: C.gold,
                              textDecoration: "none",
                            }}
                          >
                            Stripe
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
          Web Solutions website packages are still enquiry-only (Calendly). They will show here once a deposit checkout exists.
          Blueprint intake workflow stays under Blueprints; use Details then Open intake.
        </p>
      </div>

      {viewing && <DetailDrawer order={viewing} onClose={() => setViewing(null)} />}
    </AdminShell>
  );
}
