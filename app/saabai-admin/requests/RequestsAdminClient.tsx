"use client";

import { useCallback, useEffect, useState } from "react";

const C = {
  card: "#ffffff",
  border: "rgba(0,0,0,0.08)",
  text: "#111827",
  muted: "#9ca3af",
  dim: "#6b7280",
  gold: "#b45309",
  goldBg: "rgba(180,83,9,0.08)",
  goldBdr: "rgba(180,83,9,0.25)",
  green: "#16a34a",
  greenBg: "rgba(22,163,74,0.10)",
  amber: "#b45309",
  amberBg: "rgba(217,119,6,0.12)",
  blue: "#2563eb",
  blueBg: "rgba(37,99,235,0.08)",
  red: "#dc2626",
};

type Status = "received" | "in_progress" | "done";
type Priority = "low" | "normal" | "high";

interface ClientRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  siteName?: string;
  title: string;
  description: string;
  priority: Priority;
  screenshots: string[];
  status: Status;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS: Record<Status, { label: string; color: string; bg: string }> = {
  received: { label: "Received", color: C.blue, bg: C.blueBg },
  in_progress: { label: "In progress", color: C.amber, bg: C.amberBg },
  done: { label: "Done", color: C.green, bg: C.greenBg },
};
const PRIORITY: Record<Priority, { label: string; color: string }> = {
  low: { label: "Low", color: C.dim },
  normal: { label: "Normal", color: C.dim },
  high: { label: "High", color: C.red },
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function RequestCard({ r, onSaved }: { r: ClientRequest; onSaved: (msg: string) => void }) {
  const [status, setStatus] = useState<Status>(r.status);
  const [note, setNote] = useState(r.adminNote || "");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const dirty = status !== r.status || note !== (r.adminNote || "");

  async function save() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(r.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: note, notifyClient: notify }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      onSaved(data.statusChanged ? (data.emailed ? "Saved, and the client was emailed" : "Saved (no email sent)") : "Saved");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const s = STATUS[r.status];
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>{r.title}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: C.dim }}>
            <strong style={{ color: C.text }}>{r.clientName || r.clientEmail || r.clientId}</strong>
            {r.siteName ? ` · ${r.siteName}` : ""} · {r.clientEmail} · {fmt(r.createdAt)} · Priority{" "}
            <span style={{ color: PRIORITY[r.priority]?.color, fontWeight: 700 }}>{PRIORITY[r.priority]?.label}</span>
          </p>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20, color: s.color, background: s.bg, letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{s.label}</span>
      </div>

      <p style={{ margin: "12px 0 0", fontSize: 13, color: "#374151", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{r.description}</p>

      {r.screenshots.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {r.screenshots.map((u, j) => (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Screenshot ${j + 1}`} style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}` }} />
            </a>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "flex-start", flexWrap: "wrap", paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.muted, marginBottom: 5 }}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.14)", fontSize: 13, background: "#fff", color: C.text }}>
            <option value="received">Received</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.muted, marginBottom: 5 }}>Note to client (optional, shown in their portal)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000} placeholder="e.g. All done, the new hours are live on the contact page." style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.14)", fontSize: 13, fontFamily: "inherit", resize: "vertical", color: C.text, background: "#fff" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", paddingTop: 18 }}>
          <label style={{ fontSize: 12, color: C.dim, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Email client on status change
          </label>
          <button onClick={save} disabled={!dirty || busy} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${C.goldBdr}`, background: C.goldBg, color: C.gold, fontSize: 13, fontWeight: 700, cursor: dirty ? "pointer" : "default", opacity: !dirty || busy ? 0.5 : 1 }}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {err && <p style={{ margin: "8px 0 0", fontSize: 12, color: C.red }}>{err}</p>}
    </div>
  );
}

export default function RequestsAdminClient() {
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [clients, setClients] = useState<{ clientId: string; name: string }[]>([]);
  const [counts, setCounts] = useState({ all: 0, received: 0, in_progress: 0, done: 0 });
  const [status, setStatus] = useState<"" | Status>("");
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (clientId) qs.set("clientId", clientId);
      const res = await fetch(`/api/admin/requests?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load requests");
      setRequests(data.requests || []);
      setClients(data.clients || []);
      setCounts(data.counts || { all: 0, received: 0, in_progress: 0, done: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [status, clientId]);

  useEffect(() => { load(); }, [load]);

  const tabs: { key: "" | Status; label: string; n: number }[] = [
    { key: "", label: "All", n: counts.all },
    { key: "received", label: "Received", n: counts.received },
    { key: "in_progress", label: "In progress", n: counts.in_progress },
    { key: "done", label: "Done", n: counts.done },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: C.text }}>Client Requests</h1>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: C.dim }}>Change and feature requests from client portals. New ones are emailed to you as they arrive.</p>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
        {tabs.map((t) => (
          <button key={t.key || "all"} onClick={() => setStatus(t.key)} style={{
            padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: `1px solid ${status === t.key ? C.goldBdr : "rgba(0,0,0,0.1)"}`,
            background: status === t.key ? C.goldBg : "#fff",
            color: status === t.key ? C.gold : C.dim,
          }}>
            {t.label} <span style={{ opacity: 0.7 }}>{t.n}</span>
          </button>
        ))}
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ marginLeft: "auto", padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", fontSize: 12, background: "#fff", color: C.text }}>
          <option value="">All clients</option>
          {clients.map((c) => <option key={c.clientId} value={c.clientId}>{c.name}</option>)}
        </select>
      </div>

      {toast && <p style={{ margin: "0 0 12px", fontSize: 13, color: C.green, fontWeight: 600 }}>{toast}</p>}

      {loading ? (
        <p style={{ fontSize: 13, color: C.muted }}>Loading…</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: C.red }}>{error}</p>
      ) : requests.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
          <p style={{ margin: 0, fontSize: 13, color: C.dim }}>No requests here yet.</p>
        </div>
      ) : (
        requests.map((r) => (
          <RequestCard key={`${r.id}:${r.updatedAt}`} r={r} onSaved={(msg) => { setToast(msg); setTimeout(() => setToast(""), 4000); load(); }} />
        ))
      )}
    </div>
  );
}
