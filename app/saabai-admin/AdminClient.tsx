"use client";

import { useState, useEffect } from "react";
import type { ClientConfig } from "../../lib/clients";
import type { RexStats, LeadEvent } from "../../lib/rex-stats";

// ── Theme ─────────────────────────────────────────────────────────────────────

const C = {
  bg:           "#07091a",
  sidebar:      "#080b1e",
  card:         "#0e1128",
  surface:      "#131729",
  surfaceHi:    "#181c32",
  border:       "rgba(255,255,255,0.07)",
  borderBright: "rgba(255,255,255,0.14)",
  text:         "#e2e4f0",
  muted:        "#525873",
  dim:          "#2a2d47",
  teal:         "#25D366",
  orange:       "#ff6635",
  blue:         "#4d8ef6",
  amber:        "#f5a623",
  green:        "#22c55e",
  red:          "#ef4444",
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
  const h = new Date(Date.now() + 10 * 3600 * 1000).getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtLeadTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
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

// ── Sidebar ───────────────────────────────────────────────────────────────────

const NAV_WORKSPACE = [
  { label: "Dashboard", href: "/saabai-admin",  active: true },
  { label: "Agents",    href: "/mission-control", active: false },
  { label: "Growth",    href: "/rex-analytics",  active: false },
  { label: "Changelog", href: "/rex-changelog",  active: false },
];

const NAV_BUILD = [
  { label: "Social",      href: "/saabai-admin/social/linkedin" },
  { label: "Subscribers", href: "/saabai-admin/subscribers" },
  { label: "Actions",     href: "#actions" },
];

function Sidebar({ venture, onVenture }: { venture: string; onVenture: (v: string) => void }) {
  return (
    <div style={{
      width: 220,
      minHeight: "100vh",
      background: C.sidebar,
      borderRight: `1px solid ${C.border}`,
      position: "fixed",
      left: 0, top: 0, bottom: 0,
      display: "flex",
      flexDirection: "column",
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${C.border}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/saabai-logo.png" alt="Saabai" style={{ width: 110, height: "auto", opacity: 0.9 }} />
      </div>

      {/* Venture switcher */}
      <div style={{ padding: "16px 14px 10px" }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: "uppercase" as const, margin: "0 6px 8px" }}>Ventures</p>
        {(["All", "Rex", "Lex"] as const).map(v => {
          const dot = v === "Rex" ? C.orange : v === "Lex" ? C.blue : C.teal;
          const active = venture === v;
          return (
            <button
              key={v}
              onClick={() => onVenture(v)}
              style={{
                display: "flex", alignItems: "center", width: "100%",
                padding: "7px 10px", marginBottom: 2,
                background: active ? "rgba(37,211,102,0.1)" : "transparent",
                border: "none", borderRadius: 8,
                cursor: "pointer", textAlign: "left" as const,
                fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? C.teal : "#9aa0b8",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, marginRight: 9, flexShrink: 0 }} />
              {v}
            </button>
          );
        })}
      </div>

      {/* Workspace nav */}
      <div style={{ padding: "12px 14px 8px" }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: "uppercase" as const, margin: "0 6px 8px" }}>Workspace</p>
        {NAV_WORKSPACE.map(item => (
          <a
            key={item.href}
            href={item.href}
            style={{
              display: "flex", alignItems: "center",
              padding: "7px 10px", marginBottom: 2,
              background: item.active ? "rgba(255,255,255,0.06)" : "transparent",
              borderRadius: 8, textDecoration: "none",
              fontSize: 13, fontWeight: item.active ? 600 : 400,
              color: item.active ? "#eef0ff" : "#9aa0b8",
            }}
          >
            {item.label}
          </a>
        ))}
      </div>

      {/* Build nav */}
      <div style={{ padding: "10px 14px 8px" }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: "uppercase" as const, margin: "0 6px 8px" }}>Build</p>
        {NAV_BUILD.map(item => (
          <a
            key={item.href}
            href={item.href}
            style={{
              display: "flex", alignItems: "center",
              padding: "7px 10px", marginBottom: 2,
              background: "transparent",
              borderRadius: 8, textDecoration: "none",
              fontSize: 13, fontWeight: 400,
              color: "#9aa0b8",
            }}
          >
            {item.label}
          </a>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* New venture CTA */}
      <div style={{ padding: "0 14px 14px" }}>
        <button style={{
          width: "100%", padding: "9px 14px",
          background: "rgba(37,211,102,0.1)",
          border: `1px solid rgba(37,211,102,0.22)`,
          borderRadius: 8, cursor: "pointer",
          color: C.teal, fontSize: 11, fontWeight: 700,
          letterSpacing: 0.3, textAlign: "center" as const,
        }}>
          + New venture
        </button>
      </div>

      {/* Profile + sign out */}
      <div style={{ padding: "14px 18px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "linear-gradient(135deg, #25D366, #1aab52)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0,
        }}>
          S
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#eef0ff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>Shane Pearl</p>
          <p style={{ margin: 0, fontSize: 11, color: "#9aa0b8" }}>Admin</p>
        </div>
        <form method="POST" action="/api/auth/logout" style={{ margin: 0 }}>
          <button
            type="submit"
            title="Sign out"
            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 14, padding: "2px 4px", lineHeight: 1 }}
          >
            ↩
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Atlas notification bar ─────────────────────────────────────────────────────

function AtlasBar({ rexStats }: { rexStats: RexStats }) {
  const todayStr = new Date(Date.now() + 10 * 3600 * 1000).toISOString().slice(0, 10);
  const todayCount = rexStats.dailyCounts.find(d => d.date === todayStr)?.count ?? 0;
  const weekCount = rexStats.dailyCounts.slice(-7).reduce((s, d) => s + d.count, 0);

  let msg = "No Rex leads today yet. Widget is live and listening.";
  if (todayCount === 1) msg = `Rex captured 1 lead today.${rexStats.avgPrice ? ` Avg quote ${fmtPrice(rexStats.avgPrice)}.` : ""}`;
  if (todayCount > 1)  msg = `Rex captured ${todayCount} leads today, ${weekCount} this week.${rexStats.avgPrice ? ` Avg quote ${fmtPrice(rexStats.avgPrice)}.` : ""}`;

  return (
    <div style={{
      background: "rgba(37,211,102,0.06)",
      border: `1px solid rgba(37,211,102,0.14)`,
      borderRadius: 10,
      padding: "13px 18px",
      display: "flex", alignItems: "center", gap: 13,
      marginBottom: 32,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: "rgba(37,211,102,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, flexShrink: 0,
      }}>
        ⚡
      </div>
      <div>
        <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: 0.4 }}>Atlas</p>
        <p style={{ margin: 0, fontSize: 12, color: "#9aa0b8", lineHeight: 1.5 }}>{msg}</p>
      </div>
    </div>
  );
}

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
      background: disabled ? "rgba(14,17,40,0.5)" : C.card,
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

type LeadTab = "All" | "Rex" | "Lex" | "Web";

const SRC_LABEL: Record<string, string> = {
  rex_quote_email: "Quote form",
  rex_mid_chat:    "Mid-chat",
  pete_ended:      "End panel",
  rex_quick_reply: "Quick reply",
};

function LeadsTable({ rexStats }: { rexStats: RexStats }) {
  const [tab, setTab] = useState<LeadTab>("All");
  const leads = rexStats.recentLeads ?? [];
  const filtered: LeadEvent[] = tab === "Lex" || tab === "Web" ? [] : leads;

  return (
    <DCard style={{ overflow: "hidden" }}>
      <div style={{ padding: "18px 22px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 10 }}>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: C.text }}>Recent Leads</p>
          <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{leads.length} most recent</p>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["All", "Rex", "Lex", "Web"] as LeadTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "5px 12px", borderRadius: 20,
                border: `1px solid ${tab === t ? C.borderBright : C.border}`,
                background: tab === t ? "rgba(255,255,255,0.07)" : "transparent",
                color: tab === t ? C.text : C.muted,
                fontSize: 11, fontWeight: tab === t ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1fr 0.9fr 1.2fr", gap: 10, padding: "8px 22px", borderBottom: `1px solid ${C.border}` }}>
          {["Name / Email", "Source", "Material", "Quote", "Time"].map(h => (
            <p key={h} style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" as const }}>{h}</p>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "32px 22px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>No leads in this category yet.</p>
          </div>
        ) : (
          filtered.map((lead, i) => (
            <div
              key={i}
              style={{
                display: "grid", gridTemplateColumns: "2fr 1.4fr 1fr 0.9fr 1.2fr",
                gap: 10, padding: "11px 22px",
                borderBottom: `1px solid ${C.border}`,
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                  {lead.name ?? "Anonymous"}
                </p>
                {lead.email && (
                  <p style={{ margin: 0, fontSize: 10, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{lead.email}</p>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 11, color: C.muted, alignSelf: "center" as const }}>
                {SRC_LABEL[lead.source] ?? lead.source}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: C.muted, alignSelf: "center" as const }}>
                {lead.material ?? "-"}
              </p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: lead.price ? C.orange : C.muted, alignSelf: "center" as const }}>
                {lead.price ?? "-"}
              </p>
              <p style={{ margin: 0, fontSize: 10, color: C.muted, alignSelf: "center" as const }}>
                {fmtLeadTime(lead.timestamp)}
              </p>
            </div>
          ))
        )}
      </div>
    </DCard>
  );
}

// ── Client account cards ──────────────────────────────────────────────────────

function ClientCard({ client, rexStats }: { client: ClientConfig; rexStats: RexStats }) {
  const isRex = client.dashboardUrl === "/rex-dashboard";
  const todayStr = new Date(Date.now() + 10 * 3600 * 1000).toISOString().slice(0, 10);
  const todayCount = isRex ? (rexStats.dailyCounts.find(d => d.date === todayStr)?.count ?? 0) : 0;
  const isLive = isRex && rexStats.total > 0;

  return (
    <DCard style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: isRex ? "linear-gradient(135deg, #e13f00, #ff6b35)" : C.surface,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 900, color: isRex ? "#fff" : C.muted,
          }}>
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: C.text }}>{client.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: C.muted }}>
              {isRex ? `Rex AI Sales Agent · ${rexStats.total} leads · ${todayCount} today` : client.email}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "3px 9px", borderRadius: 20,
            background: isLive ? "rgba(34,197,94,0.12)" : C.surface,
            color: isLive ? C.green : C.muted,
            fontSize: 10, fontWeight: 700,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: isLive ? C.green : C.muted, display: "inline-block" }} />
            {isLive ? "Live" : "Pending"}
          </span>
          {client.dashboardUrl !== "/saabai-admin" && (
            <a
              href={client.dashboardUrl}
              style={{
                padding: "6px 14px", borderRadius: 7,
                background: isRex ? C.orange : C.surface,
                border: isRex ? "none" : `1px solid ${C.border}`,
                color: isRex ? "#fff" : C.text,
                fontSize: 11, fontWeight: 700, textDecoration: "none",
              }}
            >
              Open &rarr;
            </a>
          )}
        </div>
      </div>
    </DCard>
  );
}

