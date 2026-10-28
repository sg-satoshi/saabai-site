"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  notifyClientDefault,
  statusEmailFirstLine,
  statusEmailSubject,
  statusLabel,
} from "../../../lib/request-notify";
import {
  PANEL_DEFAULT,
  SPLIT_STEP,
  SPLIT_STORAGE_KEY,
  TOP_MIN,
  clampPanelWidth,
  clampSplit,
  loadPanelWidth,
  moveSplit,
  persistPanelWidth,
  persistSplit,
  readStoredNumber,
  splitEnd,
  splitHome,
} from "./split";
import "./requests.css";

type Status =
  | "new"
  | "awaiting_client"
  | "triaged"
  | "in_progress"
  | "qa"
  | "blocked"
  | "done"
  | "received";
type Editable = Exclude<Status, "received">;
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
  statusChangedAt?: string;
}

const EDITABLE: Editable[] = ["new", "awaiting_client", "triaged", "in_progress", "qa", "blocked", "done"];

const PRI_LABEL: Record<Priority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  critical: "Critical",
};

const TYPE_LABEL: Record<string, string> = {
  text_change: "Text change",
  new_feature: "Feature",
  bug: "Bug",
  other: "Other",
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
  if (m < 60) return `${Math.max(m, 0)}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function savedStatus(r: ClientRequest): Editable {
  return r.status === "received" ? "new" : r.status;
}

function narrow() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 600px)").matches;
}

export default function RequestsAdminClient() {
  const router = useRouter();
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
  const [detail, setDetail] = useState<ClientRequest | null>(null);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT);
  const [isNarrow, setIsNarrow] = useState(false);
  const selectedId = deepId;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 600px)");
    const apply = () => {
      setIsNarrow(mq.matches);
      setPanelWidth(loadPanelWidth(localStorage, window.innerWidth));
    };
    apply();
    window.addEventListener("resize", apply);
    mq.addEventListener("change", apply);
    return () => {
      window.removeEventListener("resize", apply);
      mq.removeEventListener("change", apply);
    };
  }, []);

  function changePanelWidth(next: number) {
    const width = clampPanelWidth(next, window.innerWidth);
    setPanelWidth(width);
    persistPanelWidth(localStorage, width);
  }

  function resetPanelWidth() {
    persistPanelWidth(localStorage, null);
    setPanelWidth(clampPanelWidth(PANEL_DEFAULT, window.innerWidth));
  }

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
    const app = document.querySelector(".app");
    if (!app) return;
    const on = () => app.classList.toggle("req-open", Boolean(selectedId) && narrow());
    on();
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("resize", on);
      app.classList.remove("req-open");
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(selectedId)}`);
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      setDetail(res.ok && data.request ? data.request : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const tabs = useMemo(
    () => [
      { key: "", label: "All", n: counts.all || 0 },
      { key: "critical", label: "Critical", n: counts.critical || 0, special: true },
      { key: "new", label: "New", n: counts.new || 0 },
      { key: "awaiting_client", label: "Awaiting client", n: counts.awaiting_client || 0 },
      { key: "triaged", label: "Triaged", n: counts.triaged || 0 },
      { key: "in_progress", label: "In progress", n: counts.in_progress || 0 },
      { key: "qa", label: "QA", n: counts.qa || 0 },
      { key: "blocked", label: "Blocked", n: counts.blocked || 0 },
      { key: "done", label: "Done", n: counts.done || 0 },
    ],
    [counts],
  );

  const visible = useMemo(() => {
    if (status === "critical") return requests.filter((r) => r.priority === "critical" && r.status !== "done");
    return requests;
  }, [requests, status]);

  function openRequest(id: string) {
    const qs = new URLSearchParams(sp.toString());
    qs.set("id", id);
    if (id !== deepId) qs.delete("takeOver");
    const next = `/saabai-admin/requests?${qs.toString()}`;
    // Mobile pushes so the phone back button returns to the list. Desktop replaces.
    if (narrow()) router.push(next);
    else router.replace(next);
  }

  function closePanel() {
    const qs = new URLSearchParams(sp.toString());
    qs.delete("id");
    qs.delete("takeOver");
    const next = qs.toString();
    const url = next ? `/saabai-admin/requests?${next}` : "/saabai-admin/requests";
    // Replace so Close panel stays closed. The phone back button still works
    // because opening the ticket was a push.
    router.replace(url);
  }

  useEffect(() => {
    if (!selectedId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePanel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, sp, router]);

  function clearTakeOverFlag() {
    const qs = new URLSearchParams(sp.toString());
    if (!qs.has("takeOver")) return;
    qs.delete("takeOver");
    const next = qs.toString();
    router.replace(next ? `/saabai-admin/requests?${next}` : "/saabai-admin/requests");
  }

  const pinned = requests.find((r) => r.priority === "critical" && r.status !== "done");
  const shown = detail && detail.id === selectedId ? detail : null;

  return (
    <div
      className={`req-layout${selectedId ? " has-detail" : ""}`}
      style={!isNarrow && selectedId ? ({ "--req-panel-w": `${panelWidth}px` } as React.CSSProperties) : undefined}
    >
      <div className="req-list">
        <h1 className="mc-h1">Client Requests</h1>
        <p className="mc-sub" style={{ marginBottom: 20 }}>
          Change and support tickets from clients.
        </p>

        <div className="req-filters">
          <div className="chip-row" role="tablist" aria-label="Filter requests">
            {tabs.map((t) => (
              <button
                key={t.key || "all"}
                type="button"
                role="tab"
                aria-selected={status === t.key}
                className={`req-chip${status === t.key ? " on" : ""}${t.special ? " bad" : ""}`}
                onClick={() => setStatus(t.key)}
              >
                {t.label} <span>{t.n}</span>
              </button>
            ))}
          </div>
          <input className="req-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search requests" aria-label="Search requests" />
          <select className="req-client" value={clientId} onChange={(e) => setClientId(e.target.value)} aria-label="Filter by client">
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.clientId} value={c.clientId}>{c.name}</option>
            ))}
          </select>
        </div>

        {pinned && (
          <div className="req-pin">
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="k">Critical · pinned</div>
              <div style={{ fontWeight: 650, marginTop: 2 }}>{pinned.title}</div>
              <div style={{ fontSize: 12, color: "var(--n-500)", marginTop: 4 }}>
                {pinned.siteName || pinned.clientName}
                {" · "}
                {pinned.discussWithShane ? "Discuss with Shane" : "Chief AI handling"}
                {" · Open "}
                {age(pinned.createdAt)}
              </div>
            </div>
            <button type="button" className="btn acc" onClick={() => openRequest(pinned.id)}>Open</button>
          </div>
        )}
        {toast && <p className="req-toast" role="status">{toast}</p>}
        {error && <p className="req-err">{error}</p>}

        {loading ? (
          <p style={{ color: "var(--n-500)", fontSize: 13 }}>Loading...</p>
        ) : visible.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 28, textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 13, color: "var(--n-500)" }}>No requests here yet.</p>
          </div>
        ) : (
          <>
            <table className="req-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th className="r">Age</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr
                    key={r.id}
                    tabIndex={0}
                    className={`${selectedId === r.id ? "sel" : ""} ${r.priority === "critical" ? "crit" : ""}`}
                    onClick={() => openRequest(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openRequest(r.id);
                      }
                    }}
                  >
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.title}</div>
                      <div className="req-sub">{r.siteName || r.clientName} · {TYPE_LABEL[r.type] || r.type}</div>
                    </td>
                    <td><StatusPill status={r.status} /></td>
                    <td><PriorityPill priority={r.priority} /></td>
                    <td className={`req-age${r.priority === "critical" ? " hot" : ""}`}>{age(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="req-cards">
              {visible.map((r) => (
                <button key={r.id} type="button" className={`req-card${r.priority === "critical" ? " crit" : ""}`} onClick={() => openRequest(r.id)}>
                  <div className="top">
                    <h3>{r.title}</h3>
                    <span className={`req-age${r.priority === "critical" ? " hot" : ""}`}>{age(r.createdAt)}</span>
                  </div>
                  <div className="req-sub">{r.siteName || r.clientName}</div>
                  <div className="req-badges">
                    <PriorityPill priority={r.priority} />
                    <StatusPill status={r.status} />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedId && !shown && (
        <section className="req-panel" aria-label="Request detail">
          <header className="req-head">
            <button type="button" className="req-back" onClick={closePanel}>‹ Requests</button>
            <button type="button" className="req-x" onClick={closePanel} aria-label="Close panel">
              Close panel
            </button>
          </header>
          <p className="req-empty" style={{ padding: 20 }}>Loading...</p>
        </section>
      )}
      {shown && (
        <DetailPane
          r={shown}
          promptTakeOver={wantTakeOver && shown.id === deepId}
          onClose={closePanel}
          onTakeOverDone={clearTakeOverFlag}
          panelWidth={panelWidth}
          onPanelWidth={changePanelWidth}
          onPanelWidthReset={resetPanelWidth}
          onSaved={(msg, next) => {
            setToast(msg);
            if (next) setDetail(next);
            load();
            window.setTimeout(() => setToast(""), 3500);
          }}
        />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`pill st ${status}`}>
      <i />
      {statusLabel(status)}
    </span>
  );
}

function PriorityPill({ priority }: { priority: Priority }) {
  const cls = priority === "critical" ? "crit" : priority === "high" ? "high" : "norm";
  return <span className={`pill ${cls}`}>{PRI_LABEL[priority]}</span>;
}

function DetailPane({
  r,
  promptTakeOver,
  onClose,
  onTakeOverDone,
  onSaved,
  panelWidth,
  onPanelWidth,
  onPanelWidthReset,
}: {
  r: ClientRequest;
  promptTakeOver: boolean;
  onClose: () => void;
  onTakeOverDone: () => void;
  onSaved: (msg: string, next?: ClientRequest) => void;
  panelWidth: number;
  onPanelWidth: (width: number) => void;
  onPanelWidthReset: () => void;
}) {
  const saved = savedStatus(r);
  const [pending, setPending] = useState<Editable | null>(null);
  const [notify, setNotify] = useState(true);
  const [assignee, setAssignee] = useState(r.assignee || "");
  const [autoHandle, setAutoHandle] = useState(r.autoHandle && r.priority !== "critical");
  const [tab, setTab] = useState<"conversation" | "internal" | "details">("conversation");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [clarifierOn, setClarifierOn] = useState(true);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [more, setMore] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const topRef = useRef<number | null>(null);
  const [topPx, setTopPx] = useState<number | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const [autoTop, setAutoTop] = useState(TOP_MIN);
  const [capped, setCapped] = useState(false);
  const [splitDrag, setSplitDrag] = useState(false);
  const [widthDrag, setWidthDrag] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const measure = () => {
      setPanelHeight(panel.clientHeight);
      const top = panel.querySelector(".req-top");
      if (!top) return;
      setAutoTop(top.clientHeight);
      setCapped(top.scrollHeight > top.clientHeight + 1);
    };
    measure();
    const watcher = new ResizeObserver(measure);
    watcher.observe(panel);
    const top = panel.querySelector(".req-top");
    if (top) watcher.observe(top);
    return () => watcher.disconnect();
  }, [topPx, pending]);

  useEffect(() => {
    if (!panelHeight || narrow()) return;
    const basis = topRef.current ?? readStoredNumber(localStorage.getItem(SPLIT_STORAGE_KEY));
    if (basis == null) return;
    const next = clampSplit(basis, panelHeight);
    if (next === topRef.current) return;
    topRef.current = next;
    setTopPx(next);
    persistSplit(localStorage, next);
  }, [panelHeight]);

  function commitTop(next: number | null) {
    topRef.current = next;
    setTopPx(next);
    persistSplit(localStorage, next);
  }

  function onSplitPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0 || narrow()) return;
    const panel = panelRef.current;
    if (!panel) return;
    e.preventDefault();
    const handle = e.currentTarget;
    const startY = e.clientY;
    const startTop = topRef.current ?? panel.querySelector(".req-top")?.clientHeight ?? TOP_MIN;
    setSplitDrag(true);
    handle.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      commitTop(clampSplit(startTop + (ev.clientY - startY), panel.clientHeight));
    };
    const end = () => {
      setSplitDrag(false);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  function onSplitKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const panel = panelRef.current;
    if (!panel || narrow()) return;
    const height = panel.clientHeight;
    const current = topRef.current ?? panel.querySelector(".req-top")?.clientHeight ?? TOP_MIN;
    let next: number | null = null;
    if (e.key === "ArrowDown") next = moveSplit(current, height, SPLIT_STEP);
    else if (e.key === "ArrowUp") next = moveSplit(current, height, -SPLIT_STEP);
    else if (e.key === "Home") next = splitHome(height);
    else if (e.key === "End") next = splitEnd(height);
    else return;
    e.preventDefault();
    commitTop(next);
  }

  function onWidthPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0 || narrow()) return;
    e.preventDefault();
    const handle = e.currentTarget;
    const startX = e.clientX;
    const startW = panelWidth;
    setWidthDrag(true);
    handle.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      onPanelWidth(startW + (startX - ev.clientX));
    };
    const end = () => {
      setWidthDrag(false);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  function onWidthKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (narrow()) return;
    const viewport = window.innerWidth;
    let next: number | null = null;
    if (e.key === "ArrowLeft") next = panelWidth + SPLIT_STEP;
    else if (e.key === "ArrowRight") next = panelWidth - SPLIT_STEP;
    else if (e.key === "Home") next = PANEL_DEFAULT;
    else if (e.key === "End") next = clampPanelWidth(viewport, viewport);
    else return;
    e.preventDefault();
    onPanelWidth(next);
  }

  useEffect(() => {
    setPending(null);
    setAssignee(r.assignee || "");
    setAutoHandle(r.autoHandle && r.priority !== "critical");
    setMore(false);
    setErr("");
  }, [r]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/requests/settings?clientId=${encodeURIComponent(r.clientId)}`);
      const data = await res.json();
      if (res.ok) setClarifierOn(data.clarifierEnabled !== false);
    })();
  }, [r.clientId]);

  async function patch(body: Record<string, unknown>, kind: string) {
    setBusy(kind);
    setErr("");
    try {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(r.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      const msg = data.statusChanged
        ? data.emailed ? "Saved. Client emailed." : "Saved. No email sent."
        : "Saved";
      onSaved(msg, data.request);
      setReply("");
      setNote("");
      setPending(null);
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy("");
    }
  }

  function beginChange(next: Editable) {
    if (next === saved) {
      setPending(null);
      return;
    }
    setPending(next);
    setNotify(notifyClientDefault(next));
    setErr("");
    setMore(false);
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

  async function takeOver() {
    const ok = await patch(
      {
        discussWithShane: true,
        autoHandle: false,
        assignee: "shane",
        internalNote: "Take over: switched to Discuss with Shane.",
      },
      "handle",
    );
    if (ok) onTakeOverDone();
  }

  async function handBack() {
    await patch(
      {
        discussWithShane: false,
        autoHandle: true,
        assignee: "chief_ai",
        internalNote: "Handed back to Chief.",
      },
      "handle",
    );
  }

  const showHandle = r.priority === "critical" || r.discussWithShane || promptTakeOver;
  const done = saved === "done";
  const statusEntry = [...(r.timeline || [])].reverse().find((t) => t.kind === "status");
  const emailed = !statusEntry
    ? null
    : statusEntry.body.includes("Client not emailed")
      ? false
      : statusEntry.body.includes("Client emailed")
        ? true
        : null;
  const notes = (r.timeline || []).filter((t) => t.internal);
  const convo = (r.timeline || []).filter((t) => !t.internal && t.kind !== "agreed_change");

  const splitNow = topPx ?? autoTop;
  const splitMax = panelHeight ? splitEnd(panelHeight) : splitNow;

  return (
    <section ref={panelRef} className={`req-panel${splitDrag || widthDrag ? " is-dragging" : ""}`} aria-label="Request detail">
      <button
        type="button"
        className={`req-width${widthDrag ? " is-drag" : ""}`}
        aria-label="Resize panel width"
        onPointerDown={onWidthPointerDown}
        onKeyDown={onWidthKeyDown}
        onDoubleClick={onPanelWidthReset}
      >
        <i />
      </button>
      <div
        className={`req-top${topPx != null && !narrow() ? " is-set" : ""}${capped ? " is-capped" : ""}`}
        style={topPx != null && !narrow() ? { height: topPx } : undefined}
      >
      <header className="req-head">
        <button type="button" className="req-back" onClick={onClose}>‹ Requests</button>
        <div className="req-idrow">
          <div className="req-id">{r.id.slice(0, 8)}{r.siteName ? ` · ${r.siteName}` : ""}</div>
          <button type="button" className="req-x" onClick={onClose} aria-label="Close panel">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            Close panel
          </button>
        </div>
        <h2 className="req-title">{r.title}</h2>
        <p className="req-meta">
          {r.clientName || "Client"}
          {r.clientEmail ? ` · ${r.clientEmail}` : ""}
          {r.siteName ? ` · ${r.siteName}` : ""}
        </p>
        <div className="req-badges">
          <PriorityPill priority={r.priority} />
          <StatusPill status={saved} />
          {r.discussWithShane ? (
            <span className="pill handle">Discuss with Shane</span>
          ) : r.priority === "critical" ? (
            <span className="pill handle">Chief AI handling</span>
          ) : null}
        </div>
        {done && !pending && (
          <div className="req-done">
            <span>
              Done. Closed {fmt(r.statusChangedAt || statusEntry?.createdAt || r.updatedAt)}
              {statusEntry?.authorName ? ` by ${statusEntry.authorName}` : ""}.
              {emailed === true ? " Client emailed." : emailed === false ? " Client not emailed." : ""}
            </span>
            <button type="button" className="btn sm" onClick={() => beginChange("in_progress")}>Reopen</button>
          </div>
        )}
        {r.priority === "critical" && (
          <p className="req-handle">
            <strong>Critical.</strong>{" "}
            {r.discussWithShane
              ? "Discuss with Shane. Chief is paused until this is handed back."
              : "Chief AI is handling this. It comes to you for cost decisions or blockers."}
          </p>
        )}
        {promptTakeOver && !r.discussWithShane && (
          <p className="req-take">This link does not take the ticket over on its own. Click Take over to do it.</p>
        )}
        <div className="req-actions">
          <select
            aria-label="Status"
            className={pending ? "changed" : ""}
            value={pending || saved}
            onChange={(e) => beginChange(e.target.value as Editable)}
          >
            {EDITABLE.map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
          {showHandle && (
            <button
              type="button"
              className="btn"
              disabled={!!busy}
              onClick={r.discussWithShane ? handBack : takeOver}
            >
              {r.discussWithShane ? "Hand back to Chief" : "Take over"}
            </button>
          )}
          {done ? (
            <button type="button" className="btn" onClick={() => beginChange("in_progress")}>Reopen</button>
          ) : (
            <button type="button" className="btn acc" onClick={() => { if (!pending) beginChange("done"); }}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-6.5" /></svg>
              Mark done
            </button>
          )}
          <div className="req-more">
            <button type="button" className="btn" aria-label="More actions" aria-expanded={more} onClick={() => setMore((v) => !v)}>...</button>
            {more && (
              <div className="req-menu" role="menu">
                <button type="button" onClick={async () => {
                  const url = `${window.location.origin}/saabai-admin/requests?id=${encodeURIComponent(r.id)}`;
                  await navigator.clipboard.writeText(url);
                  setMore(false);
                  onSaved("Link copied");
                }}>Copy link</button>
                <button type="button" onClick={() => { window.open("/client-portal", "_blank", "noopener,noreferrer"); setMore(false); }}>
                  Open client portal view
                </button>
                {done && <button type="button" onClick={() => beginChange("in_progress")}>Reopen</button>}
              </div>
            )}
          </div>
        </div>
        {pending && (
          <ConfirmStrip
            from={saved}
            to={pending}
            notify={notify}
            setNotify={setNotify}
            request={r}
            busy={busy === "status"}
            err={err}
            onCancel={() => { setPending(null); setErr(""); }}
            onSave={() => patch({ status: pending, notifyClient: notify }, "status")}
          />
        )}
      </header>
      </div>
      <button
        type="button"
        className={`req-split${splitDrag ? " is-drag" : ""}`}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize request sections"
        aria-valuemin={TOP_MIN}
        aria-valuemax={splitMax}
        aria-valuenow={splitNow}
        onPointerDown={onSplitPointerDown}
        onKeyDown={onSplitKeyDown}
        onDoubleClick={() => commitTop(null)}
      >
        <i />
      </button>
      <div className="req-bottom">

      <div className="tabs req-tabs" role="tablist" aria-label="Request sections">
        <button type="button" role="tab" aria-selected={tab === "conversation"} className={tab === "conversation" ? "on" : ""} onClick={() => setTab("conversation")}>
          Conversation <span className="num">{convo.length + 1}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "internal"} className={tab === "internal" ? "on" : ""} onClick={() => setTab("internal")}>
          Internal notes <span className="num">{notes.length}</span>
          {notes.length > 0 && <i className="dot" aria-hidden="true" />}
        </button>
        <button type="button" role="tab" aria-selected={tab === "details"} className={tab === "details" ? "on" : ""} onClick={() => setTab("details")}>Details</button>
      </div>

      <div className="req-body">
        {tab === "conversation" && (
          <>
            {r.agreedChange && (
              <div className="req-agreed">
                <div className="k">Agreed change</div>
                {r.agreedChange}
              </div>
            )}
            <article className="req-bubble client">
              <div className="who"><b>{r.clientName || "Client"}</b> · Client · {fmt(r.createdAt)}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{r.description}</div>
              <Shots urls={r.screenshots} />
            </article>
            {convo.map((t) => <Entry key={t.id} t={t} />)}
          </>
        )}
        {tab === "internal" && (
          notes.length === 0
            ? <p className="req-empty">No internal notes yet.</p>
            : notes.map((t) => (
              <article key={t.id} className="req-note">
                <div className="who"><b>{t.authorName}</b> · Internal · {fmt(t.createdAt)}</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{t.body}</div>
              </article>
            ))
        )}
        {tab === "details" && (
          <>
            <label className="req-field">
              Assignee
              <select
                value={assignee}
                onChange={(e) => {
                  const value = e.target.value;
                  setAssignee(value);
                  patch({ assignee: value || null }, "handle");
                }}
              >
                <option value="">Unassigned</option>
                {(Object.keys(ASSIGNEE_LABEL) as Assignee[]).map((a) => (
                  <option key={a} value={a}>{ASSIGNEE_LABEL[a]}</option>
                ))}
              </select>
            </label>
            {r.priority !== "critical" && (
              <label className="req-check">
                <input
                  type="checkbox"
                  checked={autoHandle}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setAutoHandle(on);
                    patch({ autoHandle: on, discussWithShane: !on }, "handle");
                  }}
                />
                <span>
                  Chief AI handles this (off: Discuss with Shane)
                </span>
              </label>
            )}
            <label className="req-check">
              <input type="checkbox" checked={clarifierOn} onChange={(e) => toggleClarifier(e.target.checked)} />
              <span>
                AI clarifier for this client
                <small>Applies to all of this client&apos;s requests.</small>
              </span>
            </label>
            {r.agreedChange && (
              <div className="req-agreed">
                <div className="k">Agreed change</div>
                {r.agreedChange}
              </div>
            )}
            <Shots urls={r.screenshots} />
            <p className="req-empty">Opened {fmt(r.createdAt)}. Clarifier rounds {r.clarifierRounds || 0}.</p>
          </>
        )}
      </div>

      {tab !== "details" && (
        <form
          className={`req-compose${tab === "internal" ? " internal" : ""}`}
          onSubmit={(e) => {
            e.preventDefault();
            if (tab === "internal") {
              if (note.trim()) patch({ internalNote: note }, "note");
            } else if (reply.trim()) {
              patch({ reply }, "reply");
            }
          }}
        >
          <div className="lab">
            <span>{tab === "internal" ? "Internal note" : "Reply to client"}</span>
            {tab === "internal"
              ? <span className="vis internal">Internal only</span>
              : <span className="vis client">Visible to client</span>}
          </div>
          {tab === "internal" ? (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for the team. The client never sees this."
              aria-label="Internal note"
            />
          ) : (
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={r.clientEmail ? `Write a reply. It is emailed to ${r.clientEmail} and shows in their portal.` : "Write a reply. It shows in their portal."}
              aria-label="Reply to client"
            />
          )}
          <div className="send">
            {tab === "internal" ? (
              <button type="submit" className="btn req-note-btn" disabled={!!busy || !note.trim()}>Add internal note</button>
            ) : (
              <button type="submit" className={`btn pri${busy === "reply" ? " loading" : ""}`} disabled={!!busy || !reply.trim()}>Send reply</button>
            )}
          </div>
          {err && !pending && <p className="inline-err" style={{ color: "var(--bad)", fontSize: 12, marginTop: 8 }}>{err}</p>}
        </form>
      )}

      </div>

      <div className="req-mbar">
        <select
          aria-label="Status"
          className={pending ? "changed" : ""}
          value={pending || saved}
          onChange={(e) => beginChange(e.target.value as Editable)}
        >
          {EDITABLE.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
        {showHandle && !done && (
          <button type="button" className="btn" disabled={!!busy} onClick={r.discussWithShane ? handBack : takeOver}>
            {r.discussWithShane ? "Hand back" : "Take over"}
          </button>
        )}
        {done ? (
          <button type="button" className="btn" onClick={() => beginChange("in_progress")}>Reopen</button>
        ) : (
          <button type="button" className="btn acc" onClick={() => { if (!pending) beginChange("done"); }}>Mark done</button>
        )}
      </div>
    </section>
  );
}

function ConfirmStrip({
  from,
  to,
  notify,
  setNotify,
  request,
  busy,
  err,
  onCancel,
  onSave,
}: {
  from: string;
  to: string;
  notify: boolean;
  setNotify: (v: boolean) => void;
  request: ClientRequest;
  busy: boolean;
  err: string;
  onCancel: () => void;
  onSave: () => void;
}) {
  const line = statusEmailFirstLine(to, request.title, request.clientName);
  return (
    <div className="req-confirm" role="region" aria-label="Confirm status change">
      <h3>Change status: {statusLabel(from)} → {statusLabel(to)}</h3>
      <div className="req-switchrow">
        <button type="button" className={`req-switch${notify ? " on" : ""}`} role="switch" aria-checked={notify} aria-label="Email the client about this change" onClick={() => setNotify(!notify)}>
          <i />
        </button>
        <span>Email the client about this change</span>
        <span className="req-onoff">{notify ? "ON" : "OFF"}</span>
      </div>
      <div className="req-preview">
        <div className="to">To {request.clientEmail || "no email on file"} · {statusEmailSubject(request.title)}</div>
        {line}
      </div>
      <p className="req-help">Turn off to save without an email. It is still logged.</p>
      {err && <p className="inline-err">{err}</p>}
      <div className="row">
        <button type="button" className="btn gh" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className={`btn acc${busy ? " loading" : ""}`} onClick={onSave} disabled={busy}>
          {notify ? "Save and email client" : "Save without email"}
        </button>
      </div>
    </div>
  );
}

function Entry({ t }: { t: TimelineEntry }) {
  if (t.kind === "status" || t.kind === "system") {
    return <p className="req-system">{t.body} · {fmt(t.createdAt)}</p>;
  }
  const staff = t.authorKind === "admin" || t.authorKind === "assistant";
  return (
    <article className={`req-bubble ${staff ? "staff" : "client"}`}>
      <div className="who">
        <b>{t.authorName || (staff ? "Saabai" : "Client")}</b>
        {staff ? " · Sent to client" : " · Client"}
        {" · "}
        {fmt(t.createdAt)}
      </div>
      <div style={{ whiteSpace: "pre-wrap" }}>{t.body}</div>
    </article>
  );
}

function Shots({ urls }: { urls?: string[] }) {
  if (!urls?.length) return null;
  return (
    <div className="req-shots">
      {urls.map((u, i) => (
        <a key={u} href={u} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt={`Screenshot ${i + 1}`} />
        </a>
      ))}
    </div>
  );
}
