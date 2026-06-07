/**
 * LeadGen Client Portal — Tabbed Content
 *
 * Tabs: Overview, Leads, Customise, Test Agent, Embed Code, Settings
 * Matches the Lex client portal quality level.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import type { LeadGenClient } from "../../../lib/leadgen-config";

// ── Colour palette ──────────────────────────────────────────
const C = {
  bg:       "#0a0c10",
  card:     "#12141a",
  surface:  "#181b23",
  surfaceHi:"#1e2230",
  border:   "rgba(255,255,255,0.06)",
  borderHi: "rgba(255,255,255,0.10)",
  text:     "#f1f1f3",
  muted:    "#71758a",
  dim:      "#3b3f52",
  gold:     "#C9A84C",
  goldBg:   "rgba(201,168,76,0.08)",
  goldBdr:  "rgba(201,168,76,0.25)",
  goldHi:   "#dbb95c",
  green:    "#22c55e",
  greenBg:  "rgba(34,197,94,0.08)",
  blue:     "#3b82f6",
  blueBg:   "rgba(59,130,246,0.08)",
  red:      "#ef4444",
  redBg:    "rgba(239,68,68,0.08)",
  orange:   "#f97316",
  orangeBg: "rgba(249,115,22,0.08)",
  teal:     "#62C5D1",
  tealBg:   "rgba(98,197,209,0.08)",
};

// ── Types ───────────────────────────────────────────────────
interface Lead {
  id: string;
  clientSlug: string;
  name: string;
  phone: string;
  email?: string;
  service: string;
  address?: string;
  urgency: "emergency" | "soon" | "quote";
  message?: string;
  createdAt: number;
  notified: boolean;
}

type Tab = "overview" | "leads" | "customise" | "test-agent" | "embed" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",   label: "Overview" },
  { id: "leads",      label: "Leads" },
  { id: "customise",  label: "Customise" },
  { id: "test-agent", label: "Test Agent" },
  { id: "embed",      label: "Embed Code" },
  { id: "settings",   label: "Settings" },
];

// ── Helpers ─────────────────────────────────────────────────
function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtShortDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function urng(u: string) {
  const m: Record<string, { label: string; color: string; bg: string }> = {
    emergency: { label: "Emergency", color: C.red, bg: C.redBg },
    soon:      { label: "Soon",      color: C.orange, bg: C.orangeBg },
    quote:     { label: "Quote",     color: C.blue, bg: C.blueBg },
  };
  return m[u] ?? { label: u, color: C.muted, bg: "rgba(255,255,255,0.04)" };
}

// ── Stat Card ───────────────────────────────────────────────
function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
      <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "0 0 2px", fontSize: 24, fontWeight: 800, color: highlight ? C.gold : C.text, letterSpacing: -0.5 }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{sub}</p>}
    </div>
  );
}

// ── Urgency Badge ───────────────────────────────────────────
function UrgencyBadge({ u }: { u: string }) {
  const m = urng(u);
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      color: m.color, background: m.bg, whiteSpace: "nowrap",
    }}>
      {m.label}
    </span>
  );
}

// ── Status Badge ────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active" || status === "live";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 20,
      color: isActive ? C.green : C.muted, background: isActive ? C.greenBg : "rgba(255,255,255,0.04)",
      border: `1px solid ${isActive ? "rgba(34,197,94,0.2)" : C.border}`,
    }}>
      {isActive && <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, flexShrink: 0 }} />}
      {isActive ? "Live" : status}
    </span>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════
export default function LeadGenPortalContent({ client, userName, notificationUsage: initialUsage }: { 
  client: LeadGenClient; 
  userName: string; 
  notificationUsage: {
    sms: { used: number; limit: number };
    whatsapp: { used: number; limit: number };
    email: "unlimited";
  };
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Notification state ──────────────────────────────────
  const [notifEmail, setNotifEmail] = useState(client.notifications?.email ?? true);
  const [notifSms, setNotifSms] = useState(client.notifications?.sms ?? true);
  const [notifWhatsApp, setNotifWhatsApp] = useState(client.notifications?.whatsapp ?? true);
  const [notifUsage, setNotifUsage] = useState(initialUsage);

  // ── Editable fields ──────────────────────────────────────
  const [businessName, setBusinessName] = useState(client.businessName);
  const [phone, setPhone] = useState(client.phone);
  const [serviceArea, setServiceArea] = useState(client.serviceArea);
  const [businessHours, setBusinessHours] = useState(client.businessHours);
  const [description, setDescription] = useState(client.description);
  const [primaryColor, setPrimaryColor] = useState(client.branding.primaryColor);
  const [accentColor, setAccentColor] = useState(client.branding.accentColor);
  const [widgetTitle, setWidgetTitle] = useState(client.branding.widgetTitle);
  const [greeting, setGreeting] = useState(client.branding.greeting);

  // ── Embed code ───────────────────────────────────────────
  const embedCode = `<script src="https://www.saabai.ai/api/leadgen/widget?slug=${client.slug}"></script>`;

  // ── Load leads ───────────────────────────────────────────
  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    setLeadsError("");
    try {
      const res = await fetch(`/api/leadgen/leads?slug=${client.slug}`);
      if (!res.ok) throw new Error("Failed to load leads");
      const data = await res.json();
      setLeads((data.leads || []).sort((a: Lead, b: Lead) => b.createdAt - a.createdAt));
    } catch (e: unknown) {
      setLeadsError(e instanceof Error ? e.message : "Failed to load leads");
    }
    setLeadsLoading(false);
  }, [client.slug]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // ── Save settings ────────────────────────────────────────
  async function saveSettings() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/leadgen/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: client.id,
          businessName,
          phone,
          serviceArea,
          businessHours,
          description,
          branding: { primaryColor, accentColor, widgetTitle, greeting },
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaveMsg({ type: "success", text: "Settings saved successfully." });
    } catch {
      setSaveMsg({ type: "error", text: "Failed to save settings. Try again." });
    }
    setSaving(false);
  }

  // ── Copy embed code ──────────────────────────────────────
  function copyEmbed() {
    navigator.clipboard.writeText(embedCode).then(() => {
      setSaveMsg({ type: "success", text: "Embed code copied!" });
      setTimeout(() => setSaveMsg(null), 2500);
    });
  }

  // ── Save notification preferences ────────────────────────
  async function saveNotificationPrefs() {
    setSaving(true);
    try {
      const res = await fetch("/api/leadgen/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          notifications: {
            email: notifEmail,
            sms: notifSms,
            whatsapp: notifWhatsApp,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaveMsg({ type: "success", text: "Notification preferences saved." });
    } catch {
      setSaveMsg({ type: "error", text: "Failed to save notification preferences." });
    }
    setSaving(false);
  }

  // ── Stats ────────────────────────────────────────────────
  const totalLeads = leads.length;
  const emergencyLeads = leads.filter((l) => l.urgency === "emergency").length;
  const thisMonth = leads.filter((l) => {
    const d = new Date(l.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // ── Tab styling ──────────────────────────────────────────
  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 13, fontWeight: 600, padding: "10px 18px", cursor: "pointer",
    color: active ? C.gold : C.muted, borderBottom: active ? `2px solid ${C.gold}` : "2px solid transparent",
    background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",
    transition: "color 0.15s, border-color 0.15s", whiteSpace: "nowrap",
  });

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "var(--font-geist-sans)" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* ── Header ──────────────────────────────────────── */}
      <header style={{ borderBottom: `1px solid ${C.border}`, background: C.card }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect width="24" height="24" rx="6" fill={C.gold} />
                  <text x="12" y="16" textAnchor="middle" fill="black" fontSize="13" fontWeight="800" fontFamily="sans-serif">S</text>
                </svg>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>SAABAI.ai</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.gold}`, color: C.gold, letterSpacing: 0.5 }}>
                  LeadGen Portal
                </span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <StatusBadge status={client.status} />
              <a
                href={`/leadgen-widget?slug=${client.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                  background: C.goldBg, border: `1px solid ${C.goldBdr}`,
                  color: C.gold, fontSize: 12, fontWeight: 700, textDecoration: "none",
                }}
              >
                Open Widget ↗
              </a>
              <form action="/api/auth/logout" method="POST" style={{ margin: 0 }}>
                <button type="submit" style={{
                  background: "none", border: `1px solid ${C.border}`, color: C.muted,
                  padding: "8px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                  fontWeight: 600,
                }}>
                  Sign out
                </button>
              </form>
            </div>
          </div>

          {/* Tab bar */}
          <nav style={{ display: "flex", gap: 0 }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Toast ─────────────────────────────────────────── */}
      {saveMsg && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
          padding: "10px 20px", borderRadius: 10,
          background: saveMsg.type === "success" ? C.greenBg : C.redBg,
          border: `1px solid ${saveMsg.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: saveMsg.type === "success" ? C.green : C.red,
          fontSize: 13, fontWeight: 600,
        }}>
          {saveMsg.text}
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────── */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px" }}>
        {/* ── Tab: Overview ──────────────────────────────── */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
                Welcome, {userName}
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>
                Here is how your LeadGen widget is performing.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              <StatCard label="Total Leads" value={totalLeads.toString()} sub="all time" />
              <StatCard label="This Month" value={thisMonth.toString()} sub={new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" })} />
              <StatCard label="Emergency" value={emergencyLeads.toString()} sub="flagged urgent" highlight={emergencyLeads > 0} />
              <StatCard label="Widget Status" value={client.status === "active" ? "Live" : "Paused"} sub={client.status === "active" ? "Capturing leads 24/7" : "Not active"} />
            </div>

            {/* ── Notification Usage ──────────────────────── */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: C.gold }}>Notification Usage</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    📧 Email
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Unlimited</div>
                  <div style={{ fontSize: 11, color: C.green }}>Active</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    📱 SMS
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>
                    {notifUsage.sms.used}<span style={{ fontSize: 13, color: C.muted }}>/{notifUsage.sms.limit}</span>
                  </div>
                  <div style={{ fontSize: 11, color: notifUsage.sms.used >= notifUsage.sms.limit ? C.red : C.green }}>
                    {notifUsage.sms.used >= notifUsage.sms.limit ? "Limit reached" : `${notifUsage.sms.limit - notifUsage.sms.used} remaining`}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    💬 WhatsApp
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>
                    {notifUsage.whatsapp.used}<span style={{ fontSize: 13, color: C.muted }}>/{notifUsage.whatsapp.limit}</span>
                  </div>
                  <div style={{ fontSize: 11, color: notifUsage.whatsapp.used >= notifUsage.whatsapp.limit ? C.red : C.green }}>
                    {notifUsage.whatsapp.used >= notifUsage.whatsapp.limit ? "Limit reached" : `${notifUsage.whatsapp.limit - notifUsage.whatsapp.used} remaining`}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Quick actions */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px" }}>
                <h2 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: C.gold }}>Quick Actions</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button onClick={() => setTab("test-agent")} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                    background: C.surface, border: `1px solid ${C.border}`, color: C.text,
                    fontSize: 13, fontWeight: 600, textAlign: "left", width: "100%",
                  }}>
                    <span>Test your agent</span>
                    <span style={{ color: C.gold, fontSize: 11 }}>Test Agent →</span>
                  </button>
                  <button onClick={() => setTab("embed")} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                    background: C.surface, border: `1px solid ${C.border}`, color: C.text,
                    fontSize: 13, fontWeight: 600, textAlign: "left", width: "100%",
                  }}>
                    <span>Get embed code</span>
                    <span style={{ color: C.gold, fontSize: 11 }}>Embed Code →</span>
                  </button>
                  <button onClick={() => setTab("customise")} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                    background: C.surface, border: `1px solid ${C.border}`, color: C.text,
                    fontSize: 13, fontWeight: 600, textAlign: "left", width: "100%",
                  }}>
                    <span>Customise widget</span>
                    <span style={{ color: C.gold, fontSize: 11 }}>Customise →</span>
                  </button>
                </div>
              </div>

              {/* Recent leads */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.gold }}>Recent Leads</h2>
                  {leads.length > 0 && (
                    <button onClick={() => setTab("leads")} style={{ background: "none", border: "none", color: C.gold, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      View all →
                    </button>
                  )}
                </div>
                {leadsLoading ? (
                  <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Loading...</p>
                ) : leads.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <p style={{ margin: "0 0 6px", fontSize: 28 }}>📭</p>
                    <p style={{ margin: 0, fontSize: 12, color: C.muted }}>No leads yet. Leads captured by your widget will appear here.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {leads.slice(0, 5).map((lead) => (
                      <div key={lead.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 14px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`,
                      }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{lead.name}</span>
                            <UrgencyBadge u={lead.urgency} />
                          </div>
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>{lead.service}</p>
                        </div>
                        <span style={{ fontSize: 10, color: C.dim }}>{fmtShortDate(lead.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Leads ──────────────────────────────────── */}
        {tab === "leads" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Captured Leads</h1>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>
                  {totalLeads} lead{totalLeads !== 1 ? "s" : ""} captured · {emergencyLeads} emergency/urgent
                </p>
              </div>
              <button onClick={loadLeads} style={{
                padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                background: C.surface, border: `1px solid ${C.border}`, color: C.muted,
                fontSize: 12, fontWeight: 600,
              }}>
                Refresh
              </button>
            </div>

            {leadsLoading ? (
              <div style={{ textAlign: "center", padding: 60 }}>
                <div style={{ width: 32, height: 32, border: "2px solid", borderColor: `${C.gold} transparent transparent transparent`, borderRadius: "50%", margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
                <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Loading leads...</p>
              </div>
            ) : leadsError ? (
              <div style={{ background: C.redBg, border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 10, padding: 20, textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 13, color: C.red }}>{leadsError}</p>
              </div>
            ) : leads.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, background: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}>
                <p style={{ margin: "0 0 8px", fontSize: 32 }}>📭</p>
                <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600 }}>No leads yet</h2>
                <p style={{ margin: "0 auto 20px", fontSize: 13, color: C.muted, maxWidth: 400 }}>
                  Your widget hasn&apos;t captured any leads yet. Make sure the embed code is on your website and test it below.
                </p>
                <button onClick={() => setTab("test-agent")} style={{
                  padding: "10px 20px", borderRadius: 10, cursor: "pointer",
                  background: C.goldBg, border: `1px solid ${C.goldBdr}`, color: C.gold,
                  fontSize: 13, fontWeight: 700,
                }}>
                  Test Your Agent →
                </button>
              </div>
            ) : (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                    <thead>
                      <tr>
                        <TH>Name</TH>
                        <TH>Contact</TH>
                        <TH>Service</TH>
                        <TH>Urgency</TH>
                        <TH>Date</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead, i) => (
                        <tr key={lead.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                          <TD>
                            <span style={{ fontWeight: 600 }}>{lead.name}</span>
                          </TD>
                          <TD>
                            <a href={`tel:${lead.phone}`} style={{ color: C.gold, textDecoration: "none", fontSize: 12 }}>{lead.phone}</a>
                            {lead.email && <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>{lead.email}</p>}
                          </TD>
                          <TD>
                            <span style={{ fontSize: 13 }}>{lead.service}</span>
                            {lead.address && <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>{lead.address}</p>}
                          </TD>
                          <TD><UrgencyBadge u={lead.urgency} /></TD>
                          <TD style={{ ...tdStyle, color: C.muted, fontSize: 11, whiteSpace: "nowrap" }}>{fmtDate(lead.createdAt)}</TD>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Customise ──────────────────────────────── */}
        {tab === "customise" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Customise Widget</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>
                Changes apply here after you hit Save Configuration. Live widget updates may take a few minutes.
              </p>
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" }}>Branding</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Widget Title" value={widgetTitle} onChange={setWidgetTitle} />
                <Field label="Greeting Message" value={greeting} onChange={setGreeting} />
                <ColorField label="Primary Color" value={primaryColor} onChange={setPrimaryColor} />
                <ColorField label="Accent Color" value={accentColor} onChange={setAccentColor} />
              </div>
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" }}>Business Info</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Business Name" value={businessName} onChange={setBusinessName} />
                <Field label="Phone" value={phone} onChange={setPhone} />
                <Field label="Service Area" value={serviceArea} onChange={setServiceArea} />
                <Field label="Business Hours" value={businessHours} onChange={setBusinessHours} />
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: 0.5, textTransform: "uppercase" }}>Service Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: `1px solid ${C.border}`, background: C.surface, color: C.text,
                    fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            <button onClick={saveSettings} disabled={saving} style={{
              alignSelf: "flex-start", padding: "10px 24px", borderRadius: 8,
              background: C.goldBg, border: `1px solid ${C.goldBdr}`, color: C.gold,
              fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}>
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        )}

        {/* ── Tab: Test Agent ─────────────────────────────── */}
        {tab === "test-agent" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 600, margin: "0 auto" }}>
            <div style={{ textAlign: "center" }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Test Your Agent</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>
                Have a live conversation using your current configuration. This is exactly how clients on your website will experience it.
              </p>
            </div>

            <div style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden",
              padding: "4px",
            }}>
              <div style={{
                background: C.surfaceHi, borderBottom: `1px solid ${C.border}`,
                padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: primaryColor, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700 }}>
                  {widgetTitle[0]}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{widgetTitle}</p>
                  <p style={{ margin: 0, fontSize: 10, color: C.green }}>● Live preview</p>
                </div>
              </div>
              <div style={{ height: 480, background: C.bg }}>
                <iframe
                  src={`/leadgen-widget?slug=${client.slug}&embed=1`}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  title="Widget Preview"
                />
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 11, color: C.muted, textAlign: "center" }}>
              Using your saved configuration. Changes made in the Customise tab only apply here after you hit Save Configuration.
            </p>
          </div>
        )}

        {/* ── Tab: Embed Code ─────────────────────────────── */}
        {tab === "embed" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Embed Code</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>
                Add this one line of code to your website, right before the closing &lt;/body&gt; tag. That is it.
              </p>
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: 0.5 }}>Widget Script</span>
                <button onClick={copyEmbed} style={{
                  padding: "6px 14px", borderRadius: 6, cursor: "pointer",
                  background: C.goldBg, border: `1px solid ${C.goldBdr}`, color: C.gold,
                  fontSize: 11, fontWeight: 700,
                }}>
                  Copy Code
                </button>
              </div>
              <pre style={{
                margin: 0, padding: "16px 20px", fontSize: 12, lineHeight: 1.6,
                color: C.teal, background: C.surface, overflowX: "auto",
                fontFamily: "monospace",
              }}>
{embedCode}
              </pre>
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px" }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: C.gold }}>Installation Guide</h2>
              <ol style={{ margin: 0, padding: "0 0 0 18px", fontSize: 13, color: C.muted, lineHeight: 2 }}>
                <li>Copy the embed code above</li>
                <li>Open your website&apos;s HTML file (or CMS footer section)</li>
                <li>Paste it just before the closing <code style={{ color: C.text, background: C.surface, padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>&lt;/body&gt;</code> tag</li>
                <li>Save and publish your changes</li>
                <li>Test it — a chat bubble should appear in the bottom-right corner</li>
              </ol>
            </div>

            <div style={{ background: C.blueBg, border: `1px solid rgba(59,130,246,0.2)`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
              <p style={{ margin: 0, fontSize: 12, color: C.blue, lineHeight: 1.5 }}>
                Your slug is <code style={{ background: "rgba(59,130,246,0.1)", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>{client.slug}</code>. This is unique to your account. Do not share your slug or someone else could embed your widget on their site.
              </p>
            </div>
          </div>
        )}

        {/* ── Tab: Settings ───────────────────────────────── */}
        {tab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Settings</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>
                Account details and subscription information.
              </p>
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" }}>Account</h2>
              <Row label="Business Name" value={client.businessName} />
              <Row label="Email" value={client.email} />
              <Row label="Phone" value={client.phone || "—"} />
              <Row label="Slug" value={client.slug} mono />
              <Row label="Widget Status" value={client.status} />
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" }}>Subscription</h2>
              {client.subscription ? (
                <>
                  <Row label="Tier" value={client.subscription.tier} />
                  <Row label="Status" value={client.subscription.status} />
                  <Row label="Stripe Customer" value={client.subscription.stripeCustomerId ?? "—"} mono />
                  {client.subscription.currentPeriodEnd && (
                    <Row label="Current Period Ends" value={fmtDate(client.subscription.currentPeriodEnd)} />
                  )}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: C.muted }}>No subscription data available.</p>
              )}
            </div>

            {/* ── Notification Preferences ────────────────── */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" }}>Notifications</h2>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: C.muted }}>
                Choose which channels receive lead alerts. Usage resets monthly.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <ToggleRow
                  icon="📧"
                  label="Email"
                  description={`Send to ${client.email}`}
                  checked={notifEmail}
                  onChange={setNotifEmail}
                  limit="Unlimited"
                />
                <ToggleRow
                  icon="📱"
                  label="SMS"
                  description={`Send to ${client.notifications?.notificationPhone || client.phone || "not set"}`}
                  checked={notifSms}
                  onChange={setNotifSms}
                  limit={`${notifUsage.sms.used}/${notifUsage.sms.limit}`}
                />
                <ToggleRow
                  icon="💬"
                  label="WhatsApp"
                  description={`Send to ${client.notifications?.notificationPhone || client.phone || "not set"}`}
                  checked={notifWhatsApp}
                  onChange={setNotifWhatsApp}
                  limit={`${notifUsage.whatsapp.used}/${notifUsage.whatsapp.limit}`}
                />
              </div>
              <button
                onClick={saveNotificationPrefs}
                disabled={saving}
                style={{
                  marginTop: 16, padding: "9px 20px", borderRadius: 8,
                  background: C.goldBg, border: `1px solid ${C.goldBdr}`,
                  color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit", opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Preferences"}
              </button>
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" }}>Support</h2>
              <p style={{ margin: "0 0 6px", fontSize: 13, color: C.text }}>Need help with your LeadGen widget?</p>
              <a href="mailto:hello@saabai.ai" style={{ color: C.gold, fontSize: 13, textDecoration: "none", fontWeight: 600 }}>
                hello@saabai.ai →
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Table Helpers ──────────────────────────────────────────
const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 700,
  letterSpacing: 1, color: C.muted, textTransform: "uppercase", borderBottom: `1px solid ${C.border}`,
  whiteSpace: "nowrap",
};

function TH({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <th style={{ ...thStyle, ...style }}>{children}</th>;
}

const tdStyle: React.CSSProperties = {
  padding: "12px 16px", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}`,
};

function TD({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ ...tdStyle, ...style }}>{children}</td>;
}

// ── Form field ─────────────────────────────────────────────
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 8,
          border: `1px solid ${C.border}`, background: C.surface, color: C.text,
          fontSize: 13, outline: "none",
        }}
      />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 36, height: 36, borderRadius: 6, border: `1px solid ${C.border}`, padding: 0, cursor: "pointer", background: "none" }}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1, padding: "10px 12px", borderRadius: 8,
            border: `1px solid ${C.border}`, background: C.surface, color: C.text,
            fontSize: 13, outline: "none", fontFamily: "monospace",
          }}
        />
      </div>
    </div>
  );
}

// ── Row helper ─────────────────────────────────────────────
function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
      <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: C.text, textAlign: "right", fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all" }}>
        {value}
      </span>
    </div>
  );
}

// ── Toggle Row ─────────────────────────────────────────────
function ToggleRow({
  icon, label, description, checked, onChange, limit,
}: {
  icon: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  limit: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{description}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 10, color: C.dim, fontWeight: 700 }}>{limit}</span>
        <button
          onClick={() => onChange(!checked)}
          style={{
            width: 42, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
            position: "relative", transition: "background 0.15s",
            background: checked ? C.green : C.dim,
          }}
        >
          <span style={{
            position: "absolute", top: 3, left: checked ? 21 : 3,
            width: 18, height: 18, borderRadius: "50%", background: "#fff",
            transition: "left 0.15s",
          }} />
        </button>
      </div>
    </div>
  );
}
