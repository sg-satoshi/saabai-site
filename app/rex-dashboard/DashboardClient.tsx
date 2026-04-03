"use client";

import { useState, useEffect } from "react";
import type { RexStats, LeadEvent, FeedbackItem, FeedbackCategory } from "../../lib/rex-stats";
import RexNav from "../components/RexNav";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function fullTime(ts: string): string {
  return new Date(ts).toLocaleString("en-AU", {
    timeZone: "Australia/Brisbane",
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtPrice(v: number): string {
  if (!v) return "—";
  return `$${v.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pct(a: number, b: number): string {
  if (!b) return "—";
  return `${Math.round((a / b) * 100)}%`;
}

const SOURCE_LABELS: Record<string, string> = {
  rex_quote_email: "Quote form",
  rex_mid_chat:    "Mid-chat",
  pete_ended:      "End panel",
  rex_quick_reply: "Quick reply",
};

const CATEGORY_META: Record<FeedbackCategory, { label: string; color: string; bg: string }> = {
  pricing_error:  { label: "Pricing Error",   color: "#dc2626", bg: "#fef2f2" },
  wrong_material: { label: "Wrong Material",  color: "#d97706", bg: "#fffbeb" },
  missed_upsell:  { label: "Missed Upsell",   color: "#7c3aed", bg: "#f5f3ff" },
  bad_tone:       { label: "Bad Tone",        color: "#0369a1", bg: "#f0f9ff" },
  missing_info:   { label: "Missing Info",    color: "#059669", bg: "#f0fdf4" },
  other:          { label: "Other",           color: "#6b7280", bg: "#f9fafb" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  submitted:   { label: "Submitted",    color: "#6b7280", bg: "#f3f4f6" },
  reviewed:    { label: "Atlas Reviewed", color: "#2563eb", bg: "#eff6ff" },
  approved:    { label: "Approved",     color: "#059669", bg: "#f0fdf4" },
  implemented: { label: "Implemented",  color: "#e13f00", bg: "#fff5f2" },
};

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  label:   { fontSize: 11, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 1.2, fontWeight: 700 },
  heading: { fontSize: 13, color: "#111827", fontWeight: 700 },
  body:    { fontSize: 13, color: "#374151" },
  muted:   { fontSize: 12, color: "#6b7280" },
  card:    { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
};

// ── Components ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = false }: {
  label: string; value: string | number; sub?: string; accent?: boolean;
}) {
  return (
    <div style={{
      ...T.card, padding: "20px 24px",
      borderTop: accent ? "3px solid #e13f00" : "3px solid #e5e7eb",
    }}>
      <p style={{ ...T.label, margin: "0 0 8px" }}>{label}</p>
      <p style={{ margin: "0 0 4px", fontSize: 34, fontWeight: 800, color: accent ? "#e13f00" : "#111827", letterSpacing: -1.5, lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ ...T.muted, margin: 0 }}>{sub}</p>}
    </div>
  );
}

function BarChart({ days }: { days: { label: string; count: number }[] }) {
  const max = Math.max(...days.map(d => d.count), 1);
  const last14 = days.slice(-14);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
      {last14.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
            <div
              title={`${d.label}: ${d.count} lead${d.count !== 1 ? "s" : ""}`}
              style={{
                width: "100%",
                height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2)}%`,
                background: d.count > 0 ? "#e13f00" : "#f3f4f6",
                borderRadius: "4px 4px 0 0",
                transition: "height 0.3s ease",
              }}
            />
          </div>
          {i % 2 === 0 && (
            <span style={{ fontSize: 9, color: "#9ca3af", whiteSpace: "nowrap", transform: "rotate(-35deg)", transformOrigin: "top center" }}>
              {d.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function HBar({ label, count, max, color = "#e13f00" }: { label: string; count: number; max: number; color?: string }) {
  const p = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ ...T.body, fontWeight: 600 }}>{label}</span>
        <span style={{ ...T.body, fontWeight: 700, color: "#111827" }}>{count}</span>
      </div>
      <div style={{ height: 6, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${p}%`, background: color, borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ ...T.card, padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ ...T.label, margin: 0 }}>{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{
      background: bg, color, padding: "3px 9px", borderRadius: 6,
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    }}>{text}</span>
  );
}

// ── Lead Detail Panel ─────────────────────────────────────────────────────────

function LeadDetailPanel({ lead, onClose }: { lead: LeadEvent; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)",
          zIndex: 40, backdropFilter: "blur(2px)",
        }}
      />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
        background: "#fff", zIndex: 50,
        borderLeft: "1px solid #e5e7eb",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.08)",
        display: "flex", flexDirection: "column",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 800, color: "#111827" }}>
              {lead.name ?? "Anonymous Lead"}
            </p>
            <p style={{ ...T.muted, margin: 0 }}>{fullTime(lead.timestamp)}</p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb", cursor: "pointer", fontSize: 16, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Key fields */}
          <div style={{ ...T.card, padding: "16px 20px", marginBottom: 16 }}>
            {[
              { label: "Email",    value: lead.email },
              { label: "Material", value: lead.material },
              { label: "Price",    value: lead.price },
              { label: "Despatch", value: lead.despatch },
              { label: "Source",   value: SOURCE_LABELS[lead.source ?? ""] ?? lead.source },
            ].map(({ label, value }) => value ? (
              <div key={label} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ ...T.muted, width: 72, flexShrink: 0, paddingTop: 1 }}>{label}</span>
                <span style={{ ...T.body, fontWeight: label === "Price" ? 700 : 500, color: label === "Price" ? "#e13f00" : "#111827", fontFamily: label === "Email" ? "monospace" : undefined, fontSize: label === "Email" ? 12 : 13 }}>
                  {value}
                </span>
              </div>
            ) : null)}
          </div>

          {/* Summary */}
          {lead.summary && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ ...T.label, margin: "0 0 8px" }}>Conversation Summary</p>
              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderLeft: "3px solid #e13f00", borderRadius: 10, padding: "14px 16px" }}>
                <p style={{ ...T.body, margin: 0, lineHeight: 1.7 }}>{lead.summary}</p>
              </div>
            </div>
          )}

          {!lead.summary && (
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ ...T.muted, margin: 0, fontStyle: "italic" }}>Conversation summary available for leads captured after the 3 Apr 2026 update.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Leads Table ───────────────────────────────────────────────────────────────

function LeadsTable({ leads, onSelect }: { leads: LeadEvent[]; onSelect: (lead: LeadEvent) => void }) {
  if (!leads.length) {
    return <p style={{ ...T.muted, margin: 0 }}>No leads yet — they&apos;ll appear here as they come in.</p>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {["Time", "Name", "Email", "Material", "Price", "Despatch", "Source"].map(h => (
              <th key={h} style={{
                textAlign: "left", padding: "0 12px 10px 0",
                ...T.label, borderBottom: "2px solid #e5e7eb",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, i) => (
            <tr
              key={i}
              onClick={() => onSelect(lead)}
              style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "11px 12px 11px 0", color: "#6b7280", whiteSpace: "nowrap", fontSize: 12 }}>
                {timeAgo(lead.timestamp)}
              </td>
              <td style={{ padding: "11px 12px 11px 0", color: "#111827", fontWeight: 600 }}>
                {lead.name ?? <span style={{ color: "#d1d5db" }}>—</span>}
              </td>
              <td style={{ padding: "11px 12px 11px 0", color: "#374151", fontFamily: "monospace", fontSize: 12 }}>
                {lead.email ?? <span style={{ color: "#d1d5db" }}>—</span>}
              </td>
              <td style={{ padding: "11px 12px 11px 0" }}>
                {lead.material ? (
                  <span style={{ background: "#fff5f2", color: "#e13f00", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                    {lead.material}
                  </span>
                ) : <span style={{ color: "#d1d5db" }}>—</span>}
              </td>
              <td style={{ padding: "11px 12px 11px 0", color: lead.priceValue ? "#111827" : "#d1d5db", fontWeight: lead.priceValue ? 800 : 400, fontSize: 13 }}>
                {lead.price ?? "—"}
              </td>
              <td style={{ padding: "11px 12px 11px 0", color: "#374151" }}>
                {lead.despatch ?? <span style={{ color: "#d1d5db" }}>—</span>}
              </td>
              <td style={{ padding: "11px 0 11px 0", color: "#6b7280", fontSize: 12 }}>
                {SOURCE_LABELS[lead.source ?? ""] ?? lead.source ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Feedback Tab ──────────────────────────────────────────────────────────────

const CATEGORIES: FeedbackCategory[] = [
  "pricing_error", "wrong_material", "missed_upsell", "bad_tone", "missing_info", "other",
];

function FeedbackTab({ recentLeads }: { recentLeads: LeadEvent[] }) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState("");
  const [leadRef, setLeadRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/rex-feedback")
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    if (!category || !message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/rex-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message, leadRef: leadRef || undefined }),
      });
      const newItem = await res.json() as FeedbackItem;
      setItems(prev => [newItem, ...prev]);
      setCategory(null);
      setMessage("");
      setLeadRef("");
      setJustSubmitted(true);
      setExpandedId(newItem.id);
      setTimeout(() => setJustSubmitted(false), 3000);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/rex-feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const now = new Date().toISOString();
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        status: status as FeedbackItem["status"],
        ...(status === "approved"    ? { approvedAt: now }    : {}),
        ...(status === "implemented" ? { implementedAt: now } : {}),
      };
    }));
  }

  return (
    <div>
      {/* Submit Form */}
      <div style={{ ...T.card, padding: "24px 28px", marginBottom: 20 }}>
        <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "#111827" }}>Submit Rex Feedback</p>
        <p style={{ ...T.muted, margin: "0 0 20px", fontSize: 13 }}>
          Spotted something Rex got wrong? Report it here — Atlas will review it instantly and propose a fix.
        </p>

        {/* Category pills */}
        <p style={{ ...T.label, margin: "0 0 10px" }}>Category</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat];
            const active = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(active ? null : cat)}
                style={{
                  padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: active ? `2px solid ${meta.color}` : "2px solid #e5e7eb",
                  background: active ? meta.bg : "#fff",
                  color: active ? meta.color : "#374151",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >{meta.label}</button>
            );
          })}
        </div>

        {/* Text area */}
        <p style={{ ...T.label, margin: "0 0 10px" }}>Describe the Issue</p>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="e.g. Rex quoted $180 for 6mm clear acrylic 600×600mm but the correct price is $203. Customer noticed the discrepancy."
          rows={4}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "12px 14px", fontSize: 13, lineHeight: 1.6,
            color: "#111827", background: "#f9fafb",
            border: "1px solid #e5e7eb", borderRadius: 10,
            resize: "vertical", outline: "none",
            fontFamily: "inherit",
          }}
        />

        {/* Optional lead reference */}
        {recentLeads.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p style={{ ...T.label, margin: "0 0 8px" }}>Link a Lead (optional)</p>
            <select
              value={leadRef}
              onChange={e => setLeadRef(e.target.value)}
              style={{
                padding: "8px 12px", fontSize: 13, color: "#374151",
                background: "#f9fafb", border: "1px solid #e5e7eb",
                borderRadius: 8, outline: "none", width: "100%",
              }}
            >
              <option value="">— No specific lead —</option>
              {recentLeads.slice(0, 20).map((lead, i) => (
                <option key={i} value={lead.timestamp}>
                  {timeAgo(lead.timestamp)} · {lead.name ?? "Anonymous"} · {lead.material ?? "unknown"} · {lead.price ?? "no price"}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Submit */}
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={handleSubmit}
            disabled={!category || !message.trim() || submitting}
            style={{
              padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: category && message.trim() ? "#e13f00" : "#e5e7eb",
              color: category && message.trim() ? "#fff" : "#9ca3af",
              border: "none", cursor: category && message.trim() ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
          >
            {submitting ? "Submitting & reviewing…" : "Submit to Atlas"}
          </button>
          {justSubmitted && (
            <p style={{ ...T.body, margin: 0, color: "#059669", fontWeight: 600 }}>
              ✓ Submitted — Atlas review complete
            </p>
          )}
        </div>
      </div>

      {/* Resolution stats */}
      {items.length > 0 && (() => {
        const valid       = items.filter(i => i.atlasReview?.valid);
        const approved    = items.filter(i => i.status === "approved" || i.status === "implemented");
        const implemented = items.filter(i => i.status === "implemented");
        const resolutionRate = valid.length > 0 ? Math.round((implemented.length / valid.length) * 100) : 0;

        const avgMs = implemented
          .filter(i => i.approvedAt)
          .map(i => new Date(i.approvedAt!).getTime() - new Date(i.submittedAt).getTime());
        const avgHours = avgMs.length > 0
          ? Math.round(avgMs.reduce((s, v) => s + v, 0) / avgMs.length / 3600000)
          : null;

        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total Reports",      value: String(items.length) },
              { label: "Atlas Valid Issues",  value: String(valid.length) },
              { label: "Approved / Acting",  value: String(approved.length) },
              { label: "Implemented",        value: String(implemented.length), sub: avgHours !== null ? `avg ${avgHours}h to action` : resolutionRate > 0 ? `${resolutionRate}% resolved` : undefined },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{ ...T.card, padding: "14px 18px" }}>
                <p style={{ ...T.label, margin: "0 0 6px" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: -1 }}>{value}</p>
                {sub && <p style={{ ...T.muted, margin: "2px 0 0", fontSize: 11 }}>{sub}</p>}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Feedback list */}
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ ...T.label, margin: 0 }}>Submitted Feedback ({items.length})</p>
      </div>

      {loading && (
        <div style={{ ...T.card, padding: "24px", textAlign: "center" }}>
          <p style={{ ...T.muted, margin: 0 }}>Loading…</p>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div style={{ ...T.card, padding: "32px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#111827", fontWeight: 600, margin: "0 0 4px" }}>No feedback yet</p>
          <p style={{ ...T.muted, margin: 0 }}>Submit your first report above — Atlas will review it in seconds.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map(item => {
          const catMeta = CATEGORY_META[item.category];
          const statusMeta = STATUS_META[item.status] ?? STATUS_META.submitted;
          const isExpanded = expandedId === item.id;
          const ar = item.atlasReview;

          return (
            <div key={item.id} style={{ ...T.card, overflow: "hidden" }}>
              {/* Item header */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                style={{ padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <Badge text={catMeta.label} color={catMeta.color} bg={catMeta.bg} />
                    <Badge text={statusMeta.label} color={statusMeta.color} bg={statusMeta.bg} />
                    <span style={{ ...T.muted }}>{timeAgo(item.submittedAt)}</span>
                    {item.approvedAt    && <span style={{ ...T.muted, fontSize: 11 }}>· approved {timeAgo(item.approvedAt)}</span>}
                    {item.implementedAt && <span style={{ ...T.muted, fontSize: 11 }}>· implemented {timeAgo(item.implementedAt)}</span>}
                  </div>
                  <p style={{ ...T.body, margin: 0, fontWeight: 500, lineHeight: 1.5 }}>{item.message}</p>
                </div>
                <span style={{ color: "#9ca3af", fontSize: 14, marginTop: 2, flexShrink: 0 }}>
                  {isExpanded ? "▲" : "▼"}
                </span>
              </div>

              {/* Expanded: Atlas review + actions */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid #f3f4f6" }}>
                  {ar ? (
                    <div style={{ padding: "16px 20px", background: "#f8faff", borderLeft: "3px solid #2563eb" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: 1 }}>Atlas Review</span>
                        <Badge
                          text={ar.confidence === "high" ? "High confidence" : ar.confidence === "medium" ? "Medium confidence" : "Low confidence"}
                          color={ar.confidence === "high" ? "#059669" : ar.confidence === "medium" ? "#d97706" : "#6b7280"}
                          bg={ar.confidence === "high" ? "#f0fdf4" : ar.confidence === "medium" ? "#fffbeb" : "#f9fafb"}
                        />
                        <Badge
                          text={ar.valid ? "Valid issue" : "Not an issue"}
                          color={ar.valid ? "#dc2626" : "#6b7280"}
                          bg={ar.valid ? "#fef2f2" : "#f3f4f6"}
                        />
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <p style={{ ...T.label, margin: "0 0 4px" }}>Root Cause</p>
                        <p style={{ ...T.body, margin: 0, fontWeight: 500, lineHeight: 1.6 }}>{ar.rootCause}</p>
                      </div>

                      <div>
                        <p style={{ ...T.label, margin: "0 0 4px" }}>Recommendation</p>
                        <p style={{ ...T.body, margin: 0, lineHeight: 1.6 }}>{ar.recommendation}</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "12px 20px", background: "#f9fafb" }}>
                      <p style={{ ...T.muted, margin: 0, fontStyle: "italic" }}>Atlas review pending.</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  {(item.status === "reviewed" || item.status === "submitted") && (
                    <div style={{ padding: "12px 20px", display: "flex", gap: 8, borderTop: "1px solid #f3f4f6" }}>
                      <button
                        onClick={() => updateStatus(item.id, "approved")}
                        style={{ padding: "7px 16px", fontSize: 12, fontWeight: 700, borderRadius: 8, border: "1px solid #d1fae5", background: "#f0fdf4", color: "#059669", cursor: "pointer" }}
                      >
                        Approve Fix
                      </button>
                      <button
                        onClick={() => updateStatus(item.id, "submitted")}
                        style={{ padding: "7px 16px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer" }}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {item.status === "approved" && (
                    <div style={{ padding: "12px 20px", display: "flex", gap: 8, borderTop: "1px solid #f3f4f6" }}>
                      <button
                        onClick={() => updateStatus(item.id, "implemented")}
                        style={{ padding: "7px 16px", fontSize: 12, fontWeight: 700, borderRadius: 8, border: "1px solid #ffe0d6", background: "#fff5f2", color: "#e13f00", cursor: "pointer" }}
                      >
                        Mark Implemented
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

type Tab = "overview" | "leads" | "feedback";

export default function DashboardClient({ stats }: { stats: RexStats }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedLead, setSelectedLead] = useState<LeadEvent | null>(null);

  const topMaterials = Object.entries(stats.materials).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxMaterial  = topMaterials[0]?.[1] ?? 1;
  const topSources   = Object.entries(stats.sources).sort((a, b) => b[1] - a[1]);

  const pickupCount   = stats.despatch?.pickup   ?? 0;
  const deliveryCount = stats.despatch?.delivery ?? 0;
  const totalDespatch = pickupCount + deliveryCount;

  const todayStr   = new Date(Date.now() + 10 * 3600 * 1000).toISOString().slice(0, 10);
  const todayCount = stats.dailyCounts.find(d => d.date === todayStr)?.count ?? 0;
  const weekCount  = stats.dailyCounts.slice(-7).reduce((s, d) => s + d.count, 0);

  const hasData = stats.total > 0;

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "leads",    label: `Leads${stats.recentLeads.length > 0 ? ` (${stats.recentLeads.length})` : ""}` },
    { id: "feedback", label: "Rex Feedback" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#f9fafb",
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      color: "#111827",
    }}>
      <RexNav />

      {/* Sub-nav */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 2, height: 44, alignItems: "center" }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                border: "none", cursor: "pointer", transition: "all 0.15s",
                background: tab === t.id ? "#fff5f2" : "transparent",
                color: tab === t.id ? "#e13f00" : "#374151",
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px 64px" }}>

        {!hasData && tab !== "feedback" && (
          <div style={{ ...T.card, padding: "32px", textAlign: "center", marginBottom: 28 }}>
            <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#111827" }}>Tracking is live</p>
            <p style={{ ...T.muted, margin: 0 }}>Stats will appear here as leads come in through Rex.</p>
          </div>
        )}

        {/* ── Overview tab ── */}
        {tab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              <StatCard label="Total Leads"      value={stats.total}           sub={`${todayCount} today · ${weekCount} this week`} accent />
              <StatCard label="Email Captured"   value={pct(stats.withEmail, stats.total)} sub={`${stats.withEmail} of ${stats.total}`} />
              <StatCard label="Quotes with Price" value={stats.withPrice}       sub={pct(stats.withPrice, stats.total) + " of leads"} />
              <StatCard label="Avg Quote Value"  value={fmtPrice(stats.avgPrice)} sub="Ex GST" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
              <Section title="Daily Leads — Last 14 Days">
                {stats.dailyCounts.some(d => d.count > 0)
                  ? <BarChart days={stats.dailyCounts} />
                  : <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ ...T.muted, margin: 0 }}>No data yet</p></div>
                }
              </Section>
              <Section title="Lead Sources">
                {topSources.length > 0
                  ? topSources.map(([source, count]) => <HBar key={source} label={SOURCE_LABELS[source] ?? source} count={count} max={topSources[0][1]} />)
                  : <p style={{ ...T.muted, margin: 0 }}>No data yet</p>}
              </Section>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
              <Section title="Material Mix">
                {topMaterials.length > 0
                  ? topMaterials.map(([mat, count]) => <HBar key={mat} label={mat} count={count} max={maxMaterial} />)
                  : <p style={{ ...T.muted, margin: 0 }}>No data yet</p>}
              </Section>

              <Section title="Fulfilment Preference">
                {totalDespatch > 0 ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 20 }}>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, color: "#111827" }}>
                          {Math.round((pickupCount / totalDespatch) * 100)}%
                        </p>
                        <p style={{ ...T.muted, margin: 0, fontWeight: 600 }}>Pick Up</p>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, color: "#e13f00" }}>
                          {Math.round((deliveryCount / totalDespatch) * 100)}%
                        </p>
                        <p style={{ ...T.muted, margin: 0, fontWeight: 600 }}>Delivery</p>
                      </div>
                    </div>
                    <div style={{ height: 8, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(pickupCount / totalDespatch) * 100}%`, background: "linear-gradient(90deg, #d1d5db 0%, #e13f00 100%)" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ ...T.muted, fontSize: 11 }}>Pick Up ({pickupCount})</span>
                      <span style={{ ...T.muted, fontSize: 11 }}>Delivery ({deliveryCount})</span>
                    </div>
                  </>
                ) : <p style={{ ...T.muted, margin: 0 }}>No data yet</p>}
              </Section>
            </div>

            <Section title="Recent Leads" action={
              <button onClick={() => setTab("leads")} style={{ ...T.muted, background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
                View all →
              </button>
            }>
              <LeadsTable leads={stats.recentLeads.slice(0, 5)} onSelect={setSelectedLead} />
            </Section>
          </>
        )}

        {/* ── Leads tab ── */}
        {tab === "leads" && (
          <Section title={`All Recent Leads (${stats.recentLeads.length})`}>
            <LeadsTable leads={stats.recentLeads} onSelect={setSelectedLead} />
          </Section>
        )}

        {/* ── Feedback tab ── */}
        {tab === "feedback" && (
          <FeedbackTab recentLeads={stats.recentLeads} />
        )}

        <p style={{ marginTop: 32, textAlign: "center", ...T.muted }}>
          {stats.trackingSince
            ? `Tracking since ${new Date(stats.trackingSince).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`
            : "Tracking active"
          }
          {" · "}
          <a href="/rex-dashboard" style={{ color: "#374151", textDecoration: "none", fontWeight: 600 }}>Refresh</a>
        </p>
      </div>

      {/* Lead detail slide-out */}
      {selectedLead && (
        <LeadDetailPanel lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}
