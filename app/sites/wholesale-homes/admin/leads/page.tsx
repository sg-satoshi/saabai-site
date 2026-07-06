"use client";

import { useState, useEffect, useCallback } from "react";
import AdminShell from "../AdminShell";

interface Lead {
  name: string; email: string; phone: string; buyer_type?: string;
  timeline?: string; state?: string; budget?: string; createdAt: number;
}

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/site-factory/lead?siteSlug=wholesale-homes");
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) setLeads(data.leads.reverse());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function approve(lead: Lead) {
    setApproving(lead.email);
    try {
      const res = await fetch("/api/site-factory/approve-lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: lead.name, email: lead.email, phone: lead.phone, buyer_type: lead.buyer_type }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast("Approved! Welcome email sent to " + lead.email);
        setLeads((p) => p.filter((l) => l.email !== lead.email));
      } else setToast(data?.error || "Failed");
    } catch { setToast("Network error"); }
    finally { setApproving(null); }
  }

  return (
    <AdminShell>
      <div style={{ maxWidth: 900 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>Pending Leads</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>{leads.length} awaiting approval</p>
          </div>
          <button onClick={fetchLeads} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Refresh
          </button>
        </div>

        {toast && (
          <div style={{ padding: "10px 14px", marginBottom: 12, borderRadius: 8, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)", fontSize: 13, color: "#16a34a", display: "flex", justifyContent: "space-between" }}>
            <span>{toast}</span>
            <button onClick={() => setToast(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#16a34a", fontSize: 16 }}>&times;</button>
          </div>
        )}

        {loading && <p style={{ fontSize: 13, color: "#6b7280" }}>Loading...</p>}

        {!loading && leads.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", borderRadius: 12, border: "1px dashed rgba(0,0,0,0.08)", background: "#fff" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>No pending leads</p>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>New registrations will appear here.</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {leads.map((lead) => (
            <div key={lead.email + lead.createdAt} style={{ padding: "14px 18px", borderRadius: 12, background: "#fff", border: "1px solid rgba(0,0,0,0.08)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <strong style={{ fontSize: 13, color: "#111827" }}>{lead.name}</strong>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", fontSize: 11, color: "#6b7280" }}>
                  <span>{lead.email}</span>
                  <span>{lead.phone}</span>
                  {lead.buyer_type && <span>{lead.buyer_type}</span>}
                </div>
              </div>
              <button onClick={() => approve(lead)} disabled={approving === lead.email}
                style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: approving === lead.email ? "#9ca3af" : "#0891b2", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", marginLeft: 12, opacity: approving === lead.email ? 0.6 : 1 }}>
                {approving === lead.email ? "Approving..." : "Approve"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
