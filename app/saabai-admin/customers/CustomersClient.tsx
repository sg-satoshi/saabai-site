"use client";

import { useState, useEffect } from "react";
import AdminShell from "../AdminSidebar";

const C = {
  bg:       "#07091a",
  card:     "#0e1128",
  surface:  "#131729",
  surfaceHi:"#181c32",
  border:   "rgba(255,255,255,0.07)",
  borderHi: "rgba(255,255,255,0.13)",
  text:     "#e2e4f0",
  muted:    "#525873",
  dim:      "#2a2d47",
  gold:     "#C9A84C",
  goldBg:   "rgba(201,168,76,0.08)",
  goldBdr:  "rgba(201,168,76,0.20)",
  goldHi:   "#E0BC6A",
  green:    "#22c55e",
  greenBg:  "rgba(34,197,94,0.10)",
  blue:     "#4d8ef6",
  blueBg:   "rgba(77,142,246,0.10)",
  orange:   "#ff6635",
  orangeBg: "rgba(255,102,53,0.10)",
  teal:     "#25D366",
  tealBg:   "rgba(37,211,102,0.10)",
  amber:    "#f5a623",
  red:      "#ef4444",
};

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  lex:            { label: "Lex",          color: C.blue,   bg: C.blueBg },
  "site-factory": { label: "Site Factory", color: C.gold,   bg: C.goldBg },
  stripe:         { label: "Stripe",       color: C.green,  bg: C.greenBg },
  portal:         { label: "Portal",       color: C.orange, bg: C.orangeBg },
};

const PROJECT_META: Record<string, { color: string; bg: string }> = {
  "Lex":          { color: C.blue,   bg: C.blueBg },
  "Site Factory": { color: C.gold,   bg: C.goldBg },
  "Rex":          { color: C.orange, bg: C.orangeBg },
  "Portal":       { color: C.teal,   bg: C.tealBg },
};

interface Customer {
  id: string;
  name: string;
  email: string;
  type: string;
  project: string;
  status: string;
  revenue: number;
  mrr: number;
  createdAt: number;
  detailUrl: string;
  metadata: Record<string, unknown>;
}

interface CustomerNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

function fmtAud(cents: number) {
  if (!cents) return "\u2014";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(cents / 100);
}

function fmtDate(ts: number) {
  if (!ts) return "\u2014";
  return new Date(ts).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function TypeBadge({ type }: { type: string }) {
  const m = TYPE_META[type] ?? { label: type, color: C.muted, bg: "rgba(255,255,255,0.05)" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
      color: m.color, background: m.bg, letterSpacing: 0.4, textTransform: "uppercase" as const,
      whiteSpace: "nowrap",
    }}>
      {m.label}
    </span>
  );
}

function ProjectBadge({ project }: { project: string }) {
  const m = PROJECT_META[project] ?? { color: C.muted, bg: "rgba(255,255,255,0.05)" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      color: m.color, background: m.bg, letterSpacing: 0.4,
      whiteSpace: "nowrap",
    }}>
      {project}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active" || status === "live";
  const isWarning = status === "past_due" || status === "unpaid";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
      color: isActive ? C.green : isWarning ? C.amber : C.muted,
      background: isActive ? C.greenBg : isWarning ? "rgba(245,166,35,0.10)" : "rgba(255,255,255,0.04)",
      letterSpacing: 0.5, textTransform: "uppercase" as const,
      whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
}

