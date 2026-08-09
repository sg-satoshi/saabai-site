"use client";

import { useState, useEffect, useCallback } from "react";

const C = {
  card: "#ffffff",
  border: "rgba(0,0,0,0.08)",
  text: "#111827",
  muted: "#9ca3af",
  dim: "#6b7280",
  gold: "#C9A84C",
  goldBg: "rgba(201,168,76,0.10)",
  goldBdr: "rgba(201,168,76,0.22)",
  green: "#16a34a",
  greenBg: "rgba(22,163,74,0.10)",
  red: "#dc2626",
  redBg: "rgba(220,38,38,0.10)",
  blue: "#2563eb",
  blueBg: "rgba(37,99,235,0.08)",
};

interface Invoice {
  id: string;
  number: string | null;
  created: number;
  amount: number;
  currency: string;
  status: string | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
  description: string | null;
}

function fmtMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: (currency || "aud").toUpperCase(), maximumFractionDigits: 2 }).format(cents / 100);
}

function fmtDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    paid: { label: "Paid", color: C.green, bg: C.greenBg },
    open: { label: "Due", color: C.blue, bg: C.blueBg },
    draft: { label: "Draft", color: C.muted, bg: "rgba(0,0,0,0.04)" },
    void: { label: "Void", color: C.muted, bg: "rgba(0,0,0,0.04)" },
    uncollectible: { label: "Unpaid", color: C.red, bg: C.redBg },
  };
  const s = map[status ?? ""] ?? { label: status || "Unknown", color: C.muted, bg: "rgba(0,0,0,0.04)" };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, color: s.color, background: s.bg, letterSpacing: 0.5, textTransform: "uppercase" }}>
      {s.label}
    </span>
  );
}

export default function BillingContent() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalErr, setPortalErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/billing/invoices");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load invoices");
      setInvoices(data.invoices || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openPortal() {
    setPortalBusy(true);
    setPortalErr(null);
    try {
      const res = await fetch("/api/dashboard/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setPortalErr(data.error || "Could not open the billing portal"); return; }
      window.location.href = data.url;
    } catch (e) {
      setPortalErr(e instanceof Error ? e.message : String(e));
    } finally {
      setPortalBusy(false);
    }
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: C.text }}>Billing</h1>
      <p style={{ margin: "0 0 22px", fontSize: 13, color: C.dim }}>Your invoices and payment details, all in one place.</p>

      {/* Manage billing */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, marginBottom: 22, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>Payment &amp; subscriptions</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: C.dim }}>Update your card, view or cancel subscriptions in our secure portal.</p>
        </div>
        <button
          onClick={openPortal}
          disabled={portalBusy}
          style={{ padding: "11px 20px", borderRadius: 10, border: `1px solid ${C.goldBdr}`, background: C.goldBg, color: C.gold, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", opacity: portalBusy ? 0.6 : 1 }}
        >
          {portalBusy ? "Opening…" : "Manage billing"}
        </button>
      </div>
      {portalErr && <p style={{ margin: "-12px 0 22px", fontSize: 12, color: C.red }}>{portalErr}</p>}

      {/* Invoices */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
        <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: C.text }}>Invoice history</p>

        {loading ? (
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Loading invoices…</p>
        ) : error ? (
          <p style={{ margin: 0, fontSize: 13, color: C.red }}>{error}</p>
        ) : invoices.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: C.dim }}>No invoices yet. They will appear here after your first payment.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {invoices.map((inv, i) => (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i === 0 ? "none" : `1px solid ${C.border}`, flexWrap: "wrap" }}>
                <div style={{ width: 92, fontSize: 12, color: C.dim, flexShrink: 0 }}>{fmtDate(inv.created)}</div>
                <div style={{ flex: 1, minWidth: 140, fontSize: 13, color: C.text }}>
                  {inv.description || inv.number || "Invoice"}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, width: 90, textAlign: "right" }}>{fmtMoney(inv.amount, inv.currency)}</div>
                <div style={{ width: 64, textAlign: "center" }}><StatusBadge status={inv.status} /></div>
                <div style={{ width: 56, textAlign: "right" }}>
                  {inv.pdfUrl ? (
                    <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: C.blue, textDecoration: "none" }}>PDF</a>
                  ) : inv.hostedUrl ? (
                    <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: C.blue, textDecoration: "none" }}>View</a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
