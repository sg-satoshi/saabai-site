"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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
  redBg: "rgba(220,38,38,0.08)",
  redBdr: "rgba(220,38,38,0.25)",
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

function leadKey(lead: Lead): string {
  return `${lead.email.trim().toLowerCase()}|${lead.createdAt}`;
}

export default function WholesaleLeadsClient() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Lead[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const fetchLeads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/site-factory/lead?siteSlug=wholesale-homes");
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        const next = data.leads.reverse() as Lead[];
        setLeads(next);
        const live = new Set(next.map(leadKey));
        setSelected((prev) => new Set([...prev].filter((k) => live.has(k))));
      } else if (!silent) {
        setError("Failed to fetch leads");
      }
    } catch (_) {
      if (!silent) setError("Network error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (!pending) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) setPending(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, deleting]);

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
        setToast({ text: "Approved! Welcome email sent to " + lead.email, ok: true });
        setLeads((prev) => prev.filter((l) => l.email !== lead.email));
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(leadKey(lead));
          return next;
        });
      } else {
        setToast({ text: data?.error || "Failed to approve", ok: false });
      }
    } catch (_) {
      setToast({ text: "Network error approving lead", ok: false });
    } finally {
      setApproving(null);
    }
  };

  const toggle = (lead: Lead) => {
    const key = leadKey(lead);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allSelected = leads.length > 0 && leads.every((l) => selected.has(leadKey(l)));
  const someSelected = leads.some((l) => selected.has(leadKey(l)));

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(leads.map(leadKey)));
  };

  const confirmDelete = async () => {
    if (!pending || deleting) return;
    const targets = pending;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/wholesale-leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: targets.map((l) => ({ email: l.email, createdAt: l.createdAt })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setToast({ text: data?.error || "Could not delete the registration.", ok: false });
        return;
      }
      const keys = new Set(targets.map(leadKey));
      setLeads((prev) => prev.filter((l) => !keys.has(leadKey(l))));
      setSelected((prev) => new Set([...prev].filter((k) => !keys.has(k))));
      const n = typeof data?.deleted === "number" ? data.deleted : targets.length;
      setToast({
        text: targets.length === 1
          ? `Deleted ${targets[0].name || "registration"} (${targets[0].email}).`
          : `Deleted ${n} registration${n === 1 ? "" : "s"}.`,
        ok: true,
      });
      setPending(null);
      void fetchLeads(true);
    } catch (_) {
      setToast({ text: "Network error deleting the registration.", ok: false });
    } finally {
      setDeleting(false);
    }
  };

  const selectedLeads = leads.filter((l) => selected.has(leadKey(l)));
  const toastColor = toast?.ok ? C.green : C.red;
  const toastBg = toast?.ok ? C.greenBg : C.redBg;
  const toastBdr = toast?.ok ? C.greenBdr : C.redBdr;

  return (
    <div style={{ maxWidth: 960 }}>
      <div className="mc-head">
        <div>
          <p className="mc-eyebrow">
            Wholesale Homes
          </p>
          <h1 className="mc-h1">
            Pending Registrations
          </h1>
          <p className="mc-sub">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} awaiting approval
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {selectedLeads.length > 0 && (
            <button
              type="button"
              onClick={() => setPending(selectedLeads)}
              disabled={deleting}
              style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid " + C.redBdr,
                background: C.redBg, fontSize: 12, fontWeight: 600, color: C.red, cursor: "pointer",
              }}
            >
              Delete selected ({selectedLeads.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => fetchLeads()}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid " + C.border,
              background: C.surface, fontSize: 12, fontWeight: 600, color: C.text, cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {toast && (
        <div
          role={toast.ok ? "status" : "alert"}
          style={{
            padding: "10px 16px", marginBottom: 16, borderRadius: 10,
            background: toastBg, border: "1px solid " + toastBdr,
            fontSize: 13, fontWeight: 500, color: toastColor,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}
        >
          <span>{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss message" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: toastColor }}>
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
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textDim, paddingLeft: 4 }}>
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
              onChange={toggleAll}
              aria-label="Select all registrations"
            />
            Select all
          </label>
          {leads.map((lead) => {
            const key = leadKey(lead);
            return (
              <div
                key={key}
                style={{
                  padding: "16px 20px", borderRadius: 14,
                  background: C.surface, border: "1px solid " + (selected.has(key) ? C.teal : C.border),
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => toggle(lead)}
                    aria-label={`Select ${lead.name || lead.email}`}
                    style={{ marginTop: 4 }}
                  />
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
                  <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
                    <button
                      type="button"
                      onClick={() => setPending([lead])}
                      disabled={deleting}
                      style={{
                        padding: "8px 14px", borderRadius: 8, border: "1px solid " + C.redBdr,
                        background: C.surface, color: C.red, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", whiteSpace: "nowrap",
                      }}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(lead)}
                      disabled={approving === lead.email || deleting}
                      style={{
                        padding: "8px 18px", borderRadius: 8, border: "none",
                        background: approving === lead.email ? "#9CA3AF" : C.teal,
                        color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        whiteSpace: "nowrap",
                        opacity: approving === lead.email ? 0.6 : 1,
                      }}
                    >
                      {approving === lead.email ? "Approving..." : "Approve"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-registration-title"
          onClick={() => { if (!deleting) setPending(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 80,
            background: "rgba(17,24,39,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(100%, 440px)", background: C.surface, borderRadius: 16,
              padding: 20, border: "1px solid " + C.border,
            }}
          >
            <h2 id="delete-registration-title" style={{ margin: "0 0 8px", fontSize: 16, color: C.text }}>
              {pending.length === 1 ? "Delete this registration?" : `Delete ${pending.length} registrations?`}
            </h2>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: C.textDim, lineHeight: 1.45 }}>
              {pending.length === 1
                ? "This permanently removes the pending registration. This cannot be undone."
                : "This permanently removes these pending registrations. This cannot be undone."}
            </p>
            <div style={{
              maxHeight: 220, overflowY: "auto", marginBottom: 16,
              padding: "8px 12px", borderRadius: 10, background: C.bg, border: "1px solid " + C.border,
            }}>
              {pending.map((lead) => (
                <div key={leadKey(lead)} style={{ padding: "6px 0", fontSize: 13, color: C.text }}>
                  <strong>{lead.name || "No name"}</strong>
                  <div style={{ color: C.textDim, fontSize: 12 }}>{lead.email}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                ref={cancelRef}
                onClick={() => setPending(null)}
                disabled={deleting}
                style={{
                  padding: "8px 14px", borderRadius: 8, border: "1px solid " + C.border,
                  background: C.surface, fontSize: 12, fontWeight: 600, color: C.text, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  padding: "8px 14px", borderRadius: 8, border: "none",
                  background: C.red, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? "Deleting..." : pending.length === 1 ? "Delete" : `Delete ${pending.length}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
