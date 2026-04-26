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

type Tab = "overview" | "leads" | "review-queue" | "customize" | "test" | "embed" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",     label: "Overview"      },
  { id: "leads",        label: "Leads"         },
  { id: "review-queue", label: "Review Queue"  },
  { id: "customize",    label: "Customise"     },
  { id: "test",         label: "Test Agent"    },
  { id: "embed",        label: "Embed Code"    },
  { id: "settings",     label: "Settings"      },
];

type AuthView = "checking" | "login" | "sent" | "dashboard";
type FirmSession = { email: string; firmName: string; clientId: string; agentName: string; plan: string };
type TestMsg = { role: "user" | "assistant"; content: string };

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
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt,   setSavedAt]   = useState<string | null>(null);
  const [settings, setSettings] = useState({
    agentName:          MOCK.agentName,
    agentIconUrl:       "",
    welcomeMessage:     "Hi there! I'm Lex, an AI legal assistant. How can I help you today?",
    formalityLevel:     75,
    warmthLevel:        60,
    humorLevel:         20,
    responseLength:     "balanced" as "concise" | "balanced" | "detailed",
    personalityTraits:  [] as string[],
    alwaysSay:          [] as string[],
    neverSay:           [] as string[],
    instructionLog:      [] as { text: string; ts: string }[],
    leadCaptureEnabled:  true,
    // Goals & Strategy
    primaryGoal:         "",
    successDefinition:   "",
    targetClient:        "",
    desiredOutcomes:     [] as string[],
    skillPacks:          [] as string[],
    // Style Coach
    writingPersona:    "",
    clientAddress:     "first-name" as "first-name" | "mr-ms" | "formal",
    contractions:      "sometimes" as "always" | "sometimes" | "never",
    sentenceLength:    "medium" as "short" | "medium" | "long",
    legalLatin:        "sometimes" as "never" | "sometimes" | "often",
    openingStyle:      "",
    badNewsStyle:      "",
    signOff:           "",
    writingSamples:    [] as { label: string; text: string }[],
    // The Lawyer Behind the Agent
    birthYear:            "",
    practiceFocus:        "",
    careerBackground:     "",
    educationBackground:  "",
    formativeInfluences:  "",
    legalPhilosophy:      "",
  });
  const [urlIngestDraft,   setUrlIngestDraft]   = useState("");
  const [urlIngestLoading, setUrlIngestLoading] = useState(false);
  const [pdfIngestLoading, setPdfIngestLoading] = useState(false);
  const [alwaysSayDraft,    setAlwaysSayDraft]    = useState("");
  const [neverSayDraft,     setNeverSayDraft]      = useState("");
  const [instructionDraft,  setInstructionDraft]   = useState("");
  const [outcomeDraft,      setOutcomeDraft]        = useState("");
  const [sampleLabelDraft,  setSampleLabelDraft]    = useState("");
  const [sampleTextDraft,   setSampleTextDraft]     = useState("");
  // LLM / API key settings state
  const [llmProvider,     setLlmProvider]     = useState("anthropic");
  const [llmModel,        setLlmModel]        = useState("claude-sonnet-4-6");
  const [llmApiKey,       setLlmApiKey]       = useState("");
  const [llmShowKey,      setLlmShowKey]      = useState(false);
  const [llmCurrentCfg,   setLlmCurrentCfg]   = useState<{ provider: string; model: string; keyHint: string } | null>(null);
  const [llmTestStatus,   setLlmTestStatus]   = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [llmTestMsg,      setLlmTestMsg]      = useState("");
  const [llmSaving,       setLlmSaving]       = useState(false);
  const [llmSaveMsg,      setLlmSaveMsg]      = useState("");
  // Test Agent tab state
  const [testMessages, setTestMessages] = useState<TestMsg[]>([]);
  const [testInput,    setTestInput]    = useState("");
  const [testLoading,  setTestLoading]  = useState(false);
  const [testError,    setTestError]    = useState<string | null>(null);
  // Review Queue tab state
  type StoredReview = {
    id: string; firmId: string; submittedBy: string; matterNo: string; clientName: string;
    documentName: string; submittedAt: number; reviewedAt?: number; reportJson: string;
    riskLevel: string; overallScore: number; documentType: string; direction: string;
    jurisdiction: string; status: "pending" | "approved" | "needs_changes";
    supervisorNotes: string; reviewedBy: string;
  };
  const [queue,        setQueue]        = useState<StoredReview[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError,   setQueueError]   = useState<string | null>(null);
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [signOffId,    setSignOffId]    = useState<string | null>(null);
  const [signOffNotes, setSignOffNotes] = useState("");
  const [signOffBy,    setSignOffBy]    = useState("");
  const [signOffLoading, setSignOffLoading] = useState(false);

  // Sync tab from URL param
  useEffect(() => {
    const t = searchParams.get("tab") as Tab | null;
    if (t && TABS.some(x => x.id === t)) setTab(t);
  }, [searchParams]);

  // Load LLM config when settings tab is opened
  useEffect(() => {
    if (tab !== "settings" || !firm?.clientId) return;
    fetch(`/api/lex-settings?clientId=${firm.clientId}`)
      .then(r => r.json())
      .then(data => {
        if (data.configured) {
          setLlmCurrentCfg({ provider: data.provider, model: data.model, keyHint: data.keyHint });
          setLlmProvider(data.provider);
          setLlmModel(data.model);
        }
      })
      .catch(() => {});
  }, [tab, firm?.clientId]);

  // Load review queue when that tab is active
  useEffect(() => {
    if (tab !== "review-queue") return;
    setQueueLoading(true);
    setQueueError(null);
    fetch("/api/lex-review-queue?firmId=lex-internal&limit=50")
      .then(r => r.json())
      .then(data => { setQueue(data.reviews ?? []); })
      .catch(() => setQueueError("Failed to load review queue."))
      .finally(() => setQueueLoading(false));
  }, [tab]);

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
          // Load saved settings from server
          fetch("/api/portal/settings", { credentials: "include" })
            .then(r => r.ok ? r.json() : null)
            .then(saved => {
              if (saved?.settings) {
                setSettings(prev => ({ ...prev, ...saved.settings }));
              }
            })
            .catch(() => {});
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

  async function testLlmConnection() {
    if (!llmApiKey.trim()) { setLlmTestMsg("Enter your API key first."); setLlmTestStatus("fail"); return; }
    setLlmTestStatus("testing"); setLlmTestMsg("");
    const res = await fetch("/api/lex-settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test", clientId, provider: llmProvider, model: llmModel, apiKey: llmApiKey }),
    }).then(r => r.json());
    setLlmTestStatus(res.ok ? "ok" : "fail");
    setLlmTestMsg(res.ok ? `Connected — model replied: "${res.response}"` : (res.error ?? "Connection failed"));
  }

  async function saveLlmConfig() {
    if (!llmApiKey.trim()) { setLlmSaveMsg("Enter your API key before saving."); return; }
    setLlmSaving(true); setLlmSaveMsg("");
    const res = await fetch("/api/lex-settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", clientId, provider: llmProvider, model: llmModel, apiKey: llmApiKey }),
    }).then(r => r.json());
    setLlmSaving(false);
    if (res.ok) {
      setLlmSaveMsg("Saved. Your Lex agent will use this model going forward.");
      setLlmCurrentCfg({ provider: llmProvider, model: llmModel, keyHint: `****${llmApiKey.slice(-4)}` });
      setLlmApiKey("");
      setLlmTestStatus("idle");
    } else {
      setLlmSaveMsg(`Error: ${res.error ?? "Unknown error"}`);
    }
  }

  async function saveSettings() {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/portal/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, firmName }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setSavedOk(true);
      setSavedAt(data.savedAt);
      setTimeout(() => setSavedOk(false), 4000);
    } catch {
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function sendTestMessage() {
    const text = testInput.trim();
    if (!text || testLoading) return;

    const newMessages: TestMsg[] = [...testMessages, { role: "user", content: text }];
    setTestMessages(newMessages);
    setTestInput("");
    setTestLoading(true);
    setTestError(null);

    try {
      const res = await fetch("/api/lex-chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          clientId,
        }),
      });

      if (!res.ok || !res.body) throw new Error("No response");

      // Stream SSE response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let started = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "text-delta" && parsed.delta) {
              assistantText += parsed.delta;
              if (!started) {
                started = true;
                setTestMessages(prev => [...prev, { role: "assistant", content: assistantText }]);
              } else {
                setTestMessages(prev => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: "assistant", content: assistantText };
                  return copy;
                });
              }
            }
          } catch { /* skip malformed lines */ }
        }
      }

      if (!started) throw new Error("Empty response");
    } catch {
      setTestError("Something went wrong. Please try again.");
      setTestMessages(prev => prev.filter(m => !(m.role === "assistant" && m.content === "")));
    } finally {
      setTestLoading(false);
    }
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
            <img src="/brand/saabai-logo-transparent.png" alt="Saabai" style={{ height: 22 }} />
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
                <a
                  key={i}
                  href={`/lex?q=${encodeURIComponent(q)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 0", borderBottom: i < MOCK.topQuestions.length - 1 ? `1px solid ${C.border}` : "none",
                    fontSize: 14, color: C.muted, textDecoration: "none", gap: 8,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                >
                  <span>{i + 1}. {q}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                    <path d="M2.5 9.5l7-7M4 2.5h5.5v5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </a>
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

        {/* ── Review Queue ─────────────────────────────────────────────────── */}
        {tab === "review-queue" && (
          <div style={{ padding: "28px 32px", maxWidth: 900 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>Doc Review Queue</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>Reviews submitted by lawyers for supervisor sign-off.</p>
              </div>
              <button onClick={() => {
                setQueueLoading(true);
                fetch("/api/lex-review-queue?firmId=lex-internal&limit=50")
                  .then(r => r.json()).then(d => setQueue(d.reviews ?? []))
                  .finally(() => setQueueLoading(false));
              }} style={{ padding: "8px 14px", borderRadius: 8, background: C.raised, border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, cursor: "pointer" }}>
                ↻ Refresh
              </button>
            </div>

            {queueLoading && <p style={{ color: C.muted, fontSize: 13 }}>Loading…</p>}
            {queueError  && <p style={{ color: "#f87171", fontSize: 13 }}>{queueError}</p>}
            {!queueLoading && queue.length === 0 && (
              <div style={{ padding: "48px 0", textAlign: "center" }}>
                <p style={{ fontSize: 28, marginBottom: 12 }}>📋</p>
                <p style={{ color: C.muted, fontSize: 14 }}>No reviews submitted yet.</p>
                <p style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>When a lawyer submits a Doc Review for sign-off, it will appear here.</p>
              </div>
            )}

            {queue.map(review => {
              const isExpanded = expandedId === review.id;
              const isSignOff  = signOffId === review.id;
              const statusColour = review.status === "approved" ? C.green : review.status === "needs_changes" ? "#f97316" : C.gold;
              const statusLabel  = review.status === "approved" ? "Approved" : review.status === "needs_changes" ? "Needs Changes" : "Pending";
              const riskColour   = review.riskLevel === "critical" ? "#ef4444" : review.riskLevel === "high" ? "#f97316" : review.riskLevel === "medium" ? "#eab308" : C.green;
              let report: Record<string, unknown> | null = null;
              try { report = JSON.parse(review.reportJson); } catch {}

              return (
                <div key={review.id} style={{ marginBottom: 12, borderRadius: 12, background: C.surface, border: `1px solid ${isExpanded ? C.border : C.border}`, overflow: "hidden" }}>
                  {/* Row header */}
                  <div onClick={() => setExpandedId(isExpanded ? null : review.id)}
                    style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", flexWrap: "wrap" }}>
                    {/* Risk badge */}
                    <div style={{ padding: "3px 10px", borderRadius: 20, background: `${riskColour}18`, border: `1px solid ${riskColour}40`, fontSize: 10, fontWeight: 700, color: riskColour, textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0 }}>
                      {review.riskLevel}
                    </div>
                    {/* Doc info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {review.documentName || review.documentType || "Document"}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>
                        {review.submittedBy && <span>{review.submittedBy}</span>}
                        {review.matterNo    && <span style={{ marginLeft: 8 }}>· Matter {review.matterNo}</span>}
                        {review.clientName  && <span style={{ marginLeft: 4 }}>· {review.clientName}</span>}
                        <span style={{ marginLeft: 8, color: C.dim }}>
                          {new Date(review.submittedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </p>
                    </div>
                    {/* Score */}
                    <div style={{ textAlign: "center", flexShrink: 0 }}>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: riskColour }}>{review.overallScore}</p>
                      <p style={{ margin: 0, fontSize: 9, color: C.dim, textTransform: "uppercase" }}>Score</p>
                    </div>
                    {/* Status badge */}
                    <div style={{ padding: "4px 10px", borderRadius: 20, background: `${statusColour}18`, border: `1px solid ${statusColour}40`, fontSize: 11, fontWeight: 700, color: statusColour, flexShrink: 0 }}>
                      {statusLabel}
                    </div>
                    <span style={{ color: C.dim, fontSize: 14 }}>{isExpanded ? "▲" : "▼"}</span>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: "20px 18px" }}>
                      {/* Summary */}
                      {report && (report.summary as string) && (
                        <div style={{ marginBottom: 16 }}>
                          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Lex Summary</p>
                          <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.6 }}>{report.summary as string}</p>
                        </div>
                      )}
                      {/* Key findings */}
                      {report && Array.isArray(report.findings) && (report.findings as unknown[]).length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Key Findings</p>
                          {(report.findings as {severity:string;title:string;issue:string}[]).slice(0, 4).map((f, i) => (
                            <div key={i} style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 6, background: C.raised, border: `1px solid ${C.border}`, display: "flex", gap: 10 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: f.severity === "critical" ? "#ef4444" : f.severity === "moderate" ? "#f97316" : C.muted, textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0, paddingTop: 1 }}>{f.severity}</span>
                              <div>
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.text }}>{f.title}</p>
                                <p style={{ margin: "3px 0 0", fontSize: 11, color: C.muted }}>{f.issue}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Existing supervisor notes */}
                      {review.supervisorNotes && (
                        <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 8, background: C.raised, border: `1px solid ${C.border}` }}>
                          <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Supervisor Notes</p>
                          <p style={{ margin: 0, fontSize: 13, color: C.text }}>{review.supervisorNotes}</p>
                          {review.reviewedBy && <p style={{ margin: "6px 0 0", fontSize: 11, color: C.dim }}>— {review.reviewedBy}</p>}
                        </div>
                      )}

                      {/* Sign-off form */}
                      {review.status === "pending" && (
                        isSignOff ? (
                          <div style={{ padding: "16px", borderRadius: 10, background: C.raised, border: `1px solid ${C.border}` }}>
                            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: C.text }}>Sign Off</p>
                            <input value={signOffBy} onChange={e => setSignOffBy(e.target.value)}
                              placeholder="Your name" style={{ width: "100%", marginBottom: 8, padding: "8px 12px", borderRadius: 7, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                            <textarea value={signOffNotes} onChange={e => setSignOffNotes(e.target.value)}
                              placeholder="Add notes for the lawyer (optional)" rows={3}
                              style={{ width: "100%", marginBottom: 12, padding: "8px 12px", borderRadius: 7, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
                            <div style={{ display: "flex", gap: 8 }}>
                              <button disabled={signOffLoading} onClick={async () => {
                                setSignOffLoading(true);
                                await fetch("/api/lex-review-queue", { method: "PATCH", headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: review.id, status: "approved", supervisorNotes: signOffNotes, reviewedBy: signOffBy }) });
                                setQueue(q => q.map(r => r.id === review.id ? { ...r, status: "approved", supervisorNotes: signOffNotes, reviewedBy: signOffBy } : r));
                                setSignOffId(null); setSignOffNotes(""); setSignOffBy(""); setSignOffLoading(false);
                              }} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: "rgba(34,197,94,0.15)", color: C.green, fontWeight: 700, fontSize: 12, cursor: signOffLoading ? "wait" : "pointer" }}>
                                {signOffLoading ? "Saving…" : "✓ Approve"}
                              </button>
                              <button disabled={signOffLoading} onClick={async () => {
                                setSignOffLoading(true);
                                await fetch("/api/lex-review-queue", { method: "PATCH", headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: review.id, status: "needs_changes", supervisorNotes: signOffNotes, reviewedBy: signOffBy }) });
                                setQueue(q => q.map(r => r.id === review.id ? { ...r, status: "needs_changes", supervisorNotes: signOffNotes, reviewedBy: signOffBy } : r));
                                setSignOffId(null); setSignOffNotes(""); setSignOffBy(""); setSignOffLoading(false);
                              }} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: "rgba(249,115,22,0.12)", color: "#f97316", fontWeight: 700, fontSize: 12, cursor: signOffLoading ? "wait" : "pointer" }}>
                                ↩ Request Changes
                              </button>
                              <button onClick={() => { setSignOffId(null); setSignOffNotes(""); }} style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "none", color: C.muted, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setSignOffId(review.id); setSignOffNotes(review.supervisorNotes || ""); }} style={{
                            padding: "9px 18px", borderRadius: 8, background: C.goldBg, border: `1px solid ${C.goldBdr}`, color: C.gold, fontWeight: 700, fontSize: 12, cursor: "pointer",
                          }}>Sign Off →</button>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28,
          };
          const labelStyle: React.CSSProperties = {
            fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.8px",
            textTransform: "uppercase", display: "block", marginBottom: 8,
          };
          let sectionCounter = 0;
          function SectionNumber() {
            sectionCounter += 1;
            const n = String(sectionCounter).padStart(2, "0");
            return (
              <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, letterSpacing: "0.1em", marginBottom: 4 }}>
                {n}
              </div>
            );
          }

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
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Agent Configuration</h2>
              <p style={{ color: C.muted, margin: "0 0 24px", fontSize: 14, lineHeight: 1.6 }}>
                Every setting here becomes a guiding principle for {agentName} — shaping how it thinks, speaks, and drives your firm&apos;s goals across every conversation.
              </p>

              {/* ── Configuration Health Score ── */}
              {(() => {
                const checks = [
                  { label: "Goals & Strategy", done: !!(settings.primaryGoal.trim() && settings.desiredOutcomes.length > 0), pts: 25 },
                  { label: "Identity",          done: settings.agentName !== MOCK.agentName || settings.welcomeMessage !== "Hi there! I'm Lex, an AI legal assistant. How can I help you today?", pts: 10 },
                  { label: "Voice & Tone",      done: settings.personalityTraits.length > 0 || settings.responseLength !== "balanced", pts: 15 },
                  { label: "Personality",       done: settings.personalityTraits.length >= 3, pts: 15 },
                  { label: "Language Rules",    done: settings.alwaysSay.length > 0 || settings.neverSay.length > 0, pts: 15 },
                  { label: "Skill Packs",       done: settings.skillPacks.length > 0, pts: 10 },
                  { label: "Instructions",      done: settings.instructionLog.length > 0, pts: 10 },
                ];
                const score = checks.reduce((acc, c) => acc + (c.done ? c.pts : 0), 0);
                const complete = checks.filter(c => c.done).length;
                const scoreColor = score >= 80 ? C.green : score >= 50 ? C.gold : "#f87171";
                return (
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 2 }}>Agent Readiness</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: scoreColor }}>{score}<span style={{ fontSize: 16, fontWeight: 600 }}>%</span></div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, color: C.dim }}>{complete} of {checks.length} sections complete</div>
                        {score < 80 && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>Fully configured agents get 3× more qualified leads</div>}
                        {score >= 80 && <div style={{ fontSize: 11, color: C.green, marginTop: 2 }}>Your agent is well-configured — great work</div>}
                      </div>
                    </div>
                    <div style={{ background: C.raised, borderRadius: 99, height: 6, marginBottom: 14, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}cc)`, width: `${score}%`, transition: "width 0.4s ease" }} />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
                      {checks.map(c => (
                        <span key={c.label} style={{ fontSize: 12, color: c.done ? C.green : C.dim, display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ fontSize: 10 }}>{c.done ? "●" : "○"}</span>{c.label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 720 }}>

                {/* ── The Lawyer Behind the Agent ── */}
                <div style={{ ...sectionStyle, background: "#0a1628", borderColor: C.border, borderLeft: `4px solid ${C.gold}` }}>
                  <SectionNumber />
                  <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: C.text, paddingLeft: 12, borderLeft: `3px solid ${C.gold}` }}>The Lawyer Behind the Agent</h3>
                  <p style={{ margin: "0 0 24px", fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
                    The more Lex understands who you are — not just how you write, but how you think — the more precisely it can represent you. This section is the deepest form of cloning available.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                    <div>
                      <label style={labelStyle}>Birth Year</label>
                      <p style={{ margin: "0 0 8px", fontSize: 14, color: C.dim, lineHeight: 1.7 }}>
                        Used to understand your formative era — the ideas, events, and cultural context that shaped how you think about law and life.
                      </p>
                      <input
                        value={settings.birthYear}
                        onChange={e => setSettings(p => ({ ...p, birthYear: e.target.value }))}
                        placeholder="e.g. 1968"
                        style={{ ...inputStyle, maxWidth: 160 }}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Practice Focus & Specialties</label>
                      <textarea
                        value={settings.practiceFocus}
                        onChange={e => setSettings(p => ({ ...p, practiceFocus: e.target.value }))}
                        rows={3}
                        placeholder="e.g. Tax and trust law, 28 years. Specialist in ATO disputes, family trust structuring, and business succession. Former ATO officer."
                        style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui, sans-serif", lineHeight: 1.7 }}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Career Background</label>
                      <textarea
                        value={settings.careerBackground}
                        onChange={e => setSettings(p => ({ ...p, careerBackground: e.target.value }))}
                        rows={3}
                        placeholder="e.g. Admitted 1994, NSW Bar 2001. 12 years at Clayton Utz, then founded own practice. Former ATO officer 1990-1994."
                        style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui, sans-serif", lineHeight: 1.7 }}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Education</label>
                      <textarea
                        value={settings.educationBackground}
                        onChange={e => setSettings(p => ({ ...p, educationBackground: e.target.value }))}
                        rows={3}
                        placeholder="e.g. LLB (Hons) UNSW 1993. Commerce degree UQ. Attended Sydney Grammar School. Also studied philosophy, which heavily influences my approach to legal reasoning."
                        style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui, sans-serif", lineHeight: 1.7 }}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Formative Influences</label>
                      <p style={{ margin: "0 0 8px", fontSize: 14, color: C.dim, lineHeight: 1.7 }}>Books, mentors, cases, and ideas that shaped how you think.</p>
                      <textarea
                        value={settings.formativeInfluences}
                        onChange={e => setSettings(p => ({ ...p, formativeInfluences: e.target.value }))}
                        rows={4}
                        placeholder="e.g. Books: The Art of Advocacy (Morley Safer), Thinking Fast and Slow (Kahneman), Letters to a Young Lawyer (Dershowitz). Mentors: Sir Garfield Barwick's written judgments. Cases that shaped me: FCT v Spotless Services."
                        style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui, sans-serif", lineHeight: 1.7 }}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Legal Philosophy & Worldview</label>
                      <textarea
                        value={settings.legalPhilosophy}
                        onChange={e => setSettings(p => ({ ...p, legalPhilosophy: e.target.value }))}
                        rows={4}
                        placeholder="e.g. I believe the law is a tool for clarity, not a weapon. Plain English is more powerful than jargon. The best advice is the one the client can actually act on."
                        style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui, sans-serif", lineHeight: 1.7 }}
                      />
                    </div>

                  </div>
                </div>

                {/* ── Goals & Strategy ── */}
                <div style={{ ...sectionStyle, borderColor: C.goldBdr, background: `linear-gradient(135deg, ${C.surface} 0%, rgba(201,168,76,0.04) 100%)` }}>
                  <SectionNumber />
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>🎯</span>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.goldB, paddingLeft: 12, borderLeft: `3px solid ${C.gold}` }}>Goals & Strategy</h3>
                  </div>
                  <p style={{ margin: "0 0 20px", fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
                    Define what success looks like for your firm. {agentName} will use these goals to actively steer every conversation toward your desired outcomes — not just answer questions, but drive results.
                  </p>

                  {/* Goal templates */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 10 }}>Quick Start Templates</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {([
                        { icon: "🎯", label: "Lead Conversion", goal: "Convert every website enquiry into a booked consultation. Target 40% of widget conversations becoming qualified leads who book a free 15-minute call.", success: "The client feels heard, understands their legal position, and books a consultation. They leave the conversation with clear next steps and confidence in the firm.", client: "People actively searching for legal help — typically stressed, time-poor, and uncertain about their situation. They need clarity and a trusted professional to guide them.", outcomes: ["Book a free consultation", "Capture contact details (name, email, phone)", "Qualify the matter type and urgency"] },
                        { icon: "🤝", label: "Trust & Education", goal: "Position the firm as the most trusted and knowledgeable legal resource in our practice areas. Build long-term relationships by genuinely helping people understand their options before asking for anything.", success: "The client feels genuinely informed and grateful. They see the firm as the expert they want to work with. They either book a consultation or come back when they're ready.", client: "People in the research phase — they have a legal concern but aren't sure if they need a lawyer yet. They need clear, jargon-free information before they'll trust anyone enough to engage.", outcomes: ["Educate the client clearly on their options", "Build trust and demonstrate expertise", "Capture details when the client is ready"] },
                        { icon: "👑", label: "Premium Acquisition", goal: "Attract and convert high-value clients who have complex, multi-faceted matters. Every interaction should communicate exceptional expertise and justify a premium fee structure.", success: "The prospect feels they've already received more value in this conversation than from other firms. They're eager to engage and have no hesitation about fees because the quality is self-evident.", client: "High-net-worth individuals and business owners with significant legal matters. They've likely worked with lawyers before and know the difference between average and exceptional. They value results over cost.", outcomes: ["Book a senior partner consultation", "Qualify the matter complexity and budget", "Convey firm expertise and track record"] },
                        { icon: "⏰", label: "After-Hours Intake", goal: "Capture every after-hours enquiry so no lead goes cold overnight. Ensure prospective clients feel supported 24/7 and are automatically queued for follow-up the next business day.", success: "The client feels they've been heard even outside business hours. Their details are captured, their matter is understood, and they receive a response first thing the next morning.", client: "People who need legal help urgently but contact the firm outside office hours. They're often stressed or facing a deadline and need immediate reassurance that someone will help them.", outcomes: ["Capture full contact details and matter description", "Set clear expectations on response time", "Triage urgency level for next-day follow-up"] },
                      ] as { icon: string; label: string; goal: string; success: string; client: string; outcomes: string[] }[]).map(tpl => (
                        <button key={tpl.label} onClick={() => setSettings(p => ({
                          ...p,
                          primaryGoal: tpl.goal,
                          successDefinition: tpl.success,
                          targetClient: tpl.client,
                          desiredOutcomes: tpl.outcomes,
                        }))}
                          style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.raised, cursor: "pointer", transition: "border-color 0.15s" }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = C.gold)}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
                          <div style={{ fontSize: 18, marginBottom: 4 }}>{tpl.icon}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{tpl.label}</div>
                          <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>Click to pre-fill</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Primary Business Goal</label>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: C.dim }}>What is the single most important thing you want Lex to achieve for your business?</p>
                    <textarea
                      value={settings.primaryGoal}
                      onChange={e => setSettings(p => ({ ...p, primaryGoal: e.target.value }))}
                      rows={3}
                      placeholder="e.g. Convert every website enquiry into a booked consultation. Our goal is to turn 40% of widget conversations into qualified leads who book a free 15-minute call."
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>What does a successful conversation look like?</label>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: C.dim }}>Describe the ideal outcome — how should the client feel, and what action should they take?</p>
                    <textarea
                      value={settings.successDefinition}
                      onChange={e => setSettings(p => ({ ...p, successDefinition: e.target.value }))}
                      rows={3}
                      placeholder="e.g. The client feels genuinely heard and reassured. They understand their options and are confident in taking the next step. They have either booked a consultation or left their contact details."
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Your Ideal Client</label>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: C.dim }}>Who are you trying to attract and serve? The more specific, the better {agentName} can qualify and connect with the right people.</p>
                    <textarea
                      value={settings.targetClient}
                      onChange={e => setSettings(p => ({ ...p, targetClient: e.target.value }))}
                      rows={3}
                      placeholder="e.g. Small business owners (10–50 staff) facing employment disputes or contract issues. They are time-poor, cost-conscious, and need fast, clear guidance without legal jargon."
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Desired Outcomes (in priority order)</label>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: C.dim }}>What actions should {agentName} guide every conversation toward? Add them in order of priority — {agentName} will aim for #1 first, then #2, and so on.</p>
                    {settings.desiredOutcomes.length > 0 && (
                      <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                        {settings.desiredOutcomes.map((outcome, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: C.raised, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px" }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: C.gold, minWidth: 20 }}>#{i + 1}</span>
                            <span style={{ flex: 1, fontSize: 13, color: C.text }}>{outcome}</span>
                            <div style={{ display: "flex", gap: 4 }}>
                              {i > 0 && (
                                <button onClick={() => setSettings(p => {
                                  const arr = [...p.desiredOutcomes];
                                  [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                                  return { ...p, desiredOutcomes: arr };
                                })} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 14, padding: "0 4px" }} title="Move up">↑</button>
                              )}
                              {i < settings.desiredOutcomes.length - 1 && (
                                <button onClick={() => setSettings(p => {
                                  const arr = [...p.desiredOutcomes];
                                  [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                                  return { ...p, desiredOutcomes: arr };
                                })} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 14, padding: "0 4px" }} title="Move down">↓</button>
                              )}
                              <button onClick={() => setSettings(p => ({ ...p, desiredOutcomes: p.desiredOutcomes.filter((_, j) => j !== i) }))}
                                style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1 }}>×</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        value={outcomeDraft}
                        onChange={e => setOutcomeDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = outcomeDraft.trim();
                            if (!val) return;
                            setSettings(p => ({ ...p, desiredOutcomes: [...p.desiredOutcomes, val] }));
                            setOutcomeDraft("");
                          }
                        }}
                        placeholder="e.g. Book a free consultation · Capture contact details · Qualify the matter type"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button onClick={() => {
                        const val = outcomeDraft.trim();
                        if (!val) return;
                        setSettings(p => ({ ...p, desiredOutcomes: [...p.desiredOutcomes, val] }));
                        setOutcomeDraft("");
                      }} style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.raised, color: C.muted, cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Identity ── */}
                <div style={sectionStyle}>
                  <SectionNumber />
                  <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: C.goldB, paddingLeft: 12, borderLeft: `3px solid ${C.gold}` }}>Identity</h3>

                  {/* Widget Icon */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>Widget Icon</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                      {/* Preview */}
                      <div style={{
                        width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
                        background: settings.agentIconUrl ? "transparent" : `linear-gradient(135deg, #E0BC6A 0%, #C9A84C 100%)`,
                        border: `2px solid ${C.goldBdr}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        overflow: "hidden", position: "relative",
                      }}>
                        {settings.agentIconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={settings.agentIconUrl} alt="Agent icon"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 26, fontWeight: 900, color: "#0a1628", fontFamily: "Georgia, serif" }}>
                            {settings.agentName?.[0] ?? "L"}
                          </span>
                        )}
                      </div>
                      {/* Upload controls */}
                      <div style={{ flex: 1 }}>
                        <label htmlFor="agent-icon-upload" style={{
                          display: "inline-block", padding: "8px 16px",
                          background: C.raised, border: `1px solid ${C.border}`,
                          borderRadius: 8, fontSize: 13, fontWeight: 600,
                          color: C.muted, cursor: "pointer",
                          transition: "border-color 0.15s",
                        }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = C.gold)}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
                        >
                          {settings.agentIconUrl ? "Change image" : "Upload image"}
                        </label>
                        <input
                          id="agent-icon-upload"
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          style={{ display: "none" }}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = ev => {
                              const result = ev.target?.result;
                              if (typeof result === "string") {
                                setSettings(p => ({ ...p, agentIconUrl: result }));
                              }
                            };
                            reader.readAsDataURL(file);
                            // Reset input so same file can be re-selected
                            e.target.value = "";
                          }}
                        />
                        {settings.agentIconUrl && (
                          <button onClick={() => setSettings(p => ({ ...p, agentIconUrl: "" }))} style={{
                            marginLeft: 8, padding: "8px 14px", background: "none",
                            border: `1px solid ${C.border}`, borderRadius: 8,
                            fontSize: 13, color: C.dim, cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "#f87171"; e.currentTarget.style.color = "#f87171"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}
                          >
                            Remove
                          </button>
                        )}
                        <p style={{ margin: "8px 0 0", fontSize: 12, color: C.dim }}>
                          PNG, JPG, WebP or SVG · Recommended 128×128px or larger
                        </p>
                      </div>
                    </div>
                  </div>

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
                  <SectionNumber />
                  <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: C.goldB, paddingLeft: 12, borderLeft: `3px solid ${C.gold}` }}>Voice & Tone</h3>

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
                    <label style={labelStyle}>Default Response Length</label>
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: C.dim }}>Your preferred default. Individual documents in Lex can override this per job.</p>
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

                {/* ── Skill Packs ── */}
                <div style={sectionStyle}>
                  <SectionNumber />
                  <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: C.goldB, paddingLeft: 12, borderLeft: `3px solid ${C.gold}` }}>Skill Packs</h3>
                  <p style={{ margin: "0 0 16px", fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
                    Give {agentName} specialised capabilities beyond standard legal assistance. Each pack adds a set of proven behavioural frameworks — select what fits your goals.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                    {([
                      { id: "sales-conversion",   icon: "💼", name: "Sales Conversion",     desc: "Guides conversations toward bookings using proven conversion psychology" },
                      { id: "objection-handling",  icon: "🛡️", name: "Objection Handling",   desc: "Expertly addresses hesitations: cost, urgency, trust, and \"I'll think about it\"" },
                      { id: "rapport-building",    icon: "🤝", name: "Rapport Building",      desc: "Builds genuine connection fast — clients feel understood before they feel sold to" },
                      { id: "appointment-setting", icon: "📅", name: "Appointment Setting",   desc: "Optimised scripts and framing to maximise consultation bookings" },
                      { id: "lead-qualification",  icon: "🎯", name: "Lead Qualification",    desc: "Expertly qualifies matter type, urgency, and client fit before handing off" },
                      { id: "active-listening",    icon: "👂", name: "Active Listening",      desc: "Demonstrates genuine understanding before offering solutions — builds deep trust" },
                      { id: "urgency-framing",     icon: "⚡", name: "Urgency Framing",       desc: "Ethically communicates the value and importance of acting sooner rather than later" },
                      { id: "premium-positioning", icon: "👑", name: "Premium Positioning",   desc: "Confidently communicates the firm's expertise, value, and premium positioning" },
                    ] as { id: string; icon: string; name: string; desc: string }[]).map(pack => {
                      const active = settings.skillPacks.includes(pack.id);
                      return (
                        <button key={pack.id} onClick={() => setSettings(p => ({
                          ...p,
                          skillPacks: active ? p.skillPacks.filter(s => s !== pack.id) : [...p.skillPacks, pack.id],
                        }))}
                          style={{
                            textAlign: "left", padding: "14px 14px", borderRadius: 10, cursor: "pointer",
                            border: `1px solid ${active ? C.gold : C.border}`,
                            background: active ? C.goldBg : "transparent",
                            transition: "all 0.12s",
                          }}>
                          <div style={{ fontSize: 20, marginBottom: 6 }}>{pack.icon}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: active ? C.goldB : C.text, marginBottom: 4 }}>{pack.name}</div>
                          <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>{pack.desc}</div>
                          {active && <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: C.gold }}>✓ Active</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Personality Traits ── */}
                <div style={sectionStyle}>
                  <SectionNumber />
                  <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: C.goldB, paddingLeft: 12, borderLeft: `3px solid ${C.gold}` }}>Personality Traits</h3>
                  <p style={{ margin: "0 0 16px", fontSize: 14, color: C.muted, lineHeight: 1.7 }}>Select the traits that best describe how your agent should come across.</p>
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
                  <SectionNumber />
                  <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: C.goldB, paddingLeft: 12, borderLeft: `3px solid ${C.gold}` }}>Language Rules</h3>
                  <p style={{ margin: "0 0 20px", fontSize: 14, color: C.muted, lineHeight: 1.7 }}>Control the specific words and phrases your agent uses or avoids.</p>

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

                {/* ── Style Coach ── */}
                <div style={sectionStyle}>
                  <SectionNumber />
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
                    <span style={{ fontSize: 20, marginTop: 1 }}>✍️</span>
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: C.goldB, paddingLeft: 12, borderLeft: `3px solid ${C.gold}` }}>Style Coach</h3>
                      <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
                        Teach {agentName} to write exactly like you do. Senior lawyers have spent decades developing their voice — this is where you transfer that to your agent. The more precise you are, the more precisely {agentName} will replicate it.
                      </p>
                    </div>
                  </div>

                  <div style={{ height: 1, background: C.border, margin: "16px 0" }} />

                  {/* Writing persona */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>Your Writing Persona</label>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: C.dim }}>
                      In your own words — what makes your writing style distinctive? What do you always do? What do you never do? How do you want clients to feel when they read your words?
                    </p>
                    <textarea
                      value={settings.writingPersona}
                      onChange={e => setSettings(p => ({ ...p, writingPersona: e.target.value }))}
                      rows={5}
                      placeholder={"e.g. I'm a senior tax partner with 28 years of practice. I lead with the answer — never bury the conclusion. I write in plain English unless a term of art is genuinely necessary. I never begin with 'I hope this finds you well.' I use short sentences. I don't hedge unless I need to. When delivering bad news, I'm direct but I always include a path forward. My sign-off is always 'Kind regards' — never 'Best wishes'."}
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}
                    />
                  </div>

                  {/* Style attributes */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ ...labelStyle, marginBottom: 16 }}>Style Attributes</label>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                      {/* Client address */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>How do you address clients?</div>
                        {([
                          { val: "first-name", label: "First name", eg: "\"Hi James\"" },
                          { val: "mr-ms",      label: "Mr / Ms Surname", eg: "\"Dear Mr Thompson\"" },
                          { val: "formal",     label: "Full formal", eg: "\"Dear Mr James Thompson\"" },
                        ] as { val: "first-name"|"mr-ms"|"formal"; label: string; eg: string }[]).map(opt => (
                          <label key={opt.val} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }}>
                            <input type="radio" name="clientAddress" checked={settings.clientAddress === opt.val}
                              onChange={() => setSettings(p => ({ ...p, clientAddress: opt.val }))}
                              style={{ accentColor: C.gold }} />
                            <span style={{ fontSize: 13, color: C.text }}>{opt.label}</span>
                            <span style={{ fontSize: 11, color: C.dim }}>{opt.eg}</span>
                          </label>
                        ))}
                      </div>

                      {/* Contractions */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Contractions (don't, can't, it's)</div>
                        {([
                          { val: "never",     label: "Never", eg: "always \"do not\", \"cannot\"" },
                          { val: "sometimes", label: "Sometimes", eg: "depends on context" },
                          { val: "always",    label: "Always", eg: "conversational tone" },
                        ] as { val: "always"|"sometimes"|"never"; label: string; eg: string }[]).map(opt => (
                          <label key={opt.val} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }}>
                            <input type="radio" name="contractions" checked={settings.contractions === opt.val}
                              onChange={() => setSettings(p => ({ ...p, contractions: opt.val }))}
                              style={{ accentColor: C.gold }} />
                            <span style={{ fontSize: 13, color: C.text }}>{opt.label}</span>
                            <span style={{ fontSize: 11, color: C.dim }}>{opt.eg}</span>
                          </label>
                        ))}
                      </div>

                      {/* Sentence length */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Sentence length preference</div>
                        {([
                          { val: "short",  label: "Short & punchy", eg: "clear, direct, minimal" },
                          { val: "medium", label: "Balanced", eg: "standard professional length" },
                          { val: "long",   label: "Long & detailed", eg: "thorough, layered reasoning" },
                        ] as { val: "short"|"medium"|"long"; label: string; eg: string }[]).map(opt => (
                          <label key={opt.val} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }}>
                            <input type="radio" name="sentenceLength" checked={settings.sentenceLength === opt.val}
                              onChange={() => setSettings(p => ({ ...p, sentenceLength: opt.val }))}
                              style={{ accentColor: C.gold }} />
                            <span style={{ fontSize: 13, color: C.text }}>{opt.label}</span>
                            <span style={{ fontSize: 11, color: C.dim }}>{opt.eg}</span>
                          </label>
                        ))}
                      </div>

                      {/* Legal Latin */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Legal Latin (inter alia, prima facie, etc.)</div>
                        {([
                          { val: "never",     label: "Never", eg: "plain English always" },
                          { val: "sometimes", label: "When precise", eg: "only when genuinely necessary" },
                          { val: "often",     label: "Freely", eg: "part of professional register" },
                        ] as { val: "never"|"sometimes"|"often"; label: string; eg: string }[]).map(opt => (
                          <label key={opt.val} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }}>
                            <input type="radio" name="legalLatin" checked={settings.legalLatin === opt.val}
                              onChange={() => setSettings(p => ({ ...p, legalLatin: opt.val }))}
                              style={{ accentColor: C.gold }} />
                            <span style={{ fontSize: 13, color: C.text }}>{opt.label}</span>
                            <span style={{ fontSize: 11, color: C.dim }}>{opt.eg}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Freetext style questions */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
                      {([
                        { key: "openingStyle" as const, label: "How do you open a letter or email of advice?", placeholder: "e.g. \"Thank you for your instructions. The question is whether...\" or \"I refer to our meeting of [date]. My advice is as follows.\"" },
                        { key: "badNewsStyle" as const, label: "How do you deliver bad news or an unfavourable opinion?", placeholder: "e.g. \"I need to be direct with you — the position is not as strong as you had hoped. That said, there are steps we can take to...\"" },
                        { key: "signOff" as const, label: "Your standard sign-off / closing phrase", placeholder: "e.g. \"Please do not hesitate to contact me should you have any questions.\" then \"Kind regards\"" },
                      ]).map(field => (
                        <div key={field.key}>
                          <label style={labelStyle}>{field.label}</label>
                          <textarea
                            value={settings[field.key]}
                            onChange={e => setSettings(p => ({ ...p, [field.key]: e.target.value }))}
                            rows={2}
                            placeholder={field.placeholder}
                            style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Writing samples */}
                  <div>
                    <label style={labelStyle}>Writing Samples</label>
                    <p style={{ margin: "0 0 12px", fontSize: 14, color: C.dim, lineHeight: 1.7 }}>
                      Paste up to 6 real excerpts from your own writing — emails, letters of advice, or client communications. {agentName} will study these closely and mirror your exact phrasing, rhythm, and structure.
                    </p>

                    {settings.writingSamples.length > 0 && (
                      <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                        {settings.writingSamples.map((sample, i) => (
                          <div key={i} style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: C.goldB }}>
                                Sample {i + 1}{sample.label ? ` — ${sample.label}` : ""}
                              </span>
                              <button onClick={() => setSettings(p => ({ ...p, writingSamples: p.writingSamples.filter((_, j) => j !== i) }))}
                                style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px" }}>×</button>
                            </div>
                            <p style={{ margin: 0, padding: "12px 14px", fontSize: 12, color: C.muted, lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 120, overflowY: "auto" }}>{sample.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {settings.writingSamples.length < 6 && (
                      <div style={{ background: C.raised, border: `1px dashed ${C.border}`, borderRadius: 10, padding: 16 }}>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ ...labelStyle, marginBottom: 4 }}>Sample label (optional)</label>
                          <input
                            value={sampleLabelDraft}
                            onChange={e => setSampleLabelDraft(e.target.value)}
                            placeholder="e.g. Letter of advice — CGT on property sale"
                            style={{ ...inputStyle }}
                          />
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ ...labelStyle, marginBottom: 4 }}>Paste your writing here</label>
                          <textarea
                            value={sampleTextDraft}
                            onChange={e => setSampleTextDraft(e.target.value)}
                            rows={6}
                            placeholder="Paste an excerpt from one of your actual letters, emails, or advice documents..."
                            style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui, sans-serif", lineHeight: 1.7 }}
                          />
                        </div>
                        <button
                          onClick={() => {
                            const text = sampleTextDraft.trim();
                            if (!text) return;
                            setSettings(p => ({ ...p, writingSamples: [...p.writingSamples, { label: sampleLabelDraft.trim(), text }] }));
                            setSampleLabelDraft("");
                            setSampleTextDraft("");
                          }}
                          style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${C.goldBdr}`, background: C.goldBg, color: C.goldB, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                          + Add Writing Sample {settings.writingSamples.length > 0 ? `(${settings.writingSamples.length}/6)` : ""}
                        </button>
                      </div>
                    )}
                    {settings.writingSamples.length >= 6 && (
                      <p style={{ margin: 0, fontSize: 12, color: C.dim }}>Maximum 6 samples added. Remove one to add another.</p>
                    )}

                    {/* Import from Documents */}
                    {settings.writingSamples.length < 6 && (
                      <div style={{ marginTop: 20 }}>
                        <div style={{ height: 1, background: C.border, marginBottom: 16 }} />
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>
                          Import from Documents
                        </div>

                        {/* Import from URL */}
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ ...labelStyle, marginBottom: 4 }}>Import from URL</label>
                          <p style={{ margin: "0 0 8px", fontSize: 12, color: C.dim }}>
                            Enter a URL to a web page containing your writing — an article, blog post, or published piece. We will extract the text and pre-fill a new sample.
                          </p>
                          <div style={{ display: "flex", gap: 8 }}>
                            <input
                              value={urlIngestDraft}
                              onChange={e => setUrlIngestDraft(e.target.value)}
                              placeholder="https://..."
                              style={{ ...inputStyle, flex: 1 }}
                              disabled={urlIngestLoading}
                            />
                            <button
                              disabled={urlIngestLoading || !urlIngestDraft.trim()}
                              onClick={async () => {
                                const url = urlIngestDraft.trim();
                                if (!url) return;
                                setUrlIngestLoading(true);
                                try {
                                  const res = await fetch("/api/portal/ingest-url", {
                                    method: "POST",
                                    credentials: "include",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ url }),
                                  });
                                  const data = await res.json();
                                  if (!res.ok) throw new Error(data.error ?? "Failed");
                                  setSampleTextDraft(data.text ?? "");
                                  setUrlIngestDraft("");
                                } catch (err) {
                                  alert(`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`);
                                } finally {
                                  setUrlIngestLoading(false);
                                }
                              }}
                              style={{
                                padding: "10px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                                background: urlIngestLoading || !urlIngestDraft.trim() ? C.raised : C.goldBg,
                                color: urlIngestLoading || !urlIngestDraft.trim() ? C.dim : C.goldB,
                                cursor: urlIngestLoading || !urlIngestDraft.trim() ? "not-allowed" : "pointer",
                                fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                                display: "flex", alignItems: "center", gap: 6,
                              }}>
                              {urlIngestLoading && (
                                <span style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${C.goldBdr}`, borderTopColor: C.gold, display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                              )}
                              {urlIngestLoading ? "Fetching…" : "Fetch & Import"}
                            </button>
                          </div>
                        </div>

                        {/* Import from PDF */}
                        <div>
                          <label style={{ ...labelStyle, marginBottom: 4 }}>Import from PDF</label>
                          <p style={{ margin: "0 0 8px", fontSize: 12, color: C.dim }}>
                            Upload a PDF document — a letter, opinion, or advice memo. Claude will extract the most style-revealing writing from it.
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <label style={{
                              display: "inline-flex", alignItems: "center", gap: 8,
                              padding: "10px 16px", borderRadius: 8,
                              border: `1px solid ${pdfIngestLoading ? C.border : C.goldBdr}`,
                              background: pdfIngestLoading ? C.raised : C.goldBg,
                              color: pdfIngestLoading ? C.dim : C.goldB,
                              cursor: pdfIngestLoading ? "not-allowed" : "pointer",
                              fontSize: 13, fontWeight: 700,
                            }}>
                              {pdfIngestLoading && (
                                <span style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${C.goldBdr}`, borderTopColor: C.gold, display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                              )}
                              {pdfIngestLoading ? "Extracting…" : "Choose PDF"}
                              <input
                                type="file"
                                accept="application/pdf"
                                style={{ display: "none" }}
                                disabled={pdfIngestLoading}
                                onChange={async e => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  e.target.value = "";
                                  setPdfIngestLoading(true);
                                  try {
                                    const arrayBuffer = await file.arrayBuffer();
                                    const bytes = new Uint8Array(arrayBuffer);
                                    let binary = "";
                                    for (let i = 0; i < bytes.byteLength; i++) {
                                      binary += String.fromCharCode(bytes[i]);
                                    }
                                    const base64 = btoa(binary);
                                    const res = await fetch("/api/portal/ingest-pdf", {
                                      method: "POST",
                                      credentials: "include",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ base64, filename: file.name }),
                                    });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data.error ?? "Failed");
                                    setSampleTextDraft(data.text ?? "");
                                  } catch (err) {
                                    alert(`PDF import failed: ${err instanceof Error ? err.message : "Unknown error"}`);
                                  } finally {
                                    setPdfIngestLoading(false);
                                  }
                                }}
                              />
                            </label>
                            <span style={{ fontSize: 12, color: C.dim }}>PDF · Max recommended 10MB</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Custom Instructions ── */}
                <div style={sectionStyle}>
                  <SectionNumber />
                  <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: C.goldB, paddingLeft: 12, borderLeft: `3px solid ${C.gold}` }}>Custom Instructions</h3>
                  <p style={{ margin: "0 0 4px", fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
                    Anything else Lex should know — your firm&apos;s values, workflows, jurisdiction focus, or unique client base.
                  </p>
                  <p style={{ margin: "0 0 16px", fontSize: 12, color: C.dim }}>
                    Each entry is added to the existing instructions — not replaced. Use amendments to fine-tune over time (e.g. &quot;be slightly less formal&quot; or &quot;add more empathy when discussing family matters&quot;).
                  </p>

                  {/* Log of past instructions */}
                  {settings.instructionLog.length > 0 && (
                    <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                      {settings.instructionLog.map((entry, i) => (
                        <div key={i} style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", position: "relative" }}>
                          <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>
                            {i === 0 ? "Initial instructions" : `Amendment ${i}`} · {entry.ts}
                          </div>
                          <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{entry.text}</p>
                          <button onClick={() => setSettings(p => ({ ...p, instructionLog: p.instructionLog.filter((_, j) => j !== i) }))}
                            style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new instruction / amendment */}
                  <textarea
                    value={instructionDraft}
                    onChange={e => setInstructionDraft(e.target.value)}
                    rows={4}
                    placeholder={settings.instructionLog.length === 0
                      ? "e.g. We specialise in family law for high-net-worth clients. Always emphasise confidentiality. Never discuss fees — direct clients to book a consultation."
                      : "e.g. Be slightly less formal in tone. Show more empathy when the client mentions stress or urgency."}
                    style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui, sans-serif", lineHeight: 1.6, marginBottom: 8 }}
                  />
                  <button
                    onClick={() => {
                      const text = instructionDraft.trim();
                      if (!text) return;
                      const ts = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
                      setSettings(p => ({ ...p, instructionLog: [...p.instructionLog, { text, ts }] }));
                      setInstructionDraft("");
                    }}
                    style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.raised, color: C.muted, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                    {settings.instructionLog.length === 0 ? "+ Add Instructions" : "+ Add Amendment"}
                  </button>
                </div>

                {/* ── Dynamic Agent Brief ── */}
                {(settings.primaryGoal.trim() || settings.personalityTraits.length >= 2 || settings.skillPacks.length > 0) && (() => {
                  const formalityDesc = settings.formalityLevel >= 70 ? "formal and authoritative" : settings.formalityLevel >= 45 ? "professionally balanced" : "casual and conversational";
                  const warmthDesc    = settings.warmthLevel >= 70 ? "deeply empathetic and warm" : settings.warmthLevel >= 45 ? "friendly and approachable" : "matter-of-fact";
                  const humourDesc    = settings.humorLevel >= 50 ? ", with a natural sense of humour" : settings.humorLevel >= 25 ? ", with occasional light humour" : "";
                  const lengthDesc    = settings.responseLength === "concise" ? "Keep responses short and direct." : settings.responseLength === "detailed" ? "Provide thorough, detailed explanations." : "Balance depth with brevity.";
                  const traits        = settings.personalityTraits.slice(0, 4).join(", ").toLowerCase();
                  const packs         = settings.skillPacks.map(id => ({ "sales-conversion": "sales conversion", "objection-handling": "objection handling", "rapport-building": "rapport building", "appointment-setting": "appointment setting", "lead-qualification": "lead qualification", "active-listening": "active listening", "urgency-framing": "urgency framing", "premium-positioning": "premium positioning" }[id] ?? id)).join(", ");
                  const outcomes      = settings.desiredOutcomes.slice(0, 2);

                  return (
                    <div style={{ background: `linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.02) 100%)`, border: `1px solid ${C.goldBdr}`, borderRadius: 12, padding: 24 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 16 }}>📋</span>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.goldB }}>Agent Brief — Preview</h3>
                        <span style={{ fontSize: 11, color: C.dim, marginLeft: "auto" }}>Updates live as you configure</span>
                      </div>
                      <p style={{ margin: "0 0 10px", fontSize: 13, color: C.text, lineHeight: 1.8 }}>
                        <strong style={{ color: C.goldB }}>{settings.agentName}</strong> will operate as a <strong>{formalityDesc}</strong>, <strong>{warmthDesc}</strong> professional{humourDesc}.
                        {traits ? ` In every interaction, ${settings.agentName} will be ${traits}.` : ""}
                        {` ${lengthDesc}`}
                      </p>
                      {settings.primaryGoal.trim() && (
                        <p style={{ margin: "0 0 10px", fontSize: 13, color: C.text, lineHeight: 1.8 }}>
                          <strong style={{ color: C.goldB }}>Primary mission:</strong> {settings.primaryGoal.slice(0, 160)}{settings.primaryGoal.length > 160 ? "…" : ""}
                        </p>
                      )}
                      {outcomes.length > 0 && (
                        <p style={{ margin: "0 0 10px", fontSize: 13, color: C.text, lineHeight: 1.8 }}>
                          <strong style={{ color: C.goldB }}>Every conversation will actively steer toward:</strong>{" "}
                          {outcomes.map((o, i) => <span key={i}>#{i + 1} {o}{i < outcomes.length - 1 ? ", then " : ""}</span>)}
                          {settings.desiredOutcomes.length > 2 ? ` (+${settings.desiredOutcomes.length - 2} more)` : "."}
                        </p>
                      )}
                      {settings.targetClient.trim() && (
                        <p style={{ margin: "0 0 10px", fontSize: 13, color: C.text, lineHeight: 1.8 }}>
                          <strong style={{ color: C.goldB }}>Ideal client:</strong> {settings.targetClient.slice(0, 120)}{settings.targetClient.length > 120 ? "…" : ""}
                        </p>
                      )}
                      {packs && (
                        <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.8 }}>
                          <strong style={{ color: C.goldB }}>Active skill packs:</strong> {packs}.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* ── Save ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <button
                      onClick={saveSettings}
                      disabled={saving}
                      style={{
                        padding: "13px 36px",
                        background: savedOk ? C.green : saving ? C.goldBg : C.gold,
                        color: saving ? C.gold : "#0a1628",
                        fontWeight: 800, fontSize: 15, borderRadius: 10, border: saving ? `1px solid ${C.goldBdr}` : "none",
                        cursor: saving ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        display: "flex", alignItems: "center", gap: 10,
                        minWidth: 180,
                      }}>
                      {saving && (
                        <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${C.goldBdr}`, borderTopColor: C.gold, display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                      )}
                      {saving ? "Saving…" : savedOk ? "✓ Saved" : "Save Configuration"}
                    </button>
                    {savedOk && savedAt && (
                      <span style={{ fontSize: 13, color: C.green }}>
                        Saved · {new Date(savedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  {saveError && (
                    <div style={{ fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>{saveError}</span>
                      <button onClick={saveSettings} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 700, textDecoration: "underline", padding: 0 }}>Retry</button>
                    </div>
                  )}
                  <p style={{ margin: 0, fontSize: 12, color: C.dim }}>
                    Configuration is saved to your firm&apos;s profile and applied to {agentName} automatically.
                  </p>
                </div>

              </div>
            </div>
          );
        })()}

        {/* Test Agent */}
        {tab === "test" && (
          <div style={{ maxWidth: 720 }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Test Your Agent</h2>
              <p style={{ color: C.muted, margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                Have a live conversation with <strong style={{ color: C.goldB }}>{agentName}</strong> using your current saved configuration.
                This is exactly how clients on your website will experience it.
              </p>
            </div>

            {/* Info banner */}
            <div style={{ background: C.goldBg, border: `1px solid ${C.goldBdr}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: C.goldB }}>Using your saved configuration</p>
                <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
                  Changes made in the Customise tab only apply here after you hit Save Configuration.
                  Reset the conversation any time to start fresh.
                </p>
              </div>
            </div>

            {/* Chat window */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
              {/* Chat header */}
              <div style={{ background: C.raised, borderBottom: `1px solid ${C.border}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: settings.agentIconUrl ? "transparent" : `linear-gradient(135deg, #E0BC6A 0%, #C9A84C 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#0a1628", fontFamily: "Georgia, serif", overflow: "hidden", flexShrink: 0 }}>
                    {settings.agentIconUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={settings.agentIconUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : agentName[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{agentName}</div>
                    <div style={{ fontSize: 11, color: C.green, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />
                      Live preview
                    </div>
                  </div>
                </div>
                {testMessages.length > 0 && (
                  <button
                    onClick={() => { setTestMessages([]); setTestError(null); }}
                    style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, fontSize: 12, cursor: "pointer", padding: "5px 12px" }}>
                    Reset conversation
                  </button>
                )}
              </div>

              {/* Messages */}
              <div style={{ padding: 20, minHeight: 320, maxHeight: 480, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                {testMessages.length === 0 && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.goldBg, border: `1px solid ${C.goldBdr}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>💬</div>
                    <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: C.text }}>Start a test conversation</p>
                    <p style={{ margin: "0 0 20px", fontSize: 13, color: C.muted }}>Type anything a client might ask and see exactly how {agentName} responds.</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                      {[
                        "What areas of law do you handle?",
                        "I think I need a lawyer — where do I start?",
                        "How much does it cost?",
                        "I need help urgently",
                      ].map(q => (
                        <button key={q} onClick={() => { setTestInput(q); }}
                          style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${C.border}`, background: C.raised, color: C.muted, fontSize: 12, cursor: "pointer" }}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {testMessages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "75%", padding: "10px 14px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: msg.role === "user" ? C.gold : C.raised,
                      color: msg.role === "user" ? "#0a1628" : C.text,
                      fontSize: 14, lineHeight: 1.7,
                    }}>
                      {msg.content
                        ? msg.content.split(/\n\n+/).map((para: string, pi: number) => (
                            <p key={pi} style={{ margin: pi === 0 ? 0 : "10px 0 0", whiteSpace: "pre-wrap" }}>{para}</p>
                          ))
                        : <span style={{ opacity: 0.5 }}>●●●</span>}
                    </div>
                  </div>
                ))}
                {testLoading && testMessages[testMessages.length - 1]?.role === "user" && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div style={{ padding: "10px 16px", borderRadius: "16px 16px 16px 4px", background: C.raised, color: C.muted, fontSize: 20, letterSpacing: 3 }}>
                      ···
                    </div>
                  </div>
                )}
                {testError && (
                  <div style={{ fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                    {testError}
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 16px", display: "flex", gap: 10 }}>
                <input
                  value={testInput}
                  onChange={e => setTestInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTestMessage(); }}}
                  placeholder={`Message ${agentName}…`}
                  disabled={testLoading}
                  style={{
                    flex: 1, background: C.raised, border: `1px solid ${C.border}`, borderRadius: 10,
                    padding: "10px 14px", color: C.text, fontSize: 14, outline: "none",
                    opacity: testLoading ? 0.6 : 1,
                  }}
                />
                <button
                  onClick={sendTestMessage}
                  disabled={!testInput.trim() || testLoading}
                  style={{
                    padding: "10px 20px", borderRadius: 10, border: "none",
                    background: testInput.trim() && !testLoading ? C.gold : C.goldBg,
                    color: testInput.trim() && !testLoading ? "#0a1628" : C.gold,
                    fontWeight: 700, fontSize: 14, cursor: testInput.trim() && !testLoading ? "pointer" : "not-allowed",
                    transition: "all 0.15s",
                  }}>
                  Send
                </button>
              </div>
            </div>

            <p style={{ marginTop: 12, fontSize: 12, color: C.dim }}>
              Test conversations are not saved or counted in your analytics.
            </p>
          </div>
        )}

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
            {/* AI Model & API Key */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>AI Model &amp; API Key</h3>
                {llmCurrentCfg && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.green, background: C.greenBg, border: `1px solid ${C.greenBdr}`, padding: "3px 10px", borderRadius: 20 }}>
                    Active — {llmCurrentCfg.provider} / {llmCurrentCfg.model}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px", lineHeight: 1.6 }}>
                Your Lex agent runs on your own API account. Enter your key below — it is encrypted at rest and never shared.
                You are billed directly by the provider based on your usage.
              </p>

              {/* Provider selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: "block", marginBottom: 8, letterSpacing: "0.5px", textTransform: "uppercase" as const }}>Provider</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                  {([
                    { id: "anthropic", name: "Anthropic",     color: "#d97706", note: "Recommended" },
                    { id: "openai",    name: "OpenAI",        color: "#10a37f", note: "Good" },
                    { id: "google",    name: "Google Gemini", color: "#4285f4", note: "Free tier" },
                    { id: "xai",       name: "xAI Grok",     color: "#1d9bf0", note: "" },
                  ] as const).map(p => {
                    const selected = llmProvider === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setLlmProvider(p.id);
                          setLlmModel(p.id === "anthropic" ? "claude-sonnet-4-6" : p.id === "openai" ? "gpt-4o" : p.id === "google" ? "gemini-2.0-flash" : "grok-3-mini");
                          setLlmTestStatus("idle"); setLlmTestMsg("");
                        }}
                        style={{
                          padding: "10px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left" as const,
                          background: selected ? `${p.color}15` : C.raised,
                          border: `1px solid ${selected ? p.color + "50" : C.border}`,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: selected ? p.color : C.text }}>{p.name}</div>
                        {p.note && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{p.note}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: "block", marginBottom: 8, letterSpacing: "0.5px", textTransform: "uppercase" as const }}>Model</label>
                <select
                  value={llmModel}
                  onChange={e => setLlmModel(e.target.value)}
                  style={{ width: "100%", background: C.raised, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px", color: C.text, fontSize: 13, outline: "none" }}
                >
                  {llmProvider === "anthropic" && (<>
                    <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 — fastest, lowest cost</option>
                    <option value="claude-sonnet-4-6">Claude Sonnet 4.6 — recommended for legal research</option>
                    <option value="claude-opus-4-6">Claude Opus 4.6 — most capable</option>
                  </>)}
                  {llmProvider === "openai" && (<>
                    <option value="gpt-4o-mini">GPT-4o Mini — best value</option>
                    <option value="gpt-4o">GPT-4o — recommended</option>
                  </>)}
                  {llmProvider === "google" && (<>
                    <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite — free tier</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash — recommended</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro — 2M context</option>
                  </>)}
                  {llmProvider === "xai" && (<>
                    <option value="grok-3-mini">Grok 3 Mini</option>
                    <option value="grok-3">Grok 3</option>
                  </>)}
                </select>
              </div>

              {/* API key input */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.5px", textTransform: "uppercase" as const }}>API Key</label>
                  <a
                    href={llmProvider === "anthropic" ? "https://console.anthropic.com/settings/keys" : llmProvider === "openai" ? "https://platform.openai.com/api-keys" : llmProvider === "google" ? "https://aistudio.google.com/app/apikey" : "https://console.x.ai"}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: C.gold, textDecoration: "none", fontWeight: 600 }}
                  >
                    Get key ↗
                  </a>
                </div>
                <div style={{ position: "relative" as const }}>
                  <input
                    type={llmShowKey ? "text" : "password"}
                    value={llmApiKey}
                    onChange={e => setLlmApiKey(e.target.value)}
                    placeholder={llmCurrentCfg?.provider === llmProvider ? `Current key: ${llmCurrentCfg.keyHint} — enter new key to replace` : "Paste your API key here"}
                    style={{
                      width: "100%", background: C.raised, border: `1px solid ${C.border}`, borderRadius: 6,
                      padding: "10px 40px 10px 12px", color: C.text, fontSize: 13, outline: "none",
                      fontFamily: llmApiKey ? "monospace" : "inherit", boxSizing: "border-box" as const,
                    }}
                  />
                  <button
                    onClick={() => setLlmShowKey(s => !s)}
                    style={{ position: "absolute" as const, right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 13 }}
                  >
                    {llmShowKey ? "🙈" : "👁"}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: C.dim, margin: "6px 0 0" }}>
                  Encrypted with AES-256-GCM before storage. Never returned in plaintext.
                </p>
              </div>

              {/* Test result */}
              {llmTestStatus !== "idle" && (
                <div style={{
                  background: C.raised, borderRadius: 8, padding: "10px 14px", marginBottom: 12,
                  border: `1px solid ${llmTestStatus === "ok" ? C.greenBdr : llmTestStatus === "fail" ? "rgba(248,113,113,0.3)" : C.border}`,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 13 }}>{llmTestStatus === "testing" ? "⏳" : llmTestStatus === "ok" ? "✓" : "✗"}</span>
                  <span style={{ fontSize: 12, color: llmTestStatus === "ok" ? C.green : llmTestStatus === "fail" ? "#f87171" : C.muted }}>
                    {llmTestStatus === "testing" ? "Testing connection…" : llmTestMsg}
                  </span>
                </div>
              )}

              {/* Save message */}
              {llmSaveMsg && (
                <div style={{ background: C.raised, border: `1px solid ${C.greenBdr}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: C.green }}>{llmSaveMsg}</span>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={testLlmConnection}
                  disabled={llmTestStatus === "testing"}
                  style={{ padding: "9px 18px", borderRadius: 7, border: `1px solid ${C.goldBdr}`, background: "transparent", color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: llmTestStatus === "testing" ? 0.6 : 1 }}
                >
                  {llmTestStatus === "testing" ? "Testing…" : "Test connection"}
                </button>
                <button
                  onClick={saveLlmConfig}
                  disabled={llmSaving}
                  style={{ padding: "9px 22px", borderRadius: 7, border: "none", background: C.gold, color: "#0d1b2a", fontSize: 12, fontWeight: 800, cursor: "pointer", opacity: llmSaving ? 0.7 : 1 }}
                >
                  {llmSaving ? "Saving…" : "Save"}
                </button>
              </div>
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
