"use client";

import { useState, useEffect } from "react";
import AdminShell from "../AdminSidebar";
import type { OrderRecord } from "../../api/admin/orders/route";
import { Badge, ProductTag } from "../ui/Badge";
import { Num } from "../ui/Num";

const C = {
  bg: "var(--n-50)",
  card: "var(--n-0)",
  surface: "var(--n-50)",
  border: "var(--n-200)",
  borderHi: "var(--n-300)",
  text: "var(--n-900)",
  muted: "var(--n-500)",
  gold: "var(--gold-700)",
  goldBg: "var(--gold-50)",
  goldBdr: "#ecdcae",
  teal: "var(--teal-700)",
  tealBg: "var(--teal-50)",
  tealBdr: "#b9e4ea",
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
  if (kind === "blueprint") return <ProductTag kind="bp">Blueprint</ProductTag>;
  if (kind === "website_care") return <ProductTag kind="ws">Web/Care</ProductTag>;
  if (kind === "lex_subscription") return <ProductTag kind="cr">Lex</ProductTag>;
  return <ProductTag kind="ws">Subscription</ProductTag>;
}

function StatusBadge({ label }: { label: string }) {
  const lower = label.toLowerCase();
  let tone = "neutral";
  if (lower.includes("active") || lower.includes("delivered") || lower.includes("paid")) tone = "ok";
  else if (lower.includes("past") || lower.includes("missing") || lower.includes("questionnaire") || lower.includes("draft") || lower.includes("deposit")) tone = "warn";
  else if (lower.includes("cancel") || lower.includes("closed") || lower.includes("unpaid") || lower.includes("failed")) tone = "bad";
  else if (lower.includes("progress") || lower.includes("fact") || lower.includes("build")) tone = "info";
  return <Badge tone={tone}>{label}</Badge>;
}

function DetailDrawer({ order, onClose }: { order: OrderRecord; onClose: () => void }) {
  return (
    <div className="drawer-detail" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
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
                ["Amount", order.kind !== "blueprint" ? `${fmtAud(order.amountTotal)} total · ${fmtAud(order.monthlyAmount)}/mo` : fmtAud(order.amountTotal)],
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
  const [filter, setFilter] = useState<"all" | "blueprint" | "lex_subscription" | "website_care" | "subscription">("all");

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
  const careCount = orders.filter((o) => o.kind === "website_care").length;
  const otherSubCount = orders.filter((o) => o.kind === "subscription").length;
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
      <div className="ph">
        <div>
          <h1>Orders</h1>
          <div className="sub">Blueprint one-offs and Lex subscriptions in one place. Full name required on new checkouts.</div>
        </div>
        <button type="button" className="btn" onClick={load}>Refresh</button>
      </div>

      <div className="kpis">
        {[
          { label: "All orders", value: String(orders.length), sub: "Blueprint + Lex" },
          { label: "Blueprints", value: String(blueprintCount), sub: `${fmtAud(blueprintRevenue)} collected` },
          { label: "Lex MRR", value: fmtAud(mrr), sub: `${lexCount} subscriptions` },
          { label: "Missing name", value: String(missingName), sub: "older orders only" },
        ].map((s) => (
          <div key={s.label} className="card kpi">
            <div className="l">{s.label}</div>
            <div className="v num">{s.value}</div>
            <div className="d muted">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {([
          ["all", "All", orders.length],
          ["blueprint", "Blueprints", blueprintCount],
          ["lex_subscription", "Lex", lexCount],
          ["website_care", "Web/Care", careCount],
          ...(otherSubCount ? ([["subscription", "Other", otherSubCount]] as const) : []),
        ] as ReadonlyArray<readonly [typeof filter, string, number]>).map(([v, l, n]) => (
          <button key={v} type="button" className={filter === v ? "on" : ""} onClick={() => setFilter(v)}>
            {l}<span className="num">{n}</span>
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p className="muted" style={{ margin: 0, padding: 32, textAlign: "center" }}>Loading...</p>
        ) : error ? (
          <p style={{ margin: 0, padding: 32, textAlign: "center", color: "var(--bad)" }}>{error}</p>
        ) : filtered.length === 0 ? (
          <p className="muted" style={{ margin: 0, padding: 32, textAlign: "center" }}>No orders found.</p>
        ) : (
          <>
            <div className="dt" style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Product</th>
                    <th>Status</th>
                    <th className="r">Amount</th>
                    <th>Ordered</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order) => (
                    <tr key={`${order.kind}-${order.id}`}>
                      <td>
                        <div style={{ fontWeight: 500, color: order.name ? "var(--n-900)" : "var(--bad)" }}>
                          {order.name?.trim() || "Name missing"}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>{order.email ?? "-"}</div>
                        {order.phone && <div className="muted" style={{ fontSize: 12 }}>{order.phone}</div>}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                          <KindBadge kind={order.kind} />
                          <span style={{ fontSize: 12.5, fontWeight: 500 }}>{order.productLabel}</span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge label={order.statusLabel} />
                        {order.intakeStatus && order.kind === "blueprint" && (
                          <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>Intake: {order.intakeStatus}</div>
                        )}
                      </td>
                      <td className="r">
                        <Num>
                          {order.kind !== "blueprint" ? (
                            <>
                              {fmtAud(order.monthlyAmount)}
                              <span className="muted" style={{ display: "block", fontSize: 11 }}>total {fmtAud(order.amountTotal)}</span>
                            </>
                          ) : (
                            fmtAud(order.amountTotal)
                          )}
                        </Num>
                      </td>
                      <td className="muted">{fmtDate(order.createdAt)}</td>
                      <td className="r">
                        <button type="button" className="btn sm" onClick={() => setViewing(order)}>Details</button>
                        {order.stripeUrl && (
                          <a className="btn sm" href={order.stripeUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 6 }}>Stripe</a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mo">
              {filtered.map((order) => (
                <div key={`m-${order.kind}-${order.id}`} className="oc" onClick={() => setViewing(order)} style={{ cursor: "pointer" }}>
                  <div className="r1">
                    <div>
                      <div style={{ fontWeight: 500 }}>{order.name?.trim() || "Name missing"}</div>
                      <div className="muted num" style={{ fontSize: 12 }}>{fmtDate(order.createdAt)}</div>
                    </div>
                    <div className="num" style={{ fontWeight: 500 }}>
                      {order.kind !== "blueprint" ? fmtAud(order.monthlyAmount) : fmtAud(order.amountTotal)}
                    </div>
                  </div>
                  <div className="r2">
                    <KindBadge kind={order.kind} />
                    <StatusBadge label={order.statusLabel} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="muted" style={{ marginTop: 16, fontSize: 12.5 }}>
        Web Solutions website packages are still enquiry-only. They will show here once a deposit checkout exists.
        Blueprint intake stays under Blueprints; use Details then Open intake.
      </p>

      {viewing && <DetailDrawer order={viewing} onClose={() => setViewing(null)} />}
    </AdminShell>
  );
}
