"use client";

import { useCallback, useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";

const C = {
  card: "#ffffff",
  border: "rgba(0,0,0,0.08)",
  text: "#111827",
  muted: "#9ca3af",
  dim: "#6b7280",
  gold: "#C9A84C",
  goldBg: "rgba(201,168,76,0.10)",
  goldBdr: "rgba(201,168,76,0.22)",
  green: "#16a34a",
  greenBg: "rgba(22,163,74,0.10)",
  amber: "#b45309",
  amberBg: "rgba(217,119,6,0.12)",
  blue: "#2563eb",
  blueBg: "rgba(37,99,235,0.08)",
  red: "#dc2626",
  redBg: "rgba(220,38,38,0.08)",
};

type Status = "received" | "in_progress" | "done";
type Priority = "low" | "normal" | "high";

interface ClientRequest {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  screenshots: string[];
  status: Status;
  adminNote?: string;
  siteName?: string;
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

const MAX_FILES = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS[status] ?? STATUS.received;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20, color: s.color, background: s.bg, letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 14,
  color: C.text, background: "#fff", border: `1px solid rgba(0,0,0,0.14)`,
  borderRadius: 10, outline: "none", fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block", marginBottom: 6, fontSize: 11, fontWeight: 700,
  letterSpacing: 1, textTransform: "uppercase", color: C.dim,
};

function NewRequestForm({ uploadFolder, onCreated, onCancel }: {
  uploadFolder: string;
  onCreated: (r: ClientRequest) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError("");
    const next = [...files];
    for (const f of Array.from(list)) {
      if (!TYPES.includes(f.type)) { setError("Screenshots need to be PNG, JPG, WebP or GIF images."); continue; }
      if (f.size > MAX_BYTES) { setError(`${f.name} is over 5 MB. Please use a smaller image.`); continue; }
      if (next.length >= MAX_FILES) { setError(`You can attach up to ${MAX_FILES} screenshots.`); break; }
      next.push(f);
    }
    setFiles(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (title.trim().length < 3) { setError("Please add a short title."); return; }
    if (description.trim().length < 10) { setError("Please describe the change in a little more detail."); return; }
    setBusy(true);
    try {
      const screenshots: string[] = [];
      for (const f of files) {
        const safeName = f.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-60) || "screenshot";
        const blob = await upload(`${uploadFolder}/${safeName}`, f, {
          access: "public",
          handleUploadUrl: "/api/dashboard/requests/upload",
          contentType: f.type,
        });
        screenshots.push(blob.url);
      }
      const res = await fetch("/api/dashboard/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority, screenshots }),
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
    <form onSubmit={submit} style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.gold}`, borderRadius: 14, padding: 22, marginBottom: 22 }}>
      <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: C.text }}>New request</p>
      <p style={{ margin: "0 0 18px", fontSize: 12, color: C.dim }}>Tell us what you&apos;d like changed or added to your website. We&apos;ll email you as it progresses.</p>

      <div style={{ marginBottom: 14 }}>
        <label htmlFor="req-title" style={labelStyle}>Title</label>
        <input id="req-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Update opening hours on the contact page" style={inputStyle} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label htmlFor="req-desc" style={labelStyle}>Details</label>
        <textarea id="req-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} rows={5} placeholder="What should change, where on the site, and any wording or links to use." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <span style={labelStyle}>Priority</span>
        <div style={{ display: "flex", gap: 8 }}>
          {(["low", "normal", "high"] as Priority[]).map((p) => (
            <button key={p} type="button" onClick={() => setPriority(p)} style={{
              padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${priority === p ? C.goldBdr : "rgba(0,0,0,0.12)"}`,
              background: priority === p ? C.goldBg : "#fff",
              color: priority === p ? "#8a6d1f" : C.dim,
            }}>
              {PRIORITY[p].label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <span style={labelStyle}>Screenshots (optional, up to 3, max 5 MB each)</span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {previews.map((src, i) => (
            <div key={src} style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Screenshot ${i + 1}`} style={{ width: 88, height: 66, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}` }} />
              <button type="button" aria-label="Remove screenshot" onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ position: "absolute", top: -7, right: -7, width: 20, height: 20, borderRadius: 10, border: "none", background: C.text, color: "#fff", fontSize: 11, cursor: "pointer", lineHeight: "20px", padding: 0 }}>×</button>
            </div>
          ))}
          {files.length < MAX_FILES && (
            <label style={{ width: 88, height: 66, borderRadius: 8, border: "1px dashed rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.dim, cursor: "pointer", textAlign: "center" }}>
              + Add
              <input type="file" accept={TYPES.join(",")} multiple style={{ display: "none" }} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
      </div>

      {error && <p style={{ margin: "0 0 14px", fontSize: 13, color: C.red }}>{error}</p>}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid rgba(0,0,0,0.12)`, background: "#fff", color: C.dim, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button type="submit" disabled={busy} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.goldBdr}`, background: C.goldBg, color: "#8a6d1f", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Sending…" : "Send request"}
        </button>
      </div>
    </form>
  );
}

export default function RequestsContent() {
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [uploadFolder, setUploadFolder] = useState("");
  const [siteName, setSiteName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [thanks, setThanks] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/requests");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load your requests");
      setRequests(data.requests || []);
      setUploadFolder(data.uploadFolder || "");
      setSiteName(data.siteName || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (new URLSearchParams(window.location.search).get("new") === "1") setShowForm(true);
  }, [load]);

  const open = requests.filter((r) => r.status !== "done").length;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: C.text }}>Requests</h1>
          <p style={{ margin: 0, fontSize: 13, color: C.dim }}>
            Ask for changes or new features{siteName ? ` on ${siteName}` : " on your website"}, and track their progress here.
          </p>
        </div>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setThanks(false); }} style={{ padding: "11px 20px", borderRadius: 10, border: `1px solid ${C.goldBdr}`, background: C.goldBg, color: "#8a6d1f", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            + New request
          </button>
        )}
      </div>

      {thanks && (
        <div style={{ marginBottom: 22, padding: "14px 16px", borderRadius: 12, background: C.greenBg, border: "1px solid rgba(22,163,74,0.25)" }}>
          <p style={{ margin: 0, fontSize: 13, color: C.green, fontWeight: 600 }}>Thanks, your request has been sent. We&apos;ll be in touch soon.</p>
        </div>
      )}

      {showForm && (
        <NewRequestForm
          uploadFolder={uploadFolder}
          onCancel={() => setShowForm(false)}
          onCreated={(r) => { setRequests([r, ...requests]); setShowForm(false); setThanks(true); }}
        />
      )}

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>Your requests</p>
          {requests.length > 0 && <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{open} open · {requests.length} total</p>}
        </div>

        {loading ? (
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Loading your requests…</p>
        ) : error ? (
          <p style={{ margin: 0, fontSize: 13, color: C.red }}>{error}</p>
        ) : requests.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: C.dim }}>No requests yet. Press &ldquo;New request&rdquo; whenever you&apos;d like something changed.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {requests.map((r, i) => (
              <div key={r.id} style={{ padding: "16px 0", borderTop: i === 0 ? "none" : `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, justifyContent: "space-between" }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>{r.title}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: C.muted }}>
                      Sent {fmtDate(r.createdAt)} · Priority <span style={{ color: PRIORITY[r.priority]?.color, fontWeight: 600 }}>{PRIORITY[r.priority]?.label}</span>
                      {r.updatedAt !== r.createdAt ? ` · Updated ${fmtDate(r.updatedAt)}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p style={{ margin: "10px 0 0", fontSize: 13, color: "#374151", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{r.description}</p>
                {r.screenshots.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    {r.screenshots.map((u, j) => (
                      <a key={u} href={u} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt={`Screenshot ${j + 1}`} style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}` }} />
                      </a>
                    ))}
                  </div>
                )}
                {r.adminNote && (
                  <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "#f8f6f2", border: `1px solid ${C.border}` }}>
                    <p style={{ margin: "0 0 3px", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "#0f766e" }}>Note from Saabai</p>
                    <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{r.adminNote}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
