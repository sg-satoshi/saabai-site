"use client";

/**
 * Saabai Client Portal
 * Firms log in here to view their agent stats, customise Lex, and get their embed code.
 * Auth: magic link sent via /api/portal/login → Resend email with token.
 */

import { useState } from "react";

const C = {
  bg:      "#0d1b2a",
  surface: "#162236",
  raised:  "#1e3050",
  border:  "#243550",
  gold:    "#C9A84C",
  goldB:   "#E0BC6A",
  goldBg:  "rgba(201,168,76,0.08)",
  goldBdr: "rgba(201,168,76,0.2)",
  text:    "#e8edf5",
  muted:   "#8fa3c0",
  dim:     "#4a6080",
  green:   "#22c55e",
  greenBg: "rgba(34,197,94,0.12)",
  greenBdr:"rgba(34,197,94,0.3)",
};

type View = "login" | "sent" | "dashboard";
type Tab  = "overview" | "leads" | "customize" | "embed" | "settings";

// ── Mock Data (replace with real API) ──────────────────────────────────────────
const MOCK = {
  firmName:  "Your Law Firm",
  clientId:  "yourfirm-external",
  agentName: "Lex",
  plan: "Professional",
  conversations:  847,
  leadsThisMonth: 23,
  topQuestions: [
    "How do I contest a Will?",
    "What are my rights if I'm made redundant?",
    "How does a property settlement work?",
    "I've received a letter of demand — what do I do?",
    "Can I take my employer to Fair Work?",
  ],
  recentLeads: [
    { name: "Michael T.", email: "m.t@example.com", matter: "Unfair dismissal",     time: "2h ago",     status: "New" },
    { name: "Sarah J.",   email: "s.j@example.com", matter: "Property settlement",  time: "5h ago",     status: "New" },
    { name: "David K.",   email: "d.k@example.com", matter: "Will dispute",         time: "Yesterday",  status: "Viewed" },
    { name: "Emma L.",    email: "e.l@example.com", matter: "Business contract",    time: "2 days ago", status: "Viewed" },
    { name: "James R.",   email: "j.r@example.com", matter: "Family law advice",    time: "3 days ago", status: "Viewed" },
  ],
};

// ── Customisation State ────────────────────────────────────────────────────────
type CustomSettings = {
  agentName: string;
  welcomeMessage: string;
  firmTagline: string;
  contactUrl: string;
  notifyEmail: string;
  practiceAreas: string[];
  quickReplies: string[];
  // Theme
  accentColor: string;
  launcherLabel: string;
  // Behaviour
  mode: "external" | "internal";
  leadCaptureEnabled: boolean;
  researchToolsEnabled: boolean;
  // Voice & Personality
  formalityLevel: number;       // 0 = very formal … 100 = conversational
  warmthLevel: number;          // 0 = clinical/detached … 100 = warm/personable
  humorLevel: "none" | "subtle" | "warm";
  responseLength: "concise" | "balanced" | "detailed";
  personalityTraits: string[];
  alwaysSayPhrases: string[];
  neverSayPhrases: string[];
  customVoiceNotes: string;     // free-form persona instructions
};

const ALL_PRACTICE_AREAS = [
  "Corporate & Commercial", "Property & Conveyancing", "Family Law", "Criminal Law",
  "Employment Law", "Tax Law", "Immigration", "Intellectual Property",
  "Tort & Personal Injury", "Wills & Estates", "Administrative Law",
  "Construction & Infrastructure", "Banking & Finance", "Dispute Resolution",
  "Insolvency & Restructuring", "Environmental Law",
];

const DEFAULT_SETTINGS: CustomSettings = {
  agentName: "Lex",
  welcomeMessage: "Hi! I'm Lex, your AI legal assistant. I can answer general questions about our services or help you get started with a matter enquiry. How can I help you today?",
  firmTagline: "Your AI legal assistant",
  contactUrl: "https://yourfirm.com.au/contact",
  notifyEmail: "admin@yourfirm.com.au",
  practiceAreas: ["Corporate & Commercial", "Property & Conveyancing", "Family Law", "Employment Law", "Wills & Estates"],
  quickReplies: [
    "I need help with a contract",
    "I need a property lawyer",
    "I've been unfairly dismissed",
    "I need advice on my Will",
    "What areas do you practise in?",
    "How do I book a consultation?",
  ],
  accentColor: "#C9A84C",
  launcherLabel: "Chat with Lex",
  mode: "external",
  leadCaptureEnabled: true,
  researchToolsEnabled: false,
  // Voice & Personality defaults
  formalityLevel: 65,
  warmthLevel: 70,
  humorLevel: "subtle",
  responseLength: "balanced",
  personalityTraits: ["Empathetic", "Clear", "Trustworthy", "Professional"],
  alwaysSayPhrases: [],
  neverSayPhrases: [],
  customVoiceNotes: "",
};

const ALL_PERSONALITY_TRAITS = [
  "Empathetic", "Direct", "Warm", "Authoritative", "Reassuring", "Patient",
  "Concise", "Thorough", "Encouraging", "Trustworthy", "Calm", "Confident",
  "Clear", "Professional", "Approachable", "Proactive",
];

// ── Input / Label helpers ──────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.muted,
      letterSpacing: "0.8px", textTransform: "uppercase" as const, marginBottom: 6 }}>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "10px 14px", borderRadius: 8,
        background: C.raised, border: `1px solid ${C.border}`,
        color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const }} />
  );
}

function Textarea({ value, onChange, rows = 3, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <textarea value={value} rows={rows} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "10px 14px", borderRadius: 8,
        background: C.raised, border: `1px solid ${C.border}`,
        color: C.text, fontSize: 13, outline: "none", resize: "vertical" as const,
        lineHeight: 1.6, boxSizing: "border-box" as const, fontFamily: "inherit" }} />
  );
}

