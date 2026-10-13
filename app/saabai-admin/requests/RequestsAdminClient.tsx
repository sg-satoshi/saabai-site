"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Status =
  | "new"
  | "awaiting_client"
  | "triaged"
  | "in_progress"
  | "qa"
  | "blocked"
  | "done"
  | "received";
type Priority = "low" | "normal" | "high" | "critical";
type Assignee = "chief_ai" | "designer" | "shane" | "team";

interface TimelineEntry {
  id: string;
  kind: string;
  authorKind: string;
  authorName: string;
  body: string;
  internal?: boolean;
  createdAt: string;
}

interface ClientRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  siteId?: string;
  siteName?: string;
  title: string;
  description: string;
  type: string;
  priority: Priority;
  screenshots: string[];
  status: Status;
  assignee?: Assignee;
  autoHandle: boolean;
  discussWithShane: boolean;
  clarifierRounds: number;
  agreedChange?: string;
  adminNote?: string;
  timeline: TimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  received: "New",
  awaiting_client: "Awaiting client",
  triaged: "Triaged",
  in_progress: "In progress",
  qa: "QA / Review",
  blocked: "Blocked",
  done: "Done",
};

const PRI_LABEL: Record<Priority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  critical: "Critical",
};

const ASSIGNEE_LABEL: Record<Assignee, string> = {
  chief_ai: "Chief AI",
  designer: "Designer",
  shane: "Shane",
  team: "Team",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function age(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function RequestsAdminClient() {
  const sp = useSearchParams();
  const deepId = sp.get("id") || "";
  const wantTakeOver = sp.get("takeOver") === "1";
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [clients, setClients] = useState<{ clientId: string; name: string }[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("");
  const [clientId, setClientId] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [selectedId, setSelectedId] = useState(deepId);
  const [detail, setDetail] = useState<ClientRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (clientId) qs.set("clientId", clientId);
      if (q.trim()) qs.set("q", q.trim());
      const res = await fetch(`/api/admin/requests?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load requests");
      setRequests(data.requests || []);
      setClients(data.clients || []);
      setCounts(data.counts || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [status, clientId, q]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(selectedId)}`);
      const data = await res.json();
      if (!cancelled && res.ok) setDetail(data.request);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // Email "Take over" deep link: switch to Discuss and assign to Shane (easy to change later).
  useEffect(() => {
    if (!wantTakeOver || !detail || detail.discussWithShane) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(detail.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discussWithShane: true,
          autoHandle: false,
          assignee: "shane",
          internalNote: "Take over: switched to Discuss with Shane.",
        }),
      });
      const data = await res.json();
      if (!cancelled && res.ok) {
        setDetail(data.request);
        setToast("Taken over · Discuss with Shane");
        // Drop takeOver from URL without reload
        const url = new URL(window.location.href);
        url.searchParams.delete("takeOver");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wantTakeOver, detail?.id, detail?.discussWithShane]);

  const tabs = useMemo(
    () => [
      { key: "", label: "All", n: counts.all || 0 },
      { key: "critical", label: "Critical", n: counts.critical || 0, special: true },
      { key: "new", label: "New", n: counts.new || 0 },
      { key: "awaiting_client", label: "Awaiting client", n: counts.awaiting_client || 0 },
      { key: "triaged", label: "Triaged", n: counts.triaged || 0 },
      { key: "in_progress", label: "In progress", n: counts.in_progress || 0 },
      { key: "done", label: "Done", n: counts.done || 0 },
    ],
    [counts],
  );

  const visible = useMemo(() => {
    if (status === "critical") return requests.filter((r) => r.priority === "critical" && r.status !== "done");
    return requests;
  }, [requests, status]);

  return (
    <div style={{ maxWidth: 1200 }}>
      <h1 className="mc-h1">Client Requests</h1>
      <p className="mc-sub" style={{ marginBottom: 20 }}>
        Inbox for change and support tickets. Clarifier messages and Critical alerts show here.
      </p>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        {tabs.map((t) => (
          <button
            key={t.key || "all"}
            onClick={() => setStatus(t.key === "critical" ? "critical" : t.key)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: `1px solid ${status === t.key ? (t.special ? "#f3c4c0" : "#b9e4ea") : "rgba(0,0,0,0.1)"}`,
              background: status === t.key ? (t.special ? "#fff8f7" : "#edf8f9") : "#fff",
              color: status === t.key ? (t.special ? "#c2261d" : "#0e7482") : "#5f6580",
            }}
          >
            {t.label} <span style={{ opacity: 0.7 }}>{t.n}</span>
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          style={{ marginLeft: "auto", padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", fontSize: 12, width: 180 }}
        />
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", fontSize: 12, background: "#fff" }}
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.clientId} value={c.clientId}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {(() => {
        const crit = requests.find((r) => r.priority === "critical" && r.status !== "done");
        if (!crit) return null;
        return (
          <div
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
              flexWrap: "wrap",
              border: "1px solid #f3c4c0",
              borderLeft: "4px solid #c2261d",
              background: "linear-gradient(90deg,#fdecea,#fff 70%)",
              borderRadius: 12,
              padding: "14px 18px",
              marginBottom: 16,
            }}
          >
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#c2261d", textTransform: "uppercase" }}>
                Critical · pinned
              </div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>
                {crit.siteName ? `${crit.siteName}: ` : ""}
                {crit.title}
              </div>
              <div style={{ fontSize: 12, color: "#5f6580", marginTop: 4 }}>
                {crit.discussWithShane ? "Discuss with Shane" : "Chief AI · Auto-handling"} · Open {age(crit.createdAt)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {!crit.discussWithShane && (
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetch(`/api/admin/requests/${encodeURIComponent(crit.id)}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        discussWithShane: true,
                        autoHandle: false,
                        assignee: "shane",
                        internalNote: "Take over: switched to Discuss with Shane.",
                      }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setToast("Taken over");
                      setSelectedId(crit.id);
                      setDetail(data.request);
                      load();
                    }
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Take over
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedId(crit.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #b9e4ea",
                  background: "#0e7482",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Open request
              </button>
            </div>
          </div>
        );
      })()}
      {toast && <p style={{ margin: "0 0 12px", fontSize: 13, color: "#16a34a", fontWeight: 600 }}>{toast}</p>}
      {error && <p style={{ margin: "0 0 12px", fontSize: 13, color: "#c2261d" }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: detail ? "1fr 420px" : "1fr", gap: 16, alignItems: "start" }}>
        <div>
          {loading ? (
            <p style={{ color: "#5f6580", fontSize: 13 }}>Loading…</p>
          ) : visible.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 28, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 13, color: "#5f6580" }}>No requests here yet.</p>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#5f6580", fontSize: 11, letterSpacing: 0.06, textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 14px" }}>Request</th>
                    <th style={{ padding: "10px 14px" }}>Site</th>
                    <th style={{ padding: "10px 14px" }}>Priority</th>
                    <th style={{ padding: "10px 14px" }}>Status</th>
                    <th style={{ padding: "10px 14px" }}>Mode</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Age</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      style={{
                        cursor: "pointer",
                        background: selectedId === r.id ? "#edf8f9" : r.priority === "critical" ? "#fff8f7" : undefined,
                        borderTop: "1px solid rgba(0,0,0,0.06)",
                        boxShadow: r.priority === "critical" ? "inset 3px 0 0 #c2261d" : undefined,
                      }}
                    >
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 500 }}>{r.title}</div>
                        <div style={{ fontSize: 11, color: "#5f6580", marginTop: 2 }}>
                          {r.clientName || r.clientEmail} · {r.type}
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>{r.siteName || "—"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: r.priority === "critical" ? "#c2261d" : r.priority === "high" ? "#fff7e6" : "#fff",
                            color: r.priority === "critical" ? "#fff" : r.priority === "high" ? "#b45309" : "#5f6580",
                            border: "1px solid rgba(0,0,0,0.08)",
                          }}
                        >
                          {PRI_LABEL[r.priority]}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>{STATUS_LABEL[r.status]}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#5f6580" }}>
                        {r.discussWithShane ? "Discuss" : "Auto"}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.priority === "critical" ? "#c2261d" : "#5f6580" }}>
                        {age(r.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {detail && (
          <DetailPane
            r={detail}
            onClose={() => setSelectedId("")}
            onSaved={(msg, next) => {
              setToast(msg);
              if (next) setDetail(next);
              load();
              setTimeout(() => setToast(""), 3500);
            }}
          />
        )}
      </div>
    </div>
  );
}

function DetailPane({
  r,
  onClose,
  onSaved,
}: {
  r: ClientRequest;
  onClose: () => void;
  onSaved: (msg: string, next?: ClientRequest) => void;
}) {
  const [status, setStatus] = useState<Exclude<Status, "received">>(r.status === "received" ? "new" : r.status);
  const [assignee, setAssignee] = useState(r.assignee || "");
  const [autoHandle, setAutoHandle] = useState(r.autoHandle && r.priority !== "critical");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [clarifierOn, setClarifierOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setStatus(r.status === "received" ? "new" : (r.status as Exclude<Status, "received">));
    setAssignee(r.assignee || "");
    setAutoHandle(r.autoHandle && r.priority !== "critical");
  }, [r]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/requests/settings?clientId=${encodeURIComponent(r.clientId)}`);
      const data = await res.json();
      if (res.ok) setClarifierOn(data.clarifierEnabled !== false);
    })();
  }, [r.clientId]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(r.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      onSaved(
        data.statusChanged ? (data.emailed ? "Saved, client emailed" : "Saved") : "Saved",
        data.request,
      );
      setReply("");
      setNote("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleClarifier(enabled: boolean) {
    setClarifierOn(enabled);
    await fetch("/api/admin/requests/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: r.clientId, enabled }),
    });
    onSaved(enabled ? "Clarifier on for this client" : "Clarifier off for this client");
  }

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 18, position: "sticky", top: 16, maxHeight: "calc(100vh - 40px)", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#5f6580" }}>{r.id.slice(0, 8)}</div>
        <button type="button" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#5f6580" }}>
          Close
        </button>
      </div>
      {r.priority === "critical" && (
        <div style={{ border: "1px solid #f3c4c0", borderLeft: "4px solid #c2261d", background: "#fff8f7", borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 12 }}>
          <strong style={{ color: "#c2261d" }}>Critical</strong>
          {r.discussWithShane
            ? " · Discuss with Shane (taken over / escalated)"
            : " · Chief AI auto-handling · Escalation: not needed yet"}
        </div>
      )}
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>{r.title}</h2>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#5f6580" }}>
        {r.clientName} · {r.clientEmail}
        {r.siteName ? ` · ${r.siteName}` : ""} · {fmt(r.createdAt)}
      </p>
      <p style={{ margin: "0 0 14px", fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{r.description}</p>

      {r.agreedChange && (
        <div style={{ background: "#edf8f9", border: "1px solid #b9e4ea", borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 13 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.1, textTransform: "uppercase", color: "#0e7482", marginBottom: 4 }}>
            Agreed change
          </div>
          {r.agreedChange}
        </div>
      )}

      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#5f6580" }}>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Exclude<Status, "received">)}
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid rgba(0,0,0,0.14)" }}
          >
            {["new", "awaiting_client", "triaged", "in_progress", "qa", "blocked", "done"].map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#5f6580" }}>
          Assignee
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid rgba(0,0,0,0.14)" }}
          >
            <option value="">Unassigned</option>
            {(Object.keys(ASSIGNEE_LABEL) as Assignee[]).map((a) => (
              <option key={a} value={a}>
                {ASSIGNEE_LABEL[a]}
              </option>
            ))}
          </select>
        </label>
        {r.priority === "critical" ? (
          <div style={{ background: "#edf8f9", border: "1px solid #b9e4ea", borderRadius: 10, padding: 12 }}>
            {!r.discussWithShane ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#13152a" }}>Chief is handling.</div>
                <div style={{ fontSize: 12, color: "#5f6580", marginTop: 2 }}>
                  Will escalate to Shane if needed (cost decision or blocker).
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    patch({
                      discussWithShane: true,
                      autoHandle: false,
                      assignee: "shane",
                      internalNote: "Escalated to Shane by admin.",
                    })
                  }
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Escalate to Shane
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    patch({
                      discussWithShane: true,
                      autoHandle: false,
                      assignee: "shane",
                      internalNote: "Take over: switched to Discuss with Shane.",
                    })
                  }
                  style={{
                    width: "100%",
                    marginTop: 8,
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid #b9e4ea",
                    background: "#0e7482",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Take over
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Discuss with Shane</div>
                <div style={{ fontSize: 12, color: "#5f6580", marginTop: 2 }}>
                  Chief paused. Nothing ships until Shane approves.
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    patch({
                      discussWithShane: false,
                      autoHandle: true,
                      assignee: "chief_ai",
                      internalNote: "Returned to Auto-handle by Chief.",
                    })
                  }
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid #b9e4ea",
                    background: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Return to Chief
                </button>
              </>
            )}
          </div>
        ) : (
          <label style={{ fontSize: 12, color: "#5f6580", display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={autoHandle}
              onChange={(e) => setAutoHandle(e.target.checked)}
            />
            Auto-handle (off = Discuss with Shane)
          </label>
        )}
        <label style={{ fontSize: 12, color: "#5f6580", display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={clarifierOn} onChange={(e) => toggleClarifier(e.target.checked)} />
          AI clarifier for this client
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            patch({
              status,
              assignee: assignee || null,
              autoHandle,
              discussWithShane: !autoHandle,
            })
          }
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #b9e4ea",
            background: "#edf8f9",
            color: "#0e7482",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Save status / assignee
        </button>
      </div>

      <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.08, textTransform: "uppercase", color: "#5f6580", marginBottom: 8 }}>
          Timeline ({r.timeline?.length || 0}) · clarifier rounds {r.clarifierRounds || 0}
        </div>
        <div style={{ maxHeight: 220, overflow: "auto", marginBottom: 10 }}>
          {(r.timeline || []).map((t) => (
            <div key={t.id} style={{ marginBottom: 10, fontSize: 12, lineHeight: 1.45 }}>
              <div style={{ color: "#5f6580" }}>
                <strong style={{ color: t.internal ? "#b45309" : "#13152a" }}>
                  {t.authorName}
                  {t.internal ? " (internal)" : ""}
                </strong>{" "}
                · {fmt(t.createdAt)}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{t.body}</div>
            </div>
          ))}
        </div>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={2}
          placeholder="Reply to client…"
          style={{ width: "100%", boxSizing: "border-box", padding: 8, borderRadius: 8, border: "1px solid rgba(0,0,0,0.14)", fontSize: 13, fontFamily: "inherit", marginBottom: 6 }}
        />
        <button type="button" disabled={busy || !reply.trim()} onClick={() => patch({ reply })} style={{ marginBottom: 10, padding: "7px 12px", borderRadius: 8, border: "1px solid #b9e4ea", background: "#0e7482", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
          Send reply
        </button>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Internal note…"
          style={{ width: "100%", boxSizing: "border-box", padding: 8, borderRadius: 8, border: "1px solid rgba(0,0,0,0.14)", fontSize: 13, fontFamily: "inherit", marginBottom: 6 }}
        />
        <button type="button" disabled={busy || !note.trim()} onClick={() => patch({ internalNote: note })} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", color: "#5f6580", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
          Add internal note
        </button>
      </div>

      {r.screenshots?.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {r.screenshots.map((u, i) => (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Shot ${i + 1}`} style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(0,0,0,0.08)" }} />
            </a>
          ))}
        </div>
      )}
      {err && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#c2261d" }}>{err}</p>}
    </div>
  );
}
