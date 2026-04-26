"use client";

import { useState, useEffect } from "react";
import AdminShell from "../AdminSidebar";

// ── Provider registry ──────────────────────────────────────────────────────────

const PROVIDERS = [
  {
    id: "anthropic",
    name: "Anthropic",
    shortName: "Claude",
    tagline: "Best legal reasoning and instruction-following",
    color: "#d97706",
    bg: "rgba(217,119,6,0.1)",
    border: "rgba(217,119,6,0.25)",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    keyPrefix: "sk-ant-",
    available: true,
    models: [
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", cost: "~$0.80/M tokens", badge: "Fastest · cheapest", context: "200K" },
      { id: "claude-sonnet-4-6",         name: "Claude Sonnet 4.6", cost: "~$3/M tokens",   badge: "Recommended",      context: "200K" },
      { id: "claude-opus-4-6",           name: "Claude Opus 4.6",   cost: "~$15/M tokens",  badge: "Most capable",     context: "200K" },
    ],
    pricing: "Est. $5–40/mo for most firms",
  },
  {
    id: "openai",
    name: "OpenAI",
    shortName: "GPT",
    tagline: "Industry standard · widely trusted",
    color: "#10a37f",
    bg: "rgba(16,163,127,0.1)",
    border: "rgba(16,163,127,0.25)",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    keyPrefix: "sk-",
    available: true,
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini", cost: "~$0.15/M tokens", badge: "Best value",  context: "128K" },
      { id: "gpt-4o",      name: "GPT-4o",      cost: "~$2.50/M tokens", badge: "Recommended", context: "128K" },
    ],
    pricing: "Est. $2–20/mo for most firms",
  },
  {
    id: "google",
    name: "Google Gemini",
    shortName: "Gemini",
    tagline: "Fast · generous free tier",
    color: "#4285f4",
    bg: "rgba(66,133,244,0.1)",
    border: "rgba(66,133,244,0.25)",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
    keyPrefix: "AIza",
    available: true,
    hasFree: true,
    models: [
      { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", cost: "Free tier + very low", badge: "Free tier",    context: "1M" },
      { id: "gemini-2.0-flash",      name: "Gemini 2.0 Flash",      cost: "~$0.10/M tokens",       badge: "Recommended", context: "1M" },
      { id: "gemini-1.5-pro",        name: "Gemini 1.5 Pro",        cost: "~$1.25/M tokens",       badge: "",            context: "2M" },
    ],
    pricing: "Est. $0–10/mo · Free tier available",
  },
  {
    id: "xai",
    name: "xAI Grok",
    shortName: "Grok",
    tagline: "Real-time knowledge · strong reasoning",
    color: "#1d9bf0",
    bg: "rgba(29,155,240,0.1)",
    border: "rgba(29,155,240,0.25)",
    apiKeyUrl: "https://console.x.ai",
    keyPrefix: "xai-",
    available: true,
    models: [
      { id: "grok-3-mini", name: "Grok 3 Mini", cost: "Competitive", badge: "Recommended",  context: "131K" },
      { id: "grok-3",      name: "Grok 3",      cost: "Competitive", badge: "Most capable", context: "131K" },
    ],
    pricing: "See console.x.ai for pricing",
  },
  {
    id: "groq",
    name: "Groq",
    shortName: "Llama",
    tagline: "Ultra-fast open source · generous free tier",
    color: "#f55036",
    bg: "rgba(245,80,54,0.1)",
    border: "rgba(245,80,54,0.25)",
    apiKeyUrl: "https://console.groq.com/keys",
    keyPrefix: "gsk_",
    available: false,
    hasFree: true,
    models: [
      { id: "llama-3.1-8b-instant",    name: "Llama 3.1 8B",  cost: "Free tier", badge: "Free",         context: "128K" },
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", cost: "Very low",  badge: "More capable", context: "128K" },
    ],
    pricing: "Free tier · very low cost",
    comingSoon: true,
  },
  {
    id: "moonshot",
    name: "Kimi (Moonshot)",
    shortName: "Kimi K2",
    tagline: "Long context · strong multilingual reasoning",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.25)",
    apiKeyUrl: "https://platform.moonshot.cn",
    keyPrefix: "sk-",
    available: false,
    models: [
      { id: "kimi-k2", name: "Kimi K2", cost: "Competitive", badge: "Recommended", context: "128K" },
    ],
    pricing: "Competitive pricing",
    comingSoon: true,
  },
] as const;

