"use client";

import { useCallback, useEffect, useState } from "react";

interface Entry {
  id: string;
  siteId: string;
  siteName: string;
  summary: string;
  source: string;
  requestId?: string;
  authorName: string;
  createdAt: string;
}

export default function ChangeLogClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [siteId, setSiteId] = useState("");
  const [summary, setSummary] = useState("");
  const [siteName, setSiteName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const qs = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    const res = await fetch(`/api/admin/change-log${qs}`);
    const data = await res.json();
    if (res.ok) setEntries(data.entries || []);
  }, [siteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/change-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: siteId || "global", siteName: siteName || siteId || "Global", summary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      setSummary("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800 }}>Change log</h1>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "#5f6580" }}>
        Site and global changes. Request status updates land here automatically.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          placeholder="Filter by siteId (blank = all)"
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", fontSize: 13, minWidth: 220 }}
        />
        <button type="button" onClick={load} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #b9e4ea", background: "#edf8f9", color: "#0e7482", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          Refresh
        </button>
      </div>

      <form onSubmit={addManual} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 16, marginBottom: 20, display: "grid", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Add manual entry</div>
        <input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Site name" style={{ padding: 8, borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)" }} />
        <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What changed?" required minLength={3} style={{ padding: 8, borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)" }} />
        <button type="submit" disabled={busy} style={{ justifySelf: "start", padding: "8px 14px", borderRadius: 8, border: "1px solid #b9e4ea", background: "#0e7482", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          {busy ? "Saving…" : "Add entry"}
        </button>
        {error && <p style={{ margin: 0, color: "#c2261d", fontSize: 12 }}>{error}</p>}
      </form>

      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, overflow: "hidden" }}>
        {entries.length === 0 ? (
          <p style={{ padding: 24, margin: 0, color: "#5f6580", fontSize: 13 }}>No entries yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#5f6580", fontSize: 11, textTransform: "uppercase" }}>
                <th style={{ padding: "10px 14px" }}>When</th>
                <th style={{ padding: "10px 14px" }}>Site</th>
                <th style={{ padding: "10px 14px" }}>Summary</th>
                <th style={{ padding: "10px 14px" }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: "12px 14px", whiteSpace: "nowrap", color: "#5f6580" }}>
                    {new Date(e.createdAt).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "12px 14px" }}>{e.siteName}</td>
                  <td style={{ padding: "12px 14px" }}>{e.summary}</td>
                  <td style={{ padding: "12px 14px", color: "#5f6580" }}>
                    {e.source}
                    {e.authorName ? ` · ${e.authorName}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
