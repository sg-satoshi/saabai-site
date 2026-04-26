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
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", cost: "~$0.80/M tokens", badge: "Fastest · cheapest" },
      { id: "claude-sonnet-4-6",         name: "Claude Sonnet 4.6", cost: "~$3/M tokens",   badge: "Recommended" },
      { id: "claude-opus-4-6",           name: "Claude Opus 4.6",   cost: "~$15/M tokens",  badge: "Most capable" },
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
      { id: "gpt-4o-mini", name: "GPT-4o Mini", cost: "~$0.15/M tokens", badge: "Best value" },
      { id: "gpt-4o",      name: "GPT-4o",      cost: "~$2.50/M tokens", badge: "Recommended" },
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
      { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", cost: "Free tier + very low", badge: "Free tier" },
      { id: "gemini-2.0-flash",      name: "Gemini 2.0 Flash",      cost: "~$0.10/M tokens",       badge: "Recommended" },
      { id: "gemini-1.5-pro",        name: "Gemini 1.5 Pro",        cost: "~$1.25/M tokens",       badge: "" },
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
      { id: "grok-3-mini", name: "Grok 3 Mini", cost: "Competitive", badge: "Recommended" },
      { id: "grok-3",      name: "Grok 3",      cost: "Competitive", badge: "Most capable" },
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
      { id: "llama-3.1-8b-instant",    name: "Llama 3.1 8B",  cost: "Free tier", badge: "Free" },
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", cost: "Very low",  badge: "More capable" },
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
      { id: "kimi-k2", name: "Kimi K2", cost: "Competitive", badge: "Recommended" },
    ],
    pricing: "Competitive pricing",
    comingSoon: true,
  },
] as const;

type ProviderId = typeof PROVIDERS[number]["id"];

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

// ── Component ─────────────────────────────────────────────────────────────────

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

  // Reset model when provider changes
  function selectProvider(id: ProviderId) {
    const p = PROVIDERS.find(pr => pr.id === id)!;
    setSelectedProv(id);
    // Pick first model of the new provider
    if ("models" in p && p.models.length > 0) {
      setSelectedModel(p.models[0].id);
    }
    setTestStatus("idle");
    setSaveMsg("");
  }

  async function handleTest() {
    if (!apiKey.trim()) { setTestMsg("Enter your API key first."); setTestStatus("fail"); return; }
    setTestStatus("testing");
    setTestMsg("");
    const res = await fetch("/api/lex-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test", clientId, provider: selectedProv, model: selectedModel, apiKey }),
    }).then(r => r.json());
    setTestStatus(res.ok ? "ok" : "fail");
    setTestMsg(res.ok ? `Connected · model replied: "${res.response}"` : (res.error ?? "Connection failed"));
  }

  async function handleSave() {
    if (!apiKey.trim()) { setSaveMsg("Enter the API key before saving."); return; }
    setSaving(true);
    setSaveMsg("");
    const res = await fetch("/api/lex-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", clientId, provider: selectedProv, model: selectedModel, apiKey }),
    }).then(r => r.json());
    setSaving(false);
    if (res.ok) {
      setSaveMsg("Saved. Lex will use this model for new conversations.");
      setCurrentConfig({ provider: selectedProv, model: selectedModel, keyHint: `****${apiKey.slice(-4)}`, updatedAt: Date.now() });
      setApiKey("");
    } else {
      setSaveMsg(`Error: ${res.error ?? "Unknown error"}`);
    }
  }

  const testColor = testStatus === "ok" ? "#00bfa5" : testStatus === "fail" ? "#f87171" : C.sub;

  return (
    <AdminShell activePath="/saabai-admin/lex-settings">
      <div style={{ padding: "40px 40px 80px", maxWidth: 900 }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "-0.5px", margin: "0 0 8px" }}>
            LLM Configuration
          </h1>
          <p style={{ fontSize: 14, color: C.sub, margin: 0, lineHeight: 1.6 }}>
            Each client can use their own API key and preferred model. Keys are encrypted at rest — never stored in plaintext.
          </p>
        </div>

        {/* Client selector */}
        <div style={{ marginBottom: 36, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px" }}>
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
                  Configured · {currentConfig.provider}/{currentConfig.model} · key {currentConfig.keyHint}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Provider grid */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "1px", textTransform: "uppercase" as const, margin: "0 0 14px" }}>
            Choose provider
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {PROVIDERS.map(p => {
              const isSelected = selectedProv === p.id;
              const isAvailable = p.available;
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
                  {"comingSoon" in p && p.comingSoon && (
                    <div style={{ position: "absolute" as const, top: 12, right: 12, fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.8px", textTransform: "uppercase" as const, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 7px" }}>
                      Coming soon
                    </div>
                  )}
                  {"hasFree" in p && p.hasFree && !("comingSoon" in p && p.comingSoon) && (
                    <div style={{ position: "absolute" as const, top: 12, right: 12, fontSize: 9, fontWeight: 700, color: "#4ade80", letterSpacing: "0.8px", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 4, padding: "2px 7px" }}>
                      Free tier
                    </div>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 800, color: isSelected ? p.color : C.text, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{p.tagline}</div>
                  {isSelected && (
                    <div style={{ marginTop: 8, fontSize: 11, color: p.color, fontWeight: 600 }}>{p.pricing}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

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
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{m.name}</span>
                      {m.badge && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: provider.color, background: provider.bg, border: `1px solid ${provider.border}`, borderRadius: 4, padding: "2px 7px", letterSpacing: "0.5px" }}>
                          {m.badge.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{m.cost}</div>
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
          <div style={{ background: C.surface, border: `1px solid rgba(0,191,165,0.2)`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
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

        {/* Info footer */}
        <div style={{ marginTop: 48, padding: "20px 24px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.sub, margin: "0 0 8px" }}>How this works</p>
          <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column" as const, gap: 6 }}>
            {[
              "The client's API key is encrypted with AES-256-GCM and stored in Redis. Saabai never has access to the plaintext key.",
              "When Lex receives a conversation, it looks up the client's stored config and routes the request through their key and chosen model.",
              "If no config is saved, Lex falls back to Saabai's default model — useful during onboarding.",
              "The client's AI costs go directly to their provider account. Saabai's monthly fee covers everything else.",
            ].map((item, i) => (
              <li key={i} style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
