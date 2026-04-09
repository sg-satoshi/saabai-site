"use client";

import { useState, useRef, useEffect } from "react";

// ── Brand ──────────────────────────────────────────────────────────────────────
const P = {
  bg:            "#0d1b2a",
  surface:       "#162236",
  surfaceRaised: "#1e3050",
  border:        "#243550",
  borderAccent:  "#2d4870",
  purple:        "#7c6cf8",
  purpleBright:  "#9d8ffc",
  purpleDim:     "#4a3fa0",
  purpleBg:      "rgba(124,108,248,0.08)",
  purpleBorder:  "rgba(124,108,248,0.2)",
  text:          "#e8edf5",
  textMuted:     "#8fa3c0",
  textDim:       "#4a6080",
  green:         "#22c55e",
  orange:        "#f97316",
  red:           "#ef4444",
};

// ── Types ─────────────────────────────────────────────────────────────────────
type Campaign = {
  id: string;
  product: string;
  audience: string;
  goal: string;
  message: string;
  tone: string;
  platforms: string[];
  budget: string;
  competitor: string;
  output: string;
  createdAt: number;
};

type BriefForm = {
  product: string;
  audience: string;
  goal: string;
  message: string;
  tone: string;
  platforms: string[];
  budget: string;
  competitor: string;
};

const BLANK_FORM: BriefForm = {
  product: "", audience: "", goal: "", message: "",
  tone: "Professional", platforms: [], budget: "", competitor: "",
};

const GOALS = [
  "Brand Awareness", "Lead Generation", "Sales / Conversions",
  "Website Traffic", "App Installs", "Event Promotion", "Retargeting",
];
const TONES = ["Professional", "Casual", "Urgent", "Playful", "Inspirational", "Authoritative"];
const ALL_PLATFORMS = [
  "Meta (Facebook/Instagram)", "Google Ads", "LinkedIn", "TikTok", "YouTube",
];

