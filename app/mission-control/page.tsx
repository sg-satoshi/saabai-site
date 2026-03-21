"use client";

import React, { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tool {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  voiceId: string;
  model: string;
  triggerText: string;
  triggerSubtext: string;
  avatarInitials: string;
  avatarColor: string;
  pages: string;
  status: "active" | "draft" | "paused";
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_TOOLS: Tool[] = [
  {
    id: "mia",
    name: "Mia",
    role: "AI Sales Agent · Saabai.ai",
    systemPrompt: "(Loaded from lib/chat-prompt.ts)",
    voiceId: "WotOlpik2Jh26pUiTVLy",
    model: "claude-sonnet-4-6",
    triggerText: "Ask Mia about automation",
    triggerSubtext: "AI-powered · Replies instantly",
    avatarInitials: "M",
    avatarColor: "from-saabai-teal/30 to-indigo-700/40",
    pages: "*",
    status: "active",
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
  },
  {
    id: "peter",
    name: "Peter Shane",
    role: "Founder · Saabai.ai",
    systemPrompt: "You are Peter Shane, founder of Saabai.ai...",
    voiceId: "txdmFzaxxwmYbb99FY4D",
    model: "claude-sonnet-4-6",
    triggerText: "Talk to Peter",
    triggerSubtext: "Got questions? I'm here.",
    avatarInitials: "PS",
    avatarColor: "from-saabai-teal/20 to-indigo-700/30",
    pages: "/onboarding/plon",
    status: "active",
    createdAt: "2026-03-21",
    updatedAt: "2026-03-21",
  },
];

const MODELS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (recommended)" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (fastest)" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6 (most capable)" },
];

const BLANK_TOOL: Omit<Tool, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  role: "",
  systemPrompt: "",
  voiceId: "",
  model: "claude-sonnet-4-6",
  triggerText: "Chat with us",
  triggerSubtext: "AI-powered · Replies instantly",
  avatarInitials: "",
  avatarColor: "from-saabai-teal/30 to-indigo-700/40",
  pages: "*",
  status: "draft",
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

const MC_KEY = "mc_unlocked_v1";
const MC_PASSWORD = (process.env.NEXT_PUBLIC_MC_PASSWORD ?? "saabai2026").trim();

function AuthGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function attempt() {
    if (pin.trim() === MC_PASSWORD) {
      sessionStorage.setItem(MC_KEY, "1");
      onUnlock();
    } else {
      setError(true);
      setPin("");
    }
  }

  return (
    <div className="min-h-screen bg-saabai-bg flex items-center justify-center font-[family-name:var(--font-geist-sans)]">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-saabai-surface border border-saabai-border mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--saabai-teal)" strokeWidth="1.5" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="var(--saabai-teal)" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1.5" fill="var(--saabai-teal)" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-saabai-text tracking-tight">Mission Control</h1>
          <p className="text-saabai-text-dim text-sm mt-2">Enter your access code</p>
        </div>
        <div className="flex flex-col gap-3">
          <input
            type="password"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false); }}
            onKeyDown={(e) => e.key === "Enter" && attempt()}
            placeholder="Access code"
            autoFocus
            className={`w-full bg-saabai-surface border rounded-xl px-4 py-3.5 text-sm text-saabai-text placeholder:text-saabai-text-dim focus:outline-none transition-colors text-center tracking-widest ${error ? "border-red-500/60" : "border-saabai-border focus:border-saabai-teal/60"}`}
          />
          {error && <p className="text-red-400 text-xs text-center">Incorrect — try again</p>}
          <button
            onClick={attempt}
            className="w-full bg-saabai-teal text-saabai-bg py-3.5 rounded-xl text-sm font-semibold hover:bg-saabai-teal-bright transition-colors"
            style={{ boxShadow: "0 0 24px rgba(98,197,209,0.25)" }}
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Tool["status"] }) {
  const styles = {
    active: "bg-green-500/10 text-green-400 border-green-500/20",
    draft: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    paused: "bg-white/5 text-saabai-text-dim border-white/10",
  };
  return (
    <span className={`text-[10px] font-medium border rounded-full px-2 py-0.5 ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function WidgetPreview({ tool }: { tool: Partial<Tool> }) {
  return (
    <div className="relative">
      <p className="text-[10px] text-saabai-text-dim uppercase tracking-widest mb-3 font-medium">Live Preview</p>
      {/* Launcher */}
      <div className="inline-flex items-center gap-3 bg-saabai-surface border border-saabai-teal/30 rounded-full pl-3 pr-5 py-2.5 shadow-lg"
        style={{ boxShadow: "0 0 24px rgba(98,197,209,0.15)" }}>
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${tool.avatarColor || "from-saabai-teal/30 to-indigo-700/40"} border border-saabai-teal/40 flex items-center justify-center text-xs font-bold text-saabai-teal shrink-0`}>
          {tool.avatarInitials || "?"}
        </div>
        <div>
          <p className="text-xs font-semibold text-saabai-text leading-none">{tool.triggerText || "Chat with us"}</p>
          <p className="text-[10px] text-saabai-text-dim mt-0.5">{tool.triggerSubtext || "AI-powered"}</p>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, hint, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-saabai-text-dim uppercase tracking-wider">{label}</label>
      {hint && <p className="text-[11px] text-saabai-text-dim -mt-0.5">{hint}</p>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-saabai-bg border border-saabai-border rounded-xl px-4 py-3 text-sm text-saabai-text placeholder:text-saabai-text-dim focus:outline-none focus:border-saabai-teal/60 transition-colors"
      />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, hint, rows = 6 }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-saabai-text-dim uppercase tracking-wider">{label}</label>
      {hint && <p className="text-[11px] text-saabai-text-dim -mt-0.5">{hint}</p>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="bg-saabai-bg border border-saabai-border rounded-xl px-4 py-3 text-sm text-saabai-text placeholder:text-saabai-text-dim focus:outline-none focus:border-saabai-teal/60 transition-colors resize-none font-mono text-xs leading-relaxed"
      />
    </div>
  );
}

// ─── Ventures data ────────────────────────────────────────────────────────────

const VENTURES = [
  {
    id: "saabai",
    name: "Saabai.ai",
    type: "Core Venture",
    stage: "In Market",
    stageColor: "text-green-400 bg-green-500/10 border-green-500/20",
    value: "Ongoing",
    nextAction: "Scale inbound — increase Mia conversations",
    url: "https://www.saabai.ai",
    color: "from-saabai-teal/20 to-blue-800/30",
    initials: "SA",
  },
  {
    id: "plon",
    name: "PlasticOnline (PLON)",
    type: "Client Engagement",
    stage: "Scoping",
    stageColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    value: "AUD $30–55k+",
    nextAction: "Complete scoping form — build AI agent proposal",
    url: "https://www.saabai.ai/onboarding/plon",
    color: "from-amber-500/20 to-orange-900/30",
    initials: "PL",
  },
  {
    id: "builder",
    name: "Builder Client",
    type: "Client Engagement",
    stage: "Qualifying",
    stageColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    value: "TBD",
    nextAction: "Awaiting fact find return before scoping",
    url: null,
    color: "from-blue-500/20 to-indigo-900/30",
    initials: "BC",
  },
];

// ─── Dashboard View ────────────────────────────────────────────────────────────

function DashboardView({ tools, activeCount, onEditTool, onNewTool, onTabChange }: {
  tools: Tool[];
  activeCount: number;
  onEditTool: (t: Tool) => void;
  onNewTool: () => void;
  onTabChange: (tab: Tab) => void;
}) {
  const [health, setHealth] = useState<Record<string, boolean> | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetch("/api/mission-control/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });

  const QUICK_ACTIONS = [
    { label: "Saabai.ai", sub: "Main site", href: "https://www.saabai.ai", icon: "↗", color: "text-saabai-teal" },
    { label: "PLON Onboarding", sub: "Client page", href: "https://www.saabai.ai/onboarding/plon", icon: "↗", color: "text-amber-400" },
    { label: "ElevenLabs", sub: "Voice studio", href: "https://elevenlabs.io/app", icon: "↗", color: "text-indigo-400" },
    { label: "Vercel", sub: "Deployments", href: "https://vercel.com/dashboard", icon: "↗", color: "text-white/70" },
    { label: "New Tool", sub: "Builder", href: null, icon: "+", color: "text-green-400", onClick: onNewTool },
    { label: "View Agents", sub: "Registry", href: null, icon: "◆", color: "text-saabai-teal", onClick: () => onTabChange("agents") },
  ];

  const HEALTH_ITEMS = [
    { key: "claude", label: "Claude API", desc: "AI brain" },
    { key: "elevenlabs", label: "ElevenLabs", desc: "TTS voice" },
    { key: "elevenlabsVoice", label: "Voice ID", desc: "Mia voice" },
    { key: "heygen", label: "HeyGen", desc: "Video avatar" },
    { key: "resend", label: "Resend", desc: "Email" },
  ];

  return (
    <div className="p-8 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs text-saabai-text-dim uppercase tracking-wider mb-1">{dateStr}</p>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">{greeting}, Shane.</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal animate-pulse" />
            <p className="text-sm text-saabai-text-dim italic">Atlas: &ldquo;What is the highest ROI action across all ventures right now?&rdquo;</p>
          </div>
        </div>
        <button
          onClick={onNewTool}
          className="flex items-center gap-2 px-4 py-2.5 bg-saabai-teal text-saabai-bg rounded-xl text-sm font-semibold hover:bg-saabai-teal-bright transition-colors shrink-0"
          style={{ boxShadow: "0 0 20px rgba(98,197,209,0.2)" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          New Tool
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Active Tools", value: activeCount, sub: `${tools.length} total`, color: "text-green-400", dot: "bg-green-400" },
          { label: "Active Agents", value: AGENTS.filter(a => a.status === "active").length, sub: `${AGENTS.length} total`, color: "text-saabai-teal", dot: "bg-saabai-teal" },
          { label: "Voices Live", value: tools.filter(t => t.voiceId && t.status === "active").length, sub: "ElevenLabs", color: "text-indigo-400", dot: "bg-indigo-400" },
          { label: "Client Engagements", value: VENTURES.filter(v => v.type === "Client Engagement").length, sub: "Active", color: "text-amber-400", dot: "bg-amber-400" },
        ].map((s) => (
          <div key={s.label} className="bg-saabai-surface border border-saabai-border rounded-2xl p-4 hover:border-saabai-border-accent transition-colors">
            <div className="flex items-center gap-1.5 mb-3">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              <span className={`text-[11px] font-medium ${s.color}`}>{s.label}</span>
            </div>
            <div className="text-3xl font-semibold text-saabai-text stat-glow mb-0.5">{s.value}</div>
            <div className="text-[11px] text-saabai-text-dim">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-[11px] font-semibold text-saabai-text-dim uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-6 gap-2">
          {QUICK_ACTIONS.map((a) => (
            a.href ? (
              <a key={a.label} href={a.href} target="_blank" rel="noopener noreferrer"
                className="bg-saabai-surface border border-saabai-border rounded-xl p-3 hover:border-saabai-border-accent transition-colors group flex flex-col gap-1.5">
                <span className={`text-base font-bold ${a.color} group-hover:scale-110 transition-transform inline-block`}>{a.icon}</span>
                <span className="text-xs font-medium text-saabai-text leading-tight">{a.label}</span>
                <span className="text-[10px] text-saabai-text-dim">{a.sub}</span>
              </a>
            ) : (
              <button key={a.label} onClick={a.onClick}
                className="bg-saabai-surface border border-saabai-border rounded-xl p-3 hover:border-saabai-border-accent transition-colors group flex flex-col gap-1.5 text-left">
                <span className={`text-base font-bold ${a.color} group-hover:scale-110 transition-transform inline-block`}>{a.icon}</span>
                <span className="text-xs font-medium text-saabai-text leading-tight">{a.label}</span>
                <span className="text-[10px] text-saabai-text-dim">{a.sub}</span>
              </button>
            )
          ))}
        </div>
      </div>

      {/* Ventures + Health side by side */}
      <div className="grid grid-cols-[1fr_220px] gap-4 mb-6">

        {/* Venture Tracker */}
        <div>
          <h2 className="text-[11px] font-semibold text-saabai-text-dim uppercase tracking-wider mb-3">Venture Tracker</h2>
          <div className="flex flex-col gap-2">
            {VENTURES.map((v) => (
              <div key={v.id} className="bg-saabai-surface border border-saabai-border rounded-xl p-4 hover:border-saabai-border-accent transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${v.color} border border-white/10 flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                      {v.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-saabai-text">{v.name}</p>
                        <span className={`text-[9px] font-medium border rounded-full px-1.5 py-0.5 ${v.stageColor}`}>{v.stage}</span>
                      </div>
                      <p className="text-[11px] text-saabai-text-dim mt-0.5">{v.type}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-saabai-text">{v.value}</p>
                    {v.url && (
                      <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-saabai-teal hover:text-saabai-teal-bright transition-colors">Open ↗</a>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-saabai-border/50 flex items-start gap-1.5">
                  <span className="text-[9px] text-saabai-teal uppercase font-semibold mt-0.5 shrink-0">Next</span>
                  <p className="text-[11px] text-saabai-text-muted">{v.nextAction}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div>
          <h2 className="text-[11px] font-semibold text-saabai-text-dim uppercase tracking-wider mb-3">System Health</h2>
          <div className="bg-saabai-surface border border-saabai-border rounded-xl overflow-hidden">
            {HEALTH_ITEMS.map((item, i) => {
              const ok = health?.[item.key];
              const loading = health === null;
              return (
                <div key={item.key} className={`flex items-center justify-between px-4 py-3 ${i < HEALTH_ITEMS.length - 1 ? "border-b border-saabai-border/50" : ""}`}>
                  <div>
                    <p className="text-xs font-medium text-saabai-text">{item.label}</p>
                    <p className="text-[10px] text-saabai-text-dim">{item.desc}</p>
                  </div>
                  {loading ? (
                    <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
                  ) : ok ? (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-[10px] text-green-400">OK</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-400/60" />
                      <span className="text-[10px] text-red-400/70">Missing</span>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="px-4 py-2 border-t border-saabai-border/50 bg-saabai-bg/40">
              <button
                onClick={() => fetch("/api/mission-control/health").then(r => r.json()).then(setHealth)}
                className="text-[10px] text-saabai-text-dim hover:text-saabai-teal transition-colors"
              >
                ↺ Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Tools */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold text-saabai-text-dim uppercase tracking-wider">Active Tools</h2>
          <button onClick={() => onTabChange("tools")} className="text-[11px] text-saabai-teal hover:text-saabai-teal-bright transition-colors">View all →</button>
        </div>
        <div className="flex flex-col gap-2">
          {tools.filter(t => t.status === "active").map((tool) => (
            <div key={tool.id} className="bg-saabai-surface border border-saabai-border rounded-xl px-4 py-3.5 flex items-center justify-between hover:border-saabai-border-accent transition-colors group">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tool.avatarColor} border border-saabai-teal/30 flex items-center justify-center text-[10px] font-bold text-saabai-teal shrink-0`}>
                  {tool.avatarInitials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-saabai-text">{tool.name}</p>
                    <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-1.5 py-0.5">Live</span>
                  </div>
                  <p className="text-[11px] text-saabai-text-dim mt-0.5">{tool.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-white/5 rounded-lg px-2 py-1 font-mono text-saabai-text-dim">{tool.model.split("-")[1]}</span>
                {tool.voiceId && <span className="text-[10px] bg-indigo-500/10 text-indigo-400 rounded-lg px-2 py-1">Voice</span>}
                <span className="text-[10px] bg-white/5 rounded-lg px-2 py-1 font-mono text-saabai-text-dim">{tool.pages === "*" ? "All pages" : tool.pages}</span>
                <button onClick={() => onEditTool(tool)} className="text-[11px] text-saabai-teal hover:text-saabai-teal-bright transition-colors ml-1 opacity-0 group-hover:opacity-100">Edit →</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Agent Registry ───────────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  role: string;
  cluster: string;
  status: "active" | "archived";
  color: string;
  initials: string;
  mission: string;
  skills: string[];
  outputs: string[];
  hardRule?: string;
}

const AGENT_CLUSTERS = [
  {
    id: "orchestrator",
    label: "Orchestrator",
    description: "Strategic oversight, capital allocation, operating rules",
    color: "text-saabai-teal",
    borderColor: "border-saabai-teal/40",
    bgColor: "bg-saabai-teal/5",
  },
  {
    id: "build",
    label: "Build & Automation",
    description: "Systems, infrastructure, workflows",
    color: "text-indigo-400",
    borderColor: "border-indigo-400/30",
    bgColor: "bg-indigo-400/5",
  },
  {
    id: "growth",
    label: "Growth & Revenue",
    description: "Demand generation, paid traffic, creative",
    color: "text-emerald-400",
    borderColor: "border-emerald-400/30",
    bgColor: "bg-emerald-400/5",
  },
  {
    id: "ops",
    label: "Operations",
    description: "Systems design, SOPs, delivery frameworks",
    color: "text-amber-400",
    borderColor: "border-amber-400/30",
    bgColor: "bg-amber-400/5",
  },
  {
    id: "archived",
    label: "Archived",
    description: "Inactive — available for reactivation",
    color: "text-saabai-text-dim",
    borderColor: "border-white/10",
    bgColor: "bg-white/3",
  },
];

const AGENTS: Agent[] = [
  {
    id: "atlas",
    name: "Atlas",
    role: "Orchestration Intelligence",
    cluster: "orchestrator",
    status: "active",
    color: "from-saabai-teal/30 to-blue-700/40",
    initials: "AT",
    mission: "Build profitable automated ventures while minimising operator workload. Ask: what is the highest ROI action across all ventures right now?",
    skills: ["Venture strategy", "Capital allocation", "Agent coordination", "Task routing", "Build execution", "Decision-making"],
    outputs: ["Venture plans", "Agent task assignments", "Build decisions", "ROI assessments"],
    hardRule: "Fix problems directly. Avoid partial solutions.",
  },
  {
    id: "developer",
    name: "Developer",
    role: "Build & Infrastructure Agent",
    cluster: "build",
    status: "active",
    color: "from-indigo-500/30 to-indigo-900/40",
    initials: "DEV",
    mission: "Execute validated opportunities into scalable, self-running systems. Configure before building. No-code before code.",
    skills: ["Landing pages", "Cold email systems", "Zapier / Make workflows", "AI chatbots", "API integrations", "Scraping & data pipelines", "CRM setup", "Checkout flows"],
    outputs: ["Build plans", "Live systems", "Integration specs", "Technical docs"],
    hardRule: "No-code before code. Simple before scalable. New landing page < 4 hours.",
  },
  {
    id: "automation-engineer",
    name: "Automation Engineer",
    role: "Workflow Reliability Agent",
    cluster: "build",
    status: "active",
    color: "from-indigo-400/20 to-purple-800/40",
    initials: "AE",
    mission: "Eliminate manual operator work by building reliable, self-running workflows. Not product builders — reliability engineers.",
    skills: ["Process auditing", "Make / Zapier / n8n", "CRM automation", "Payment triggers", "Lead routing", "Error monitoring", "SOP documentation"],
    outputs: ["Automation specs", "Monitoring dashboards", "Failure alerts", "Process docs"],
    hardRule: "If it needs babysitting, it is not done.",
  },
  {
    id: "marketing",
    name: "Marketing",
    role: "Demand Generation Agent",
    cluster: "growth",
    status: "active",
    color: "from-emerald-500/20 to-teal-900/40",
    initials: "MKT",
    mission: "Design how ventures attract attention, generate leads, and convert customers. Channel strategy, offer design, funnel design.",
    skills: ["Cold email", "LinkedIn outreach", "Reddit / forums", "Positioning & messaging", "Funnel design", "Offer structuring", "Conversion optimisation", "Acquisition systems"],
    outputs: ["Channel strategies", "Funnel maps", "Messaging frameworks", "Campaign briefs"],
    hardRule: "No scaling without validated signal. Cheapest channel first.",
  },
  {
    id: "paid-ads",
    name: "Paid Ads Scientist",
    role: "Paid Traffic & CAC Agent",
    cluster: "growth",
    status: "active",
    color: "from-emerald-400/20 to-green-900/40",
    initials: "PAS",
    mission: "Design, test, and optimise paid traffic systems. Goal: profitable customer acquisition. No scaling before signal.",
    skills: ["Meta Ads", "Google Search", "LinkedIn Ads", "TikTok Ads", "YouTube Ads", "Creative testing", "CAC modelling", "Audience strategy", "Landing page briefs"],
    outputs: ["Test structures", "Campaign briefs", "Hook variants", "Scaling decisions"],
    hardRule: "No scaling before signal. No signal before test structure.",
  },
  {
    id: "creative-director",
    name: "Creative Director",
    role: "Brand & Messaging Agent",
    cluster: "growth",
    status: "active",
    color: "from-pink-500/20 to-rose-900/40",
    initials: "CD",
    mission: "Ensure all external output is clear, persuasive, visually coherent, and aligned with Saabai's premium positioning.",
    skills: ["Brand consistency", "Copywriting", "Website UX", "Ad creative", "Content creation", "Design direction", "Messaging strategy", "Competitive intelligence"],
    outputs: ["Creative briefs", "Copy", "Design direction", "Brand audits", "UX feedback"],
    hardRule: "Does NOT write production code. Proposes — does not deploy.",
  },
  {
    id: "operations-architect",
    name: "Operations Architect",
    role: "Systems & SOP Agent",
    cluster: "ops",
    status: "active",
    color: "from-amber-500/20 to-orange-900/40",
    initials: "OA",
    mission: "Design systems, SOPs, and operating frameworks that make ventures run without constant operator involvement.",
    skills: ["SOP development", "Process mapping", "Operating rhythm design", "Delivery frameworks", "Tool stack design", "Role definition", "Reporting systems", "Onboarding design"],
    outputs: ["SOPs", "Process maps", "Operating systems", "Delivery frameworks"],
    hardRule: "Operational complexity must be justified by measurable leverage.",
  },
  {
    id: "research",
    name: "Research",
    role: "Opportunity Intelligence Agent",
    cluster: "archived",
    status: "archived",
    color: "from-gray-500/20 to-gray-800/40",
    initials: "RES",
    mission: "Intelligence arm identifying, surfacing, and validating profitable opportunities. Kills bad ideas fast.",
    skills: ["Market research", "Demand validation", "Competitor analysis", "Market sizing", "Opportunity scoring", "ICP definition"],
    outputs: ["Opportunity scores (/ 25)", "Market analysis", "ICP profiles", "Evidence reports"],
  },
  {
    id: "finance",
    name: "Finance",
    role: "Capital Allocation Agent",
    cluster: "archived",
    status: "archived",
    color: "from-gray-500/20 to-gray-800/40",
    initials: "FIN",
    mission: "Financial gatekeeper protecting resources. Evaluates opportunities and decides: INVEST / TEST SMALL / KILL.",
    skills: ["Unit economics", "CAC modelling", "LTV analysis", "Break-even modelling", "Risk assessment", "Financial scoring", "Capital efficiency"],
    outputs: ["INVEST / TEST / KILL decisions", "Financial models", "Unit economics", "Risk assessments"],
    hardRule: "LTV:CAC > 3:1 minimum. All figures in AUD.",
  },
  {
    id: "sales",
    name: "Sales",
    role: "Revenue Generation Agent",
    cluster: "archived",
    status: "archived",
    color: "from-gray-500/20 to-gray-800/40",
    initials: "SAL",
    mission: "Generate revenue fast. Builds systematised sales assets, not one-off pitches.",
    skills: ["Offer structuring", "Cold outreach", "LinkedIn DMs", "Funnel design", "Conversion optimisation", "Objection handling", "CRM pipeline", "Closing frameworks"],
    outputs: ["Outreach sequences", "Sales funnels", "Offer docs", "Closing scripts"],
  },
];

// ─── Agent Tree View ───────────────────────────────────────────────────────────

function AgentsView() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["atlas"]));

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const activeAgents = AGENTS.filter((a) => a.status === "active");
  const archivedAgents = AGENTS.filter((a) => a.status === "archived");

  const clusterMap = AGENT_CLUSTERS.reduce<Record<string, typeof AGENT_CLUSTERS[0]>>(
    (acc, c) => ({ ...acc, [c.id]: c }),
    {}
  );

  // Build tree: orchestrator → clusters → agents
  const clusterGroups = ["build", "growth", "ops"].map((clusterId) => ({
    cluster: clusterMap[clusterId],
    agents: activeAgents.filter((a) => a.cluster === clusterId),
  }));

  function AgentCard({ agent, indent = 0 }: { agent: Agent; indent?: number }) {
    const isExpanded = expanded.has(agent.id);
    const cluster = clusterMap[agent.cluster];

    return (
      <div style={{ marginLeft: indent * 20 }}>
        {/* Connector line */}
        {indent > 0 && (
          <div className="flex items-stretch" style={{ marginLeft: -20 }}>
            <div className="w-5 flex flex-col items-center">
              <div className="w-px flex-1 bg-saabai-border" />
              <div className="w-3 h-px bg-saabai-border" />
            </div>
            <div className="flex-1">
              <AgentCardInner agent={agent} cluster={cluster} isExpanded={isExpanded} onToggle={() => toggle(agent.id)} />
            </div>
          </div>
        )}
        {indent === 0 && (
          <AgentCardInner agent={agent} cluster={cluster} isExpanded={isExpanded} onToggle={() => toggle(agent.id)} />
        )}
      </div>
    );
  }

  function AgentCardInner({ agent, cluster, isExpanded, onToggle }: {
    agent: Agent; cluster: typeof AGENT_CLUSTERS[0]; isExpanded: boolean; onToggle: () => void;
  }) {
    return (
      <div className={`mb-2 rounded-xl border transition-colors ${agent.status === "archived" ? "border-white/8 opacity-60" : isExpanded ? cluster.borderColor : "border-saabai-border hover:border-saabai-border-accent"}`}>
        {/* Header row */}
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 p-4 text-left"
        >
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${agent.color} border border-white/10 flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
            {agent.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-saabai-text">{agent.name}</span>
              {agent.status === "active" ? (
                <span className="text-[9px] font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-1.5 py-0.5">Active</span>
              ) : (
                <span className="text-[9px] font-medium bg-white/5 text-saabai-text-dim border border-white/10 rounded-full px-1.5 py-0.5">Archived</span>
              )}
            </div>
            <p className="text-xs text-saabai-text-dim mt-0.5 truncate">{agent.role}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-medium ${cluster.color} hidden sm:block`}>{cluster.label}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={`text-saabai-text-dim transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
              <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-saabai-border/50 pt-4">
            <p className="text-xs text-saabai-text-muted leading-relaxed mb-4">{agent.mission}</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold text-saabai-text-dim uppercase tracking-wider mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.skills.map((s) => (
                    <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full border ${cluster.bgColor} ${cluster.borderColor} ${cluster.color}`}>{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-saabai-text-dim uppercase tracking-wider mb-2">Outputs</p>
                <div className="flex flex-col gap-1">
                  {agent.outputs.map((o) => (
                    <div key={o} className="flex items-center gap-1.5 text-[11px] text-saabai-text-muted">
                      <span className={`w-1 h-1 rounded-full shrink-0 ${cluster.color.replace("text-", "bg-")}`} />
                      {o}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {agent.hardRule && (
              <div className="mt-4 pt-3 border-t border-saabai-border/50 flex items-start gap-2">
                <span className="text-[10px] text-saabai-teal shrink-0 mt-0.5">RULE</span>
                <p className="text-[11px] text-saabai-text-dim italic">&ldquo;{agent.hardRule}&rdquo;</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Agent Registry</h1>
        <p className="text-saabai-text-dim text-sm">All active and archived agents — roles, skills, and hierarchy.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-5">
          <div className="text-xs font-medium text-green-400 mb-2">● Active Agents</div>
          <div className="text-3xl font-semibold text-saabai-text stat-glow">{activeAgents.length}</div>
        </div>
        <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-5">
          <div className="text-xs font-medium text-saabai-text-dim mb-2">◌ Archived</div>
          <div className="text-3xl font-semibold text-saabai-text">{archivedAgents.length}</div>
        </div>
        <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-5">
          <div className="text-xs font-medium text-saabai-teal mb-2">◆ Clusters</div>
          <div className="text-3xl font-semibold text-saabai-text stat-glow">{clusterGroups.length}</div>
        </div>
      </div>

      {/* Tree */}
      <div>
        {/* Orchestrator */}
        <div className="mb-1">
          <AgentCard agent={AGENTS.find((a) => a.id === "atlas")!} />
        </div>

        {/* Root connector */}
        <div className="flex ml-4 mb-1">
          <div className="w-px h-4 bg-saabai-border mx-auto" style={{ marginLeft: 0 }} />
        </div>

        {/* Cluster branches */}
        <div className="flex flex-col gap-0">
          {clusterGroups.map((group, gi) => {
            const c = group.cluster;
            const isLast = gi === clusterGroups.length - 1;
            return (
              <div key={c.id} className="flex">
                {/* Vertical line from parent */}
                <div className="flex flex-col items-center" style={{ width: 20 }}>
                  <div className={`w-px ${isLast ? "h-4" : "flex-1"} bg-saabai-border`} />
                  <div className="w-3 h-px bg-saabai-border" />
                  {!isLast && <div className="w-px flex-1 bg-saabai-border" />}
                </div>

                <div className="flex-1 mb-4">
                  {/* Cluster header */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${c.borderColor} ${c.bgColor} mb-2`}>
                    <span className={`text-xs font-semibold ${c.color}`}>{c.label}</span>
                    <span className="text-saabai-text-dim text-xs">—</span>
                    <span className="text-xs text-saabai-text-dim">{c.description}</span>
                    <span className={`ml-auto text-[10px] ${c.color} bg-white/5 rounded-full px-1.5 py-0.5`}>{group.agents.length} agents</span>
                  </div>

                  {/* Agents in cluster */}
                  <div className="ml-3">
                    {group.agents.map((agent) => (
                      <AgentCard key={agent.id} agent={agent} indent={1} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Archived */}
        <div className="mt-6 pt-6 border-t border-saabai-border">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/8 bg-white/3 mb-3">
            <span className="text-xs font-semibold text-saabai-text-dim">Archived</span>
            <span className="text-saabai-text-dim text-xs">—</span>
            <span className="text-xs text-saabai-text-dim">Inactive agents — available for reactivation</span>
            <span className="ml-auto text-[10px] text-saabai-text-dim bg-white/5 rounded-full px-1.5 py-0.5">{archivedAgents.length} agents</span>
          </div>
          <div className="flex flex-col gap-0">
            {archivedAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "agents" | "tools" | "builder" | "settings";

export default function MissionControl() {
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [tools, setTools] = useState<Tool[]>(DEFAULT_TOOLS);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [draftTool, setDraftTool] = useState<Partial<Tool>>(BLANK_TOOL);
  const [saved, setSaved] = useState(false);

  // Check session
  useEffect(() => {
    if (sessionStorage.getItem(MC_KEY) === "1") setAuthed(true);
  }, []);

  // Load saved tools from localStorage
  useEffect(() => {
    if (!authed) return;
    try {
      const stored = localStorage.getItem("mc_tools_v1");
      if (stored) {
        const parsed = JSON.parse(stored) as Tool[];
        // Merge with defaults (keep defaults if not overridden)
        const ids = parsed.map((t) => t.id);
        const merged = [
          ...DEFAULT_TOOLS.filter((d) => !ids.includes(d.id)),
          ...parsed,
        ];
        setTools(merged);
      }
    } catch {}
  }, [authed]);

  const persistTools = useCallback((updated: Tool[]) => {
    setTools(updated);
    // Only persist non-default tools (or overrides)
    localStorage.setItem("mc_tools_v1", JSON.stringify(updated));
  }, []);

  function startNewTool() {
    setEditingTool(null);
    setDraftTool({ ...BLANK_TOOL });
    setActiveTab("builder");
  }

  function editTool(tool: Tool) {
    setEditingTool(tool);
    setDraftTool({ ...tool });
    setActiveTab("builder");
  }

  function saveTool() {
    const now = new Date().toISOString().split("T")[0];
    const tool: Tool = {
      id: editingTool?.id ?? `tool_${Date.now()}`,
      name: draftTool.name ?? "",
      role: draftTool.role ?? "",
      systemPrompt: draftTool.systemPrompt ?? "",
      voiceId: draftTool.voiceId ?? "",
      model: draftTool.model ?? "claude-sonnet-4-6",
      triggerText: draftTool.triggerText ?? "Chat with us",
      triggerSubtext: draftTool.triggerSubtext ?? "AI-powered · Replies instantly",
      avatarInitials: draftTool.avatarInitials ?? draftTool.name?.slice(0, 2).toUpperCase() ?? "AI",
      avatarColor: draftTool.avatarColor ?? "from-saabai-teal/30 to-indigo-700/40",
      pages: draftTool.pages ?? "*",
      status: draftTool.status ?? "draft",
      createdAt: editingTool?.createdAt ?? now,
      updatedAt: now,
    };

    const updated = editingTool
      ? tools.map((t) => (t.id === editingTool.id ? tool : t))
      : [...tools, tool];

    persistTools(updated);
    setEditingTool(tool);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function deleteTool(id: string) {
    if (!confirm("Delete this tool?")) return;
    persistTools(tools.filter((t) => t.id !== id));
    if (editingTool?.id === id) {
      setEditingTool(null);
      setDraftTool({ ...BLANK_TOOL });
    }
  }

  function toggleStatus(id: string) {
    persistTools(tools.map((t) => {
      if (t.id !== id) return t;
      return { ...t, status: t.status === "active" ? "paused" : "active" };
    }));
  }

  const activeTool = (t: Tool) => t.status === "active";
  const activeCount = tools.filter(activeTool).length;

  if (!authed) return <AuthGate onUnlock={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-saabai-bg text-saabai-text font-[family-name:var(--font-geist-sans)] flex">

      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-saabai-border flex flex-col py-6 px-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-saabai-teal/10 border border-saabai-teal/30 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="var(--saabai-teal)" strokeWidth="1.2" />
              <circle cx="7" cy="7" r="2" fill="var(--saabai-teal)" />
              <path d="M7 1v2M7 11v2M1 7h2M11 7h2" stroke="var(--saabai-teal)" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-saabai-text leading-none">Mission Control</p>
            <p className="text-[10px] text-saabai-text-dim mt-0.5">Saabai.ai</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <p className="text-[9px] font-semibold text-saabai-text-dim uppercase tracking-widest px-3 mb-1">Workspace</p>
          {(["dashboard", "agents"] as const).map((tab) => {
            const icons: Record<string, React.ReactElement> = {
              dashboard: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /></svg>,
              agents: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" /><circle cx="10" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M1 11c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M10 7c1.7 0 3 1.3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
            };
            const labels: Record<string, string> = { dashboard: "Dashboard", agents: "Agents" };
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${active ? "bg-saabai-teal/10 text-saabai-teal border border-saabai-teal/20" : "text-saabai-text-muted hover:text-saabai-text hover:bg-white/5"}`}
              >
                {icons[tab]}
                <span>{labels[tab]}</span>
                {tab === "agents" && <span className="ml-auto text-[10px] bg-saabai-teal/10 text-saabai-teal rounded-full px-1.5 py-0.5">{AGENTS.filter(a => a.status === "active").length}</span>}
              </button>
            );
          })}

          <p className="text-[9px] font-semibold text-saabai-text-dim uppercase tracking-widest px-3 mt-4 mb-1">Build</p>
          {(["tools", "builder", "settings"] as Tab[]).map((tab) => {
            const icons: Record<string, React.ReactElement> = {
              tools: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L9 5H13L10 7.5L11 12L7 9.5L3 12L4 7.5L1 5H5L7 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>,
              builder: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" /></svg>,
              settings: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.6 2.6l1.1 1.1M10.3 10.3l1.1 1.1M2.6 11.4l1.1-1.1M10.3 3.7l1.1-1.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
            };
            const labels: Record<string, string> = { tools: "Tools", builder: "Builder", settings: "Settings" };
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${active ? "bg-saabai-teal/10 text-saabai-teal border border-saabai-teal/20" : "text-saabai-text-muted hover:text-saabai-text hover:bg-white/5"}`}
              >
                {icons[tab]}
                <span>{labels[tab]}</span>
                {tab === "tools" && <span className="ml-auto text-[10px] bg-saabai-teal/10 text-saabai-teal rounded-full px-1.5 py-0.5">{tools.length}</span>}
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-saabai-border">
          <button
            onClick={startNewTool}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-saabai-teal text-saabai-bg rounded-lg text-xs font-semibold hover:bg-saabai-teal-bright transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            New Tool
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-y-auto">

        {/* ── Dashboard ── */}
        {activeTab === "dashboard" && <DashboardView tools={tools} activeCount={activeCount} onEditTool={editTool} onNewTool={startNewTool} onTabChange={setActiveTab} />}

        {/* ── Agents ── */}
        {activeTab === "agents" && <AgentsView />}

        {/* ── Tools ── */}
        {activeTab === "tools" && (
          <div className="p-8 max-w-4xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight mb-1">Tools</h1>
                <p className="text-saabai-text-dim text-sm">All configured AI agents and widgets.</p>
              </div>
              <button
                onClick={startNewTool}
                className="flex items-center gap-2 px-4 py-2 bg-saabai-teal text-saabai-bg rounded-lg text-sm font-semibold hover:bg-saabai-teal-bright transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                New Tool
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {tools.map((tool) => (
                <div key={tool.id} className="bg-saabai-surface border border-saabai-border rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.avatarColor} border border-saabai-teal/30 flex items-center justify-center text-sm font-bold text-saabai-teal shrink-0`}>
                        {tool.avatarInitials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-saabai-text">{tool.name}</p>
                          <StatusBadge status={tool.status} />
                        </div>
                        <p className="text-sm text-saabai-text-dim">{tool.role}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-saabai-text-dim">
                          <span className="bg-white/5 rounded px-2 py-0.5 font-mono">{tool.model.split("-").slice(1).join("-")}</span>
                          {tool.voiceId && <span className="bg-white/5 rounded px-2 py-0.5">Voice enabled</span>}
                          <span className="bg-white/5 rounded px-2 py-0.5">{tool.pages === "*" ? "All pages" : tool.pages}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleStatus(tool.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-saabai-border hover:border-saabai-border-accent text-saabai-text-dim hover:text-saabai-text transition-colors"
                      >
                        {tool.status === "active" ? "Pause" : "Activate"}
                      </button>
                      <button
                        onClick={() => editTool(tool)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-saabai-teal/10 border border-saabai-teal/20 text-saabai-teal hover:bg-saabai-teal/20 transition-colors"
                      >
                        Edit
                      </button>
                      {!["mia", "peter"].includes(tool.id) && (
                        <button
                          onClick={() => deleteTool(tool.id)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Builder ── */}
        {activeTab === "builder" && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight mb-1">
                  {editingTool ? `Edit — ${editingTool.name}` : "New Tool"}
                </h1>
                <p className="text-saabai-text-dim text-sm">Configure an AI agent, chatbot, or voice assistant.</p>
              </div>
              <div className="flex items-center gap-3">
                {saved && (
                  <span className="text-xs text-green-400 flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Saved
                  </span>
                )}
                <button
                  onClick={saveTool}
                  disabled={!draftTool.name}
                  className="px-5 py-2.5 bg-saabai-teal text-saabai-bg rounded-lg text-sm font-semibold hover:bg-saabai-teal-bright disabled:opacity-40 transition-colors"
                  style={{ boxShadow: "0 0 16px rgba(98,197,209,0.2)" }}
                >
                  {editingTool ? "Save Changes" : "Create Tool"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_280px] gap-8 max-w-5xl">
              {/* Form */}
              <div className="flex flex-col gap-6">

                {/* Identity */}
                <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-6">
                  <h2 className="text-xs font-semibold text-saabai-text-dim uppercase tracking-wider mb-5">Identity</h2>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Name" value={draftTool.name ?? ""} onChange={(v) => setDraftTool(d => ({ ...d, name: v, avatarInitials: d.avatarInitials || v.slice(0, 2).toUpperCase() }))} placeholder="e.g. Mia, Alex, Jordan" />
                      <Input label="Avatar Initials" value={draftTool.avatarInitials ?? ""} onChange={(v) => setDraftTool(d => ({ ...d, avatarInitials: v.slice(0, 3).toUpperCase() }))} placeholder="e.g. MIA, PS" />
                    </div>
                    <Input label="Role / Tagline" value={draftTool.role ?? ""} onChange={(v) => setDraftTool(d => ({ ...d, role: v }))} placeholder="e.g. AI Sales Agent · Saabai.ai" />
                  </div>
                </div>

                {/* System Prompt */}
                <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-6">
                  <h2 className="text-xs font-semibold text-saabai-text-dim uppercase tracking-wider mb-5">System Prompt</h2>
                  <Textarea
                    label="Persona & Instructions"
                    value={draftTool.systemPrompt ?? ""}
                    onChange={(v) => setDraftTool(d => ({ ...d, systemPrompt: v }))}
                    placeholder={`You are [Name], [role] at [company].\n\nYour job is to...\n\nAlways:\n- Keep replies short (2–3 sentences)\n- Be warm and direct\n- Ask one question at a time`}
                    hint="Define who this agent is, what they do, and how they should behave."
                    rows={10}
                  />
                </div>

                {/* Voice */}
                <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-6">
                  <h2 className="text-xs font-semibold text-saabai-text-dim uppercase tracking-wider mb-5">Voice</h2>
                  <div className="flex flex-col gap-4">
                    <Input
                      label="ElevenLabs Voice ID"
                      value={draftTool.voiceId ?? ""}
                      onChange={(v) => setDraftTool(d => ({ ...d, voiceId: v }))}
                      placeholder="e.g. WotOlpik2Jh26pUiTVLy"
                      hint="Leave blank to disable voice. Find IDs at elevenlabs.io/app/voice-library"
                    />
                  </div>
                </div>

                {/* Model */}
                <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-6">
                  <h2 className="text-xs font-semibold text-saabai-text-dim uppercase tracking-wider mb-5">AI Model</h2>
                  <div className="flex flex-col gap-2">
                    {MODELS.map((m) => (
                      <label key={m.id} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors hover:border-saabai-border-accent group" style={{ borderColor: draftTool.model === m.id ? "rgba(98,197,209,0.4)" : undefined, background: draftTool.model === m.id ? "rgba(98,197,209,0.05)" : undefined }}>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${draftTool.model === m.id ? "border-saabai-teal" : "border-white/20"}`}>
                          {draftTool.model === m.id && <div className="w-2 h-2 rounded-full bg-saabai-teal" />}
                        </div>
                        <span className="text-sm text-saabai-text-muted group-hover:text-saabai-text transition-colors">{m.label}</span>
                        <input type="radio" className="sr-only" checked={draftTool.model === m.id} onChange={() => setDraftTool(d => ({ ...d, model: m.id }))} />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Deployment */}
                <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-6">
                  <h2 className="text-xs font-semibold text-saabai-text-dim uppercase tracking-wider mb-5">Deployment</h2>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Trigger Button Text" value={draftTool.triggerText ?? ""} onChange={(v) => setDraftTool(d => ({ ...d, triggerText: v }))} placeholder="Chat with us" />
                      <Input label="Trigger Subtext" value={draftTool.triggerSubtext ?? ""} onChange={(v) => setDraftTool(d => ({ ...d, triggerSubtext: v }))} placeholder="AI-powered · Replies instantly" />
                    </div>
                    <Input
                      label="Show on pages"
                      value={draftTool.pages ?? "*"}
                      onChange={(v) => setDraftTool(d => ({ ...d, pages: v }))}
                      placeholder="* for all pages, or /onboarding/plon"
                      hint="* = all pages. Use a URL path to restrict to specific pages."
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-saabai-text-dim uppercase tracking-wider">Status</label>
                      <div className="flex gap-2">
                        {(["draft", "active", "paused"] as Tool["status"][]).map((s) => (
                          <button
                            key={s}
                            onClick={() => setDraftTool(d => ({ ...d, status: s }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${draftTool.status === s ? "bg-saabai-teal/10 border-saabai-teal/30 text-saabai-teal" : "border-saabai-border text-saabai-text-dim hover:text-saabai-text"}`}
                          >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Preview sidebar */}
              <div className="flex flex-col gap-6">
                <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-5 sticky top-6">
                  <WidgetPreview tool={draftTool} />

                  <div className="mt-6 pt-5 border-t border-saabai-border">
                    <p className="text-[10px] text-saabai-text-dim uppercase tracking-widest mb-3 font-medium">Embed Code</p>
                    <div className="bg-saabai-bg rounded-xl p-3 font-mono text-[10px] text-saabai-text-dim leading-relaxed border border-saabai-border">
                      {`<PeterAvatarWidget\n  name="${draftTool.name || "Agent"}"\n  voiceId="${draftTool.voiceId || ""}"\n  pages="${draftTool.pages || "*"}"\n/>`}
                    </div>
                    <p className="text-[10px] text-saabai-text-dim mt-2">Drop this into any page component.</p>
                  </div>

                  {draftTool.systemPrompt && (
                    <div className="mt-4 pt-4 border-t border-saabai-border">
                      <p className="text-[10px] text-saabai-text-dim uppercase tracking-widest mb-2 font-medium">Prompt Preview</p>
                      <p className="text-[11px] text-saabai-text-dim leading-relaxed line-clamp-4">{draftTool.systemPrompt}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Settings ── */}
        {activeTab === "settings" && (
          <div className="p-8 max-w-2xl">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight mb-1">Settings</h1>
              <p className="text-saabai-text-dim text-sm">Environment and configuration overview.</p>
            </div>

            <div className="flex flex-col gap-4">
              {[
                { label: "ElevenLabs API Key", key: "ELEVENLABS_API_KEY", desc: "Text-to-speech · Set in Vercel env vars" },
                { label: "ElevenLabs Voice ID (Mia)", key: "ELEVENLABS_VOICE_ID", desc: "Default voice for Mia · Override per-tool with voiceId" },
                { label: "HeyGen API Key", key: "HEYGEN_API_KEY", desc: "Video avatar streaming · Set in Vercel env vars" },
                { label: "Mission Control Password", key: "NEXT_PUBLIC_MC_PASSWORD", desc: "Change in Vercel env vars and redeploy" },
                { label: "Chat Model (Default)", key: "CHAT_MODEL", desc: "Defaults to claude-sonnet-4-6" },
              ].map((item) => (
                <div key={item.key} className="bg-saabai-surface border border-saabai-border rounded-2xl p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-saabai-text">{item.label}</p>
                    <p className="text-xs text-saabai-text-dim mt-0.5">{item.desc}</p>
                  </div>
                  <span className="text-[10px] font-mono bg-saabai-bg border border-saabai-border px-2.5 py-1.5 rounded-lg text-saabai-text-dim shrink-0">{item.key}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-saabai-border">
              <h2 className="text-sm font-medium text-saabai-text-dim uppercase tracking-wider mb-4">Danger Zone</h2>
              <button
                onClick={() => {
                  if (!confirm("Reset all tool configs to defaults?")) return;
                  localStorage.removeItem("mc_tools_v1");
                  setTools(DEFAULT_TOOLS);
                }}
                className="px-4 py-2.5 border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 rounded-lg text-sm transition-colors"
              >
                Reset all tools to defaults
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