function Toggle({ checked, onChange, label, sub }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text }}>{label}</p>
        {sub && <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>{sub}</p>}
      </div>
      <button onClick={() => onChange(!checked)} style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: checked ? C.gold : C.raised, position: "relative", flexShrink: 0,
        transition: "background 0.2s",
      }}>
        <span style={{
          position: "absolute", top: 3, left: checked ? 23 : 3,
          width: 18, height: 18, borderRadius: "50%", background: checked ? C.bg : C.dim,
          transition: "left 0.2s",
        }} />
      </button>
    </div>
  );
}

function Slider({ value, onChange, leftLabel, rightLabel, description }: {
  value: number; onChange: (v: number) => void;
  leftLabel: string; rightLabel: string; description?: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: C.muted }}>{leftLabel}</span>
        <span style={{ fontSize: 11, color: C.muted }}>{rightLabel}</span>
      </div>
      <input type="range" min={0} max={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: C.gold, cursor: "pointer", height: 4 }} />
      {description && (
        <p style={{ margin: "4px 0 0", fontSize: 11, color: C.dim }}>{description}</p>
      )}
    </div>
  );
}

function TagPillInput({ tags, onAdd, onRemove, placeholder, addLabel = "Add" }: {
  tags: string[]; onAdd: (v: string) => void; onRemove: (i: number) => void;
  placeholder?: string; addLabel?: string;
}) {
  const [val, setVal] = useState("");
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: tags.length ? 10 : 0 }}>
        {tags.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5,
            padding: "5px 10px 5px 12px", borderRadius: 20, background: C.raised, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, color: C.text }}>{t}</span>
            <button onClick={() => onRemove(i)} style={{
              background: "none", border: "none", color: C.dim, cursor: "pointer",
              fontSize: 15, padding: 0, lineHeight: 1, display: "flex",
            }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={val} onChange={e => setVal(e.target.value)}
          placeholder={placeholder}
          onKeyDown={e => { if (e.key === "Enter" && val.trim()) { onAdd(val.trim()); setVal(""); } }}
          style={{ flex: 1, maxWidth: 360, padding: "8px 12px", borderRadius: 8,
            background: C.raised, border: `1px solid ${C.border}`,
            color: C.text, fontSize: 12, outline: "none" }} />
        <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); } }} style={{
          padding: "8px 16px", borderRadius: 8,
          background: C.goldBg, border: `1px solid ${C.goldBdr}`,
          color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer",
        } as React.CSSProperties}>{addLabel}</button>
      </div>
    </div>
  );
}