type ProviderId = typeof PROVIDERS[number]["id"];

// ── Legal AI suitability per provider ─────────────────────────────────────────

type LegalFit = {
  rating: "recommended" | "good" | "caution";
  ratingLabel: string;
  ratingColor: string;
  scores: { toolCalling: number; accuracy: number; instructions: number };
  summary: string;
  strengths: string[];
  watchOut: string;
  restriction?: string;
};

const LEGAL_FIT: Record<string, LegalFit> = {
  anthropic: {
    rating: "recommended",
    ratingLabel: "Best for Lex",
    ratingColor: "#00bfa5",
    scores: { toolCalling: 5, accuracy: 5, instructions: 5 },
    summary:
      "The strongest choice for a legal AI. Claude is built for careful, verifiable reasoning and follows complex instruction sets with higher consistency than any other provider tested in this context.",
    strengths: [
      "Most reliable multi-step tool chains — rarely skips AustLII or verifySection calls",
      "Follows the 'never fabricate citations' rule more tightly than any other provider",
      "200K context window handles even the longest contracts or transcripts without truncation",
      "Prompt caching reduces cost on long system prompts — a Lex-specific optimisation built in",
    ],
    watchOut:
      "Haiku is too lightweight for complex research chains. Use it only for intake chat or simple Q&A — not for legislation verification or multi-hop case law research. Sonnet is the minimum for anything that touches section citations or document drafting.",
  },
  openai: {
    rating: "good",
    ratingLabel: "Good for Lex",
    ratingColor: "#4ade80",
    scores: { toolCalling: 4, accuracy: 4, instructions: 4 },
    summary:
      "A proven, enterprise-grade option. GPT-4o is reliable for legal research workflows and handles tool calling well — though it can occasionally be more confident than its accuracy warrants on Australian-specific law and ATO rulings.",
    strengths: [
      "Battle-tested reliability — GPT-4o is widely deployed in legal tech globally",
      "Consistent tool calling across most query types and jurisdictions",
      "Strong comprehension of structured legal documents, contracts, and agreements",
    ],
    watchOut:
      "GPT-4o Mini may skip tool steps on complex multi-jurisdiction queries — only suitable for intake and simple Q&A, not for research chains. Use GPT-4o as the minimum for anything touching case law, ATO guidance, or section citations.",
  },
  google: {
    rating: "caution",
    ratingLabel: "Use with caution",
    ratingColor: "#f59e0b",
    scores: { toolCalling: 3, accuracy: 3, instructions: 3 },
    summary:
      "Best-in-class context window (1M–2M tokens) makes Gemini attractive for large document work, but it is less consistent on multi-step legal research chains and has a higher rate of confident errors on Australian-specific law and ATO rulings.",
    strengths: [
      "1M–2M token context window — can process entire client files, judgments, or contracts in one pass",
      "Free tier available via Google AI Studio — useful for initial piloting",
      "Fast and cost-effective for document summarisation and intake tasks",
    ],
    watchOut:
      "Gemini can be confidently wrong on Australian-specific legislation, state law nuances, and ATO interpretations — areas where Claude and GPT-4o are more carefully calibrated. It may also over-call tools, generating excessive searches that slow responses. Test thoroughly on your practice areas before using for client-facing research.",
    restriction:
      "Not recommended as the primary research model without thorough testing. Better suited for document summarisation or intake chat than for legislative citation work or advice memos.",
  },
  xai: {
    rating: "caution",
    ratingLabel: "Use with caution",
    ratingColor: "#f59e0b",
    scores: { toolCalling: 3, accuracy: 3, instructions: 3 },
    summary:
      "Grok is strong for general knowledge and real-time awareness, but multi-step legal research chains are where it becomes inconsistent — specifically the verifySection step that prevents hallucinated citations appearing in documents.",
    strengths: [
      "Strong general reasoning and broad up-to-date world knowledge",
      "Competitive pricing relative to capability",
      "Good for conversational intake and general client-facing Q&A",
    ],
    watchOut:
      "On complex research chains, Grok may skip the verifySection call and cite legislation from memory — producing plausible but incorrect section numbers. If those numbers appear in a drafted document or advice memo, the firm carries the exposure. This is the single biggest risk of using a less-reliable model in a legal AI context.",
    restriction:
      "If using xAI, restrict this client's Lex to intake and general Q&A only. Do not use for legislation research, section citations, or document drafting workflows without extensive testing first.",
  },
};

