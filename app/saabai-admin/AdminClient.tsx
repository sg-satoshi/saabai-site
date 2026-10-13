"use client";

import { useState, useEffect } from "react";
import type { ClientConfig as FullClientConfig } from "../../lib/clients";

// Passwords never reach the browser.
type ClientConfig = Omit<FullClientConfig, "password">;
import type { PendingRequest } from "../../lib/portal-users";
import AdminShell from "./AdminSidebar";

/** Known self-test portal requests - keep in Redis, hide from the default dashboard. */
const TEST_PORTAL_EMAILS = new Set(["shanegoldberg@pm.me"]);
function isTestPortalRequest(email: string) {
  return TEST_PORTAL_EMAILS.has(email.trim().toLowerCase());
}

// ── Theme ─────────────────────────────────────────────────────────────────────

const C = {
  bg:           "var(--n-50)",
  sidebar:      "var(--navy-900)",
  card:         "var(--n-0)",
  surface:      "var(--n-50)",
  surfaceHi:    "var(--n-100)",
  border:       "var(--n-200)",
  borderBright: "var(--n-300)",
  text:         "var(--n-900)",
  muted:        "var(--n-500)",
  dim:          "var(--n-100)",
  teal:         "var(--teal-700)",
  orange:       "#a15c07",
  blue:         "var(--info)",
  amber:        "var(--warn)",
  green:        "var(--ok)",
  red:          "var(--bad)",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(v: number) {
  if (!v) return "-";
  return `$${v.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pct(a: number, b: number) {
  if (!b) return "-";
  return `${Math.round((a / b) * 100)}%`;
}

function getGreeting() {
  const h = new Date(Date.now() + 10 * 3600 * 1000).getUTCHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}


// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ counts, color }: { counts: number[]; color: string }) {
  const data = counts.slice(-14);
  const max = Math.max(...data, 1);
  const w = 88, h = 30, bars = data.length;
  const bw = Math.max(2, Math.floor(w / bars) - 1);
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      {data.map((v, i) => {
        const bh = Math.max(2, Math.round((v / max) * (h - 2)));
        return (
          <rect
            key={i}
            x={i * (bw + 1)}
            y={h - bh}
            width={bw}
            height={bh}
            rx={1}
            fill={color}
            opacity={0.6}
          />
        );
      })}
    </svg>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function DCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, ...style }}>
      {children}
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: "uppercase" as const }}>{children}</p>
      <span style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

// ── Atlas notification bar ─────────────────────────────────────────────────────


// ── Product cards ──────────────────────────────────────────────────────────────

function ProductCard({
  name, status, statusColor, accent, description, stats, sparkData, linkHref, linkLabel, disabled,
}: {
  name: string;
  status: string;
  statusColor: string;
  accent: string;
  description: string;
  stats: { label: string; value: string }[];
  sparkData?: number[];
  linkHref?: string;
  linkLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div style={{
      background: disabled ? C.surface : C.card,
      border: `1px solid ${C.border}`,
      borderTop: `3px solid ${disabled ? C.dim : accent}`,
      borderRadius: 14,
      padding: "22px 22px 20px",
      display: "flex", flexDirection: "column" as const, gap: 16,
      opacity: disabled ? 0.65 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: -0.3 }}>{name}</p>
          <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{description}</p>
        </div>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: 1.4,
          color: statusColor,
          background: `${statusColor}1a`,
          border: `1px solid ${statusColor}40`,
          padding: "3px 8px", borderRadius: 20,
          whiteSpace: "nowrap" as const,
        }}>
          {status}
        </span>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "flex-end" }}>
        <div style={{ display: "flex", gap: 14, flex: 1 }}>
          {stats.map(s => (
            <div key={s.label} style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 1.4, textTransform: "uppercase" as const }}>{s.label}</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: -0.5 }}>{s.value}</p>
            </div>
          ))}
        </div>
        {sparkData && sparkData.length > 0 && (
          <div style={{ flexShrink: 0, paddingBottom: 2 }}>
            <Sparkline counts={sparkData} color={accent} />
          </div>
        )}
      </div>

      {linkHref && !disabled && (
        <a href={linkHref} style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 11, fontWeight: 700, color: accent,
          textDecoration: "none", letterSpacing: 0.1, marginTop: -6,
        }}>
          {linkLabel ?? "Open"} &rarr;
        </a>
      )}
      {disabled && (
        <p style={{ margin: "-6px 0 0", fontSize: 11, color: C.muted }}>Coming soon</p>
      )}
    </div>
  );
}

// ── Recent leads table ─────────────────────────────────────────────────────────


// ── Client account cards ──────────────────────────────────────────────────────

function ClientCard({ client }: { client: ClientConfig }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: "16px 18px", display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: C.surface,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, fontWeight: 900, color: C.muted, flexShrink: 0,
      }}>
        {client.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: C.text }}>{client.name}</p>
        <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{client.email}</p>
      </div>
      <a
        href={client.dashboardUrl || "/dashboard"}
        style={{
          padding: "7px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
          textDecoration: "none", background: C.surface, border: `1px solid ${C.border}`, color: C.text,
        }}
      >
        Open
      </a>
    </div>
  );
}

// ── Digest trigger ─────────────────────────────────────────────────────────────

type DigestState = "idle" | "sending" | "sent" | "error";


// ── LinkedIn Queue ─────────────────────────────────────────────────────────────

interface QueuedPost {
  id: string;
  content: string;
  imageUrl?: string;
  scheduledFor: string;
  sentAt?: string;
  createdAt: string;
}

function LinkedInQueue() {
  const [posts, setPosts] = useState<QueuedPost[]>([]);
  const [history, setHistory] = useState<QueuedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);
  const [viewingPost, setViewingPost] = useState<QueuedPost | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([fetch("/api/linkedin/queue"), fetch("/api/linkedin/queue?sent=true")]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      setPosts(d1.posts ?? []);
      setHistory(d2.posts ?? []);
    } finally { setLoading(false); }
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
    await fetch("/api/linkedin/queue", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  async function postNow(post: QueuedPost) {
    if (!confirm("Post this to LinkedIn right now?")) return;
    await fetch("/api/linkedin/post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: post.content }) });
    await fetch("/api/linkedin/queue", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: post.id }) });
    setViewingPost(null);
    load();
  }

  function fmtDate(d: string) {
    return new Date(d + "T00:00:00+10:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  }

  const today = new Date(Date.now() + 10 * 3600 * 1000).toISOString().slice(0, 10);

  if (loading || posts.length === 0) return null;

  const btn: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, borderRadius: 6, padding: "3px 9px", cursor: "pointer",
    border: `1px solid ${C.border}`, background: C.surface, color: C.muted,
  };

  const modalBase: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
  };

  const modalCard: React.CSSProperties = {
    background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 16,
    width: "100%", maxWidth: 560, boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
  };

  return (
    <>
      {/* View modal */}
      {viewingPost && (
        <div style={modalBase} onClick={() => setViewingPost(null)}>
          <div style={{ ...modalCard, maxHeight: "80vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: viewingPost.scheduledFor <= today ? C.amber : C.blue, background: viewingPost.scheduledFor <= today ? `${C.amber}18` : `${C.blue}18`, padding: "3px 8px", borderRadius: 20 }}>
                {viewingPost.scheduledFor <= today ? "POSTING TODAY" : fmtDate(viewingPost.scheduledFor)}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => startEdit(viewingPost)} style={btn}>Edit</button>
                <button onClick={() => postNow(viewingPost)} style={{ ...btn, color: C.blue }}>Post now</button>
                <button onClick={() => { cancelPost(viewingPost.id); setViewingPost(null); }} style={{ ...btn, color: C.red }}>Remove</button>
                <button onClick={() => setViewingPost(null)} style={{ ...btn }}>x</button>
              </div>
            </div>
            <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{viewingPost.content}</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingId && (
        <div style={modalBase} onClick={() => setEditingId(null)}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>Edit Post</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: C.muted }}>Reschedule:</span>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                  style={{ padding: "5px 8px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.text, background: C.surface, outline: "none" }} />
              </div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={12}
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, lineHeight: 1.7, color: C.text, background: C.surface, resize: "vertical", outline: "none", fontFamily: "inherit" }} />
            </div>
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setEditingId(null)} style={btn}>Cancel</button>
              <button onClick={() => saveEdit(editingId)} disabled={saving}
                style={{ ...btn, background: C.blue, color: "#fff", border: "none", fontWeight: 700 }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queue list */}
      <DCard style={{ overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "#0077b5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#fff" }}>in</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>Scheduled Posts</p>
              <p style={{ margin: 0, fontSize: 10, color: C.muted }}>{posts.length} queued · 9am Brisbane · Mon / Wed / Fri</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={load} style={{ fontSize: 11, color: C.muted, background: "none", border: "none", cursor: "pointer" }}>&#8635;</button>
            <button onClick={() => setCollapsed(v => !v)} style={{ fontSize: 11, color: C.muted, background: "none", border: "none", cursor: "pointer" }}>
              {collapsed ? "Show" : "Hide"}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div style={{ borderTop: `1px solid ${C.border}` }}>
            {posts.map((post, i) => {
              const isDue = post.scheduledFor <= today;
              const preview = (post.content ?? "").split("\n").find(l => l.trim()) ?? "";
              return (
                <div key={post.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 22px", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: isDue ? C.amber : C.blue, background: isDue ? `${C.amber}18` : `${C.blue}18`, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                    {isDue ? "TODAY" : fmtDate(post.scheduledFor)}
                  </span>
                  <span style={{ fontSize: 12, color: C.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                    {preview}
                  </span>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setViewingPost(post)} style={{ ...btn, color: C.blue }}>View</button>
                    <button onClick={() => startEdit(post)} style={btn}>Edit</button>
                    <button onClick={() => postNow(post)} style={{ ...btn, color: C.green }}>Post now</button>
                    <button onClick={() => cancelPost(post.id)} style={{ ...btn, color: C.red }}>x</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DCard>

      {/* History */}
      <DCard style={{ overflow: "hidden", marginTop: 10 }}>
        <div style={{ padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>Posted History</p>
            <p style={{ margin: 0, fontSize: 10, color: C.muted }}>{history.length} post{history.length !== 1 ? "s" : ""} published</p>
          </div>
          <button onClick={() => setHistoryCollapsed(v => !v)} style={{ fontSize: 11, color: C.muted, background: "none", border: "none", cursor: "pointer" }}>
            {historyCollapsed ? "Show" : "Hide"}
          </button>
        </div>

        {!historyCollapsed && (
          history.length === 0 ? (
            <p style={{ margin: 0, padding: "16px 22px", fontSize: 12, color: C.muted }}>No posts published yet.</p>
          ) : (
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              {history.map((post, i) => {
                const preview = (post.content ?? "").split("\n").find(l => l.trim()) ?? "";
                const sentDate = post.sentAt
                  ? new Date(post.sentAt).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                  : fmtDate(post.scheduledFor);
                return (
                  <div key={post.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 22px", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)" }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: C.green, background: `${C.green}18`, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                      {sentDate}
                    </span>
                    <span style={{ fontSize: 12, color: C.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{preview}</span>
                    <button onClick={() => setViewingPost(post)} style={{ ...btn, color: C.blue, flexShrink: 0 }}>View</button>
                  </div>
                );
              })}
            </div>
          )
        )}
      </DCard>
    </>
  );
}

// ── Subscriber panel ───────────────────────────────────────────────────────────

interface Subscriber {
  email: string;
  firstName: string;
  industry: string;
  source: string;
  subscribedAt: string;
  ip?: string;
  country?: string;
  city?: string;
}

function SubscriberPanel() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscribers")
      .then(r => r.json())
      .then(d => { setSubs(d.subscribers ?? []); setCount(d.count ?? 0); })
      .finally(() => setLoading(false));
  }, []);

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  }

  const INDUSTRY_COLOURS: Record<string, string> = {
    "Law / Legal": "#8b5cf6",
    "Accounting / Finance": C.amber,
    "Real Estate": C.teal,
    "Other": C.muted,
  };

  return (
    <DCard style={{ overflow: "hidden" }}>
      <div style={{ padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #00bfa5, #009688)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#fff" }}>SI</div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>Email Subscribers</p>
            <p style={{ margin: 0, fontSize: 10, color: C.muted }}>{count !== null ? `${count} total` : "Loading..."} · AI Readiness Audit opt-ins</p>
          </div>
        </div>
        <button onClick={() => setCollapsed(v => !v)} style={{ fontSize: 11, color: C.muted, background: "none", border: "none", cursor: "pointer" }}>
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>

      {!collapsed && !loading && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          {subs.length === 0 ? (
            <p style={{ margin: 0, padding: "24px", fontSize: 12, color: C.muted, textAlign: "center" }}>No subscribers yet.</p>
          ) : (
            subs.map((s, i) => (
              <div key={s.email} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 22px", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.teal, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {s.firstName?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.text }}>{s.firstName} <span style={{ color: C.muted, fontWeight: 400 }}>·</span> {s.email}</p>
                  {(s.city || s.country) && (
                    <p style={{ margin: "1px 0 0", fontSize: 10, color: C.muted }}>{[s.city, s.country].filter(Boolean).join(", ")}</p>
                  )}
                </div>
                {s.industry && (
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: INDUSTRY_COLOURS[s.industry] ?? C.muted, background: "rgba(0,0,0,0.04)", padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                    {s.industry}
                  </span>
                )}
                <span style={{ fontSize: 10, color: C.muted, flexShrink: 0, whiteSpace: "nowrap" as const }}>{fmtDate(s.subscribedAt)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </DCard>
  );
}

// ── LinkedIn post panel ────────────────────────────────────────────────────────

type ImageType = "none" | "stat" | "insight" | "quote" | "beforeafter";

const IMAGE_TYPES: { value: ImageType; label: string; hint: string }[] = [
  { value: "none",        label: "No image",        hint: "Text only" },
  { value: "insight",     label: "Insight card",     hint: "Headline + subtext" },
  { value: "stat",        label: "Stat card",        hint: "Big number + context" },
  { value: "quote",       label: "Quote card",       hint: "Pull quote" },
  { value: "beforeafter", label: "Before + After",   hint: "Two-panel comparison" },
];

function LinkedInPanel() {
  const [content, setContent] = useState("");
  const [imageType, setImageType] = useState<ImageType>("none");
  const [imgHeadline, setImgHeadline] = useState("");
  const [imgSub, setImgSub]       = useState("");
  const [imgStat, setImgStat]     = useState("");
  const [imgBefore, setImgBefore] = useState("");
  const [imgAfter, setImgAfter]   = useState("");
  const [imgLabel, setImgLabel]   = useState("Saabai.ai");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "posting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const charCount = content.length;
  const over = charCount > 3000;

  function buildImageUrl() {
    if (imageType === "none") return null;
    const p = new URLSearchParams({ type: imageType });
    if (imgHeadline) p.set("headline", imgHeadline);
    if (imgSub)      p.set("sub", imgSub);
    if (imgStat)     p.set("stat", imgStat);
    if (imgBefore)   p.set("before", imgBefore);
    if (imgAfter)    p.set("after", imgAfter);
    if (imgLabel)    p.set("label", imgLabel);
    return `/api/og/linkedin-card?${p.toString()}`;
  }

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
      setStatus("done"); setMessage("Posted to LinkedIn.");
      setContent(""); setImgHeadline(""); setImgSub(""); setImgStat("");
      setImgBefore(""); setImgAfter(""); setImageType("none"); setPreviewUrl(null);
      setTimeout(() => { setStatus("idle"); setMessage(""); }, 4000);
    } catch (err) {
      setStatus("error"); setMessage(String(err));
      setTimeout(() => { setStatus("idle"); setMessage(""); }, 6000);
    }
  }

  const inp = (placeholder: string, value: string, onChange: (v: string) => void) => (
    <input
      placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      style={{ flex: 1, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text, background: C.surface, outline: "none", fontFamily: "inherit" }}
    />
  );

  return (
    <DCard style={{ padding: "22px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: "#0077b5", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>in</span>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>Post to LinkedIn</p>
          <p style={{ margin: 0, fontSize: 10, color: C.muted }}>Research, Write, Image, Post</p>
        </div>
      </div>

      <textarea
        value={content} onChange={e => setContent(e.target.value)}
        placeholder="Write your LinkedIn post here..."
        rows={8}
        style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", border: `1px solid ${over ? C.red : C.border}`, borderRadius: 10, fontSize: 13, lineHeight: 1.7, color: C.text, background: C.surface, resize: "vertical", outline: "none", fontFamily: "inherit", marginBottom: 14 }}
      />

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
        <p style={{ margin: "0 0 10px", fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 1.8, textTransform: "uppercase" as const }}>Branded Image Card</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 12 }}>
          {IMAGE_TYPES.map(({ value, label, hint }) => (
            <button key={value} onClick={() => { setImageType(value); setPreviewUrl(null); }}
              style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${imageType === value ? "#0077b5" : C.border}`, background: imageType === value ? "rgba(0,119,181,0.15)" : "transparent", color: imageType === value ? "#4da6d4" : C.muted, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
              {label}
              {imageType === value && hint && <span style={{ color: C.muted, fontWeight: 400, marginLeft: 4 }}>· {hint}</span>}
            </button>
          ))}
        </div>

        {imageType !== "none" && (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {imageType === "stat"        && <div style={{ display: "flex", gap: 8 }}>{inp("Big stat (e.g. 18 hrs/wk)", imgStat, setImgStat)}{inp("Context", imgSub, setImgSub)}</div>}
            {imageType === "insight"     && <div style={{ display: "flex", gap: 8 }}>{inp("Headline", imgHeadline, setImgHeadline)}{inp("Subtext (optional)", imgSub, setImgSub)}</div>}
            {imageType === "quote"       && <div style={{ display: "flex", gap: 8 }}>{inp("Quote text", imgHeadline, setImgHeadline)}{inp("Attribution", imgSub, setImgSub)}</div>}
            {imageType === "beforeafter" && <div style={{ display: "flex", gap: 8 }}>{inp("Before", imgBefore, setImgBefore)}{inp("After", imgAfter, setImgAfter)}</div>}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {inp("Label (e.g. Law Firm Result)", imgLabel, setImgLabel)}
              <button onClick={() => setPreviewUrl(buildImageUrl())}
                style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid #0077b5`, background: "transparent", color: "#4da6d4", fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const }}>
                Preview
              </button>
            </div>
            {previewUrl && <img src={previewUrl} alt="Card preview" style={{ width: "100%", borderRadius: 8, border: `1px solid ${C.border}` }} />}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: over ? C.red : C.muted }}>{charCount.toLocaleString()} / 3,000</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {message && <span style={{ fontSize: 12, color: status === "error" ? C.red : C.green, fontWeight: 600 }}>{message}</span>}
          <button onClick={handlePost} disabled={!content.trim() || over || status === "posting"}
            style={{ padding: "8px 18px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: status === "posting" ? C.surface : "#0077b5", color: status === "posting" ? C.muted : "#fff", opacity: (!content.trim() || over) ? 0.5 : 1 }}>
            {status === "posting" ? "Posting..." : "Post Now"}
          </button>
        </div>
      </div>
    </DCard>
  );
}