// ── Portal ─────────────────────────────────────────────────────────────────────
export default function ClientPortal() {
  const [view,    setView]    = useState<View>("login");
  const [email,   setEmail]   = useState("");
  const [sending, setSending] = useState(false);
  const [tab,     setTab]     = useState<Tab>("overview");
  const [copied,  setCopied]  = useState<string | null>(null);
  const [settings, setSettings] = useState<CustomSettings>(DEFAULT_SETTINGS);
  const [savedOk,  setSavedOk]  = useState(false);
  const [newReply, setNewReply]  = useState("");

  async function requestLogin() {
    if (!email.trim() || sending) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    setSending(false);
    setView("sent");
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function updateSetting<K extends keyof CustomSettings>(key: K, value: CustomSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  function togglePracticeArea(area: string) {
    setSettings(prev => ({
      ...prev,
      practiceAreas: prev.practiceAreas.includes(area)
        ? prev.practiceAreas.filter(a => a !== area)
        : [...prev.practiceAreas, area],
    }));
  }

  function addQuickReply() {
    if (!newReply.trim()) return;
    setSettings(prev => ({ ...prev, quickReplies: [...prev.quickReplies, newReply.trim()] }));
    setNewReply("");
  }

  function removeQuickReply(i: number) {
    setSettings(prev => ({ ...prev, quickReplies: prev.quickReplies.filter((_, idx) => idx !== i) }));
  }

  function saveSettings() {
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2500);
  }

  const embedCode = `<!-- Lex Widget by Saabai — paste before </body> -->
<iframe
  id="lex-widget"
  src="https://saabai.ai/lex-widget?client=${MOCK.clientId}"
  style="position:fixed;bottom:0;right:0;width:88px;height:88px;border:none;z-index:9999;"
  title="Lex Legal Assistant"
></iframe>
<script>
  window.addEventListener("message", function(e) {
    if (e.data && e.data.lexWidget) {
      var f = document.getElementById("lex-widget");
      if (f) f.style.cssText = e.data.lexWidget === "open"
        ? "position:fixed;bottom:0;right:0;width:420px;height:680px;border:none;z-index:9999;"
        : "position:fixed;bottom:0;right:0;width:88px;height:88px;border:none;z-index:9999;";
    }
  });
</script>`;

  const wordpressCode = `// Add to your theme's functions.php or a plugin:
add_action('wp_footer', function() { ?>
  <iframe id="lex-widget"
    src="https://saabai.ai/lex-widget?client=${MOCK.clientId}"
    style="position:fixed;bottom:0;right:0;width:88px;height:88px;border:none;z-index:9999;"
    title="Lex Legal Assistant">
  </iframe>
  <script>
    window.addEventListener("message", function(e) {
      if (e.data && e.data.lexWidget) {
        var f = document.getElementById("lex-widget");
        f.style.cssText = e.data.lexWidget === "open"
          ? "position:fixed;bottom:0;right:0;width:420px;height:680px;border:none;z-index:9999;"
          : "position:fixed;bottom:0;right:0;width:88px;height:88px;border:none;z-index:9999;";
      }
    });
  </script>
<?php }); ?>`;

  const sty = {
    page: {
      minHeight: "100dvh", background: C.bg, color: C.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif",
      display: "flex" as const, flexDirection: "column" as const,
    } as React.CSSProperties,
    card: {
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
    } as React.CSSProperties,
    sectionTitle: {
      margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: C.text,
    } as React.CSSProperties,
    sectionSub: {
      margin: "0 0 20px", fontSize: 13, color: C.muted, lineHeight: 1.6,
    } as React.CSSProperties,
  };

  // ── Login ────────────────────────────────────────────────────────────────────
  if (view === "login" || view === "sent") {
    return (
      <div style={{ ...sty.page, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", margin: "0 auto 12px",
              background: `linear-gradient(135deg, ${C.goldB} 0%, ${C.gold} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: C.bg, fontFamily: "Georgia, serif" }}>L</span>
            </div>
            <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: C.text }}>Saabai Client Portal</h1>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Manage your Lex agent, view leads &amp; customise your widget</p>
          </div>

          <div style={{ ...sty.card, borderRadius: 16, padding: 28 }}>
            {view === "login" ? (
              <>
                <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: C.text }}>Sign in</h2>
                <p style={{ margin: "0 0 20px", fontSize: 13, color: C.muted }}>
                  Enter your firm email — we&apos;ll send a secure sign-in link.
                </p>
                <Label>Firm Email Address</Label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") requestLogin(); }}
                  placeholder="partner@yourfirm.com.au"
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 10,
                    background: C.raised, border: `1px solid ${C.border}`,
                    color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
                <button onClick={requestLogin} disabled={!email.trim() || sending} style={{
                  width: "100%", marginTop: 12, padding: 12, borderRadius: 10, border: "none",
                  background: email.trim() && !sending ? C.gold : C.goldBg,
                  color: email.trim() && !sending ? C.bg : C.muted,
                  fontSize: 14, fontWeight: 800,
                  cursor: email.trim() && !sending ? "pointer" : "not-allowed",
                }}>
                  {sending ? "Sending…" : "Send sign-in link"}
                </button>
                <p style={{ margin: "16px 0 0", fontSize: 11, color: C.dim, textAlign: "center" }}>
                  Don&apos;t have an account?{" "}
                  <a href="https://saabai.ai/contact" style={{ color: C.gold, textDecoration: "none" }}>Contact Saabai</a>
                </p>
                {/* Demo shortcut */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
                  <button onClick={() => setView("dashboard")} style={{
                    background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
                    color: C.muted, fontSize: 12, cursor: "pointer", padding: "7px 16px",
                  }}>
                    Preview demo portal →
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.greenBg,
                  border: `1px solid ${C.greenBdr}`, margin: "0 auto 14px",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3 10l5 5 9-9" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: C.text }}>Check your inbox</h2>
                <p style={{ margin: "0 0 20px", fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                  We&apos;ve sent a sign-in link to <strong style={{ color: C.text }}>{email}</strong>.
                  <br />Click the link to access your portal.
                </p>
                <p style={{ margin: 0, fontSize: 12, color: C.dim }}>
                  Didn&apos;t get it?{" "}
                  <button onClick={() => setView("login")}
                    style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 12, padding: 0 }}>
                    Try again
                  </button>
                </p>
              </div>
            )}
          </div>

          <p style={{ textAlign: "center", fontSize: 11, color: C.dim, marginTop: 16 }}>
            <a href="https://saabai.ai" style={{ color: C.dim }}>saabai.ai</a>
          </p>
        </div>
      </div>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview",   label: "Overview",    icon: "◎" },
    { id: "leads",      label: "Enquiries",   icon: "◈" },
    { id: "customize",  label: "Customise",   icon: "◐" },
    { id: "embed",      label: "Embed Code",  icon: "⟨/⟩" },
    { id: "settings",   label: "Settings",    icon: "⚙" },
  ];

  return (
    <div style={sty.page}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px", flexShrink: 0 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.goldB} 0%, ${C.gold} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: C.bg, fontFamily: "Georgia, serif" }}>L</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                {MOCK.firmName}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: C.muted, lineHeight: 1.2 }}>
                {MOCK.plan} Plan · Client Portal
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a href="/lex" target="_blank" style={{
              padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.goldBdr}`,
              background: C.goldBg, color: C.gold, fontSize: 12, fontWeight: 700,
              textDecoration: "none", cursor: "pointer",
            }}>
              Open Lex →
            </a>
            <button onClick={() => setView("login")} style={{ background: "none", border: `1px solid ${C.border}`,
              borderRadius: 6, color: C.muted, fontSize: 12, cursor: "pointer", padding: "5px 12px" }}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Agent status bar */}
      <div style={{ background: C.goldBg, borderBottom: `1px solid ${C.goldBdr}`, padding: "8px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center",
          justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, display: "inline-block" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.goldB }}>{MOCK.agentName} is live</span>
            <span style={{ fontSize: 12, color: C.muted }}>· AI legal assistant active on your website</span>
          </div>
          <span style={{ fontSize: 12, color: C.dim }}>Client ID: <code style={{ color: C.gold }}>{MOCK.clientId}</code></span>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

        {/* Sidebar nav */}
        <div style={{ width: 200, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`,
          padding: "16px 0", display: "flex", flexDirection: "column", gap: 2 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 18px", background: tab === t.id ? C.goldBg : "none",
              border: "none", borderLeft: tab === t.id ? `3px solid ${C.gold}` : "3px solid transparent",
              color: tab === t.id ? C.goldB : C.muted,
              fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
              cursor: "pointer", textAlign: "left", width: "100%",
            }}>
              <span style={{ fontSize: 12, opacity: 0.7 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.border}`, marginTop: 8 }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, color: C.dim }}>Need help?</p>
            <a href="https://saabai.ai/contact" style={{ fontSize: 12, color: C.gold, textDecoration: "none", fontWeight: 600 }}>
              Contact Saabai →
            </a>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
          <div style={{ maxWidth: 860 }}>

            {/* ── Overview ── */}
            {tab === "overview" && (
              <div>
                <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800, color: C.text }}>Overview</h2>

                {/* Stats grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
                  {[
                    { label: "Total Conversations", value: MOCK.conversations.toLocaleString(), sub: "All time", color: C.gold },
                    { label: "Leads This Month",    value: MOCK.leadsThisMonth, sub: "New enquiries captured", color: C.green },
                    { label: "Response Time",       value: "< 1s", sub: "Instant, 24/7", color: C.goldB },
                    { label: "Satisfaction",        value: "98%",  sub: "Based on session depth", color: C.gold },
                  ].map(stat => (
                    <div key={stat.label} style={{ ...sty.card, padding: "18px 20px" }}>
                      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: C.muted,
                        textTransform: "uppercase", letterSpacing: "0.8px" }}>{stat.label}</p>
                      <p style={{ margin: "0 0 4px", fontSize: 30, fontWeight: 800, color: stat.color }}>{stat.value}</p>
                      <p style={{ margin: 0, fontSize: 11, color: C.dim }}>{stat.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Top questions */}
                <div style={{ ...sty.card, padding: 20, marginBottom: 20 }}>
                  <h3 style={{ ...sty.sectionTitle, marginBottom: 16 }}>Top Questions This Month</h3>
                  {MOCK.topQuestions.map((q, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                      borderBottom: i < MOCK.topQuestions.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <span style={{ width: 24, height: 24, borderRadius: "50%", background: C.goldBg,
                        border: `1px solid ${C.goldBdr}`, color: C.gold, fontSize: 11, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {i + 1}
                      </span>
                      <p style={{ margin: 0, fontSize: 13, color: C.text }}>{q}</p>
                    </div>
                  ))}
                </div>

                {/* Quick links */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Customise Lex", sub: "Change name, greeting, and practice areas", tab: "customize" as Tab },
                    { label: "Get Embed Code", sub: "Install Lex on your website in minutes", tab: "embed" as Tab },
                  ].map(item => (
                    <button key={item.label} onClick={() => setTab(item.tab)} style={{
                      ...sty.card, padding: "16px 20px", cursor: "pointer",
                      textAlign: "left", border: `1px solid ${C.border}`,
                    }}>
                      <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: C.goldB }}>{item.label} →</p>
                      <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{item.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Enquiries ── */}
            {tab === "leads" && (
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: C.text }}>Enquiries</h2>
                <p style={{ margin: "0 0 24px", fontSize: 13, color: C.muted }}>
                  Clients who engaged with Lex and provided their contact details.
                </p>
                <div style={{ ...sty.card, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: C.raised }}>
                        {["Name", "Email", "Matter", "Time", "Status"].map(h => (
                          <th key={h} style={{ padding: "11px 18px", textAlign: "left", fontSize: 11,
                            fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK.recentLeads.map((lead, i) => (
                        <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                          <td style={{ padding: "12px 18px", fontSize: 13, color: C.text, fontWeight: 600 }}>{lead.name}</td>
                          <td style={{ padding: "12px 18px", fontSize: 12, color: C.muted }}>{lead.email}</td>
                          <td style={{ padding: "12px 18px", fontSize: 13, color: C.muted }}>{lead.matter}</td>
                          <td style={{ padding: "12px 18px", fontSize: 12, color: C.dim }}>{lead.time}</td>
                          <td style={{ padding: "12px 18px" }}>
                            <span style={{
                              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                              background: lead.status === "New" ? C.greenBg : C.goldBg,
                              border: `1px solid ${lead.status === "New" ? C.greenBdr : C.goldBdr}`,
                              color: lead.status === "New" ? C.green : C.gold,
                            }}>{lead.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ marginTop: 12, fontSize: 12, color: C.dim }}>
                  Leads are also sent to your notification email and CRM automatically.
                </p>
              </div>
            )}

            {/* ── Customise ── */}
            {tab === "customize" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <div>
                    <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: C.text }}>Customise Lex</h2>
                    <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Tailor your agent&apos;s personality, practice areas, and behaviour.</p>
                  </div>
                  <button onClick={saveSettings} style={{
                    padding: "9px 22px", borderRadius: 8,
                    background: savedOk ? C.greenBg : C.gold,
                    border: savedOk ? `1px solid ${C.greenBdr}` : "1px solid transparent",
                    color: savedOk ? C.green : C.bg,
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  } as React.CSSProperties}>
                    {savedOk ? "✓ Saved!" : "Save Changes"}
                  </button>
                </div>

                {/* Persona */}
                <div style={{ ...sty.card, padding: 24, marginBottom: 20 }}>
                  <h3 style={sty.sectionTitle}>Agent Persona</h3>
                  <p style={sty.sectionSub}>How Lex introduces itself and represents your firm.</p>

                  <div style={{ marginBottom: 16 }}>
                    <Label>Agent Name</Label>
                    <div style={{ maxWidth: 320 }}>
                      <TextInput value={settings.agentName} onChange={v => updateSetting("agentName", v)}
                        placeholder="Lex" />
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: C.dim }}>
                      The name your clients will see. "Lex" is the default, or use a custom name like "Alex" or "ARIA".
                    </p>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <Label>Tagline</Label>
                    <div style={{ maxWidth: 480 }}>
                      <TextInput value={settings.firmTagline} onChange={v => updateSetting("firmTagline", v)}
                        placeholder="Your AI legal assistant" />
                    </div>
                  </div>

                  <div>
                    <Label>Welcome Message</Label>
                    <Textarea value={settings.welcomeMessage}
                      onChange={v => updateSetting("welcomeMessage", v)}
                      rows={4}
                      placeholder="Hi! I'm Lex, your AI legal assistant…" />
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: C.dim }}>
                      First message shown to every new visitor. Keep it welcoming and set expectations.
                    </p>
                  </div>
                </div>

                {/* Voice & Personality */}
                <div style={{ ...sty.card, padding: 24, marginBottom: 20 }}>
                  <h3 style={sty.sectionTitle}>Voice &amp; Personality</h3>
                  <p style={sty.sectionSub}>
                    Shape how Lex communicates — its tone, warmth, humour, and language style.
                    The more detail you add, the more Lex will sound like it belongs to your firm.
                  </p>

                  {/* Trait tags */}
                  <div style={{ marginBottom: 24 }}>
                    <Label>Personality Traits</Label>
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: C.dim }}>
                      Select the traits that best describe how your firm communicates. These shape every response.
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {ALL_PERSONALITY_TRAITS.map(trait => {
                        const active = settings.personalityTraits.includes(trait);
                        return (
                          <button key={trait} onClick={() => setSettings(prev => ({
                            ...prev,
                            personalityTraits: active
                              ? prev.personalityTraits.filter(t => t !== trait)
                              : [...prev.personalityTraits, trait],
                          }))} style={{
                            padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 400,
                            cursor: "pointer",
                            background: active ? C.gold : C.raised,
                            border: active ? "none" : `1px solid ${C.border}`,
                            color: active ? C.bg : C.muted,
                          }}>
                            {trait}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sliders */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                    <div>
                      <Label>Formality</Label>
                      <Slider
                        value={settings.formalityLevel}
                        onChange={v => updateSetting("formalityLevel", v)}
                        leftLabel="Formal & precise"
                        rightLabel="Conversational"
                        description={
                          settings.formalityLevel < 30 ? "Highly formal — strict legal language, titles, no contractions." :
                          settings.formalityLevel < 60 ? "Professional — clear and structured, occasional contractions." :
                          settings.formalityLevel < 85 ? "Conversational — plain English, approachable, natural flow." :
                          "Casual — relaxed and friendly, short sentences."
                        }
                      />
                    </div>
                    <div>
                      <Label>Warmth</Label>
                      <Slider
                        value={settings.warmthLevel}
                        onChange={v => updateSetting("warmthLevel", v)}
                        leftLabel="Clinical"
                        rightLabel="Warm & caring"
                        description={
                          settings.warmthLevel < 30 ? "Clinical — just the facts, no emotional language." :
                          settings.warmthLevel < 60 ? "Measured — polite and respectful without being familiar." :
                          settings.warmthLevel < 85 ? "Warm — acknowledges emotions, uses reassuring language." :
                          "Very warm — empathetic, personal, clients feel heard."
                        }
                      />
                    </div>
                  </div>

                  {/* Humour + Response length */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                    <div>
                      <Label>Humour Level</Label>
                      <p style={{ margin: "0 0 8px", fontSize: 11, color: C.dim }}>
                        How much wit and lightness in responses. Always appropriate for context.
                      </p>
                      <div style={{ display: "flex", gap: 6 }}>
                        {(["none", "subtle", "warm"] as const).map(level => (
                          <button key={level} onClick={() => updateSetting("humorLevel", level)} style={{
                            flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
                            cursor: "pointer", textAlign: "center",
                            background: settings.humorLevel === level ? C.gold : C.raised,
                            border: settings.humorLevel === level ? "none" : `1px solid ${C.border}`,
                            color: settings.humorLevel === level ? C.bg : C.muted,
                          }}>
                            {level === "none" ? "None" : level === "subtle" ? "Subtle" : "Warm & witty"}
                          </button>
                        ))}
                      </div>
                      <p style={{ margin: "6px 0 0", fontSize: 11, color: C.dim }}>
                        {settings.humorLevel === "none" ? "Strictly professional — no humour." :
                         settings.humorLevel === "subtle" ? "Occasionally light — a warm turn of phrase when appropriate." :
                         "Genuinely warm and witty — puts clients at ease."}
                      </p>
                    </div>
                    <div>
                      <Label>Response Length</Label>
                      <p style={{ margin: "0 0 8px", fontSize: 11, color: C.dim }}>
                        How thorough Lex&apos;s answers are by default.
                      </p>
                      <div style={{ display: "flex", gap: 6 }}>
                        {(["concise", "balanced", "detailed"] as const).map(len => (
                          <button key={len} onClick={() => updateSetting("responseLength", len)} style={{
                            flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
                            cursor: "pointer", textAlign: "center",
                            background: settings.responseLength === len ? C.gold : C.raised,
                            border: settings.responseLength === len ? "none" : `1px solid ${C.border}`,
                            color: settings.responseLength === len ? C.bg : C.muted,
                          }}>
                            {len.charAt(0).toUpperCase() + len.slice(1)}
                          </button>
                        ))}
                      </div>
                      <p style={{ margin: "6px 0 0", fontSize: 11, color: C.dim }}>
                        {settings.responseLength === "concise" ? "Short and sharp — gets to the point fast." :
                         settings.responseLength === "balanced" ? "Balanced — enough detail without overwhelming." :
                         "Thorough — comprehensive answers with full context."}
                      </p>
                    </div>
                  </div>

                  {/* Always say / Never say */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                    <div>
                      <Label>Phrases to Always Use</Label>
                      <p style={{ margin: "0 0 8px", fontSize: 11, color: C.dim }}>
                        Words or phrases that reflect your firm&apos;s voice — Lex will use these naturally.
                      </p>
                      <TagPillInput
                        tags={settings.alwaysSayPhrases}
                        onAdd={v => updateSetting("alwaysSayPhrases", [...settings.alwaysSayPhrases, v])}
                        onRemove={i => updateSetting("alwaysSayPhrases", settings.alwaysSayPhrases.filter((_, idx) => idx !== i))}
                        placeholder="e.g. 'Absolutely', 'Of course'…"
                        addLabel="Add"
                      />
                    </div>
                    <div>
                      <Label>Phrases to Never Use</Label>
                      <p style={{ margin: "0 0 8px", fontSize: 11, color: C.dim }}>
                        Words or phrases that don&apos;t fit your brand — Lex will avoid them.
                      </p>
                      <TagPillInput
                        tags={settings.neverSayPhrases}
                        onAdd={v => updateSetting("neverSayPhrases", [...settings.neverSayPhrases, v])}
                        onRemove={i => updateSetting("neverSayPhrases", settings.neverSayPhrases.filter((_, idx) => idx !== i))}
                        placeholder="e.g. 'no worries', 'cheers'…"
                        addLabel="Add"
                      />
                    </div>
                  </div>

                  {/* Custom voice instructions */}
                  <div>
                    <Label>Custom Instructions</Label>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: C.dim }}>
                      Anything else that shapes how Lex should speak, think, and behave.
                      This is your direct line to Lex&apos;s personality — write it however feels natural.
                    </p>
                    <Textarea
                      value={settings.customVoiceNotes}
                      onChange={v => updateSetting("customVoiceNotes", v)}
                      rows={5}
                      placeholder={`Examples:\n• Always acknowledge the stress clients are under before answering.\n• Our firm is boutique and values personal relationships — Lex should feel like a trusted advisor, not a corporate bot.\n• When clients ask about fees, always say we offer a free initial consultation before directing them to the contact page.\n• Use British/Australian spelling throughout — never American (e.g. 'recognise' not 'recognize').`}
                    />
                  </div>
                </div>

                {/* Practice areas */}
                <div style={{ ...sty.card, padding: 24, marginBottom: 20 }}>
                  <h3 style={sty.sectionTitle}>Practice Areas</h3>
                  <p style={sty.sectionSub}>
                    Select the areas your firm practises in. Lex will tailor intake questions and responses accordingly.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {ALL_PRACTICE_AREAS.map(area => {
                      const active = settings.practiceAreas.includes(area);
                      return (
                        <button key={area} onClick={() => togglePracticeArea(area)} style={{
                          padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 400,
                          cursor: "pointer", transition: "all 0.15s",
                          background: active ? C.gold : C.raised,
                          border: active ? "none" : `1px solid ${C.border}`,
                          color: active ? C.bg : C.muted,
                        }}>
                          {area}
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ margin: "12px 0 0", fontSize: 11, color: C.dim }}>
                    {settings.practiceAreas.length} area{settings.practiceAreas.length !== 1 ? "s" : ""} selected
                  </p>
                </div>

                {/* Quick replies */}
                <div style={{ ...sty.card, padding: 24, marginBottom: 20 }}>
                  <h3 style={sty.sectionTitle}>Quick Reply Chips</h3>
                  <p style={sty.sectionSub}>
                    Shortcut buttons shown at the start of conversations. Help clients get to the right topic fast.
                    Up to 8 chips recommended.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    {settings.quickReplies.map((r, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: 20, background: C.raised, border: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 12, color: C.text }}>{r}</span>
                        <button onClick={() => removeQuickReply(i)} style={{
                          background: "none", border: "none", color: C.dim, cursor: "pointer",
                          fontSize: 14, padding: 0, lineHeight: 1, display: "flex",
                        }}>×</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, maxWidth: 480 }}>
                    <input value={newReply} onChange={e => setNewReply(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addQuickReply(); }}
                      placeholder="Add a quick reply…"
                      style={{ flex: 1, padding: "9px 14px", borderRadius: 8,
                        background: C.raised, border: `1px solid ${C.border}`,
                        color: C.text, fontSize: 13, outline: "none" }} />
                    <button onClick={addQuickReply} style={{
                      padding: "9px 18px", borderRadius: 8,
                      background: C.goldBg, border: `1px solid ${C.goldBdr}`,
                      color: C.gold, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    } as React.CSSProperties}>Add</button>
                  </div>
                </div>

                {/* Appearance */}
                <div style={{ ...sty.card, padding: 24, marginBottom: 20 }}>
                  <h3 style={sty.sectionTitle}>Appearance</h3>
                  <p style={sty.sectionSub}>Customise the visual style of the widget on your website.</p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 500 }}>
                    <div>
                      <Label>Accent Colour</Label>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input type="color" value={settings.accentColor}
                          onChange={e => updateSetting("accentColor", e.target.value)}
                          style={{ width: 40, height: 36, borderRadius: 6, border: `1px solid ${C.border}`,
                            background: "none", cursor: "pointer", padding: 2 }} />
                        <input value={settings.accentColor} onChange={e => updateSetting("accentColor", e.target.value)}
                          style={{ flex: 1, padding: "9px 12px", borderRadius: 8,
                            background: C.raised, border: `1px solid ${C.border}`,
                            color: C.text, fontSize: 12, outline: "none", fontFamily: "monospace" }} />
                      </div>
                    </div>
                    <div>
                      <Label>Launcher Label</Label>
                      <TextInput value={settings.launcherLabel}
                        onChange={v => updateSetting("launcherLabel", v)}
                        placeholder="Chat with Lex" />
                    </div>
                  </div>
                </div>

                {/* Behaviour toggles */}
                <div style={{ ...sty.card, padding: "0 24px 8px", marginBottom: 20 }}>
                  <div style={{ padding: "20px 0 12px" }}>
                    <h3 style={sty.sectionTitle}>Behaviour</h3>
                    <p style={{ ...sty.sectionSub, marginBottom: 0 }}>Control what Lex can and cannot do.</p>
                  </div>
                  <Toggle
                    checked={settings.leadCaptureEnabled}
                    onChange={v => updateSetting("leadCaptureEnabled", v)}
                    label="Lead Capture"
                    sub="Lex collects name, email, and matter details from prospective clients"
                  />
                  <Toggle
                    checked={settings.researchToolsEnabled}
                    onChange={v => updateSetting("researchToolsEnabled", v)}
                    label="Legal Research Tools (Internal Mode)"
                    sub="Enable AustLII, ATO, and legislation search — for internal lawyer use only"
                  />
                  <div style={{ paddingBottom: 8 }}>
                    <Toggle
                      checked={settings.mode === "internal"}
                      onChange={v => updateSetting("mode", v ? "internal" : "external")}
                      label="Internal Mode"
                      sub="Switch from client-facing intake to lawyer-facing research tool"
                    />
                  </div>
                </div>

                {/* Contact URL */}
                <div style={{ ...sty.card, padding: 24 }}>
                  <h3 style={sty.sectionTitle}>Contact Page URL</h3>
                  <p style={sty.sectionSub}>Where Lex sends clients when they want to speak to a lawyer directly.</p>
                  <div style={{ maxWidth: 480 }}>
                    <TextInput value={settings.contactUrl}
                      onChange={v => updateSetting("contactUrl", v)}
                      placeholder="https://yourfirm.com.au/contact" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Embed Code ── */}
            {tab === "embed" && (
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: C.text }}>Embed Code</h2>
                <p style={{ margin: "0 0 28px", fontSize: 13, color: C.muted }}>
                  Install Lex on your firm&apos;s website. Choose your platform below.
                </p>

                {/* Platform tabs */}
                {(() => {
                  const platforms = [
                    { id: "html",      label: "HTML / Any site" },
                    { id: "wordpress", label: "WordPress" },
                    { id: "webflow",   label: "Webflow" },
                    { id: "squarespace", label: "Squarespace / Wix" },
                  ] as const;
                  type PlatformId = typeof platforms[number]["id"];
                  const [platform, setPlatform] = useState<PlatformId>("html");

                  const instructions: Record<PlatformId, { steps: string[]; code: string; codeLang: string }> = {
                    html: {
                      code: embedCode,
                      codeLang: "HTML",
                      steps: [
                        "Open your website's HTML source or template editor.",
                        "Find the closing </body> tag near the bottom of every page.",
                        "Paste the code immediately before </body>.",
                        "Save and publish — Lex will appear as a chat button in the bottom-right corner.",
                      ],
                    },
                    wordpress: {
                      code: wordpressCode,
                      codeLang: "PHP",
                      steps: [
                        "Go to Appearance → Theme File Editor in your WordPress admin.",
                        "Open your theme's functions.php file.",
                        "Paste the code at the bottom of the file.",
                        "Click Update File — Lex will appear on your site immediately.",
                        "Alternatively: use a plugin like 'Insert Headers and Footers' to add the plain HTML snippet.",
                      ],
                    },
                    webflow: {
                      code: embedCode,
                      codeLang: "HTML",
                      steps: [
                        "Open your Webflow project and go to Project Settings → Custom Code.",
                        "Paste the embed code in the 'Footer Code' section.",
                        "Click Save and Publish your site.",
                        "Lex will appear on every page of your Webflow site.",
                      ],
                    },
                    squarespace: {
                      code: embedCode,
                      codeLang: "HTML",
                      steps: [
                        "Go to Settings → Advanced → Code Injection in Squarespace.",
                        "Paste the embed code in the 'Footer' field.",
                        "Click Save — Lex will appear site-wide.",
                        "For Wix: go to Settings → Custom Code → Add Code → Body - end of body.",
                      ],
                    },
                  };

                  const inst = instructions[platform];

                  return (
                    <div>
                      {/* Platform selector */}
                      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                        {platforms.map(p => (
                          <button key={p.id} onClick={() => setPlatform(p.id)} style={{
                            padding: "7px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                            cursor: "pointer", border: "none",
                            background: platform === p.id ? C.gold : C.raised,
                            color: platform === p.id ? C.bg : C.muted,
                          }}>{p.label}</button>
                        ))}
                      </div>

                      {/* Steps */}
                      <div style={{ ...sty.card, padding: 20, marginBottom: 16 }}>
                        <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: C.text }}>
                          Installation Steps
                        </h3>
                        <ol style={{ margin: 0, padding: "0 0 0 20px" }}>
                          {inst.steps.map((step, i) => (
                            <li key={i} style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, marginBottom: 4 }}>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Code block */}
                      <div style={{ ...sty.card, overflow: "hidden", marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 16px", background: C.raised, borderBottom: `1px solid ${C.border}` }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.8px",
                            textTransform: "uppercase" }}>{inst.codeLang}</span>
                          <button onClick={() => copy(inst.code, platform)} style={{
                            padding: "4px 12px", borderRadius: 6, border: `1px solid ${C.border}`,
                            background: copied === platform ? C.greenBg : C.surface,
                            color: copied === platform ? C.green : C.muted,
                            fontSize: 11, fontWeight: 700, cursor: "pointer",
                          }}>
                            {copied === platform ? "✓ Copied!" : "Copy"}
                          </button>
                        </div>
                        <div style={{ padding: 16, overflowX: "auto" }}>
                          <pre style={{ margin: 0, fontSize: 12, color: C.gold, fontFamily: "monospace",
                            whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                            {inst.code}
                          </pre>
                        </div>
                      </div>

                      {/* Your client ID */}
                      <div style={{ ...sty.card, padding: 16, display: "flex", alignItems: "center",
                        justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: C.muted }}>YOUR CLIENT ID</p>
                          <code style={{ fontSize: 14, color: C.goldB, fontFamily: "monospace" }}>{MOCK.clientId}</code>
                        </div>
                        <button onClick={() => copy(MOCK.clientId, "clientId")} style={{
                          padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.goldBdr}`,
                          background: copied === "clientId" ? C.greenBg : C.goldBg,
                          color: copied === "clientId" ? C.green : C.gold,
                          fontSize: 12, fontWeight: 700, cursor: "pointer",
                          borderColor: copied === "clientId" ? C.greenBdr : C.goldBdr,
                        }}>
                          {copied === "clientId" ? "✓ Copied" : "Copy ID"}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Help CTA */}
                <div style={{ background: C.goldBg, border: `1px solid ${C.goldBdr}`, borderRadius: 12, padding: 16, marginTop: 16 }}>
                  <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                    <strong style={{ color: C.goldB }}>Need help installing?</strong>{" "}
                    Our team can add Lex to your website for you — usually within one business day.{" "}
                    <a href="https://saabai.ai/contact" style={{ color: C.gold, fontWeight: 600 }}>Request installation →</a>
                  </p>
                </div>
              </div>
            )}

            {/* ── Settings ── */}
            {tab === "settings" && (
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: C.text }}>Settings</h2>
                <p style={{ margin: "0 0 28px", fontSize: 13, color: C.muted }}>Account and notification preferences.</p>

                {/* Firm details */}
                <div style={{ ...sty.card, padding: 24, marginBottom: 20 }}>
                  <h3 style={sty.sectionTitle}>Firm Details</h3>
                  <p style={sty.sectionSub}>Basic information about your firm account.</p>
                  {[
                    { label: "Firm Name",           placeholder: MOCK.firmName,              type: "text"  },
                    { label: "Primary Contact Email", placeholder: "partner@yourfirm.com.au", type: "email" },
                    { label: "Website",              placeholder: "https://yourfirm.com.au",  type: "url"   },
                  ].map(field => (
                    <div key={field.label} style={{ marginBottom: 16 }}>
                      <Label>{field.label}</Label>
                      <div style={{ maxWidth: 440 }}>
                        <input type={field.type} placeholder={field.placeholder}
                          style={{ width: "100%", padding: "10px 14px", borderRadius: 8,
                            background: C.raised, border: `1px solid ${C.border}`,
                            color: C.muted, fontSize: 13, outline: "none", boxSizing: "border-box" as const }} />
                      </div>
                    </div>
                  ))}
                  <button style={{ padding: "9px 22px", borderRadius: 8, border: "none",
                    background: C.gold, color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Save Details
                  </button>
                </div>

                {/* Notifications */}
                <div style={{ ...sty.card, padding: 24, marginBottom: 20 }}>
                  <h3 style={sty.sectionTitle}>Lead Notifications</h3>
                  <p style={sty.sectionSub}>Where to send new enquiries captured by Lex.</p>
                  <div style={{ marginBottom: 16 }}>
                    <Label>Notification Email</Label>
                    <div style={{ maxWidth: 440 }}>
                      <TextInput value={settings.notifyEmail}
                        onChange={v => updateSetting("notifyEmail", v)}
                        placeholder="admin@yourfirm.com.au"
                        type="email" />
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: C.dim }}>
                      Every new enquiry is emailed here instantly.
                    </p>
                  </div>
                  <div style={{ paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                    <Toggle
                      checked={true}
                      onChange={() => {}}
                      label="Email notifications"
                      sub="Receive an email for every new lead captured by Lex"
                    />
                    <Toggle
                      checked={false}
                      onChange={() => {}}
                      label="Weekly summary"
                      sub="Weekly email digest with conversation stats and top questions"
                    />
                  </div>
                  <button style={{ marginTop: 16, padding: "9px 22px", borderRadius: 8, border: "none",
                    background: C.gold, color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Save Notifications
                  </button>
                </div>

                {/* Plan */}
                <div style={{ ...sty.card, padding: 24, marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <h3 style={{ ...sty.sectionTitle, margin: 0 }}>Current Plan</h3>
                    <span style={{ padding: "3px 12px", borderRadius: 20, background: C.goldBg,
                      border: `1px solid ${C.goldBdr}`, color: C.gold, fontSize: 11, fontWeight: 700 }}>
                      {MOCK.plan}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 16px", fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                    Your plan includes the Lex external widget, lead capture, and monthly reporting.
                    Upgrade to add internal legal research tools, custom knowledge base, and multi-user access.
                  </p>
                  <a href="https://saabai.ai/contact" style={{
                    display: "inline-block", padding: "9px 22px", borderRadius: 8,
                    background: C.goldBg, border: `1px solid ${C.goldBdr}`,
                    color: C.gold, fontSize: 13, fontWeight: 700, textDecoration: "none",
                  }}>
                    Talk to Saabai about upgrading →
                  </a>
                </div>

                {/* Custom KB */}
                <div style={{ background: `linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.12) 100%)`,
                  border: `1px solid ${C.goldBdr}`, borderRadius: 12, padding: 24 }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: C.goldB }}>
                    Custom Knowledge Base
                  </h3>
                  <p style={{ margin: "0 0 16px", fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                    We can train Lex on your firm&apos;s specific FAQs, precedents, fee guides, and practice area content
                    — so responses feel like they come from your firm, not a generic AI.
                  </p>
                  <a href="https://saabai.ai/contact" style={{ fontSize: 13, fontWeight: 700, color: C.gold,
                    textDecoration: "none" }}>
                    Get a custom knowledge base →
                  </a>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
