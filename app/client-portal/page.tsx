"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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

// ── Mock / demo data (replace with real API calls) ─────────────────────────────
const MOCK = {
  firmName:       "Smith & Partners",
  clientId:       "demo-client-001",
  agentName:      "Lex",
  plan:           "Professional",
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
    { name: "Michael T.", email: "m.t@example.com", matter: "Unfair dismissal",    time: "2h ago",     status: "New" },
    { name: "Sarah J.",   email: "s.j@example.com", matter: "Property settlement", time: "5h ago",     status: "New" },
    { name: "David K.",   email: "d.k@example.com", matter: "Will dispute",        time: "Yesterday",  status: "Viewed" },
    { name: "Emma L.",    email: "e.l@example.com", matter: "Business contract",   time: "2 days ago", status: "Viewed" },
    { name: "James R.",   email: "j.r@example.com", matter: "Family law advice",   time: "3 days ago", status: "Viewed" },
  ],
};

type Tab = "overview" | "leads" | "customize" | "embed" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",  label: "Overview"  },
  { id: "leads",     label: "Leads"     },
  { id: "customize", label: "Customise" },
  { id: "embed",     label: "Embed Code"},
  { id: "settings",  label: "Settings"  },
];

type AuthView = "checking" | "login" | "sent" | "dashboard";
type FirmSession = { email: string; firmName: string; clientId: string; agentName: string; plan: string };

