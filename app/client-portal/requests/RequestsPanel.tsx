"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  pickPortalRequestFiles,
  PORTAL_REQUEST_FILE_TYPES,
  PORTAL_REQUEST_MAX_BYTES,
  PORTAL_REQUEST_MAX_FILES,
} from "../../../lib/portal-request-files";
import "./rq.css";

type RequestType = "text_change" | "new_feature" | "bug" | "other";
type Priority = "low" | "normal" | "high" | "critical";
type Status =
  | "new"
  | "awaiting_client"
  | "triaged"
  | "in_progress"
  | "qa"
  | "blocked"
  | "done"
  | "received";

interface TimelineEntry {
  id: string;
  kind: string;
  authorKind: string;
  authorName: string;
  body: string;
  createdAt: string;
}

interface ClientRequest {
  id: string;
  title: string;
  description: string;
  type: RequestType;
  priority: Priority;
  screenshots: string[];
  status: Status;
  timeline: TimelineEntry[];
  agreedChange?: string;
  siteName?: string;
  createdAt: string;
  updatedAt: string;
}

const TYPE_OPTS: { id: RequestType; label: string }[] = [
  { id: "text_change", label: "Text change" },
  { id: "new_feature", label: "New feature" },
  { id: "bug", label: "Bug / broken" },
  { id: "other", label: "Other" },
];

const PRI_OPTS: { id: Priority; label: string; hint: string }[] = [
  { id: "low", label: "Low", hint: "When you can" },
  { id: "normal", label: "Normal", hint: "2 business days" },
  { id: "high", label: "High", hint: "Same day" },
  { id: "critical", label: "Critical", hint: "Site broken" },
];

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  received: "New",
  awaiting_client: "Awaiting you",
  triaged: "Triaged",
  in_progress: "In progress",
  qa: "QA / Review",
  blocked: "Blocked",
  done: "Done",
};

const MAX_FILES = PORTAL_REQUEST_MAX_FILES;
const MAX_BYTES = PORTAL_REQUEST_MAX_BYTES;
const FILE_TYPES = [...PORTAL_REQUEST_FILE_TYPES];

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadge(status: string) {
  if (status === "done") return "badge b-ok";
  if (status === "in_progress" || status === "qa" || status === "triaged") return "badge b-info";
  if (status === "awaiting_client" || status === "blocked") return "badge b-warn";
  return "badge b-n";
}

function priClass(p: Priority) {
  if (p === "critical") return "pr crit";
  if (p === "high") return "pr high";
  if (p === "low") return "pr low";
  return "pr";
}