function abbrevPlatform(p: string): string {
  if (p.startsWith("Meta")) return "Meta";
  if (p.startsWith("Google")) return "Google";
  return p;
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

// ── Logo mark ─────────────────────────────────────────────────────────────────
function PulseMark({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #9d8ffc 0%, #7c6cf8 60%, #5b4dd0 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      boxShadow: "0 0 12px rgba(124,108,248,0.35)",
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 20 20" fill="none">
        <path d="M2 10 Q5 4 8 10 Q11 16 14 10 Q17 4 20 10" stroke="#fff" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── Thinking animation ────────────────────────────────────────────────────────
function ThinkingDots({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px",
      background: P.surface, borderRadius: 12, border: `1px solid ${P.border}`,
      maxWidth: 260 }}>
      <style>{`
        @keyframes pulseDot { 0%,80%,100% { transform:scale(0.5); opacity:0.4 }
          40% { transform:scale(1); opacity:1 } }
      `}</style>
      <div style={{ display: "flex", gap: 5 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: "50%", background: P.purple, display: "block",
            animation: `pulseDot 1.4s ease-in-out ${i * 0.16}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 12, color: P.textMuted }}>{label}</span>
    </div>
  );
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function PulseMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  function renderInline(line: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    const re = /\*\*([^*]+)\*\*/g;
    let last = 0, m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      parts.push(
        <strong key={`b-${key++}`} style={{ color: P.purpleBright, fontWeight: 700 }}>{m[1]}</strong>
      );
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return parts.length === 1 ? parts[0] : <>{parts}</>;
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // ## Section header
    if (line.startsWith("## ")) {
      elements.push(
        <div key={key++} style={{ marginTop: i === 0 ? 0 : 28, marginBottom: 14 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "4px 12px 4px 10px",
            background: P.purpleBg, border: `1px solid ${P.purpleBorder}`,
            borderRadius: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: P.purple, display: "block", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: P.purple, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {line.slice(3)}
            </span>
          </div>
        </div>
      );
      i++;
      continue;
    }

    // **Bold line on its own** — section label like SHORT / MEDIUM / LONG / Concept N
    if (/^\*\*[^*]+\*\*$/.test(line.trim())) {
      elements.push(
        <p key={key++} style={{ margin: "12px 0 4px", fontSize: 13, fontWeight: 700, color: P.purpleBright }}>
          {line.trim().slice(2, -2)}
        </p>
      );
      i++;
      continue;
    }

    // Numbered list: 1. item
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\.\s(.*)/)!;
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 10, marginBottom: 6 }}>
          <span style={{
            minWidth: 22, height: 22, borderRadius: "50%",
            background: P.purpleBg, border: `1px solid ${P.purpleBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, color: P.purple, flexShrink: 0,
          }}>{num[1]}</span>
          <span style={{ fontSize: 13, color: P.text, lineHeight: 1.6, paddingTop: 2 }}>
            {renderInline(num[2])}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // Bullet: - item
    if (/^[-•]\s/.test(line)) {
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 10, marginBottom: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: P.purple,
            flexShrink: 0, marginTop: 7 }} />
          <span style={{ fontSize: 13, color: P.textMuted, lineHeight: 1.6 }}>
            {renderInline(line.slice(2))}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // Sub-labels like "Format:", "Visual:", "Why it converts:"
    if (/^(Format|Visual|Why it converts|Lead with|Don't attack|Avoid|Core demographic|Interest|Custom|Behaviour):/.test(line)) {
      const colon = line.indexOf(":");
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: P.textDim, flexShrink: 0, minWidth: 110, paddingTop: 1 }}>
            {line.slice(0, colon)}
          </span>
          <span style={{ fontSize: 13, color: P.text, lineHeight: 1.5 }}>
            {renderInline(line.slice(colon + 1).trim())}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: 6 }} />);
      i++;
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={key++} style={{ margin: "2px 0", fontSize: 13, color: P.text, lineHeight: 1.65 }}>
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div>{elements}</div>;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PulsePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"welcome" | "brief" | "results">("welcome");
  const [form, setForm] = useState<BriefForm>(BLANK_FORM);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [mounted, setMounted] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── localStorage hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pulse_campaigns");
      if (saved) {
        const parsed = JSON.parse(saved) as Campaign[];
        setCampaigns(parsed);
        if (parsed.length > 0) {
          setActiveId(parsed[0].id);
          setView("results");
        }
      }
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem("pulse_campaigns", JSON.stringify(campaigns.slice(0, 30)));
    } catch { /* ignore */ }
  }, [campaigns, mounted]);

  const activeCampaign = campaigns.find(c => c.id === activeId) ?? null;

  // ── Generate campaign
  async function generateCampaign() {
    if (!form.product.trim() || !form.audience.trim() || !form.goal.trim()) {
      setGenError("Please fill in Product, Audience, and Goal before generating.");
      return;
    }
    if (form.platforms.length === 0) {
      setGenError("Please select at least one platform.");
      return;
    }
    setGenError("");
    setGenerating(true);

    const id = `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newCampaign: Campaign = {
      id, output: "", createdAt: Date.now(), ...form,
    };
    setCampaigns(prev => [newCampaign, ...prev]);
    setActiveId(id);
    setView("results");

    try {
      const response = await fetch("/api/pulse-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok || !response.body) {
        throw new Error("Generation failed — please try again.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let output = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output += decoder.decode(value, { stream: true });
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, output } : c));
        if (resultsRef.current) {
          resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
        }
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Unknown error");
      setCampaigns(prev => prev.filter(c => c.id !== id));
      setView("brief");
    } finally {
      setGenerating(false);
    }
  }

  function selectCampaign(id: string) {
    setActiveId(id);
    setView("results");
  }

  function startNewBrief() {
    setForm(BLANK_FORM);
    setGenError("");
    setActiveId(null);
    setView("brief");
  }

  function deleteCampaign(id: string) {
    const next = campaigns.filter(c => c.id !== id);
    setCampaigns(next);
    if (activeId === id) {
      if (next.length > 0) { setActiveId(next[0].id); setView("results"); }
      else { setActiveId(null); setView("welcome"); }
    }
  }

  function togglePlatform(p: string) {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter(x => x !== p)
        : [...prev.platforms, p],
    }));
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const sidebar = (
    <aside style={{
      width: 272, flexShrink: 0, background: P.surface, borderRight: `1px solid ${P.border}`,
      display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${P.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <PulseMark size={28} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: P.text, letterSpacing: "0.3px" }}>Pulse</div>
            <div style={{ fontSize: 10, color: P.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>Marketing AI</div>
          </div>
        </div>
        <button onClick={startNewBrief} style={{
          width: "100%", padding: "10px 14px", background: P.purple, border: "none",
          borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          transition: "opacity 0.15s",
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Campaign
        </button>
      </div>

      {/* Campaign list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
        {campaigns.length === 0 ? (
          <div style={{ padding: "24px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📣</div>
            <p style={{ fontSize: 12, color: P.textDim, lineHeight: 1.5 }}>No campaigns yet.<br />Create your first one.</p>
          </div>
        ) : (
          <>
            <div style={{ padding: "4px 20px 8px", fontSize: 10, fontWeight: 700,
              color: P.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Recent Campaigns
            </div>
            {campaigns.map(c => {
              const isActive = c.id === activeId;
              return (
                <div key={c.id} onClick={() => selectCampaign(c.id)} style={{
                  padding: "10px 20px", cursor: "pointer", position: "relative",
                  background: isActive ? P.purpleBg : "transparent",
                  borderLeft: isActive ? `3px solid ${P.purple}` : "3px solid transparent",
                  transition: "background 0.15s",
                }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? P.purpleBright : P.text,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4 }}>
                    {c.product || "Untitled Campaign"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {c.platforms.slice(0, 3).map(pl => (
                        <span key={pl} style={{
                          fontSize: 9, fontWeight: 700, color: P.textDim,
                          background: P.surfaceRaised, borderRadius: 4, padding: "1px 5px",
                          textTransform: "uppercase", letterSpacing: "0.05em",
                        }}>
                          {abbrevPlatform(pl)}
                        </span>
                      ))}
                    </div>
                    <span style={{ fontSize: 10, color: P.textDim }}>{fmtDate(c.createdAt)}</span>
                  </div>
                  {/* Delete button */}
                  <button onClick={e => { e.stopPropagation(); deleteCampaign(c.id); }} style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: P.textDim,
                    fontSize: 14, padding: "4px 6px", display: "none",
                    borderRadius: 4,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.display = "block"; e.currentTarget.style.color = P.red; }}
                    onMouseLeave={e => { e.currentTarget.style.color = P.textDim; }}
                    title="Delete campaign"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${P.border}` }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 6,
          fontSize: 11, color: P.textDim, textDecoration: "none" }}
          onMouseEnter={e => (e.currentTarget.style.color = P.textMuted)}
          onMouseLeave={e => (e.currentTarget.style.color = P.textDim)}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Saabai.ai
        </a>
      </div>
    </aside>
  );

  // ── Welcome ───────────────────────────────────────────────────────────────
  const welcomeView = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 40, textAlign: "center" }}>
      <PulseMark size={56} />
      <h1 style={{ margin: "20px 0 8px", fontSize: 28, fontWeight: 800, color: P.text }}>
        Welcome to Pulse
      </h1>
      <p style={{ margin: "0 0 8px", fontSize: 16, color: P.textMuted, maxWidth: 420, lineHeight: 1.5 }}>
        Your AI campaign strategist. Turn a brief into ready-to-use ad creative in seconds.
      </p>
      <p style={{ margin: "0 0 36px", fontSize: 13, color: P.textDim }}>
        Headlines · Copy · Creative concepts · Audience targeting · Competitor positioning
      </p>

      <button onClick={startNewBrief} style={{
        padding: "14px 32px", background: P.purple, border: "none", borderRadius: 10,
        color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
        boxShadow: `0 4px 24px rgba(124,108,248,0.35)`,
        transition: "opacity 0.15s",
      }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        Create First Campaign →
      </button>

      {/* Platform badges */}
      <div style={{ display: "flex", gap: 10, marginTop: 40, flexWrap: "wrap", justifyContent: "center" }}>
        {ALL_PLATFORMS.map(pl => (
          <span key={pl} style={{
            padding: "6px 14px", background: P.surface, border: `1px solid ${P.border}`,
            borderRadius: 20, fontSize: 12, color: P.textMuted, fontWeight: 500,
          }}>
            {pl}
          </span>
        ))}
      </div>
    </div>
  );

  // ── Brief Form ────────────────────────────────────────────────────────────
  const briefView = (
    <div style={{ flex: 1, overflowY: "auto", padding: "40px 48px", maxWidth: 760 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12,
          padding: "4px 12px", background: P.purpleBg, border: `1px solid ${P.purpleBorder}`,
          borderRadius: 20 }}>
          <PulseMark size={16} />
          <span style={{ fontSize: 11, fontWeight: 700, color: P.purple, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Campaign Brief
          </span>
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: P.text }}>
          Tell Pulse about your campaign
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: P.textMuted }}>
          The more detail you give, the sharper the creative.
        </p>
      </div>

      {genError && (
        <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: `1px solid rgba(239,68,68,0.25)`,
          borderRadius: 8, marginBottom: 24, fontSize: 13, color: "#f87171" }}>
          {genError}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Product */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: P.textMuted,
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Product / Service <span style={{ color: P.purple }}>*</span>
          </label>
          <input value={form.product} onChange={e => setForm(p => ({ ...p, product: e.target.value }))}
            placeholder="e.g. Women's running shoes, SaaS analytics platform, Sydney yoga studio"
            style={{
              width: "100%", padding: "12px 14px", background: P.surface,
              border: `1px solid ${P.border}`, borderRadius: 8, color: P.text,
              fontSize: 14, outline: "none", boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = P.purple)}
            onBlur={e => (e.currentTarget.style.borderColor = P.border)}
          />
        </div>

        {/* Target Audience */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: P.textMuted,
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Target Audience <span style={{ color: P.purple }}>*</span>
          </label>
          <textarea value={form.audience} onChange={e => setForm(p => ({ ...p, audience: e.target.value }))}
            rows={2} placeholder="e.g. Women aged 25–45 in Australia who run recreationally, own iPhones, and follow fitness influencers"
            style={{
              width: "100%", padding: "12px 14px", background: P.surface,
              border: `1px solid ${P.border}`, borderRadius: 8, color: P.text,
              fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit",
              boxSizing: "border-box", lineHeight: 1.5,
              transition: "border-color 0.15s",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = P.purple)}
            onBlur={e => (e.currentTarget.style.borderColor = P.border)}
          />
        </div>

        {/* Goal */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: P.textMuted,
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Campaign Goal <span style={{ color: P.purple }}>*</span>
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {GOALS.map(g => {
              const active = form.goal === g;
              return (
                <button key={g} onClick={() => setForm(p => ({ ...p, goal: g }))} style={{
                  padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
                  background: active ? P.purpleBg : P.surface,
                  border: `1px solid ${active ? P.purple : P.border}`,
                  color: active ? P.purpleBright : P.textMuted,
                  transition: "all 0.15s",
                }}>
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Key Message */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: P.textMuted,
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Key Message / USP
          </label>
          <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
            rows={2} placeholder="e.g. 50% off this weekend only — fastest delivery in Australia — only 200 spots left"
            style={{
              width: "100%", padding: "12px 14px", background: P.surface,
              border: `1px solid ${P.border}`, borderRadius: 8, color: P.text,
              fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit",
              boxSizing: "border-box", lineHeight: 1.5,
              transition: "border-color 0.15s",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = P.purple)}
            onBlur={e => (e.currentTarget.style.borderColor = P.border)}
          />
        </div>

        {/* Tone */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: P.textMuted,
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Tone
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TONES.map(t => {
              const active = form.tone === t;
              return (
                <button key={t} onClick={() => setForm(p => ({ ...p, tone: t }))} style={{
                  padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 600,
                  background: active ? P.purpleBg : "transparent",
                  border: `1px solid ${active ? P.purple : P.border}`,
                  color: active ? P.purpleBright : P.textMuted,
                  transition: "all 0.15s",
                }}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Platforms */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: P.textMuted,
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Platforms <span style={{ color: P.purple }}>*</span>
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ALL_PLATFORMS.map(pl => {
              const active = form.platforms.includes(pl);
              return (
                <button key={pl} onClick={() => togglePlatform(pl)} style={{
                  padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
                  background: active ? P.purpleBg : P.surface,
                  border: `1px solid ${active ? P.purple : P.border}`,
                  color: active ? P.purpleBright : P.textMuted,
                  transition: "all 0.15s",
                }}>
                  {active && <span style={{ marginRight: 5 }}>✓</span>}
                  {pl}
                </button>
              );
            })}
          </div>
        </div>

        {/* Budget + Competitor (2 col) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: P.textMuted,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Budget <span style={{ color: P.textDim, fontWeight: 400, textTransform: "none" }}>(optional)</span>
            </label>
            <input value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
              placeholder="e.g. $500/week, $2,000 total"
              style={{
                width: "100%", padding: "12px 14px", background: P.surface,
                border: `1px solid ${P.border}`, borderRadius: 8, color: P.text,
                fontSize: 14, outline: "none", boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = P.purple)}
              onBlur={e => (e.currentTarget.style.borderColor = P.border)}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: P.textMuted,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Competitor <span style={{ color: P.textDim, fontWeight: 400, textTransform: "none" }}>(optional)</span>
            </label>
            <input value={form.competitor} onChange={e => setForm(p => ({ ...p, competitor: e.target.value }))}
              placeholder="e.g. Lululemon, HubSpot, F45"
              style={{
                width: "100%", padding: "12px 14px", background: P.surface,
                border: `1px solid ${P.border}`, borderRadius: 8, color: P.text,
                fontSize: 14, outline: "none", boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = P.purple)}
              onBlur={e => (e.currentTarget.style.borderColor = P.border)}
            />
          </div>
        </div>

        {/* Submit */}
        <div style={{ paddingTop: 8, paddingBottom: 48 }}>
          <button onClick={generateCampaign} disabled={generating} style={{
            padding: "14px 32px", background: P.purple, border: "none", borderRadius: 10,
            color: "#fff", fontSize: 15, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer",
            opacity: generating ? 0.6 : 1,
            boxShadow: `0 4px 24px rgba(124,108,248,0.3)`,
            transition: "opacity 0.15s",
          }}
            onMouseEnter={e => { if (!generating) e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = generating ? "0.6" : "1"; }}
          >
            {generating ? "Generating…" : "Generate Campaign Creative →"}
          </button>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: P.textDim }}>
            Powered by Claude Sonnet · Takes about 15–20 seconds
          </p>
        </div>
      </div>
    </div>
  );

  // ── Results View ──────────────────────────────────────────────────────────
  const resultsView = activeCampaign ? (
    <div ref={resultsRef} style={{ flex: 1, overflowY: "auto", padding: "36px 48px 60px", maxWidth: 800 }}>

      {/* Campaign header */}
      <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${P.border}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              {activeCampaign.platforms.map(pl => (
                <span key={pl} style={{
                  fontSize: 10, fontWeight: 700, color: P.purple, textTransform: "uppercase",
                  letterSpacing: "0.06em", background: P.purpleBg, border: `1px solid ${P.purpleBorder}`,
                  borderRadius: 4, padding: "2px 8px",
                }}>
                  {abbrevPlatform(pl)}
                </span>
              ))}
              <span style={{ fontSize: 10, fontWeight: 600, color: P.textDim,
                background: P.surfaceRaised, borderRadius: 4, padding: "2px 8px" }}>
                {activeCampaign.goal}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: P.textDim,
                background: P.surfaceRaised, borderRadius: 4, padding: "2px 8px" }}>
                {activeCampaign.tone}
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: P.text }}>
              {activeCampaign.product || "Campaign"}
            </h1>
            {activeCampaign.audience && (
              <p style={{ margin: "6px 0 0", fontSize: 13, color: P.textMuted, lineHeight: 1.4 }}>
                {activeCampaign.audience}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={startNewBrief} style={{
              padding: "8px 16px", background: P.surface, border: `1px solid ${P.border}`,
              borderRadius: 8, color: P.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "border-color 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = P.purple)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = P.border)}
            >
              + New Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Output */}
      {generating && !activeCampaign.output && (
        <div style={{ marginBottom: 24 }}>
          <ThinkingDots label="Crafting your campaign…" />
        </div>
      )}

      {activeCampaign.output ? (
        <PulseMarkdown text={activeCampaign.output} />
      ) : generating ? (
        <div style={{ height: 120 }} />
      ) : (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: P.textDim }}>No output yet. Try regenerating this campaign.</p>
        </div>
      )}

      {/* Streaming indicator */}
      {generating && activeCampaign.output && (
        <div style={{ marginTop: 16 }}>
          <ThinkingDots label="Still writing…" />
        </div>
      )}

      {/* Done state — brief recap */}
      {!generating && activeCampaign.output && (
        <div style={{ marginTop: 40, padding: 20, background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: 12 }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: P.textDim,
            textTransform: "uppercase", letterSpacing: "0.08em" }}>Brief Summary</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
            {[
              ["Product", activeCampaign.product],
              ["Goal", activeCampaign.goal],
              ["Tone", activeCampaign.tone],
              ["Platforms", activeCampaign.platforms.map(abbrevPlatform).join(", ")],
              ...(activeCampaign.budget ? [["Budget", activeCampaign.budget]] : []),
              ...(activeCampaign.competitor ? [["Competitor", activeCampaign.competitor]] : []),
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 12, color: P.textDim, minWidth: 72 }}>{label}</span>
                <span style={{ fontSize: 12, color: P.textMuted, fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, borderTop: `1px solid ${P.border}`, paddingTop: 14,
            display: "flex", gap: 10 }}>
            <button onClick={startNewBrief} style={{
              padding: "8px 16px", background: P.purple, border: "none", borderRadius: 8,
              color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
              + New Campaign
            </button>
            <button onClick={() => {
              navigator.clipboard?.writeText(activeCampaign.output).catch(() => {});
            }} style={{
              padding: "8px 16px", background: P.surface, border: `1px solid ${P.border}`,
              borderRadius: 8, color: P.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              Copy Output
            </button>
          </div>
        </div>
      )}
    </div>
  ) : null;

  // ── Root layout ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", background: P.bg,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: P.text, overflow: "hidden" }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${P.border}; border-radius: 2px; }
        ::placeholder { color: ${P.textDim}; }
        input, textarea, button { font-family: inherit; }
      `}</style>

      {sidebar}

      <main style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {view === "welcome" && welcomeView}
        {view === "brief" && briefView}
        {view === "results" && resultsView}
      </main>
    </div>
  );
}