function ClientPortalInner() {
  const searchParams = useSearchParams();

  // ── All hooks must be declared before any early returns (Rules of Hooks) ──────
  const [authView,  setAuthView]  = useState<AuthView>("checking");
  const [loginEmail, setLoginEmail] = useState("");
  const [sending,    setSending]    = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [firm,       setFirm]       = useState<FirmSession | null>(null);
  // Dashboard state (declared here even when not yet on dashboard)
  const [tab,      setTab]      = useState<Tab>("overview");
  const [copied,   setCopied]   = useState<string | null>(null);
  const [savedOk,  setSavedOk]  = useState(false);
  const [settings, setSettings] = useState({
    agentName:          MOCK.agentName,
    welcomeMessage:     "Hi there! I'm Lex, an AI legal assistant. How can I help you today?",
    formalityLevel:     75,
    warmthLevel:        60,
    humorLevel:         20,
    responseLength:     "balanced" as "concise" | "balanced" | "detailed",
    personalityTraits:  [] as string[],
    alwaysSay:          [] as string[],
    neverSay:           [] as string[],
    customInstructions: "",
    leadCaptureEnabled: true,
  });
  const [alwaysSayDraft, setAlwaysSayDraft] = useState("");
  const [neverSayDraft,  setNeverSayDraft]  = useState("");

  // Sync tab from URL param
  useEffect(() => {
    const t = searchParams.get("tab") as Tab | null;
    if (t && TABS.some(x => x.id === t)) setTab(t);
  }, [searchParams]);

  // Check for existing session on mount + handle ?error= from magic link
  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "invalid_token") setLoginError("That sign-in link has expired or already been used. Request a new one.");
    if (err === "missing_token")  setLoginError("Invalid sign-in link. Please request a new one.");

    fetch("/api/portal/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.authenticated) {
          setFirm({ email: data.email, firmName: data.firmName, clientId: data.clientId, agentName: data.agentName, plan: data.plan });
          setSettings(prev => ({ ...prev, agentName: data.agentName }));
          setAuthView("dashboard");
        } else {
          setAuthView("login");
        }
      })
      .catch(() => setAuthView("login"));
  }, [searchParams]);

  async function requestMagicLink() {
    if (!loginEmail.trim() || sending) return;
    setLoginError(null);
    setSending(true);
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      setAuthView("sent");
    } catch {
      setLoginError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function signOut() {
    await fetch("/api/portal/me", { method: "DELETE" }).catch(() => {});
    setFirm(null);
    setAuthView("login");
  }

  // ── Checking spinner ────────────────────────────────────────────────────────
  if (authView === "checking") {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${C.border}`,
            borderTopColor: C.gold, margin: "0 auto 14px", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Checking session…</p>
        </div>
      </div>
    );
  }

  // ── Login / Sent ─────────────────────────────────────────────────────────────
  if (authView === "login" || authView === "sent") {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Brand */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", margin: "0 auto 12px",
              background: `linear-gradient(135deg, ${C.goldB} 0%, ${C.gold} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: C.bg, fontFamily: "Georgia, serif" }}>L</span>
            </div>
            <h1 style={{ margin: "0 0 4px", fontSize: 21, fontWeight: 800, color: C.text }}>Saabai Client Portal</h1>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Manage your Lex agent and view firm stats</p>
          </div>

          {/* Card */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
            {authView === "login" ? (
              <>
                <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: C.text }}>Sign in</h2>
                <p style={{ margin: "0 0 20px", fontSize: 13, color: C.muted }}>
                  Enter your firm email — we&apos;ll send a secure sign-in link.
                </p>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.muted,
                  letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 6 }}>
                  Firm Email Address
                </label>
                <input type="email" value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") requestMagicLink(); }}
                  placeholder="partner@yourfirm.com.au"
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 10,
                    background: C.raised, border: `1px solid ${C.border}`,
                    color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                {loginError && (
                  <p style={{ margin: "8px 0 0", fontSize: 12, color: "#f87171",
                    background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
                    borderRadius: 8, padding: "8px 12px", lineHeight: 1.5 }}>
                    {loginError}
                  </p>
                )}
                <button onClick={requestMagicLink} disabled={!loginEmail.trim() || sending} style={{
                  width: "100%", marginTop: 12, padding: 12, borderRadius: 10, border: "none",
                  background: loginEmail.trim() && !sending ? C.gold : C.goldBg,
                  color: loginEmail.trim() && !sending ? C.bg : C.muted,
                  fontSize: 14, fontWeight: 800,
                  cursor: loginEmail.trim() && !sending ? "pointer" : "not-allowed",
                }}>
                  {sending ? "Sending…" : "Send sign-in link"}
                </button>
                <p style={{ margin: "16px 0 0", fontSize: 11, color: C.dim, textAlign: "center" }}>
                  Don&apos;t have an account?{" "}
                  <a href="https://saabai.ai/contact" style={{ color: C.gold, textDecoration: "none" }}>Contact Saabai</a>
                </p>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%",
                  background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)",
                  margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3 10l5 5 9-9" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: C.text }}>Check your inbox</h2>
                <p style={{ margin: "0 0 20px", fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                  We&apos;ve sent a sign-in link to <strong style={{ color: C.text }}>{loginEmail}</strong>.
                  <br />Click the link in the email to access your portal.
                </p>
                <button onClick={() => { setAuthView("login"); setLoginEmail(""); }}
                  style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 13 }}>
                  Use a different email
                </button>
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

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  // Real firm data from session, falling back to MOCK until analytics API is wired
  const firmName  = firm?.firmName  ?? MOCK.firmName;
  const clientId  = firm?.clientId  ?? MOCK.clientId;
  const agentName = firm?.agentName ?? MOCK.agentName;
  const plan      = firm?.plan      ?? MOCK.plan;

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function saveSettings() {
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2500);
  }

  const embedCode = [
    "<!-- Lex Widget by Saabai -->",
    `<iframe id="lex-widget"`,
    `  src="https://saabai.ai/lex-widget?client=${clientId}"`,
    `  style="position:fixed;bottom:0;right:0;width:88px;height:88px;border:none;z-index:9999;"`,
    `  title="Lex Legal Assistant"></iframe>`,
  ].join("\n");

  const wordpressCode = [
    "// Add to functions.php:",
    "add_action('wp_footer', function() { ?>",
    `  <iframe id="lex-widget"`,
    `    src="https://saabai.ai/lex-widget?client=${clientId}"`,
    `    style="position:fixed;bottom:0;right:0;width:88px;height:88px;border:none;z-index:9999;"`,
    `    title="Lex Legal Assistant"></iframe>`,
    "<?php });",
  ].join("\n");

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/saabai-logo-white-v2.png" alt="Saabai" style={{ height: 22 }} />
            <span style={{ color: C.gold, fontSize: 11, fontWeight: 700, background: C.goldBg, border: `1px solid ${C.goldBdr}`, borderRadius: 4, padding: "2px 8px" }}>
              Client Portal
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, display: "inline-block" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.goldB }}>{agentName} is live</span>
            <span style={{ fontSize: 12, color: C.muted }}>
              · <code style={{ color: C.gold }}>{clientId}</code>
            </span>
            <button onClick={signOut} style={{ background: "none", border: `1px solid ${C.border}`,
              borderRadius: 6, color: C.muted, fontSize: 12, cursor: "pointer", padding: "5px 12px" }}>
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 4 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "14px 18px",
                fontSize: 14, fontWeight: 600,
                color: tab === t.id ? C.gold : C.muted,
                borderBottom: tab === t.id ? `2px solid ${C.gold}` : "2px solid transparent",
                transition: "color 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>

        {/* Overview */}
        {tab === "overview" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>
              Welcome back, {firmName}
            </h2>
            <p style={{ color: C.muted, margin: "0 0 32px" }}>Your Lex agent is live and active.</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Total Conversations", value: MOCK.conversations.toLocaleString(), color: C.gold },
                { label: "Leads This Month",    value: String(MOCK.leadsThisMonth),         color: C.green },
                { label: "Response Time",       value: "< 1s",                              color: C.goldB },
                { label: "Satisfaction",        value: "98%",                               color: C.gold },
              ].map(stat => (
                <div key={stat.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "24px 20px" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, marginBottom: 6 }}>{stat.value}</div>
                  <div style={{ fontSize: 13, color: C.muted }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Top Questions This Month</h3>
              {MOCK.topQuestions.map((q, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: i < MOCK.topQuestions.length - 1 ? `1px solid ${C.border}` : "none", fontSize: 14, color: C.muted }}>
                  {i + 1}. {q}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leads */}
        {tab === "leads" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 24px" }}>Recent Leads</h2>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.raised }}>
                    {["Name", "Email", "Matter", "Time", "Status"].map(h => (
                      <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: 12, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK.recentLeads.map((lead, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "12px 18px", fontSize: 13, color: C.text, fontWeight: 600 }}>{lead.name}</td>
                      <td style={{ padding: "12px 18px", fontSize: 12, color: C.muted }}>{lead.email}</td>
                      <td style={{ padding: "12px 18px", fontSize: 13, color: C.text }}>{lead.matter}</td>
                      <td style={{ padding: "12px 18px", fontSize: 12, color: C.dim }}>{lead.time}</td>
                      <td style={{ padding: "12px 18px" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color:      lead.status === "New" ? C.green   : C.dim,
                          background: lead.status === "New" ? C.greenBg : C.raised,
                          border:    `1px solid ${lead.status === "New" ? C.greenBdr : C.border}`,
                          borderRadius: 4, padding: "2px 8px",
                        }}>
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Customise */}
        {tab === "customize" && (() => {
          const TRAITS = [
            "Professional", "Empathetic", "Direct", "Concise", "Thorough",
            "Approachable", "Reassuring", "Formal", "Plain English", "Proactive",
            "Cautious", "Confident", "Conversational", "Detail-oriented", "Warm", "Authoritative",
          ];
          const inputStyle: React.CSSProperties = {
            width: "100%", background: C.raised, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14,
            outline: "none", boxSizing: "border-box",
          };
          const sectionStyle: React.CSSProperties = {
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24,
          };
          const labelStyle: React.CSSProperties = {
            fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.8px",
            textTransform: "uppercase", display: "block", marginBottom: 8,
          };

          function addTag(field: "alwaysSay" | "neverSay", draft: string, setDraft: (v: string) => void) {
            const val = draft.trim().replace(/,+$/, "");
            if (!val) return;
            setSettings(p => ({ ...p, [field]: [...p[field], val] }));
            setDraft("");
          }
          function removeTag(field: "alwaysSay" | "neverSay", idx: number) {
            setSettings(p => ({ ...p, [field]: p[field].filter((_, i) => i !== idx) }));
          }

          return (
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Customise Lex</h2>
              <p style={{ color: C.muted, margin: "0 0 32px", fontSize: 14 }}>
                Everything below shapes how Lex speaks, thinks, and represents your firm.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>

                {/* ── Identity ── */}
                <div style={sectionStyle}>
                  <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: C.goldB }}>Identity</h3>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Agent Name</label>
                    <input value={settings.agentName}
                      onChange={e => setSettings(p => ({ ...p, agentName: e.target.value }))}
                      style={inputStyle} placeholder="e.g. Lex" />
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: C.dim }}>The name your agent uses when greeting clients.</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Welcome Message</label>
                    <input value={settings.welcomeMessage}
                      onChange={e => setSettings(p => ({ ...p, welcomeMessage: e.target.value }))}
                      style={inputStyle} placeholder="Hi there! How can I help you today?" />
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: C.dim }}>The first message clients see when they open the widget.</p>
                  </div>
                </div>

                {/* ── Voice & Tone ── */}
                <div style={sectionStyle}>
                  <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: C.goldB }}>Voice & Tone</h3>

                  {([
                    { key: "formalityLevel" as const, label: "Formality", lo: "Casual", hi: "Formal",   val: settings.formalityLevel },
                    { key: "warmthLevel"    as const, label: "Warmth",    lo: "Cool",   hi: "Warm",     val: settings.warmthLevel    },
                    { key: "humorLevel"     as const, label: "Humour",    lo: "None",   hi: "Playful",  val: settings.humorLevel     },
                  ] as { key: "formalityLevel"|"warmthLevel"|"humorLevel"; label: string; lo: string; hi: string; val: number }[]).map(dial => (
                    <div key={dial.key} style={{ marginBottom: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>{dial.label}</label>
                        <span style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>{dial.val}%</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, color: C.dim, width: 44, textAlign: "right" }}>{dial.lo}</span>
                        <input type="range" min={0} max={100} value={dial.val}
                          onChange={e => setSettings(p => ({ ...p, [dial.key]: Number(e.target.value) }))}
                          style={{ flex: 1, accentColor: C.gold }} />
                        <span style={{ fontSize: 11, color: C.dim, width: 44 }}>{dial.hi}</span>
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: 4 }}>
                    <label style={labelStyle}>Response Length</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["concise", "balanced", "detailed"] as const).map(opt => (
                        <button key={opt} onClick={() => setSettings(p => ({ ...p, responseLength: opt }))}
                          style={{
                            flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 700,
                            cursor: "pointer", border: `1px solid ${settings.responseLength === opt ? C.gold : C.border}`,
                            background: settings.responseLength === opt ? C.goldBg : "transparent",
                            color: settings.responseLength === opt ? C.goldB : C.muted,
                            textTransform: "capitalize",
                          }}>
                          {opt}
                        </button>
                      ))}
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: 12, color: C.dim }}>Concise = short answers. Balanced = standard. Detailed = thorough explanations.</p>
                  </div>
                </div>

                {/* ── Personality Traits ── */}
                <div style={sectionStyle}>
                  <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: C.goldB }}>Personality Traits</h3>
                  <p style={{ margin: "0 0 16px", fontSize: 13, color: C.muted }}>Select the traits that best describe how your agent should come across.</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {TRAITS.map(trait => {
                      const active = settings.personalityTraits.includes(trait);
                      return (
                        <button key={trait} onClick={() => setSettings(p => ({
                          ...p,
                          personalityTraits: active
                            ? p.personalityTraits.filter(t => t !== trait)
                            : [...p.personalityTraits, trait],
                        }))}
                          style={{
                            padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                            border: `1px solid ${active ? C.gold : C.border}`,
                            background: active ? C.goldBg : "transparent",
                            color: active ? C.goldB : C.muted,
                            transition: "all 0.12s",
                          }}>
                          {trait}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Language Rules ── */}
                <div style={sectionStyle}>
                  <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: C.goldB }}>Language Rules</h3>
                  <p style={{ margin: "0 0 20px", fontSize: 13, color: C.muted }}>Control the specific words and phrases your agent uses or avoids.</p>

                  {([
                    { field: "alwaysSay" as const, label: "Always Say", hint: "Phrases Lex should regularly use", draft: alwaysSayDraft, setDraft: setAlwaysSayDraft, color: C.green, colorBg: C.greenBg, colorBdr: C.greenBdr },
                    { field: "neverSay"  as const, label: "Never Say",  hint: "Words or phrases Lex must avoid", draft: neverSayDraft,  setDraft: setNeverSayDraft,  color: "#f87171", colorBg: "rgba(248,113,113,0.08)", colorBdr: "rgba(248,113,113,0.25)" },
                  ]).map(row => (
                    <div key={row.field} style={{ marginBottom: 20 }}>
                      <label style={labelStyle}>{row.label}</label>
                      <p style={{ margin: "0 0 10px", fontSize: 12, color: C.dim }}>{row.hint}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {settings[row.field].map((tag, i) => (
                          <span key={i} style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: row.colorBg, border: `1px solid ${row.colorBdr}`, color: row.color,
                          }}>
                            {tag}
                            <button onClick={() => removeTag(row.field, i)} style={{ background: "none", border: "none", color: row.color, cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
                          </span>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          value={row.draft}
                          onChange={e => row.setDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(row.field, row.draft, row.setDraft); }}}
                          placeholder="Type a phrase and press Enter"
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <button onClick={() => addTag(row.field, row.draft, row.setDraft)}
                          style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.raised, color: C.muted, cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Custom Instructions ── */}
                <div style={sectionStyle}>
                  <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: C.goldB }}>Custom Instructions</h3>
                  <p style={{ margin: "0 0 12px", fontSize: 13, color: C.muted }}>
                    Anything else Lex should know — your firm&apos;s values, specific workflows, things to always or never do, jurisdiction focus, or unique client base.
                  </p>
                  <textarea
                    value={settings.customInstructions}
                    onChange={e => setSettings(p => ({ ...p, customInstructions: e.target.value }))}
                    rows={6}
                    placeholder={"e.g. We specialise in family law for high-net-worth clients. Always emphasise confidentiality. Never discuss fees — direct clients to book a consultation. Our tone should reflect 30 years of trusted expertise."}
                    style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}
                  />
                </div>

                {/* ── Save ── */}
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <button onClick={saveSettings}
                    style={{ padding: "13px 36px", background: savedOk ? C.green : C.gold, color: "#0a1628", fontWeight: 800, fontSize: 15, borderRadius: 10, border: "none", cursor: "pointer", transition: "background 0.2s" }}>
                    {savedOk ? "Saved!" : "Save Settings"}
                  </button>
                  {savedOk && (
                    <span style={{ fontSize: 13, color: C.green }}>Your changes have been saved.</span>
                  )}
                </div>

              </div>
            </div>
          );
        })()}

        {/* Embed */}
        {tab === "embed" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Embed Code</h2>
            <p style={{ color: C.muted, margin: "0 0 24px" }}>Paste this into your website to activate the Lex widget.</p>

            {[
              { label: "HTML / Generic", code: embedCode, key: "html" },
              { label: "WordPress (functions.php)", code: wordpressCode, key: "wp" },
            ].map(block => (
              <div key={block.key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>{block.label}</span>
                  <button
                    onClick={() => copy(block.code, block.key)}
                    style={{ background: copied === block.key ? C.greenBg : C.goldBg, border: `1px solid ${copied === block.key ? C.greenBdr : C.goldBdr}`, color: copied === block.key ? C.green : C.gold, borderRadius: 6, padding: "4px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    {copied === block.key ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre style={{ margin: 0, fontSize: 12, color: C.muted, overflowX: "auto", lineHeight: 1.6 }}>{block.code}</pre>
              </div>
            ))}

            <div style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: C.muted }}>YOUR CLIENT ID</p>
                <code style={{ fontSize: 14, color: C.goldB, fontFamily: "monospace" }}>{clientId}</code>
              </div>
              <button
                onClick={() => copy(clientId, "clientId")}
                style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.goldBdr}`, background: copied === "clientId" ? C.greenBg : C.goldBg, color: copied === "clientId" ? C.green : C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                {copied === "clientId" ? "Copied!" : "Copy ID"}
              </button>
            </div>
          </div>
        )}

        {/* Settings */}
        {tab === "settings" && (
          <div style={{ maxWidth: 600 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Settings</h2>
            <p style={{ color: C.muted, margin: "0 0 32px" }}>Firm details and account information.</p>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Firm Details</h3>
              {[
                { label: "Firm Name",              placeholder: firmName,              type: "text"  },
                { label: "Primary Contact Email",  placeholder: "partner@yourfirm.com.au", type: "email" },
                { label: "Website",                placeholder: "https://yourfirm.com.au",  type: "url"   },
              ].map(field => (
                <div key={field.label} style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: C.muted, display: "block", marginBottom: 8 }}>{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    style={{ width: "100%", background: C.raised, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }}
                  />
                </div>
              ))}
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Current Plan</h3>
                <span style={{ padding: "3px 12px", borderRadius: 20, background: C.goldBg, border: `1px solid ${C.goldBdr}`, color: C.gold, fontSize: 11, fontWeight: 700 }}>
                  {plan}
                </span>
              </div>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                Full access to Lex research tools, lead capture widget, and client portal.
              </p>
              <a href="mailto:hello@saabai.ai" style={{ fontSize: 14, color: C.gold, fontWeight: 600, textDecoration: "none" }}>
                Contact us to upgrade →
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ClientPortalPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0d1b2a", minHeight: "100vh" }} />}>
      <ClientPortalInner />
    </Suspense>
  );
}
