"use client";

import { useState, useEffect, useCallback } from "react";
import type { Invoice, InvoiceLineItem, InvoiceClient } from "../../../lib/invoice-store";

// ── Theme (matches PaymentsClient) ──────────────────────────────────────────

const C = {
  bg:       "#f5f5f7",
  card:     "#ffffff",
  surface:  "#f3f4f6",
  surfaceHi:"#e9eaec",
  border:   "rgba(0,0,0,0.08)",
  borderHi: "rgba(0,0,0,0.12)",
  text:     "#111827",
  muted:    "#9ca3af",
  dim:      "#e5e7eb",
  gold:     "#b45309",
  goldBg:   "rgba(180,83,9,0.08)",
  goldBdr:  "rgba(180,83,9,0.25)",
  green:    "#16a34a",
  greenBg:  "rgba(22,163,74,0.10)",
  blue:     "#2563eb",
  blueBg:   "rgba(37,99,235,0.08)",
  orange:   "#ea580c",
  orangeBg: "rgba(234,88,12,0.08)",
  red:      "#dc2626",
  redBg:    "rgba(220,38,38,0.10)",
  purple:   "#7c3aed",
  purpleBg: "rgba(124,58,237,0.08)",
  teal:     "#0891b2",
  tealBg:   "rgba(8,145,178,0.08)",
  amber:    "#d97706",
  amberBg:  "rgba(217,119,6,0.10)",
  coral:    "#e11d48",
  coralBg:  "rgba(225,29,72,0.10)",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 }).format(cents);
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const LINE_TEMPLATES = [
  { description: "Consulting / Contracted Hours", rate: 40 },
  { description: "AI Strategic Development & Implementation", rate: 45 },
];

const MY_INFO = {
  name: "Shane Goldberg",
  abn: "71 889 082 572",
  address: "4302/31 Bourton Road, Merrimac QLD 4226",
  phone: "0415 622 733",
  email: "hello@saabai.ai",
  website: "www.saabai.ai",
};

const PAY_INFO = {
  accountName: "Shane Goldberg",
  bsb: "084899",
  accountNumber: "726851250",
};

function calcLineTotal(item: InvoiceLineItem): number {
  if (item.type === "fixed") return item.total || 0;
  return parseFloat(((item.hours || 0) * (item.rate || 0)).toFixed(2));
}

function calcTotals(items: InvoiceLineItem[]): { subtotal: number; total: number } {
  const subtotal = parseFloat(items.reduce((s, li) => s + calcLineTotal(li), 0).toFixed(2));
  return { subtotal, total: subtotal };
}

// ── Input helpers ───────────────────────────────────────────────────────────

function Txt({ value, onChange, placeholder, style, type, step, min, onFocus, onBlur }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  style?: React.CSSProperties; type?: string; step?: string; min?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} type={type || "text"} step={step} min={min}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{
        width: "100%", padding: "7px 10px", borderRadius: 6,
        border: `1px solid ${C.border}`, background: C.card,
        fontSize: 12, color: C.text, outline: "none", boxSizing: "border-box",
        fontFamily: "inherit",
        ...style,
      }}
    />
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "18px 20px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color }} />
      <p style={{ margin: "0 0 4px", fontSize: 10, letterSpacing: 0.6, color: C.muted, textTransform: "uppercase", fontWeight: 500 }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 600, color }}>{value}</p>
      {sub && <p style={{ margin: "2px 0 0", fontSize: 10, color: C.muted }}>{sub}</p>}
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────

function InvStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    paid:     { label: "Paid",     color: C.teal,  bg: C.tealBg },
    unpaid:   { label: "Unpaid",   color: C.amber, bg: C.amberBg },
    overdue:  { label: "Overdue",  color: C.coral, bg: C.coralBg },
  };
  const s = map[status] ?? { label: status, color: C.muted, bg: "rgba(0,0,0,0.04)" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
      color: s.color, background: s.bg, letterSpacing: 0.5, textTransform: "uppercase",
    }}>
      {s.label}
    </span>
  );
}