// ── Known clients ──────────────────────────────────────────────────────────────

const KNOWN_CLIENTS = [
  { id: "tributumlaw", name: "Tributum Law" },
];

// ── Colours ────────────────────────────────────────────────────────────────────

const C = {
  bg:      "#07091a",
  card:    "#0e1128",
  surface: "#131729",
  border:  "rgba(255,255,255,0.07)",
  borderHi:"rgba(255,255,255,0.13)",
  text:    "#eef0ff",
  sub:     "#9aa0b8",
  muted:   "#525873",
  teal:    "#00bfa5",
};

// ── Score dots ─────────────────────────────────────────────────────────────────

function ScoreDots({ score, color }: { score: number; color: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          style={{
            width: 9, height: 9, borderRadius: "50%",
            background: i <= score ? color : "rgba(255,255,255,0.1)",
            display: "inline-block",
          }}
        />
      ))}
    </span>
  );
}

// ── Legal fit assessment panel ─────────────────────────────────────────────────

function LegalFitPanel({ providerId }: { providerId: string }) {
  const fit = LEGAL_FIT[providerId];
  if (!fit) return null;

  const isWarning   = fit.rating === "caution";
  const panelBorder = isWarning ? "rgba(245,158,11,0.28)" : fit.rating === "good" ? "rgba(74,222,128,0.2)" : "rgba(0,191,165,0.22)";
  const panelBg     = isWarning ? "rgba(245,158,11,0.04)" : "rgba(0,191,165,0.03)";

  return (
    <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, padding: "24px", marginBottom: 20 }}>

      {/* Rating badge + warning note */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" as const }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase" as const,
          color: fit.ratingColor,
          background: `${fit.ratingColor}18`,
          border: `1px solid ${fit.ratingColor}40`,
          padding: "3px 10px", borderRadius: 5,
        }}>
          {fit.ratingLabel}
        </div>
        {isWarning && (
          <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>
            Read the warnings below before saving this configuration
          </span>
        )}
      </div>

      {/* Summary */}
      <p style={{ fontSize: 13, color: "#c4c8e0", lineHeight: 1.65, margin: "0 0 20px" }}>
        {fit.summary}
      </p>

      {/* Score rows */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.8px", textTransform: "uppercase" as const, margin: "0 0 10px" }}>
          Legal AI reliability scores
        </p>
        {(
          [
            { label: "Tool calling reliability", score: fit.scores.toolCalling,   help: "Consistency calling AustLII, ATO, and verifySection in the right sequence" },
            { label: "Legal accuracy",           score: fit.scores.accuracy,       help: "How often it fabricates cases, section numbers, or rulings" },
            { label: "Instruction following",    score: fit.scores.instructions,   help: "Adherence to citation rules and the 'never fabricate' constraint" },
          ] as const
        ).map(row => {
          const scoreColor = row.score >= 4 ? "#00bfa5" : row.score >= 3 ? "#f59e0b" : "#f87171";
          const scoreLabel = row.score === 5 ? "Excellent" : row.score === 4 ? "Good" : row.score === 3 ? "Moderate" : "Poor";
          return (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ width: 190, fontSize: 12, color: C.sub, flexShrink: 0 }}>{row.label}</div>
              <ScoreDots score={row.score} color={scoreColor} />
              <span style={{ fontSize: 11, color: scoreColor, fontWeight: 600, width: 68, flexShrink: 0 }}>{scoreLabel}</span>
              <span style={{ fontSize: 11, color: C.muted }}>{row.help}</span>
            </div>
          );
        })}
      </div>

      {/* Strengths */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.8px", textTransform: "uppercase" as const, margin: "0 0 10px" }}>
          Strengths for legal work
        </p>
        {fit.strengths.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <span style={{ color: C.teal, fontSize: 11, flexShrink: 0, marginTop: 2 }}>✓</span>
            <span style={{ fontSize: 12, color: C.sub, lineHeight: 1.55 }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Watch out */}
      <div style={{
        background: isWarning ? "rgba(245,158,11,0.07)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${isWarning ? "rgba(245,158,11,0.22)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 10, padding: "14px 16px",
      }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: isWarning ? "#f59e0b" : C.muted, letterSpacing: "0.8px", textTransform: "uppercase" as const, margin: "0 0 7px" }}>
          {isWarning ? "⚠  Watch out" : "Note"}
        </p>
        <p style={{ fontSize: 12, color: isWarning ? "#fcd34d" : C.sub, lineHeight: 1.65, margin: 0 }}>
          {fit.watchOut}
        </p>
        {fit.restriction && (
          <p style={{ fontSize: 12, color: "#fca5a5", lineHeight: 1.65, margin: "10px 0 0", fontWeight: 600 }}>
            {fit.restriction}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LexSettingsClient() {
  const [clientId,       setClientId]       = useState(KNOWN_CLIENTS[0].id);
  const [selectedProv,   setSelectedProv]   = useState<ProviderId>("anthropic");
  const [selectedModel,  setSelectedModel]  = useState("claude-sonnet-4-6");
  const [apiKey,         setApiKey]         = useState("");
  const [showKey,        setShowKey]        = useState(false);
  const [currentConfig,  setCurrentConfig]  = useState<{ provider: string; model: string; keyHint: string; updatedAt: number } | null>(null);
  const [testStatus,     setTestStatus]     = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [testMsg,        setTestMsg]        = useState("");
  const [saving,         setSaving]         = useState(false);
  const [saveMsg,        setSaveMsg]        = useState("");

  const provider = PROVIDERS.find(p => p.id === selectedProv)!;

  // Load existing config when clientId changes
  useEffect(() => {
    setCurrentConfig(null);
    setApiKey("");
    setTestStatus("idle");
    setSaveMsg("");
    fetch(`/api/lex-settings?clientId=${clientId}`)
      .then(r => r.json())
      .then(data => {
        if (data.configured) {
          setCurrentConfig(data);
          setSelectedProv(data.provider as ProviderId);
          setSelectedModel(data.model);
        }
      })
      .catch(() => {});
  }, [clientId]);

  function selectProvider(id: ProviderId) {
    const p = PROVIDERS.find(pr => pr.id === id)!;
    setSelectedProv(id);
    if ("models" in p && p.models.length > 0) {
      setSelectedModel(p.models[0].id);
    }
    setTestStatus("idle");
    setSaveMsg("");
  }

  async function handleTest() {
    // Allow testing with stored key if no new key has been entered
    if (!apiKey.trim() && !currentConfig) {
      setTestMsg("Enter your API key first.");
      setTestStatus("fail");
      return;
    }
    setTestStatus("testing");
    setTestMsg("");
    try {
      const r = await fetch("/api/lex-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", clientId, provider: selectedProv, model: selectedModel, apiKey: apiKey || undefined }),
      });
      const res = await r.json();
      setTestStatus(res.ok ? "ok" : "fail");
      setTestMsg(res.ok ? `Connected — model replied: "${res.response}"` : (res.error ?? "Connection failed"));
    } catch (err) {
      setTestStatus("fail");
      setTestMsg(err instanceof Error ? err.message : "Network error — could not reach server");
    }
  }

  async function handleSave() {
    // Allow saving model change without re-entering the key if one is already stored
    if (!apiKey.trim() && !currentConfig) {
      setSaveMsg("Enter the API key before saving.");
      return;
    }
    setSaving(true);
    setSaveMsg("");
    try {
      const r = await fetch("/api/lex-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", clientId, provider: selectedProv, model: selectedModel, apiKey: apiKey || undefined }),
      });
      const res = await r.json();
      setSaving(false);
      if (res.ok) {
        setSaveMsg("Saved. Lex will use this model for new conversations.");
        setCurrentConfig({ provider: selectedProv, model: selectedModel, keyHint: `****${apiKey.slice(-4)}`, updatedAt: Date.now() });
        setApiKey("");
      } else {
        setSaveMsg(`Error: ${res.error ?? "Unknown error"}`);
      }
    } catch (err) {
      setSaving(false);
      setSaveMsg(err instanceof Error ? `Error: ${err.message}` : "Error: Network error — could not reach server");
    }
  }

  const testColor = testStatus === "ok" ? C.teal : testStatus === "fail" ? "#f87171" : C.sub;

  return (
    <AdminShell activePath="/saabai-admin/lex-settings">
      <div style={{ padding: "40px 40px 80px", maxWidth: 920 }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "-0.5px", margin: "0 0 8px" }}>
            LLM Configuration
          </h1>
          <p style={{ fontSize: 14, color: C.sub, margin: 0, lineHeight: 1.6 }}>
            Each client can use their own API key and preferred model. Keys are encrypted at rest — never stored in plaintext.
          </p>
        </div>

        {/* Stakes callout */}
        <div style={{
          background: "rgba(77,142,246,0.05)",
          border: "1px solid rgba(77,142,246,0.18)",
          borderRadius: 14, padding: "18px 22px", marginBottom: 32,
        }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚡</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#c4c8e0", margin: "0 0 6px" }}>
                Why model choice matters for Lex
              </p>
              <p style={{ fontSize: 12, color: C.sub, lineHeight: 1.65, margin: 0 }}>
                Lex performs multi-step legal research: it queries AustLII, the ATO, and legislation databases in
                sequence, then verifies every section reference before including it in a response. That verification
                step is what stops a fabricated section number from appearing in a drafted document or client advice
                memo. The step only runs reliably if the model handles multi-step tool chains consistently under
                legal constraints. Not all models do this equally well — and the difference is not about being
                "better" in a general sense. The assessments below reflect each provider's real-world reliability
                for this specific use case.
              </p>
            </div>
          </div>
        </div>

        {/* Client selector */}
        <div style={{ marginBottom: 32, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "1px", textTransform: "uppercase" as const, display: "block", marginBottom: 10 }}>
            Client
          </label>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" as const }}>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              style={{ background: C.surface, color: C.text, border: `1px solid ${C.borderHi}`, borderRadius: 8, padding: "9px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", outline: "none" }}
            >
              {KNOWN_CLIENTS.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
              ))}
            </select>
            {currentConfig && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,191,165,0.08)", border: "1px solid rgba(0,191,165,0.2)", borderRadius: 8, padding: "7px 14px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.teal }} />
                <span style={{ fontSize: 12, color: C.teal, fontWeight: 600 }}>
                  Configured — {currentConfig.provider}/{currentConfig.model} — key {currentConfig.keyHint}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Provider grid */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "1px", textTransform: "uppercase" as const, margin: "0 0 14px" }}>
            Choose provider
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {PROVIDERS.map(p => {
              const isSelected  = selectedProv === p.id;
              const isAvailable = p.available;
              const fit         = LEGAL_FIT[p.id];
              return (
                <button
                  key={p.id}
                  onClick={() => isAvailable && selectProvider(p.id as ProviderId)}
                  disabled={!isAvailable}
                  style={{
                    background: isSelected ? p.bg : C.card,
                    border: `1px solid ${isSelected ? p.border : C.border}`,
                    borderRadius: 14, padding: "18px 20px",
                    textAlign: "left" as const, cursor: isAvailable ? "pointer" : "default",
                    opacity: isAvailable ? 1 : 0.5,
                    position: "relative" as const,
                    transition: "border-color 0.15s",
                  }}
                >
                  {/* Coming soon badge */}
                  {"comingSoon" in p && p.comingSoon && (
                    <div style={{ position: "absolute" as const, top: 12, right: 12, fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.8px", textTransform: "uppercase" as const, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 7px" }}>
                      Coming soon
                    </div>
                  )}
                  {/* Free tier badge */}
                  {"hasFree" in p && p.hasFree && !("comingSoon" in p && p.comingSoon) && (
                    <div style={{ position: "absolute" as const, top: 12, right: 12, fontSize: 9, fontWeight: 700, color: "#4ade80", letterSpacing: "0.8px", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 4, padding: "2px 7px" }}>
                      Free tier
                    </div>
                  )}

                  <div style={{ fontSize: 13, fontWeight: 800, color: isSelected ? p.color : C.text, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>{p.tagline}</div>

                  {/* Legal fit rating pill on available providers */}
                  {isAvailable && fit && (
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 9, fontWeight: 800, letterSpacing: "0.6px", textTransform: "uppercase" as const,
                      color: fit.ratingColor,
                      background: `${fit.ratingColor}15`,
                      border: `1px solid ${fit.ratingColor}35`,
                      padding: "2px 8px", borderRadius: 4,
                    }}>
                      {fit.rating === "recommended" ? "★ " : fit.rating === "caution" ? "⚠ " : "✓ "}
                      {fit.ratingLabel}
                    </div>
                  )}

                  {isSelected && (
                    <div style={{ marginTop: 8, fontSize: 11, color: p.color, fontWeight: 600 }}>{p.pricing}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legal fit panel for selected provider */}
        <LegalFitPanel providerId={selectedProv} />

        {/* Model selection */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px", marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "1px", textTransform: "uppercase" as const, margin: "0 0 14px" }}>
            Model
          </p>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {provider.models.map(m => {
              const isSelected = selectedModel === m.id;
              return (
                <label
                  key={m.id}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: isSelected ? provider.bg : C.surface, border: `1px solid ${isSelected ? provider.border : C.border}`, borderRadius: 10, cursor: "pointer" }}
                >
                  <input
                    type="radio"
                    name="model"
                    value={m.id}
                    checked={isSelected}
                    onChange={() => setSelectedModel(m.id)}
                    style={{ accentColor: provider.color }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{m.name}</span>
                      {m.badge && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: provider.color, background: provider.bg, border: `1px solid ${provider.border}`, borderRadius: 4, padding: "2px 7px", letterSpacing: "0.5px" }}>
                          {m.badge.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 3 }}>
                      <span style={{ fontSize: 11, color: C.muted }}>{m.cost}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>Context: {m.context}</span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* API Key input */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "1px", textTransform: "uppercase" as const, margin: 0 }}>
              API Key
            </p>
            <a
              href={provider.apiKeyUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: provider.color, textDecoration: "none", fontWeight: 600 }}
            >
              Get key from {provider.name} ↗
            </a>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" as const }}>
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={currentConfig?.provider === selectedProv ? `Current key: ${currentConfig.keyHint} — enter new key to replace` : `Paste your ${provider.name} API key`}
                style={{
                  width: "100%", background: C.surface, color: C.text,
                  border: `1px solid ${C.borderHi}`, borderRadius: 10,
                  padding: "11px 44px 11px 14px", fontSize: 13, outline: "none",
                  fontFamily: apiKey ? "monospace" : "inherit",
                  boxSizing: "border-box" as const,
                }}
              />
              <button
                onClick={() => setShowKey(s => !s)}
                style={{ position: "absolute" as const, right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 13 }}
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <p style={{ fontSize: 11, color: C.muted, margin: "10px 0 0", lineHeight: 1.5 }}>
            Encrypted with AES-256-GCM before storage. Never returned in plaintext. Starts with: <code style={{ color: provider.color, background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 3 }}>{provider.keyPrefix}…</code>
          </p>
        </div>

        {/* Test status */}
        {testStatus !== "idle" && (
          <div style={{ background: C.surface, border: `1px solid ${testStatus === "ok" ? "rgba(0,191,165,0.25)" : "rgba(248,113,113,0.25)"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14 }}>{testStatus === "testing" ? "⏳" : testStatus === "ok" ? "✓" : "✗"}</span>
            <span style={{ fontSize: 13, color: testColor }}>{testStatus === "testing" ? "Testing connection…" : testMsg}</span>
          </div>
        )}

        {/* Save status */}
        {saveMsg && (
          <div style={{ background: C.surface, border: "1px solid rgba(0,191,165,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: C.teal }}>{saveMsg}</span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleTest}
            disabled={testStatus === "testing"}
            style={{
              padding: "11px 22px", borderRadius: 10, border: `1px solid ${provider.border}`,
              background: "transparent", color: provider.color, fontSize: 13, fontWeight: 700,
              cursor: "pointer", opacity: testStatus === "testing" ? 0.6 : 1,
            }}
          >
            {testStatus === "testing" ? "Testing…" : "Test connection"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "11px 28px", borderRadius: 10, border: "none",
              background: provider.color, color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: "pointer", opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save configuration"}
          </button>
        </div>

        {/* How this works footer */}
        <div style={{ marginTop: 48, padding: "20px 24px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.sub, margin: "0 0 8px" }}>How this works</p>
          <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column" as const, gap: 6 }}>
            {[
              "The client's API key is encrypted with AES-256-GCM and stored in Redis. Saabai never has access to the plaintext key.",
              "When Lex receives a conversation, it looks up the client's stored config and routes the request through their key and chosen model.",
              "If no config is saved, Lex falls back to Saabai's default model — useful during onboarding.",
              "The client's AI usage costs go directly to their provider account. Saabai's monthly fee covers everything else.",
            ].map((item, i) => (
              <li key={i} style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{item}</li>
            ))}
          </ul>
        </div>

      </div>
    </AdminShell>
  );
}