// ── Digest trigger ─────────────────────────────────────────────────────────────

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
      if (data.ok) { setState("sent"); setResult(data.thisWeek); }
      else setState("error");
    } catch { setState("error"); }
    setTimeout(() => { setState("idle"); setResult(null); }, 8000);
  }

  const bg    = state === "sent" ? "rgba(34,197,94,0.08)"  : state === "error" ? "rgba(239,68,68,0.08)" : C.card;
  const bdr   = state === "sent" ? "rgba(34,197,94,0.2)"   : state === "error" ? "rgba(239,68,68,0.2)"  : C.border;
  const color = state === "sent" ? C.green : state === "error" ? C.red : C.text;

  return (
    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 12, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 600, color }}>
          {state === "idle"    && "Weekly Performance Digest"}
          {state === "sending" && "Sending digest emails..."}
          {state === "sent"    && `Sent. ${result?.leads ?? 0} leads, ${result?.emailCaptureRate ?? "-"} capture rate this week.`}
          {state === "error"   && "Send failed. Check Resend and env vars."}
        </p>
        {state === "idle" && <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Fires automatically every Monday 9am AEST via Vercel Cron</p>}
      </div>
      <button
        onClick={fire}
        disabled={state === "sending"}
        style={{
          padding: "8px 18px", borderRadius: 7, border: "none",
          cursor: state === "sending" ? "not-allowed" : "pointer",
          background: state === "sending" ? C.surface : C.teal,
          color: state === "sending" ? C.muted : "#000",
          fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const,
        }}
      >
        {state === "sending" ? "Sending..." : "Send Now"}
      </button>
    </div>
  );
}

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
    width: "100%", maxWidth: 560, boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
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
              const preview = post.content.split("\n").find(l => l.trim()) ?? "";
              return (
                <div key={post.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 22px", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
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
                const preview = post.content.split("\n").find(l => l.trim()) ?? "";
                const sentDate = post.sentAt
                  ? new Date(post.sentAt).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                  : fmtDate(post.scheduledFor);
                return (
                  <div key={post.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 22px", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
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
              <div key={s.email} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 22px", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#00bfa5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {s.firstName?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.text }}>{s.firstName} <span style={{ color: C.muted, fontWeight: 400 }}>·</span> {s.email}</p>
                  {(s.city || s.country) && (
                    <p style={{ margin: "1px 0 0", fontSize: 10, color: C.muted }}>{[s.city, s.country].filter(Boolean).join(", ")}</p>
                  )}
                </div>
                {s.industry && (
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: INDUSTRY_COLOURS[s.industry] ?? C.muted, background: "rgba(255,255,255,0.05)", padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
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

// ── Main export ────────────────────────────────────────────────────────────────

export default function AdminClient({
  clients,
  rexStats,
  adminId,
}: {
  clients: ClientConfig[];
  rexStats: RexStats;
  adminId: string;
}) {
  const [venture, setVenture] = useState("All");
  const visibleClients = clients.filter(c => c.id !== adminId);

  const todayStr   = new Date(Date.now() + 10 * 3600 * 1000).toISOString().slice(0, 10);
  const todayCount = rexStats.dailyCounts.find(d => d.date === todayStr)?.count ?? 0;
  const weekCount  = rexStats.dailyCounts.slice(-7).reduce((s, d) => s + d.count, 0);
  const sparkData  = rexStats.dailyCounts.slice(-14).map(d => d.count);

  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: C.bg,
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      color: C.text,
    }}>
      {/* Sidebar */}
      <Sidebar venture={venture} onVenture={setVenture} />

      {/* Main */}
      <main style={{ marginLeft: 220, flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(7,9,26,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "0 40px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 56,
        }}>
          <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{today}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: C.muted }}>
              {rexStats.total > 0 ? `${rexStats.total} total leads` : "No data yet"}
            </span>
            <span style={{ width: 1, height: 16, background: C.border }} />
            <span style={{
              padding: "5px 12px", borderRadius: 7,
              background: "rgba(37,211,102,0.12)",
              border: `1px solid rgba(37,211,102,0.2)`,
              color: C.teal, fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
            }}>
              LIVE
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "36px 40px 80px", maxWidth: 1160, width: "100%", boxSizing: "border-box" }}>

          {/* Greeting */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: -0.8 }}>
              {getGreeting()}, Shane.
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Here&rsquo;s what&rsquo;s happening across your ventures.</p>
          </div>

          {/* Atlas bar */}
          <AtlasBar rexStats={rexStats} />

          {/* Product cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 36 }}>
            <ProductCard
              name="Rex"
              status="ACTIVE"
              statusColor={C.orange}
              accent={C.orange}
              description="AI Sales Agent"
              stats={[
                { label: "Leads",    value: String(rexStats.total) },
                { label: "Today",    value: String(todayCount) },
                { label: "Avg quote", value: fmtPrice(rexStats.avgPrice) },
              ]}
              sparkData={sparkData}
              linkHref="/rex-dashboard"
              linkLabel="Open Dashboard"
            />
            <ProductCard
              name="Lex"
              status="BETA"
              statusColor={C.blue}
              accent={C.blue}
              description="AI Legal Assistant"
              stats={[
                { label: "Threads", value: "-" },
                { label: "Firms",   value: "-" },
                { label: "Docs",    value: "-" },
              ]}
              linkHref="/lex"
              linkLabel="Open Lex"
            />
            <ProductCard
              name="LocalSearch"
              status="SOON"
              statusColor={C.amber}
              accent={C.amber}
              description="Google Business Dashboard"
              stats={[
                { label: "Clients",  value: "-" },
                { label: "Reviews",  value: "-" },
                { label: "Rating",   value: "-" },
              ]}
              disabled
            />
          </div>

          {/* Recent leads */}
          <div style={{ marginBottom: 40 }}>
            <SectionLabel>Recent Leads</SectionLabel>
            <LeadsTable rexStats={rexStats} />
          </div>

          {/* Client accounts */}
          {visibleClients.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <SectionLabel>Client Accounts</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {visibleClients.map(client => (
                  <ClientCard key={client.id} client={client} rexStats={rexStats} />
                ))}
              </div>
            </div>
          )}

          {/* Social */}
          <div id="social" style={{ marginBottom: 40 }}>
            <SectionLabel>Social Media</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              <a
                href="/saabai-admin/social/linkedin"
                style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid transparent`, borderRadius: 14, padding: "20px 22px", textDecoration: "none", display: "block", transition: "border-left-color 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = "#0077b5"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: "#0077b5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff" }}>in</div>
                  <span style={{ fontSize: 9, fontWeight: 800, color: C.green, background: `${C.green}18`, padding: "3px 8px", borderRadius: 20, letterSpacing: 1 }}>LIVE</span>
                </div>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: C.text }}>LinkedIn</p>
                <p style={{ margin: "0 0 16px", fontSize: 11, color: C.muted, lineHeight: 1.5 }}>Post generator, scheduled queue, history</p>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#4da6d4" }}>Open Hub &rarr;</p>
              </a>

              <a
                href="/saabai-admin/social/instagram"
                style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid transparent`, borderRadius: 14, padding: "20px 22px", textDecoration: "none", display: "block", transition: "border-left-color 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = "#dc2743"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg, #f09433, #dc2743 50%, #bc1888)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#fff" }}>Ig</div>
                  <span style={{ fontSize: 9, fontWeight: 800, color: C.teal, background: `${C.teal}18`, padding: "3px 8px", borderRadius: 20, letterSpacing: 1 }}>LIVE</span>
                </div>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: C.text }}>Instagram</p>
                <p style={{ margin: "0 0 16px", fontSize: 11, color: C.muted, lineHeight: 1.5 }}>Caption AI, queue, scheduled posts</p>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#e86080" }}>Open Hub &rarr;</p>
              </a>

              <div style={{ background: "rgba(14,17,40,0.5)", border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px", opacity: 0.5 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: "#1877f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff", fontFamily: "Georgia, serif" }}>f</div>
                  <span style={{ fontSize: 9, fontWeight: 800, color: C.muted, background: C.surface, padding: "3px 8px", borderRadius: 20, letterSpacing: 1 }}>SOON</span>
                </div>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: C.text }}>Facebook</p>
                <p style={{ margin: "0 0 16px", fontSize: 11, color: C.muted, lineHeight: 1.5 }}>Page posts, ad creative, schedule</p>
                <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Coming soon</p>
              </div>
            </div>
          </div>

          {/* Subscribers */}
          <div id="subs-hub" style={{ marginBottom: 40 }}>
            <SectionLabel>Email &amp; Subscribers</SectionLabel>
            <a
              href="/saabai-admin/subscribers"
              style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid transparent`, borderRadius: 14, padding: "20px 24px", textDecoration: "none", display: "block", transition: "border-left-color 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = "#00bfa5"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderLeftColor = "transparent"; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #00bfa5, #009688)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#fff" }}>SI</div>
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 700, color: C.text }}>Subscriber Intelligence</p>
                    <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Growth charts, industry breakdown, IP geolocation, CSV export</p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#00bfa5", whiteSpace: "nowrap" as const }}>Open Dashboard &rarr;</p>
              </div>
            </a>
            <div style={{ marginTop: 14 }}>
              <SubscriberPanel />
            </div>
          </div>

          {/* LinkedIn queue + post */}
          <div id="linkedin" style={{ marginBottom: 40 }}>
            <SectionLabel>LinkedIn</SectionLabel>
            <LinkedInQueue />
            <div style={{ marginTop: 14 }}>
              <LinkedInPanel />
            </div>
          </div>

          {/* Actions */}
          <div id="actions">
            <SectionLabel>Actions</SectionLabel>
            <DigestTrigger />
          </div>

          {/* Footer */}
          <p style={{ marginTop: 48, textAlign: "center", fontSize: 11, color: C.muted }}>
            Saabai Admin &middot; <a href="mailto:hello@saabai.ai" style={{ color: C.teal, textDecoration: "none" }}>hello@saabai.ai</a>
          </p>
        </div>
      </main>
    </div>
  );
}