// ── Access Requests ────────────────────────────────────────────────────────────

function AccessRequests({ initial }: { initial: PendingRequest[] }) {
  const [requests, setRequests]       = useState<PendingRequest[]>(() => initial.filter((r) => !isTestPortalRequest(r.email)));
  const [showTests, setShowTests]     = useState(false);
  const hiddenTests = initial.filter((r) => isTestPortalRequest(r.email));
  const [approving, setApproving]     = useState<string | null>(null);
  const [passwords, setPasswords]     = useState<Record<string, string>>({});
  const [dashUrls, setDashUrls]       = useState<Record<string, string>>({});
  const [busy, setBusy]               = useState<string | null>(null);
  const [message, setMessage]         = useState<{ email: string; text: string; ok: boolean } | null>(null);

  if (requests.length === 0) return null;

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  async function approve(req: PendingRequest) {
    const password = passwords[req.email]?.trim() ?? "";
    setBusy(req.email);
    try {
      const res = await fetch("/api/admin/portal-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          email: req.email,
          name: req.name,
          password,
          dashboardUrl: dashUrls[req.email] || "/dashboard",
        }),
      });
      if (res.ok) {
        setRequests(r => r.filter(x => x.email !== req.email));
        setApproving(null);
        setMessage({ email: req.email, text: `Approved and welcome email sent to ${req.name}.`, ok: true });
        setTimeout(() => setMessage(null), 5000);
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ email: req.email, text: data.error || "Something went wrong.", ok: false });
      }
    } finally { setBusy(null); }
  }

  async function deny(req: PendingRequest) {
    if (!confirm(`Deny access request from ${req.name}?`)) return;
    setBusy(req.email);
    try {
      await fetch("/api/admin/portal-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deny", email: req.email }),
      });
      setRequests(r => r.filter(x => x.email !== req.email));
    } finally { setBusy(null); }
  }

  return (
    <DCard style={{ overflow: "hidden" }}>
      <div style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.amber, display: "inline-block", flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>Portal Access Requests</p>
        <span style={{
          marginLeft: 4, padding: "2px 8px", borderRadius: 20,
          background: `${C.amber}18`, color: C.amber,
          fontSize: 10, fontWeight: 700,
        }}>{requests.length}</span>
        {hiddenTests.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setShowTests((v) => {
                const next = !v;
                setRequests(next ? [...initial] : initial.filter((r) => !isTestPortalRequest(r.email)));
                return next;
              });
            }}
            style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: C.muted, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 7, padding: "4px 10px", cursor: "pointer" }}
          >
            {showTests ? "Hide test requests" : `Show ${hiddenTests.length} test`}
          </button>
        )}
      </div>

      {message && (
        <div style={{ margin: "0 22px 14px", padding: "10px 14px", borderRadius: 8, background: message.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${message.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
          <p style={{ margin: 0, fontSize: 12, color: message.ok ? C.green : C.red }}>{message.text}</p>
        </div>
      )}

      <div style={{ borderTop: `1px solid ${C.border}` }}>
        {requests.map((req, i) => (
          <div key={req.email} style={{ borderBottom: i < requests.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px" }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(245,166,35,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: C.amber, flexShrink: 0,
              }}>
                {req.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: C.text }}>{req.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: C.muted }}>
                  {req.email}{req.company ? ` · ${req.company}` : ""} · {fmtDate(req.requestedAt)}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => setApproving(a => a === req.email ? null : req.email)}
                  disabled={busy === req.email}
                  style={{ padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer", background: C.green, color: "#fff", fontSize: 11, fontWeight: 700 }}
                >
                  Approve
                </button>
                <button
                  onClick={() => deny(req)}
                  disabled={busy === req.email}
                  style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.border}`, cursor: "pointer", background: "transparent", color: C.muted, fontSize: 11, fontWeight: 600 }}
                >
                  Deny
                </button>
              </div>
            </div>

            {approving === req.email && (
              <div style={{ margin: "0 22px 16px", padding: "14px 16px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase" as const }}>Set credentials</p>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 10, color: C.muted }}>Password (optional)</p>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Blank: they choose via email link"
                      value={passwords[req.email] ?? ""}
                      onChange={e => setPasswords(p => ({ ...p, [req.email]: e.target.value }))}
                      style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", fontSize: 12, color: C.text, background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, outline: "none", fontFamily: "inherit" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 10, color: C.muted }}>Dashboard</p>
                    <input
                      type="text"
                      placeholder="/dashboard"
                      value={dashUrls[req.email] ?? ""}
                      onChange={e => setDashUrls(d => ({ ...d, [req.email]: e.target.value }))}
                      style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", fontSize: 12, color: C.text, background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, outline: "none", fontFamily: "inherit" }}
                    />
                  </div>
                  <button
                    onClick={() => approve(req)}
                    disabled={busy === req.email}
                    style={{ padding: "8px 16px", borderRadius: 7, border: "none", cursor: "pointer", background: C.green, color: "#fff", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const }}
                  >
                    {busy === req.email ? "Saving..." : "Confirm"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </DCard>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function AdminClient({
  clients,
  adminId,
  pendingRequests,
}: {
  clients: ClientConfig[];
  adminId: string;
  pendingRequests: PendingRequest[];
}) {
  const [lexStats, setLexStats] = useState<{ total: number; configured: number; withLlmKey: number } | null>(null);
  const [bpStats, setBpStats] = useState<{ todayCount: number; todayRevenue: number; weekCount: number; weekRevenue: number; allCount: number; allRevenue: number } | null>(null);
  const [orderStats, setOrderStats] = useState<{ total: number; lex: number; blueprint: number; revenueCents: number } | null>(null);
  const visibleClients = clients.filter(c => c.id !== adminId);

  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    fetch("/api/admin/lex-clients")
      .then(r => r.json())
      .then(data => { if (data.stats) setLexStats(data.stats); })
      .catch(() => {});
    fetch("/api/admin/blueprint-stats")
      .then(r => r.json())
      .then(data => { if (typeof data.todayCount === "number") setBpStats(data); })
      .catch(() => {});
    fetch("/api/admin/orders")
      .then(r => r.json())
      .then(data => {
        const orders = (data.orders || []) as { kind: string; amountTotal: number | null }[];
        const lex = orders.filter(o => o.kind === "lex_subscription").length;
        const blueprint = orders.filter(o => o.kind === "blueprint").length;
        const revenueCents = orders.reduce((s, o) => s + (o.amountTotal || 0), 0);
        setOrderStats({ total: orders.length, lex, blueprint, revenueCents });
      })
      .catch(() => {});
  }, []);

  return (
    <AdminShell activePath="/saabai-admin">
      <div className="ph">
        <div>
          <h1>{getGreeting()}, Shane</h1>
          <div className="sub">{today} · All figures AUD, incl. GST</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a className="btn" href="/saabai-admin/orders">View orders</a>
          <a className="btn pri" href="/saabai-admin/payments">Take payment</a>
        </div>
      </div>

      <div className="kpis">
        <div className="card kpi">
          <div className="l">Orders (all time)</div>
          <div className="v num">{orderStats ? String(orderStats.total) : "-"}</div>
          <div className="d muted">
            {orderStats ? `${orderStats.blueprint} Blueprint · ${orderStats.lex} Lex` : "Loading..."}
          </div>
        </div>
        <div className="card kpi">
          <div className="l">Order revenue</div>
          <div className="v num">{orderStats ? `$${(orderStats.revenueCents / 100).toLocaleString("en-AU")}` : "-"}</div>
          <div className="d muted">Blueprint + Lex sales</div>
        </div>
        <div className="card kpi">
          <div className="l">Blueprints, all paid</div>
          <div className="v num">{bpStats ? String(bpStats.allCount) : "-"}</div>
          <div className="d muted">{bpStats ? `$${(bpStats.allRevenue / 100).toLocaleString("en-AU")} lifetime` : "Loading..."}</div>
        </div>
        <div className="card kpi">
          <div className="l">Lex firms</div>
          <div className="v num">{lexStats ? String(lexStats.total) : "-"}</div>
          <div className="d muted">{lexStats ? `${lexStats.configured} configured` : "Loading..."}</div>
        </div>
      </div>

      {pendingRequests.filter(r => !isTestPortalRequest(r.email)).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>Access Requests</SectionLabel>
          <AccessRequests initial={pendingRequests} />
        </div>
      )}

      <div className="g2">
        <div className="card">
          <div className="hd">
            <div>
              <h2>Blueprint sales</h2>
              <div className="sub">Today · week · lifetime</div>
            </div>
            <a className="btn sm" href="/saabai-admin/orders">Open Orders</a>
          </div>
          <div className="bd" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { label: "Today", value: bpStats ? String(bpStats.todayCount) : "-", sub: bpStats ? `$${(bpStats.todayRevenue / 100).toLocaleString("en-AU")}` : "" },
              { label: "This week", value: bpStats ? String(bpStats.weekCount) : "-", sub: bpStats ? `$${(bpStats.weekRevenue / 100).toLocaleString("en-AU")}` : "" },
              { label: "All paid", value: bpStats ? String(bpStats.allCount) : "-", sub: bpStats ? `$${(bpStats.allRevenue / 100).toLocaleString("en-AU")}` : "" },
            ].map(s => (
              <div key={s.label}>
                <div className="muted" style={{ fontSize: 12 }}>{s.label}</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 500 }}>{s.value}</div>
                <div className="muted" style={{ fontSize: 12 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="hd">
            <h2>Lex platform</h2>
            <span className="tag bp">Live</span>
          </div>
          <div className="bd">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Firms</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 500 }}>{lexStats ? lexStats.total : "-"}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Configured</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 500 }}>{lexStats ? lexStats.configured : "-"}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Custom LLM keys</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 500 }}>{lexStats ? lexStats.withLlmKey : "-"}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Lex sales in totals</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 500 }}>{orderStats ? orderStats.lex : "-"}</div>
              </div>
            </div>
            <a className="btn sm" style={{ marginTop: 14 }} href="/saabai-admin/lex-clients">Open Lex clients</a>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 16 }}>
        <ProductCard
          name="Lex"
          status="BETA"
          statusColor={C.blue}
          accent={C.blue}
          description="AI Legal Assistant"
          stats={[
            { label: "Firms", value: lexStats ? String(lexStats.total) : "-" },
            { label: "Configured", value: lexStats ? String(lexStats.configured) : "-" },
            { label: "LLM keys", value: lexStats ? String(lexStats.withLlmKey) : "-" },
          ]}
          linkHref="/saabai-admin/lex-clients"
          linkLabel="Open Lex clients"
        />
        <ProductCard
          name="Blueprints"
          status="LIVE"
          statusColor={C.teal}
          accent={C.teal}
          description="Paid Blueprint engagements"
          stats={[
            { label: "Today", value: bpStats ? String(bpStats.todayCount) : "-" },
            { label: "Week", value: bpStats ? String(bpStats.weekCount) : "-" },
            { label: "All", value: bpStats ? String(bpStats.allCount) : "-" },
          ]}
          linkHref="/saabai-admin/audits"
          linkLabel="Open Blueprints"
        />
      </div>

      {visibleClients.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Client Accounts</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleClients.map(client => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        </div>
      )}

      <div id="social" style={{ marginBottom: 24 }}>
        <SectionLabel>Social Media</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <a className="card" href="/saabai-admin/social/linkedin" style={{ textDecoration: "none", padding: 20, display: "block" }}>
            <p style={{ margin: "0 0 4px", fontWeight: 600, color: "var(--n-900)" }}>LinkedIn</p>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>Post generator, scheduled queue, history</p>
          </a>
          <a className="card" href="/saabai-admin/social/instagram" style={{ textDecoration: "none", padding: 20, display: "block" }}>
            <p style={{ margin: "0 0 4px", fontWeight: 600, color: "var(--n-900)" }}>Instagram</p>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>Caption AI, queue, scheduled posts</p>
          </a>
          <a className="card" href="/saabai-admin/subscribers" style={{ textDecoration: "none", padding: 20, display: "block" }}>
            <p style={{ margin: "0 0 4px", fontWeight: 600, color: "var(--n-900)" }}>Subscribers</p>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>Growth charts, industry breakdown, CSV</p>
          </a>
        </div>
      </div>

      <div id="subs-hub" style={{ marginBottom: 24 }}>
        <SectionLabel>Email and Subscribers</SectionLabel>
        <SubscriberPanel />
      </div>

      <div id="linkedin" style={{ marginBottom: 24 }}>
        <SectionLabel>LinkedIn</SectionLabel>
        <LinkedInQueue />
        <div style={{ marginTop: 14 }}>
          <LinkedInPanel />
        </div>
      </div>

      <p style={{ marginTop: 32, textAlign: "center", fontSize: 12, color: "var(--n-500)" }}>
        Saabai Mission Control · <a href="mailto:hello@saabai.ai" style={{ color: "var(--teal-700)" }}>hello@saabai.ai</a>
      </p>
    </AdminShell>
  );
}