function DetailPanel({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const m = customer.metadata as Record<string, unknown>;
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [notesLoading, setNotesLoading] = useState(true);

  useEffect(() => {
    setNotesLoading(true);
    fetch(`/api/admin/customers/${encodeURIComponent(customer.id)}/notes`)
      .then(r => r.json())
      .then(data => setNotes(data.notes ?? []))
      .catch(() => setNotes([]))
      .finally(() => setNotesLoading(false));
  }, [customer.id]);

  async function addNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/admin/customers/${encodeURIComponent(customer.id)}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: noteText.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotes(prev => [data.note, ...prev]);
      setNoteText("");
    }
    setSaving(false);
  }

  async function deleteNote(noteId: string) {
    const res = await fetch(`/api/admin/customers/${encodeURIComponent(customer.id)}/notes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId }),
    });
    if (res.ok) setNotes(prev => prev.filter(n => n.id !== noteId));
  }

  function fmtNoteDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) + " at " +
           d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ width: 480, height: "100vh", background: C.card, borderLeft: `1px solid ${C.borderHi}`, display: "flex", flexDirection: "column", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: C.text }}>{customer.name}</p>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{customer.email || "No email"}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18, padding: "2px 4px", lineHeight: 1 }}>\u2715</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
            <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Identity</p>
            <Row label="Type" value={<TypeBadge type={customer.type} />} />
            <Row label="Project" value={<ProjectBadge project={customer.project} />} />
            <Row label="Status" value={<StatusBadge status={customer.status} />} />
            <Row label="Customer ID" value={customer.id} mono />
            {customer.createdAt > 0 && <Row label="Created" value={fmtDate(customer.createdAt)} />}
          </div>

          {(customer.revenue > 0 || customer.mrr > 0) && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
              <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Revenue</p>
              {customer.mrr > 0 && <Row label="MRR" value={fmtAud(customer.mrr)} />}
              {customer.revenue > 0 && <Row label="Total Paid" value={fmtAud(customer.revenue)} />}
            </div>
          )}

          {customer.type === "lex" && m && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
              <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Lex Config</p>
              {!!m.agentName && <Row label="Agent Name" value={String(m.agentName)} />}
              {!!m.mode && <Row label="Mode" value={String(m.mode)} />}
              {!!m.practiceAreas && Array.isArray(m.practiceAreas) && (
                <Row label="Practice Areas" value={m.practiceAreas.join(", ")} />
              )}
            </div>
          )}

          {customer.type === "site-factory" && m && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
              <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Site Details</p>
              {!!m.slug && <Row label="Slug" value={`/sites/${String(m.slug)}/`} mono />}
              {!!m.niche && <Row label="Niche" value={String(m.niche)} />}
              {!!m.phone && <Row label="Phone" value={String(m.phone)} />}
              {!!m.address && <Row label="Address" value={String(m.address)} />}
              {!!m.description && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, color: C.muted }}>Description</p>
                  <p style={{ margin: 0, fontSize: 12, color: C.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{String(m.description)}</p>
                </div>
              )}
            </div>
          )}

          {customer.type === "stripe" && m && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
              <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Subscription</p>
              {!!m.plan && <Row label="Plan" value={String(m.plan)} />}
              {!!m.currentPeriodEnd && (
                <Row label="Current Period Ends" value={fmtDate(Number(m.currentPeriodEnd) * 1000)} />
              )}
            </div>
          )}

          {customer.type === "portal" && m && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
              <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Portal Access</p>
              {!!m.clientId && <Row label="Client ID" value={String(m.clientId)} mono />}
              {!!m.dashboardUrl && <Row label="Dashboard" value={String(m.dashboardUrl)} mono />}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {customer.detailUrl && (
              <a
                href={customer.detailUrl}
                target={customer.detailUrl.startsWith("http") ? "_blank" : undefined}
                rel={customer.detailUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "10px 0", borderRadius: 8,
                  background: C.goldBg, border: `1px solid ${C.goldBdr}`,
                  color: C.gold, fontSize: 13, fontWeight: 700, textDecoration: "none",
                }}
              >
                {customer.type === "site-factory" ? "Open Site \u2197" : customer.type === "lex" ? "Open Lex Clients" : customer.type === "stripe" ? "View Orders" : "Open Dashboard \u2197"}
              </a>
            )}
          </div>

          {/* Notes */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
            <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Notes</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add a note..."
                rows={2}
                style={{
                  flex: 1, padding: "8px 10px", borderRadius: 6,
                  border: `1px solid ${C.border}`, background: C.card, color: C.text,
                  fontSize: 12, resize: "vertical", outline: "none", fontFamily: "inherit",
                }}
              />
              <button
                onClick={addNote}
                disabled={saving || !noteText.trim()}
                style={{
                  padding: "8px 14px", borderRadius: 6, cursor: saving || !noteText.trim() ? "not-allowed" : "pointer",
                  background: C.goldBg, border: `1px solid ${C.goldBdr}`,
                  color: C.gold, fontSize: 12, fontWeight: 700,
                  opacity: saving || !noteText.trim() ? 0.5 : 1,
                  whiteSpace: "nowrap", alignSelf: "flex-start",
                }}
              >
                {saving ? "Saving..." : "Add"}
              </button>
            </div>
            {notesLoading ? (
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Loading notes...</p>
            ) : notes.length === 0 ? (
              <p style={{ margin: 0, fontSize: 11, color: C.muted, fontStyle: "italic" }}>No notes yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {notes.map(note => (
                  <div key={note.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                    <p style={{ margin: "0 0 6px", fontSize: 12, color: C.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{note.text}</p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, color: C.muted }}>{note.author} \u00b7 {fmtNoteDate(note.createdAt)}</span>
                      <button
                        onClick={() => deleteNote(note.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: C.red, fontSize: 10, opacity: 0.6, padding: 2 }}
                        title="Delete note"
                      >
                        \u2715
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, gap: 12 }}>
      <span style={{ fontSize: 11, color: C.muted, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: C.text, textAlign: "right" as const, fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all" as const }}>
        {value}
      </span>
    </div>
  );
}

function ExportButton({ customers }: { customers: Customer[] }) {
  function downloadCsv() {
    const headers = ["Name", "Email", "Type", "Project", "Status", "MRR", "Revenue", "Since"];
    const rows = customers.map(c => [
      c.name,
      c.email,
      c.type,
      c.project,
      c.status,
      c.mrr ? (c.mrr / 100).toFixed(2) : "",
      c.revenue ? (c.revenue / 100).toFixed(2) : "",
      c.createdAt ? new Date(c.createdAt).toISOString() : "",
    ]);

    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = [headers.join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={downloadCsv}
      disabled={customers.length === 0}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 14px", borderRadius: 8, cursor: customers.length === 0 ? "not-allowed" : "pointer",
        background: C.goldBg, border: `1px solid ${C.goldBdr}`,
        color: C.gold, fontSize: 12, fontWeight: 700,
        opacity: customers.length === 0 ? 0.5 : 1,
      }}
    >
      \u2193 Export CSV
    </button>
  );
}

export default function CustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/customers")
      .then(r => r.json())
      .then(data => {
        setCustomers(data.customers ?? []);
      })
      .catch(() => setError("Failed to load customers."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c => {
    const matchesType = filterType === "all" || c.type === filterType;
    const matchesProject = filterProject === "all" || c.project === filterProject;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    return matchesType && matchesProject && matchesSearch;
  });

  const totalRevenue = customers.reduce((s, c) => s + c.revenue, 0);
  const totalMrr = customers.reduce((s, c) => s + c.mrr, 0);
  const activeCount = customers.filter(c => c.status === "active" || c.status === "live").length;

  const types = ["all", ...Array.from(new Set(customers.map(c => c.type)))];
  const projects = ["all", ...Array.from(new Set(customers.map(c => c.project)))];

  const th: React.CSSProperties = {
    textAlign: "left", padding: "10px 16px 10px", fontSize: 10, fontWeight: 700,
    letterSpacing: 1, color: C.muted, textTransform: "uppercase" as const, borderBottom: `1px solid ${C.border}`,
  };

  const td: React.CSSProperties = {
    padding: "12px 16px", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}`,
  };

  return (
    <AdminShell activePath="/saabai-admin/customers">
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: -0.3 }}>Customers</h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>Unified directory \u2014 all clients across Lex, Site Factory, Rex, and Stripe</p>
        </div>
        <ExportButton customers={filtered} />
      </div>

      <div style={{ padding: "28px 32px 64px", display: "flex", flexDirection: "column", gap: 20 }}>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            { label: "Total customers", value: customers.length.toString(), sub: "across all projects" },
            { label: "Active", value: activeCount.toString(), sub: "live subscriptions" },
            { label: "MRR", value: fmtAud(totalMrr), sub: "monthly recurring", highlight: true },
            { label: "Total revenue", value: fmtAud(totalRevenue), sub: "all time" },
          ].map(s => (
            <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
              <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase" as const }}>{s.label}</p>
              <p style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 800, color: s.highlight ? C.gold : C.text, letterSpacing: -0.5 }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{s.sub}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customers..."
              style={{
                width: "100%", padding: "8px 12px 8px 32px", borderRadius: 8,
                border: `1px solid ${C.border}`, background: C.surface, color: C.text,
                fontSize: 13, outline: "none",
              }}
            />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.muted }}>\ud83d\udd0d</span>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {types.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 20, cursor: "pointer",
                  border: `1px solid ${filterType === t ? C.goldBdr : C.border}`,
                  background: filterType === t ? C.goldBg : "rgba(255,255,255,0.03)",
                  color: filterType === t ? C.gold : C.muted,
                  textTransform: "capitalize" as const,
                }}
              >
                {t === "all" ? "All" : t === "site-factory" ? "Site Factory" : t}
                {t !== "all" && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>{customers.filter(c => c.type === t).length}</span>}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {projects.map(p => (
              <button
                key={p}
                onClick={() => setFilterProject(p)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 20, cursor: "pointer",
                  border: `1px solid ${filterProject === p ? C.goldBdr : C.border}`,
                  background: filterProject === p ? C.goldBg : "rgba(255,255,255,0.03)",
                  color: filterProject === p ? C.gold : C.muted,
                }}
              >
                {p === "all" ? "All Projects" : p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          {loading ? (
            <p style={{ margin: 0, padding: "32px", textAlign: "center", color: C.muted, fontSize: 13 }}>Loading customers\u2026</p>
          ) : error ? (
            <p style={{ margin: 0, padding: "32px", textAlign: "center", color: C.red, fontSize: 13 }}>{error}</p>
          ) : filtered.length === 0 ? (
            <p style={{ margin: 0, padding: "32px", textAlign: "center", color: C.muted, fontSize: 13 }}>No customers found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Customer</th>
                  <th style={th}>Type</th>
                  <th style={th}>Project</th>
                  <th style={th}>Status</th>
                  <th style={th}>MRR</th>
                  <th style={th}>Revenue</th>
                  <th style={th}>Since</th>
                  <th style={{ ...th, textAlign: "right" as const }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)", cursor: "pointer" }} onClick={() => setSelected(c)}>
                    <td style={td}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>{c.email || "\u2014"}</p>
                    </td>
                    <td style={td}><TypeBadge type={c.type} /></td>
                    <td style={td}><ProjectBadge project={c.project} /></td>
                    <td style={td}><StatusBadge status={c.status} /></td>
                    <td style={{ ...td, fontWeight: 600, color: c.mrr > 0 ? C.green : C.muted }}>{c.mrr > 0 ? fmtAud(c.mrr) : "\u2014"}</td>
                    <td style={{ ...td, fontWeight: 700, color: c.revenue > 0 ? C.gold : C.muted }}>{c.revenue > 0 ? fmtAud(c.revenue) : "\u2014"}</td>
                    <td style={{ ...td, color: C.muted }}>{fmtDate(c.createdAt)}</td>
                    <td style={{ ...td, textAlign: "right" as const }}>
                      <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>View \u2192</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p style={{ margin: 0, fontSize: 11, color: C.muted }}>
          Showing {filtered.length} of {customers.length} customers
          {filterType !== "all" && ` \u00b7 filtered by type`}
          {filterProject !== "all" && ` \u00b7 filtered by project`}
          {search.trim() && ` \u00b7 matching "${search.trim()}"`}
        </p>
      </div>

      {selected && <DetailPanel customer={selected} onClose={() => setSelected(null)} />}
    </AdminShell>
  );
}