export function RequestsPanel() {
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [uploadFolder, setUploadFolder] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"list" | "new" | "detail">("list");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<ClientRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/portal/requests");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load requests");
      setRequests(data.requests || []);
      setUploadFolder(data.uploadFolder || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(id: string) {
    setActiveId(id);
    setView("detail");
    try {
      const res = await fetch(`/api/portal/requests/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");
      setActive(data.request);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open request");
      setView("list");
    }
  }

  if (view === "new") {
    return (
      <NewRequestForm
        uploadFolder={uploadFolder}
        onCancel={() => setView("list")}
        onCreated={(r) => {
          setRequests((prev) => [r, ...prev]);
          setActive(r);
          setActiveId(r.id);
          setView("detail");
        }}
      />
    );
  }

  if (view === "detail" && active) {
    return (
      <RequestDetail
        request={active}
        onBack={() => {
          setView("list");
          setActive(null);
          load();
        }}
        onUpdated={(r) => {
          setActive(r);
          setRequests((prev) => prev.map((x) => (x.id === r.id ? r : x)));
        }}
      />
    );
  }

  return (
    <>
      <div className="ph">
        <div>
          <h1>Requests</h1>
          <div className="sub">Changes, questions and support. We reply in the thread.</div>
        </div>
        <button type="button" className="btn pri" onClick={() => setView("new")}>
          New request
        </button>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="bd" style={{ color: "var(--bad, #c2261d)" }}>
            {error}
          </div>
        </div>
      )}

      {loading ? (
        <div className="card">
          <div className="bd muted">Loading your requests…</div>
        </div>
      ) : requests.length === 0 ? (
        <div className="card">
          <div className="empty">
            <h3>No requests yet</h3>
            <p>Ask for a change, report a bug, or share an idea. We reply in the portal.</p>
            <button type="button" className="btn pri" style={{ marginTop: 12 }} onClick={() => setView("new")}>
              New request
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r.id}
                  className={r.priority === "critical" ? "cr" : undefined}
                  style={{ cursor: "pointer" }}
                  onClick={() => openDetail(r.id)}
                >
                  <td>
                    <b style={{ fontWeight: 500 }}>{r.title}</b>
                    <div className="ref" style={{ marginTop: 2 }}>
                      {TYPE_OPTS.find((t) => t.id === r.type)?.label || r.type}
                    </div>
                  </td>
                  <td>
                    <span className={priClass(r.priority)}>{PRI_OPTS.find((p) => p.id === r.priority)?.label}</span>
                  </td>
                  <td>
                    <span className={statusBadge(r.status)}>{STATUS_LABEL[r.status] || r.status}</span>
                  </td>
                  <td className="muted">{fmt(r.updatedAt || r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {activeId ? null : null}
    </>
  );
}

function NewRequestForm({
  uploadFolder,
  onCreated,
  onCancel,
}: {
  uploadFolder: string;
  onCreated: (r: ClientRequest) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<RequestType>("text_change");
  const [priority, setPriority] = useState<Priority>("normal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const urls = files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : ""));
    setPreviews(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    const result = pickPortalRequestFiles(files, list);
    setFiles(result.files);
    setError(result.ok ? "" : result.error);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (title.trim().length < 3) {
      setError("Please add a short title.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Please describe the change in a little more detail.");
      return;
    }
    setBusy(true);
    try {
      const screenshots: string[] = [];
      for (const f of files) {
        if (!uploadFolder) break;
        const safeName = f.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-60) || "file";
        const blob = await upload(`${uploadFolder}/${safeName}`, f, {
          access: "public",
          handleUploadUrl: "/api/portal/requests/upload",
          contentType: f.type,
        });
        screenshots.push(blob.url);
      }
      const res = await fetch("/api/portal/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority, type, screenshots }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send your request");
      onCreated(data.request);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="ph">
        <div>
          <h1>New request</h1>
          <div className="sub">Tell us what you need. We usually reply within 2 business days.</div>
        </div>
      </div>
      <form onSubmit={submit} className="card">
        <div className="bd" style={{ padding: "22px 24px" }}>
          <div className="rq-f">
            <label htmlFor="rq-type">Type</label>
            <select
              id="rq-type"
              value={type}
              onChange={(e) => setType(e.target.value as RequestType)}
              className="rq-select"
            >
              {TYPE_OPTS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rq-f">
            <span className="rq-label">Priority</span>
            <div className="rq-pri">
              {PRI_OPTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`rq-pri-btn ${priority === p.id ? "on" : ""} ${p.id === "critical" ? "crit" : ""}`}
                  onClick={() => setPriority(p.id)}
                >
                  <strong>{p.label}</strong>
                  <small>{p.hint}</small>
                </button>
              ))}
            </div>
            {priority === "critical" && (
              <div className="warnbox" style={{ marginTop: 10 }}>
                <div>
                  <b>This alerts the Saabai team, Chief included, immediately, day or night.</b> Use Critical only when your site is
                  down or customers can&apos;t book, pay or contact you. For anything else, choose High.
                </div>
              </div>
            )}
          </div>

          <div className="rq-f">
            <label htmlFor="rq-title">Title</label>
            <input
              id="rq-title"
              className="rq-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Update opening hours from 9-5 to 8-6"
            />
          </div>

          <div className="rq-f">
            <label htmlFor="rq-desc">What&apos;s happening?</label>
            <textarea
              id="rq-desc"
              className="rq-input rq-ta"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={5}
              placeholder="What should change, where on the site, and any wording or links to use."
            />
          </div>

          <div className="rq-f">
            <span className="rq-label">
              Screenshots <small>PNG, JPG or PDF, up to 10 MB each</small>
            </span>
            <div className="rq-files">
              {previews.map((src, i) => (
                <div key={i} className="rq-thumb">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={`Attachment ${i + 1}`} />
                  ) : (
                    <div className="rq-pdf">{files[i]?.name || "PDF"}</div>
                  )}
                  <button
                    type="button"
                    aria-label="Remove"
                    className="rq-x"
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </div>
              ))}
              {files.length < MAX_FILES && (
                <div className="rq-add-wrap">
                  <button type="button" className="rq-add" onClick={openFilePicker}>
                    Add Screenshot
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={FILE_TYPES.join(",")}
                    multiple
                    className="rq-file-input"
                    aria-label="Add screenshot"
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {error && <p style={{ color: "var(--bad, #c2261d)", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}

          <div className="rq-act">
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={`btn pri ${priority === "critical" ? "crit" : ""}`} disabled={busy}>
              {busy ? "Sending…" : priority === "critical" ? "Send critical request" : "Send request"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

function RequestDetail({
  request,
  onBack,
  onUpdated,
}: {
  request: ClientRequest;
  onBack: () => void;
  onUpdated: (r: ClientRequest) => void;
}) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/portal/requests/${encodeURIComponent(request.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send reply");
      onUpdated(data.request);
      setReply("");
      // Refresh shortly so clarifier message can appear
      setTimeout(async () => {
        const r2 = await fetch(`/api/portal/requests/${encodeURIComponent(request.id)}`);
        const d2 = await r2.json();
        if (r2.ok && d2.request) onUpdated(d2.request);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reply");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="ph">
        <div>
          <button type="button" className="btn sm" onClick={onBack} style={{ marginBottom: 10 }}>
            ← All requests
          </button>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className={priClass(request.priority)}>
              {PRI_OPTS.find((p) => p.id === request.priority)?.label}
            </span>
            <span className={statusBadge(request.status)}>{STATUS_LABEL[request.status]}</span>
            <span className="ref">{TYPE_OPTS.find((t) => t.id === request.type)?.label}</span>
          </div>
          <h1 style={{ marginTop: 8 }}>{request.title}</h1>
          <div className="sub">
            {request.siteName ? `${request.siteName} · ` : ""}
            Opened {fmt(request.createdAt)}
          </div>
        </div>
      </div>

      {request.priority === "critical" && request.status !== "done" && (
        <div className="crit-strip">
          <div className="ico" aria-hidden>
            <svg viewBox="0 0 24 24">
              <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
            </svg>
          </div>
          <div>
            <div className="lbl">Critical</div>
            <div style={{ fontSize: 13 }}>The Saabai team, Chief included, was alerted. Target: first response within 1 hour.</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="hd">
          <h2>Conversation</h2>
        </div>
        <div>
          {request.timeline.length === 0 ? (
            <div className="bd muted">No messages yet.</div>
          ) : (
            request.timeline.map((t) => (
              <div key={t.id} className="cm">
                <span className={`ava ${t.authorKind === "assistant" ? "ai" : t.authorKind === "client" ? "cl" : ""} sm`}>
                  {t.authorKind === "assistant" ? (
                    <svg viewBox="0 0 24 24">
                      <rect x="4" y="7" width="16" height="12" rx="3" />
                      <path d="M12 3v4M9 13h.01M15 13h.01" />
                    </svg>
                  ) : (
                    (t.authorName || "?").slice(0, 1).toUpperCase()
                  )}
                </span>
                <div>
                  <div className="h">
                    <b>
                      {t.authorName}
                      {t.authorKind === "assistant" ? <span className="aitag"> AI</span> : null}
                    </b>
                    <span className="t">{fmt(t.createdAt)}</span>
                  </div>
                  <p style={{ whiteSpace: "pre-wrap" }}>{t.body}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <form onSubmit={sendReply} className="compose">
          <textarea
            className="tx"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply here…"
            rows={3}
            style={{
              width: "100%",
              border: "none",
              resize: "vertical",
              fontFamily: "inherit",
              fontSize: 14,
              color: "inherit",
              outline: "none",
              minHeight: 54,
            }}
          />
          <div className="bt">
            <span className="muted" style={{ fontSize: 12 }}>
              Saabai Assistant may ask a quick clarifying question.
            </span>
            <button type="submit" className="btn sm pri" disabled={busy || !reply.trim()}>
              {busy ? "Sending…" : "Send reply"}
            </button>
          </div>
          {error && <p style={{ color: "var(--bad)", fontSize: 12, margin: "8px 0 0" }}>{error}</p>}
        </form>
      </div>

      {request.screenshots?.length > 0 && (
        <div className="card">
          <div className="hd">
            <h2>Attachments</h2>
          </div>
          <div className="bd att">
            {request.screenshots.map((u, i) => (
              <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="th">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`Attachment ${i + 1}`} />
                <div>File {i + 1}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
