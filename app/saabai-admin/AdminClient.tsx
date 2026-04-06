"use client";

import { useState, useEffect } from "react";
import type { ClientConfig } from "../../lib/clients";
import type { RexStats } from "../../lib/rex-stats";

const T = {
  label:   { fontSize: 11, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 1.2, fontWeight: 700 },
  heading: { fontSize: 13, color: "#111827", fontWeight: 700 },
  body:    { fontSize: 13, color: "#374151" },
  muted:   { fontSize: 12, color: "#6b7280" },
  card:    { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
};

function fmtPrice(v: number) {
  if (!v) return "—";
  return `$${v.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pct(a: number, b: number) {
  if (!b) return "—";
  return `${Math.round((a / b) * 100)}%`;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, padding: "12px 16px", background: "#f9fafb", borderRadius: 10 }}>
      <p style={{ ...T.label, margin: "0 0 4px", fontSize: 10 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: -0.5 }}>{value}</p>
    </div>
  );
}

// ── Rex client card ────────────────────────────────────────────────────────────

function RexClientCard({ client, rexStats }: { client: ClientConfig; rexStats: RexStats }) {
  const todayStr   = new Date(Date.now() + 10 * 3600 * 1000).toISOString().slice(0, 10);
  const todayCount = rexStats.dailyCounts.find(d => d.date === todayStr)?.count ?? 0;
  const weekCount  = rexStats.dailyCounts.slice(-7).reduce((s, d) => s + d.count, 0);

  const isHealthy = rexStats.total > 0;

  return (
    <div style={{ ...T.card, padding: 0, overflow: "hidden" }}>
      {/* Card header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: "linear-gradient(135deg, #e13f00 0%, #ff6b35 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900, color: "#fff",
          }}>
            P
          </div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 800, color: "#111827" }}>{client.name}</p>
            <p style={{ ...T.muted, margin: 0 }}>Rex AI Sales Agent</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 20,
            background: isHealthy ? "#f0fdf4" : "#f3f4f6",
            color: isHealthy ? "#059669" : "#9ca3af",
            fontSize: 11, fontWeight: 700,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: isHealthy ? "#22c55e" : "#d1d5db", display: "inline-block" }} />
            {isHealthy ? "Live" : "No data"}
          </span>
          <a
            href={client.dashboardUrl}
            style={{ padding: "6px 14px", borderRadius: 8, background: "#e13f00", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}
          >
            Open Dashboard →
          </a>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: "16px 24px 20px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <StatPill label="Total Leads"      value={String(rexStats.total)} />
          <StatPill label="Today"            value={String(todayCount)} />
          <StatPill label="This Week"        value={String(weekCount)} />
          <StatPill label="Email Capture"    value={pct(rexStats.withEmail, rexStats.total)} />
          <StatPill label="Avg Quote"        value={fmtPrice(rexStats.avgPrice)} />
        </div>

        {/* Top material + source strip */}
        {rexStats.total > 0 && (() => {
          const topMat = Object.entries(rexStats.materials).sort((a, b) => b[1] - a[1])[0];
          const topSrc = Object.entries(rexStats.sources).sort((a, b) => b[1] - a[1])[0];
          const srcLabels: Record<string, string> = { rex_quote_email: "Quote form", rex_mid_chat: "Mid-chat", pete_ended: "End panel", rex_quick_reply: "Quick reply" };
          return (
            <div style={{ display: "flex", gap: 16 }}>
              {topMat && <p style={{ ...T.muted, margin: 0 }}>Top material: <strong style={{ color: "#111827" }}>{topMat[0]}</strong> ({topMat[1]} leads)</p>}
              {topSrc && <p style={{ ...T.muted, margin: 0 }}>Top source: <strong style={{ color: "#111827" }}>{srcLabels[topSrc[0]] ?? topSrc[0]}</strong></p>}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Generic client card (no stats yet) ────────────────────────────────────────

function GenericClientCard({ client }: { client: ClientConfig }) {
  return (
    <div style={{ ...T.card, padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: "#f3f4f6",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900, color: "#9ca3af",
          }}>
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 800, color: "#111827" }}>{client.name}</p>
            <p style={{ ...T.muted, margin: 0 }}>{client.email}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ padding: "4px 10px", borderRadius: 20, background: "#f3f4f6", color: "#9ca3af", fontSize: 11, fontWeight: 700 }}>
            Onboarding
          </span>
          {client.dashboardUrl !== "/saabai-admin" && (
            <a
              href={client.dashboardUrl}
              style={{ padding: "6px 14px", borderRadius: 8, background: "#f3f4f6", color: "#374151", fontSize: 12, fontWeight: 700, textDecoration: "none" }}
            >
              Open Dashboard →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Digest trigger ────────────────────────────────────────────────────────────

type DigestState = "idle" | "sending" | "sent" | "error";

function DigestTrigger() {
  const [state, setState] = useState<DigestState>("idle");
  const [result, setResult] = useState<{ leads?: number; emailCaptureRate?: string } | null>(null);

  async function fire() {
    setState("sending");
    setResult(null);
    try {
      const res = await fetch("/api/rex-weekly-digest");
      const data = await res.json();
      if (data.ok) {
        setState("sent");
        setResult(data.thisWeek);
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
    setTimeout(() => { setState("idle"); setResult(null); }, 8000);
  }

  const bgColor   = state === "sent" ? "#f0fdf4" : state === "error" ? "#fef2f2" : "#f9fafb";
  const border    = state === "sent" ? "#bbf7d0" : state === "error" ? "#fecaca" : "#e5e7eb";
  const textColor = state === "sent" ? "#059669" : state === "error" ? "#dc2626" : "#374151";

  return (
    <div style={{ ...T.card, background: bgColor, border: `1px solid ${border}`, padding: "20px 24px", marginTop: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 700, color: textColor }}>
          {state === "idle"    && "Weekly Performance Digest"}
          {state === "sending" && "Sending digest emails…"}
          {state === "sent"    && `Sent! ${result?.leads ?? 0} leads · ${result?.emailCaptureRate ?? "—"} capture rate this week`}
          {state === "error"   && "Send failed — check Resend + env vars"}
        </p>
        <p style={{ ...T.muted, margin: 0 }}>
          {state === "idle" ? "Fires automatically every Monday 9am AEST via Vercel Cron" : ""}
        </p>
      </div>
      <button
        onClick={fire}
        disabled={state === "sending"}
        style={{
          padding: "8px 18px", borderRadius: 8, border: "none", cursor: state === "sending" ? "not-allowed" : "pointer",
          background: state === "sending" ? "#e5e7eb" : "#111827",
          color: state === "sending" ? "#9ca3af" : "#ffffff",
          fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" as const,
        }}
      >
        {state === "sending" ? "Sending…" : "Send Now"}
      </button>
    </div>
  );
}

// ── LinkedIn Queue Manager ────────────────────────────────────────────────────

interface QueuedPost {
  id: string;
  content: string;
  imageUrl?: string;
  scheduledFor: string;
  createdAt: string;
}

function LinkedInQueue() {
  const [posts, setPosts] = useState<QueuedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [viewingPost, setViewingPost] = useState<QueuedPost | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/linkedin/queue");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(post: QueuedPost) {
    setViewingPost(null);
    setEditingId(post.id);
    setEditContent(post.content);
    setEditDate(post.scheduledFor);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await fetch("/api/linkedin/queue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, content: editContent, scheduledFor: editDate }),
    });
    setSaving(false);
    setEditingId(null);
    load();
  }

  async function cancelPost(id: string) {
    if (!confirm("Remove this post from the queue?")) return;
    await fetch("/api/linkedin/queue", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function postNow(post: QueuedPost) {
    if (!confirm("Post this to LinkedIn right now?")) return;
    await fetch("/api/linkedin/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: post.content }),
    });
    await fetch("/api/linkedin/queue", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id }),
    });
    setViewingPost(null);
    load();
  }

  function fmtDate(d: string) {
    const date = new Date(d + "T00:00:00+10:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
    return `${date} · 9:00am`;
  }

  const today = new Date(Date.now() + 10 * 3600 * 1000).toISOString().slice(0, 10);

  if (loading) return null;
  if (posts.length === 0) return null;

  const btnBase: React.CSSProperties = { fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "3px 9px", cursor: "pointer", border: "1px solid #e5e7eb", background: "#fff", color: "#374151" };

  return (
    <>
      {/* ── View modal ── */}
      {viewingPost && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setViewingPost(null)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: viewingPost.scheduledFor <= today ? "#d97706" : "#0077b5", background: viewingPost.scheduledFor <= today ? "#fef3c7" : "#eff8ff", padding: "3px 8px", borderRadius: 20 }}>
                  {viewingPost.scheduledFor <= today ? "POSTING TODAY" : fmtDate(viewingPost.scheduledFor)}
                </span>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{viewingPost.content.length} chars</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => startEdit(viewingPost)} style={{ ...btnBase }}>Edit</button>
                <button onClick={() => postNow(viewingPost)} style={{ ...btnBase, color: "#0077b5", background: "#eff8ff", borderColor: "#bfdbfe" }}>Post now</button>
                <button onClick={() => { cancelPost(viewingPost.id); setViewingPost(null); }} style={{ ...btnBase, color: "#ef4444", borderColor: "#fecaca" }}>Remove</button>
                <button onClick={() => setViewingPost(null)} style={{ ...btnBase, color: "#9ca3af" }}>✕</button>
              </div>
            </div>
            {/* Modal body */}
            <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#111827", lineHeight: 1.75, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                {viewingPost.content}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editingId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setEditingId(null)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827" }}>Edit Post</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#6b7280" }}>Reschedule:</span>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                  style={{ padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, color: "#111827", background: "#fff", outline: "none" }} />
              </div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={12}
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, lineHeight: 1.7, color: "#111827", background: "#f9fafb", resize: "vertical", outline: "none", fontFamily: "inherit" }} />
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setEditingId(null)} style={{ ...btnBase }}>Cancel</button>
              <button onClick={() => saveEdit(editingId)} disabled={saving}
                style={{ ...btnBase, background: "#0077b5", color: "#fff", border: "none", fontWeight: 700 }}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Queue list ── */}
      <div style={{ ...T.card, padding: "20px 24px", marginTop: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: collapsed ? 0 : 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "#0077b5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#fff" }}>in</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827" }}>Scheduled Posts</p>
              <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>{posts.length} queued · 9am Brisbane · Mon / Wed / Fri</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={load} style={{ fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>↻</button>
            <button
              onClick={() => setCollapsed(v => !v)}
              style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 6 }}
            >
              <span style={{ display: "inline-block", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
              {collapsed ? "Show" : "Hide"}
            </button>
          </div>
        </div>

        {/* Compact table */}
        {!collapsed && <div style={{ display: "flex", flexDirection: "column" as const, gap: 1 }}>
          {posts.map((post, i) => {
            const isDue = post.scheduledFor <= today;
            const preview = post.content.split("\n").find(l => l.trim()) ?? "";
            return (
              <div key={post.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: i % 2 === 0 ? "#f9fafb" : "#fff", border: isDue ? "1px solid #fbbf24" : "1px solid transparent" }}>
                {/* Date badge */}
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: isDue ? "#d97706" : "#0077b5", background: isDue ? "#fef3c7" : "#eff8ff", padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                  {isDue ? "TODAY" : fmtDate(post.scheduledFor)}
                </span>
                {/* Preview */}
                <span style={{ fontSize: 12, color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                  {preview}
                </span>
                {/* Actions */}
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => setViewingPost(post)} style={{ ...btnBase, color: "#0077b5", borderColor: "#bfdbfe", background: "#f0f9ff" }}>View</button>
                  <button onClick={() => startEdit(post)} style={{ ...btnBase }}>Edit</button>
                  <button onClick={() => postNow(post)} style={{ ...btnBase, color: "#059669", borderColor: "#a7f3d0", background: "#f0fdf4" }}>Post now</button>
                  <button onClick={() => cancelPost(post.id)} style={{ ...btnBase, color: "#ef4444", borderColor: "#fecaca" }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>}
      </div>
    </>
  );
}

// ── LinkedIn Post Panel ───────────────────────────────────────────────────────

type ImageType = "none" | "stat" | "insight" | "quote" | "beforeafter";

const IMAGE_TYPES: { value: ImageType; label: string; hint: string }[] = [
  { value: "none",        label: "No image",     hint: "Text only" },
  { value: "insight",     label: "Insight card",  hint: "Headline + subtext" },
  { value: "stat",        label: "Stat card",     hint: "Big number + context" },
  { value: "quote",       label: "Quote card",    hint: "Pull quote" },
  { value: "beforeafter", label: "Before → After", hint: "Two-panel comparison" },
];

function LinkedInPanel() {
  const [content, setContent] = useState("");
  const [imageType, setImageType] = useState<ImageType>("none");
  const [imgHeadline, setImgHeadline] = useState("");
  const [imgSub, setImgSub]     = useState("");
  const [imgStat, setImgStat]   = useState("");
  const [imgBefore, setImgBefore] = useState("");
  const [imgAfter, setImgAfter]  = useState("");
  const [imgLabel, setImgLabel]  = useState("Saabai.ai");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "posting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const charCount = content.length;
  const over = charCount > 3000;

  function buildImageUrl() {
    if (imageType === "none") return null;
    const base = "/api/og/linkedin-card";
    const p = new URLSearchParams({ type: imageType });
    if (imgHeadline) p.set("headline", imgHeadline);
    if (imgSub)      p.set("sub", imgSub);
    if (imgStat)     p.set("stat", imgStat);
    if (imgBefore)   p.set("before", imgBefore);
    if (imgAfter)    p.set("after", imgAfter);
    if (imgLabel)    p.set("label", imgLabel);
    return `${base}?${p.toString()}`;
  }

  function handlePreview() { setPreviewUrl(buildImageUrl()); }

  async function handlePost() {
    if (!content.trim() || over) return;
    setStatus("posting");
    const imageParams: Record<string, string> = {};
    if (imgHeadline) imageParams.headline = imgHeadline;
    if (imgSub)      imageParams.sub      = imgSub;
    if (imgStat)     imageParams.stat     = imgStat;
    if (imgBefore)   imageParams.before   = imgBefore;
    if (imgAfter)    imageParams.after    = imgAfter;
    if (imgLabel)    imageParams.label    = imgLabel;
    try {
      const res = await fetch("/api/linkedin/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, imageType, imageParams }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setStatus("done");
      setMessage("Posted to LinkedIn ✓");
      setContent(""); setImgHeadline(""); setImgSub(""); setImgStat("");
      setImgBefore(""); setImgAfter(""); setImageType("none"); setPreviewUrl(null);
      setTimeout(() => { setStatus("idle"); setMessage(""); }, 4000);
    } catch (err) {
      setStatus("error");
      setMessage(String(err));
      setTimeout(() => { setStatus("idle"); setMessage(""); }, 6000);
    }
  }

  const inp = (placeholder: string, value: string, onChange: (v: string) => void) => (
    <input
      placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      style={{ flex: 1, padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#111827", background: "#f9fafb", outline: "none", fontFamily: "inherit" }}
    />
  );

  return (
    <div style={{ ...T.card, padding: "24px 28px", marginTop: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#0077b5", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>in</span>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827" }}>Post to LinkedIn</p>
          <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>Research → Write → Image → Post · Full pipeline</p>
        </div>
      </div>

      {/* Post content */}
      <textarea
        value={content} onChange={e => setContent(e.target.value)}
        placeholder="Write your LinkedIn post here, or paste content drafted by the AI team..."
        rows={8}
        style={{ width: "100%", boxSizing: "border-box", padding: "14px 16px", border: `1px solid ${over ? "#ef4444" : "#e5e7eb"}`, borderRadius: 10, fontSize: 13, lineHeight: 1.7, color: "#111827", background: "#f9fafb", resize: "vertical", outline: "none", fontFamily: "inherit", marginBottom: 16 }}
      />

      {/* Image card section */}
      <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 18px", marginBottom: 14 }}>
        <p style={{ ...T.label, margin: "0 0 12px" }}>Branded Image Card</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 14 }}>
          {IMAGE_TYPES.map(({ value, label, hint }) => (
            <button key={value} onClick={() => { setImageType(value); setPreviewUrl(null); }}
              style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${imageType === value ? "#0077b5" : "#e5e7eb"}`, background: imageType === value ? "#eff8ff" : "#fff", color: imageType === value ? "#0077b5" : "#6b7280", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
              {label}
              {imageType === value && hint && <span style={{ color: "#9ca3af", fontWeight: 400, marginLeft: 4 }}>· {hint}</span>}
            </button>
          ))}
        </div>

        {imageType !== "none" && (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {imageType === "stat" && (
              <div style={{ display: "flex", gap: 8 }}>
                {inp("Big stat (e.g. 18 hrs/wk)", imgStat, setImgStat)}
                {inp("Context (e.g. recovered per fee earner)", imgSub, setImgSub)}
              </div>
            )}
            {imageType === "insight" && (
              <div style={{ display: "flex", gap: 8 }}>
                {inp("Headline (e.g. Law firms lose 20% of fee earner time to admin)", imgHeadline, setImgHeadline)}
                {inp("Subtext (optional)", imgSub, setImgSub)}
              </div>
            )}
            {imageType === "quote" && (
              <div style={{ display: "flex", gap: 8 }}>
                {inp("Quote text", imgHeadline, setImgHeadline)}
                {inp("Attribution (e.g. Principal, Tributum Law)", imgSub, setImgSub)}
              </div>
            )}
            {imageType === "beforeafter" && (
              <div style={{ display: "flex", gap: 8 }}>
                {inp("Before (e.g. 4-hour response time, leads going cold)", imgBefore, setImgBefore)}
                {inp("After (e.g. 90 seconds. Every enquiry. Any time.)", imgAfter, setImgAfter)}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {inp("Label (e.g. Law Firm Result)", imgLabel, setImgLabel)}
              <button onClick={handlePreview}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #0077b5", background: "#fff", color: "#0077b5", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const }}>
                Preview Image
              </button>
            </div>
            {previewUrl && (
              <img src={previewUrl} alt="Card preview" style={{ width: "100%", borderRadius: 8, border: "1px solid #e5e7eb", marginTop: 4 }} />
            )}
          </div>
        )}
      </div>

      {/* Footer row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: over ? "#ef4444" : "#9ca3af" }}>
          {charCount.toLocaleString()} / 3,000
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {message && (
            <span style={{ fontSize: 12, color: status === "error" ? "#ef4444" : "#10b981", fontWeight: 600 }}>
              {message}
            </span>
          )}
          <button onClick={handlePost} disabled={!content.trim() || over || status === "posting"}
            style={{ padding: "9px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: 0.3, background: status === "posting" ? "#9ca3af" : "#0077b5", color: "#fff", opacity: (!content.trim() || over) ? 0.5 : 1, transition: "opacity 0.15s" }}>
            {status === "posting" ? "Posting…" : "Post Now →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminClient({
  clients,
  rexStats,
  adminId,
}: {
  clients: ClientConfig[];
  rexStats: RexStats;
  adminId: string;
}) {
  // Filter out the Saabai admin account itself from the client list
  const visibleClients = clients.filter(c => c.id !== adminId);

  const totalLeadsAcrossClients = rexStats.total; // only Rex for now

  return (
    <div style={{
      minHeight: "100vh", background: "#f9fafb",
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      color: "#111827",
    }}>
      {/* Top nav */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#111", letterSpacing: -0.5 }}>
              Saabai<span style={{ color: "#62c5d1" }}>.</span>
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#62c5d1", letterSpacing: 2, textTransform: "uppercase" }}>Admin</span>
          </div>
          <form method="POST" action="/api/auth/logout" style={{ margin: 0 }}>
            <button type="submit" style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px 64px" }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900, color: "#111827", letterSpacing: -0.5 }}>Client Overview</h1>
          <p style={{ ...T.muted, margin: 0 }}>{visibleClients.length} active client{visibleClients.length !== 1 ? "s" : ""} · {totalLeadsAcrossClients} total leads across platform</p>
        </div>

        {/* Summary strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Active Clients",        value: String(visibleClients.length) },
            { label: "Platform Leads (Total)", value: String(totalLeadsAcrossClients) },
            { label: "Avg Quote Value",        value: fmtPrice(rexStats.avgPrice) },
          ].map(({ label, value }) => (
            <div key={label} style={{ ...T.card, padding: "18px 22px" }}>
              <p style={{ ...T.label, margin: "0 0 6px" }}>{label}</p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: -1 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Client cards */}
        <p style={{ ...T.label, margin: "0 0 14px" }}>Clients</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {visibleClients.length === 0 && (
            <div style={{ ...T.card, padding: "32px", textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>No clients configured</p>
              <p style={{ ...T.muted, margin: 0 }}>Add <code>SAABAI_CLIENT_1_*</code> env vars in Vercel to register a client.</p>
            </div>
          )}
          {visibleClients.map(client => {
            // PlasticOnline / Rex gets the rich card with live stats
            const isRexClient = client.dashboardUrl === "/rex-dashboard";
            return isRexClient
              ? <RexClientCard key={client.id} client={client} rexStats={rexStats} />
              : <GenericClientCard key={client.id} client={client} />;
          })}
        </div>

        {/* LinkedIn queue */}
        <LinkedInQueue />

        {/* LinkedIn composer */}
        <LinkedInPanel />

        {/* Actions */}
        <DigestTrigger />

        {/* Footer */}
        <p style={{ marginTop: 40, textAlign: "center", ...T.muted }}>
          Saabai Admin · <a href="mailto:hello@saabai.ai" style={{ color: "#62c5d1", textDecoration: "none" }}>hello@saabai.ai</a>
        </p>
      </div>
    </div>
  );
}
