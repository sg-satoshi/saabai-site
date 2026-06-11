"use client";

/**
 * AI Audits — engagement pipeline list + create new engagement.
 */

import { useEffect, useState } from "react";
import AdminShell from "../AdminSidebar";

const C = {
  card: "#ffffff",
  border: "rgba(0,0,0,0.08)",
  text: "#111827",
  muted: "#9ca3af",
  gold: "#b45309",
  goldBg: "rgba(180,83,9,0.08)",
  green: "#16a34a",
  greenBg: "rgba(22,163,74,0.08)",
  blue: "#2563eb",
  blueBg: "rgba(37,99,235,0.08)",
  teal: "#0891b2",
  tealBg: "rgba(8,145,178,0.08)",
  red: "#dc2626",
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  purchased: { label: "Purchased", color: C.muted, bg: "rgba(0,0,0,0.05)" },
  questionnaire_sent: { label: "Questionnaire Sent", color: C.blue, bg: C.blueBg },
  factfind_complete: { label: "Fact-Find Complete", color: C.teal, bg: C.tealBg },
  discovery: { label: "Discovery", color: C.gold, bg: C.goldBg },
  assessment: { label: "Assessment", color: C.gold, bg: C.goldBg },
  report: { label: "Report", color: C.blue, bg: C.blueBg },
  delivered: { label: "Delivered", color: C.green, bg: C.greenBg },
  closed: { label: "Closed", color: C.muted, bg: "rgba(0,0,0,0.05)" },
};

const TIER_LABELS: Record<string, string> = {
  essential: "Essential",
  professional: "Professional",
  enterprise: "Enterprise",
};

interface Engagement {
  id: string;
  createdAt: string;
  tier: string;
  status: string;
  firmName: string;
  firmType: string;
  contactName: string;
  contactEmail: string;
  factFindCompletedAt?: string;
}

export default function AuditsClient() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    firmName: "",
    firmType: "law",
    tier: "professional",
    contactName: "",
    contactEmail: "",
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/audit/engagements");
      const data = await res.json();
      setEngagements(data.engagements ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!form.firmName || !form.contactName || !form.contactEmail) {
      setError("Firm name, contact name and email are required.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/engagements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create");
        return;
      }
      window.location.href = `/saabai-admin/audits/${data.engagement.id}`;
    } finally {
      setCreating(false);
    }
  }

  const input: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    fontSize: 13.5,
    color: C.text,
    outline: "none",
    background: "#fff",
  };

  return (
    <AdminShell activePath="/saabai-admin/audits">
      <div style={{ padding: "32px 36px", maxWidth: 1100 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>AI Audits</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0" }}>
              Engagement pipeline — fact-find, discovery, assessment, report.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            style={{
              background: "#0e0c2e",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {showCreate ? "Cancel" : "+ New Engagement"}
          </button>
        </div>

        {showCreate && (
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 14,
            }}
          >
            <div style={{ gridColumn: "1 / -1", fontWeight: 600, fontSize: 14, color: C.text }}>
              New Audit Engagement
            </div>
            <input
              style={input}
              placeholder="Firm name *"
              value={form.firmName}
              onChange={(e) => setForm({ ...form, firmName: e.target.value })}
            />
            <select
              style={input}
              value={form.firmType}
              onChange={(e) => setForm({ ...form, firmType: e.target.value })}
            >
              <option value="law">Law firm</option>
              <option value="accounting">Accounting</option>
              <option value="real-estate">Real estate</option>
              <option value="financial-advisory">Financial advisory</option>
              <option value="other">Other</option>
            </select>
            <select
              style={input}
              value={form.tier}
              onChange={(e) => setForm({ ...form, tier: e.target.value })}
            >
              <option value="essential">Essential — $3,500</option>
              <option value="professional">Professional — $7,500</option>
              <option value="enterprise">Enterprise — $15,000</option>
            </select>
            <input
              style={input}
              placeholder="Contact name *"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            />
            <input
              style={input}
              placeholder="Contact email *"
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            />
            <button
              onClick={create}
              disabled={creating}
              style={{
                background: "#0e0c2e",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "9px 16px",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                opacity: creating ? 0.6 : 1,
              }}
            >
              {creating ? "Creating…" : "Create engagement"}
            </button>
            {error && (
              <div style={{ gridColumn: "1 / -1", color: C.red, fontSize: 13 }}>{error}</div>
            )}
          </div>
        )}

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: 13.5 }}>Loading…</div>
          ) : engagements.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: 13.5 }}>
              No engagements yet. Create one when an audit is purchased.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Firm", "Tier", "Contact", "Status", "Created"].map((h) => (
                    <th
                      key={h}
                      style={{ textAlign: "left", padding: "12px 16px", color: C.muted, fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {engagements.map((e) => {
                  const meta = STATUS_META[e.status] ?? STATUS_META.purchased;
                  return (
                    <tr
                      key={e.id}
                      onClick={() => (window.location.href = `/saabai-admin/audits/${e.id}`)}
                      style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                    >
                      <td style={{ padding: "13px 16px", fontWeight: 600, color: C.text }}>{e.firmName}</td>
                      <td style={{ padding: "13px 16px", color: C.text }}>{TIER_LABELS[e.tier] ?? e.tier}</td>
                      <td style={{ padding: "13px 16px", color: C.text }}>
                        {e.contactName}
                        <span style={{ color: C.muted }}> · {e.contactEmail}</span>
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <span
                          style={{
                            background: meta.bg,
                            color: meta.color,
                            padding: "3px 10px",
                            borderRadius: 99,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px", color: C.muted }}>
                        {new Date(e.createdAt).toLocaleDateString("en-AU")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