// ── Invoice Tracker ─────────────────────────────────────────────────────────

export default function InvoiceTracker() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<InvoiceClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Modal form state
  const [invNumber, setInvNumber] = useState("");
  const [invDate, setInvDate] = useState("");
  const [invClientId, setInvClientId] = useState("");
  const [invStatus, setInvStatus] = useState<"unpaid" | "paid" | "overdue">("unpaid");
  const [invNotes, setInvNotes] = useState("");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);

  // New client form
  const [showNewClient, setShowNewClient] = useState(false);
  const [ncName, setNcName] = useState("");
  const [ncAddress, setNcAddress] = useState("");

  // Print overlay
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, cliRes] = await Promise.all([
        fetch("/api/admin/invoices"),
        fetch("/api/admin/invoice-clients"),
      ]);
      const invData = await invRes.json();
      const cliData = await cliRes.json();
      if (invRes.ok) setInvoices(invData.invoices || []);
      else setError(invData.error);
      if (cliRes.ok) setClients(cliData.clients || DEFAULT_CLIENTS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalInvoiced = invoices.reduce((s, inv) => s + inv.total, 0);
  const totalPaid = invoices.filter(inv => inv.status === "paid").reduce((s, inv) => s + inv.total, 0);
  const totalOutstanding = invoices.filter(inv => inv.status !== "paid").reduce((s, inv) => s + inv.total, 0);
  const ytd = invoices.filter(inv => inv.date.startsWith("2026")).reduce((s, inv) => s + inv.total, 0);

  // ── Open new invoice modal ────────────────────────────────────────────────

  function openNewInvoice() {
    setEditId(null);

    // Auto-number
    const nums = invoices.map(inv => {
      const m = inv.number.match(/SG-(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    });
    const max = nums.length ? Math.max(...nums) : 14;
    const nextNum = "SG-" + String(max + 1).padStart(3, "0");

    setInvNumber(nextNum);
    setInvDate(new Date().toISOString().split("T")[0]);
    setInvClientId(clients[0]?.id || "");
    setInvStatus("unpaid");
    setInvNotes("");
    setLineItems(LINE_TEMPLATES.map(t => ({
      description: t.description,
      hours: 0,
      rate: t.rate,
      total: 0,
    })));
    setShowNewClient(false);
    setNcName("");
    setNcAddress("");
    setShowModal(true);
  }

  function openEditInvoice(inv: Invoice) {
    setEditId(inv.id);
    setInvNumber(inv.number);
    setInvDate(inv.date);
    setInvClientId(inv.clientId);
    setInvStatus(inv.status);
    setInvNotes(inv.notes || "");
    setLineItems(inv.lineItems.map(li => ({ ...li })));
    setShowNewClient(false);
    setShowModal(true);
  }

  // ── Line item management ──────────────────────────────────────────────────

  function updateLineItem(i: number, patch: Partial<InvoiceLineItem>) {
    setLineItems(prev => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      // Recalc
      const total = patch.type === "fixed"
        ? (patch.total ?? next[i].total ?? 0)
        : parseFloat((((patch.hours ?? next[i].hours ?? 0) * (patch.rate ?? next[i].rate ?? 0)).toFixed(2)));
      next[i].total = total;
      return next;
    });
  }

  function addLineItem() {
    setLineItems(prev => [...prev, { description: "", hours: 0, rate: 0, total: 0 }]);
  }

  function removeLineItem(i: number) {
    setLineItems(prev => prev.filter((_, idx) => idx !== i));
  }

  function toggleLineType(i: number) {
    setLineItems(prev => {
      const next = [...prev];
      const curr = next[i];
      if (curr.type === "fixed") {
        next[i] = { description: curr.description, hours: 0, rate: 0, total: 0 };
      } else {
        next[i] = { description: curr.description, type: "fixed", total: curr.total || 0 };
      }
      return next;
    });
  }

  const { subtotal } = calcTotals(lineItems);

  // ── Save ──────────────────────────────────────────────────────────────────

  async function saveInvoice() {
    const payload = {
      number: invNumber,
      date: invDate,
      clientId: invClientId,
      lineItems: lineItems.filter(li => li.description.trim()),
      status: invStatus,
      notes: invNotes || undefined,
      paidDate: invStatus === "paid" ? new Date().toISOString().split("T")[0] : undefined,
    };

    try {
      let res;
      if (editId) {
        res = await fetch(`/api/admin/invoices/${editId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/invoices", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to save invoice");
        return;
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    }
  }

  // ── Cycle status ──────────────────────────────────────────────────────────

  async function cycleStatus(id: string) {
    try {
      await fetch(`/api/admin/invoices/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _action: "cycle-status" }),
      });
      loadData();
    } catch { /* ignore */ }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function deleteInvoice(id: string) {
    if (!confirm("Delete this invoice?")) return;
    try {
      await fetch(`/api/admin/invoices/${id}`, { method: "DELETE" });
      loadData();
    } catch { /* ignore */ }
  }

  // ── Add client ────────────────────────────────────────────────────────────

  async function addClient() {
    if (!ncName.trim()) return;
    try {
      const res = await fetch("/api/admin/invoice-clients", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: ncName.trim(), address: ncAddress.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setClients(prev => [...prev, data.client]);
        setInvClientId(data.client.id);
        setShowNewClient(false);
        setNcName("");
        setNcAddress("");
      } else {
        alert(data.error);
      }
    } catch { /* ignore */ }
  }

  // ── Print invoice ─────────────────────────────────────────────────────────

  function printInv(inv: Invoice) {
    setPrintInvoice(inv);
    setTimeout(() => window.print(), 100);
  }

  // ── Sorted invoices ───────────────────────────────────────────────────────

  const sorted = [...invoices].sort((a, b) => b.date.localeCompare(a.date));

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || id;

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading && invoices.length === 0) {
    return <p style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: 40 }}>Loading invoices...</p>;
  }

  if (error && invoices.length === 0) {
    return <p style={{ fontSize: 13, color: C.red, textAlign: "center", padding: 40 }}>{error}</p>;
  }

  return (
    <div>
      {/* ── Stats ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total invoiced" value={fmt(totalInvoiced)} color={C.purple} sub="all time" />
        <StatCard label="Paid" value={fmt(totalPaid)} color={C.teal} sub="confirmed received" />
        <StatCard label="Outstanding" value={fmt(totalOutstanding)} color={C.amber} sub="unpaid + overdue" />
        <StatCard label="2026 YTD" value={fmt(ytd)} color={C.blue} sub="calendar year" />
      </div>

      {/* ── Table header ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>Invoice history</p>
        <button
          onClick={openNewInvoice}
          style={{
            padding: "7px 14px", borderRadius: 8, border: "none",
            background: C.blue, color: "#fff",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          New invoice
        </button>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────────── */}
      <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 32 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
              {["Invoice #", "Date", "Client", "Amount", "Status", "Actions"].map(h => (
                <th key={h} style={{
                  fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: 0.6,
                  textTransform: "uppercase", textAlign: "left",
                  padding: "10px 0 10px 16px",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: C.muted, fontSize: 13 }}>
                  No invoices yet — create your first one above.
                </td>
              </tr>
            ) : sorted.map((inv, i) => {
              const dateStr = new Date(inv.date + "T00:00:00").toLocaleDateString("en-AU", {
                day: "numeric", month: "short", year: "numeric",
              });
              return (
                <tr key={inv.id} style={{
                  borderBottom: i < sorted.length - 1 ? `1px solid ${C.border}` : "none",
                  background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)",
                  cursor: "pointer",
                }} onClick={() => openEditInvoice(inv)}>
                  <td style={{ padding: "10px 0 10px 16px", fontWeight: 600, fontSize: 12, color: C.text }}>
                    {inv.number}
                  </td>
                  <td style={{ padding: "10px 0", fontSize: 11, color: C.muted }}>{dateStr}</td>
                  <td style={{ padding: "10px 0", fontSize: 12, color: C.text }}>{getClientName(inv.clientId)}</td>
                  <td style={{ padding: "10px 0", fontSize: 13, fontWeight: 700, color: C.text }}>{fmt(inv.total)}</td>
                  <td style={{ padding: "10px 0" }}><InvStatusBadge status={inv.status} /></td>
                  <td style={{ padding: "10px 16px 10px 0", textAlign: "right", whiteSpace: "nowrap" }}
                    onClick={e => e.stopPropagation()}>
                    <button onClick={() => printInv(inv)} style={btnSm} title="Print">🖨</button>
                    <button onClick={() => openEditInvoice(inv)} style={btnSm} title="Edit">✎</button>
                    <button onClick={() => cycleStatus(inv.id)} style={btnSm} title="Toggle status">↻</button>
                    <button onClick={() => deleteInvoice(inv.id)} style={{ ...btnSm, color: C.red }} title="Delete">✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Invoice Modal ──────────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: C.card, border: `1px solid ${C.borderHi}`, borderRadius: 16,
            width: "100%", maxWidth: 640, maxHeight: "90vh", display: "flex", flexDirection: "column",
            boxShadow: "0 24px 60px rgba(0,0,0,0.12)",
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>
                {editId ? `Edit ${invNumber}` : "New Invoice"}
              </h3>
            </div>

            {/* Body */}
            <div style={{ overflowY: "auto", flex: 1, padding: "18px 22px" }}>
              {/* Row 1: Number + Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: C.text }}>Invoice Number</p>
                  <Txt value={invNumber} onChange={setInvNumber} placeholder="SG-015" />
                </div>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: C.text }}>Date</p>
                  <Txt value={invDate} onChange={setInvDate} type="date" />
                </div>
              </div>

              {/* Row 2: Client + Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: C.text }}>Client</p>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <select
                      value={invClientId}
                      onChange={e => setInvClientId(e.target.value)}
                      style={{
                        flex: 1, padding: "7px 10px", borderRadius: 6,
                        border: `1px solid ${C.border}`, background: C.card,
                        fontSize: 12, color: C.text, outline: "none", fontFamily: "inherit",
                      }}
                    >
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button onClick={() => setShowNewClient(!showNewClient)} style={btnSm} title="Add client">+</button>
                  </div>
                  {showNewClient && (
                    <div style={{
                      marginTop: 8, padding: 10, borderRadius: 8,
                      background: C.surface, border: `1px solid ${C.border}`,
                    }}>
                      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 500, color: C.text }}>New client</p>
                      <Txt value={ncName} onChange={setNcName} placeholder="Client name" style={{ marginBottom: 5 }} />
                      <Txt value={ncAddress} onChange={setNcAddress} placeholder="Address (optional)" />
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <button onClick={addClient} style={{ ...btnAccent, fontSize: 11, padding: "4px 10px" }}>Add client</button>
                        <button onClick={() => setShowNewClient(false)} style={{ ...btnSm, fontSize: 11, padding: "4px 8px" }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: C.text }}>Status</p>
                  <select
                    value={invStatus}
                    onChange={e => setInvStatus(e.target.value as "unpaid" | "paid" | "overdue")}
                    style={{
                      width: "100%", padding: "7px 10px", borderRadius: 6,
                      border: `1px solid ${C.border}`, background: C.card,
                      fontSize: 12, color: C.text, outline: "none", fontFamily: "inherit",
                    }}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {/* Line items */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>Line items</span>
                  <button onClick={addLineItem} style={{ ...btnSm, fontSize: 11, padding: "3px 8px" }}>+ Add line</button>
                </div>

                {lineItems.map((li, i) => {
                  const isFixed = li.type === "fixed";
                  return (
                    <div key={i} style={{
                      display: "grid",
                      gridTemplateColumns: isFixed ? "58px 1fr 80px 24px" : "58px 1fr 54px 54px 64px 24px",
                      gap: 5, alignItems: isFixed ? "start" : "center", marginBottom: 6,
                    }}>
                      <button
                        onClick={() => toggleLineType(i)}
                        style={{
                          background: C.surface, border: `1px solid ${C.border}`,
                          borderRadius: 6, padding: "5px 6px", fontSize: 9, fontWeight: 600,
                          cursor: "pointer", color: C.text, fontFamily: "inherit", whiteSpace: "nowrap",
                          height: 30, lineHeight: "18px",
                        }}
                      >
                        {isFixed ? "Fixed" : "Hourly"}
                      </button>
                      <Txt
                        value={li.description}
                        onChange={v => updateLineItem(i, { description: v })}
                        placeholder="Description"
                      />
                      {!isFixed && (
                        <>
                          <Txt
                            value={li.hours?.toString() || ""}
                            onChange={v => updateLineItem(i, { hours: parseFloat(v) || 0 })}
                            placeholder="Hrs"
                            type="number" step="0.1" min="0"
                            style={{ textAlign: "right" }}
                          />
                          <Txt
                            value={li.rate?.toString() || ""}
                            onChange={v => updateLineItem(i, { rate: parseFloat(v) || 0 })}
                            placeholder="Rate"
                            type="number" step="1" min="0"
                            style={{ textAlign: "right" }}
                          />
                        </>
                      )}
                      {isFixed && (
                        <Txt
                          value={li.total?.toString() || ""}
                          onChange={v => updateLineItem(i, { total: parseFloat(v) || 0 })}
                          placeholder="$"
                          type="number" step="0.01" min="0"
                          style={{ textAlign: "right" }}
                        />
                      )}
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, textAlign: "right", alignSelf: "center", paddingRight: 2 }}>
                        {fmt(isFixed ? (li.total || 0) : calcLineTotal(li))}
                      </div>
                      <button onClick={() => removeLineItem(i)} style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: C.muted, fontSize: 13, padding: 2, alignSelf: "center",
                      }}>✕</button>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.text, padding: "3px 0" }}>
                  <span>Subtotal</span><span>{fmt(subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, padding: "3px 0" }}>
                  <span>GST</span><span>$0.00 (not registered)</span>
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700,
                  padding: "8px 0", borderTop: `1px solid ${C.border}`, marginTop: 6,
                }}>
                  <span>TOTAL DUE</span><span style={{ color: C.purple }}>{fmt(subtotal)}</span>
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 14 }}>
                <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: C.text }}>Notes (optional)</p>
                <Txt value={invNotes} onChange={setInvNotes} placeholder="e.g. Public holidays included, thank you for your business..." />
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: "14px 22px", borderTop: `1px solid ${C.border}`,
              display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0,
            }}>
              <button onClick={() => setShowModal(false)} style={{
                padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                background: "transparent", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                Cancel
              </button>
              <button onClick={() => { setShowModal(false); /* print would need to save first */ }} style={{
                padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                background: C.surface, color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                Save &amp; Print
              </button>
              <button onClick={saveInvoice} style={{
                padding: "8px 16px", borderRadius: 8, border: "none",
                background: C.blue, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print overlay ──────────────────────────────────────────────────────── */}
      {printInvoice && (
        <div id="invoice-print-area" style={{ display: "none" }}>
          {/* Print-only content rendered via CSS @media print */}
        </div>
      )}

      {/* ── Print styles + inline print template ───────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print, #invoice-print * { visibility: visible; }
          #invoice-print { position: fixed; top: 0; left: 0; width: 100%; padding: 40px; }
        }
      `}</style>
      {printInvoice && (() => {
        const inv = printInvoice;
        const client = clients.find(c => c.id === inv.clientId);
        const dateStr = new Date(inv.date + "T00:00:00").toLocaleDateString("en-AU", {
          day: "numeric", month: "long", year: "numeric",
        });
        return (
          <div id="invoice-print" style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "#fff", zIndex: 9999, padding: 40, overflow: "auto",
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          }}>
            <button onClick={() => setPrintInvoice(null)} style={{
              position: "absolute", top: 12, right: 12, padding: "6px 12px",
              borderRadius: 6, border: "1px solid #ddd", background: "#f5f5f5",
              cursor: "pointer", fontSize: 12,
            }}>Close</button>

            <div style={{ maxWidth: 700, margin: "0 auto" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>INVOICE</h1>
                  <p style={{ margin: "6px 0 0", fontSize: 16, fontWeight: 600, color: "#555" }}>{inv.number}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{MY_INFO.name}</p>
                  <p style={{ margin: "2px 0", fontSize: 12, color: "#666" }}>ABN: {MY_INFO.abn}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#666" }}>{MY_INFO.address}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#666" }}>{MY_INFO.phone}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#666" }}>{MY_INFO.email}</p>
                </div>
              </div>

              {/* Bill to */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: 1 }}>Bill to</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{client?.name || "Client"}</p>
                {client?.address && <p style={{ margin: "2px 0", fontSize: 12, color: "#666" }}>{client.address}</p>}
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#666" }}>Date: {dateStr}</p>
              </div>

              {/* Line items table */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #333" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 12, fontWeight: 700 }}>Description</th>
                    {!inv.lineItems[0]?.type && <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 12, fontWeight: 700 }}>Hours</th>}
                    {!inv.lineItems[0]?.type && <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 12, fontWeight: 700 }}>Rate</th>}
                    <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 12, fontWeight: 700 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.lineItems.map((li, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "10px 12px", fontSize: 12 }}>{li.description}</td>
                      {!li.type && <td style={{ textAlign: "right", padding: "10px 12px", fontSize: 12 }}>{li.hours}</td>}
                      {!li.type && <td style={{ textAlign: "right", padding: "10px 12px", fontSize: 12 }}>${li.rate?.toFixed(2)}</td>}
                      <td style={{ textAlign: "right", padding: "10px 12px", fontSize: 12, fontWeight: 600 }}>${li.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ borderTop: "2px solid #333", paddingTop: 8, width: 300, marginLeft: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                  <span>Subtotal</span><span>${inv.subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, color: "#666" }}>
                  <span>GST</span><span>$0.00</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 18, fontWeight: 700, borderTop: "1px solid #333" }}>
                  <span>TOTAL DUE</span><span>$${inv.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment info */}
              <div style={{ marginTop: 40, padding: 16, background: "#f9f9f9", borderRadius: 8, fontSize: 12 }}>
                <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 13 }}>Payment Details</p>
                <p style={{ margin: 0 }}>Account Name: {PAY_INFO.accountName}</p>
                <p style={{ margin: "3px 0" }}>BSB: {PAY_INFO.bsb} &middot; Account: {PAY_INFO.accountNumber}</p>
                {inv.bankRef && <p style={{ margin: "3px 0 0", color: "#666" }}>Reference: {inv.bankRef}</p>}
              </div>

              {inv.notes && (
                <div style={{ marginTop: 20, fontSize: 12, color: "#666" }}>
                  <p style={{ margin: 0 }}>{inv.notes}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Shared button styles ────────────────────────────────────────────────────

const btnSm: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: 12, color: C.muted, padding: "4px 6px", borderRadius: 4,
  lineHeight: 1,
};

const btnAccent: React.CSSProperties = {
  borderRadius: 6, border: "none",
  background: C.blue, color: "#fff",
  fontWeight: 600, cursor: "pointer",
};

const DEFAULT_CLIENTS: InvoiceClient[] = [
  { id: "cl_default_hp", name: "Holland Plastics", address: "13 Distribution Ave, Molendinar QLD 4214" },
];
