"use client";

import { useState, useEffect, useCallback } from "react";

interface Lead {
  name: string;
  email: string;
  phone: string;
  buyer_type?: string;
  timeline?: string;
  state?: string;
  budget?: string;
  message?: string;
  siteSlug: string;
  createdAt: number;
}

const C = {
  bg: "#f5f5f7",
  surface: "#ffffff",
  border: "rgba(0,0,0,0.08)",
  teal: "#0891b2",
  tealBg: "rgba(8,145,178,0.08)",
  green: "#16a34a",
  greenBg: "rgba(22,163,74,0.08)",
  greenBdr: "rgba(22,163,74,0.25)",
  red: "#dc2626",
  redBg: "rgba(220,38,26,0.08)",
  text: "#111827",
  textDim: "#6b7280",
  muted: "#9ca3af",
};

function ago(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return s + "s ago";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  return d + "d ago";
}

export default function WholesaleLeadsClient() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/site-factory/lead?siteSlug=wholesale-homes");
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        setLeads(data.leads.reverse());
      } else {
        setError("Failed to fetch leads");
      }
    } catch (_) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleApprove = async (lead: Lead) => {
    setApproving(lead.email);
    try {
      const res = await fetch("/api/site-factory/approve-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          buyer_type: lead.buyer_type,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast("Approved! Welcome email sent to " + lead.email);
        setLeads((prev) => prev.filter((l) => l.email !== lead.email));
      } else {
        setToast(data?.error || "Failed to approve");
      }
    } catch (_) {
      setToast("Network error approving lead");
    } finally {
      setApproving(null);
    }
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 960 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.teal }}>
            Wholesale Homes
          </p>
          <h1 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-0.3px" }}>
            Pending Registrations
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textDim }}>
            {leads.length} lead{leads.length !== 1 ? "s" : ""} awaiting approval
          </p>
        </div>
        <button
          onClick={fetchLeads}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "1px solid " + C.border,
            background: C.surface, fontSize: 12, fontWeight: 600, color: C.text, cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {toast && (
        <div style={{
          padding: "10px 16px", marginBottom: 16, borderRadius: 10,
          background: C.greenBg, border: "1px solid " + C.greenBdr,
          fontSize: 13, fontWeight: 500, color: C.green,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>{toast}</span>
          <button onClick={() => setToast(null)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: C.green }}>
            &times;
          </button>
        </div>
      )}

      {loading && <p style={{ fontSize: 13, color: C.textDim }}>Loading leads...</p>}
      {error && <p style={{ fontSize: 13, color: C.red }}>{error}</p>}

      {!loading && !error && leads.length === 0 && (
        <div style={{
          padding: 40, textAlign: "center", borderRadius: 16,
          border: "1px dashed " + C.border, background: C.surface,
        }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: C.text }}>No pending registrations</p>
          <p style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>
            New sign ups from wholesalehomes.com.au/client/register will appear here.
          </p>
        </div>
      )}

      {leads.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {leads.map((lead) => (
            <div
              key={lead.email + lead.createdAt}
              style={{
                padding: "16px 20px", borderRadius: 14,
                background: C.surface, border: "1px solid " + C.border,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <strong style={{ fontSize: 14, color: C.text }}>{lead.name}</strong>
                    <span style={{ fontSize: 10, color: C.muted }}>{ago(lead.createdAt)}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 12, color: C.textDim }}>
                    <span>{lead.email}</span>
                    <span>{lead.phone}</span>
                    {lead.buyer_type && <span>Type: {lead.buyer_type}</span>}
                    {lead.state && <span>State: {lead.state}</span>}
                    {lead.timeline && <span>Timeline: {lead.timeline}</span>}
                    {lead.budget && <span>Budget: ${lead.budget}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleApprove(lead)}
                  disabled={approving === lead.email}
                  style={{
                    padding: "8px 18px", borderRadius: 8, border: "none",
                    background: approving === lead.email ? "#9CA3AF" : C.teal,
                    color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    whiteSpace: "nowrap", marginLeft: 16,
                    opacity: approving === lead.email ? 0.6 : 1,
                  }}
                >
                  {approving === lead.email ? "Approving..." : "Approve"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
