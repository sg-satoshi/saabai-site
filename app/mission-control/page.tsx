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

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "tools" | "builder" | "settings";

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
          {(["dashboard", "tools", "builder", "settings"] as Tab[]).map((tab) => {
            const icons: Record<Tab, React.ReactElement> = {
              dashboard: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /></svg>,
              tools: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L9 5H13L10 7.5L11 12L7 9.5L3 12L4 7.5L1 5H5L7 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>,
              builder: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" /></svg>,
              settings: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.6 2.6l1.1 1.1M10.3 10.3l1.1 1.1M2.6 11.4l1.1-1.1M10.3 3.7l1.1-1.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
            };
            const labels: Record<Tab, string> = { dashboard: "Dashboard", tools: "Tools", builder: "Builder", settings: "Settings" };
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
        {activeTab === "dashboard" && (
          <div className="p-8 max-w-4xl">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight mb-1">Dashboard</h1>
              <p className="text-saabai-text-dim text-sm">Overview of your active AI tools and agents.</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Active Tools", value: activeCount, icon: "●", color: "text-green-400" },
                { label: "Total Tools", value: tools.length, icon: "◆", color: "text-saabai-teal" },
                { label: "Voices Configured", value: tools.filter(t => t.voiceId).length, icon: "♪", color: "text-indigo-400" },
              ].map((stat) => (
                <div key={stat.label} className="bg-saabai-surface border border-saabai-border rounded-2xl p-5">
                  <div className={`text-xs font-medium mb-3 ${stat.color}`}>{stat.icon} {stat.label}</div>
                  <div className="text-3xl font-semibold text-saabai-text stat-glow">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Active tools */}
            <h2 className="text-sm font-medium text-saabai-text-dim uppercase tracking-wider mb-4">Active Tools</h2>
            <div className="flex flex-col gap-3">
              {tools.filter(activeTool).map((tool) => (
                <div key={tool.id} className="bg-saabai-surface border border-saabai-border rounded-2xl p-5 flex items-center justify-between group hover:border-saabai-border-accent transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.avatarColor} border border-saabai-teal/30 flex items-center justify-center text-xs font-bold text-saabai-teal`}>
                      {tool.avatarInitials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-saabai-text">{tool.name}</p>
                        <StatusBadge status={tool.status} />
                      </div>
                      <p className="text-xs text-saabai-text-dim">{tool.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-saabai-text-dim">
                    <span className="bg-white/5 rounded-lg px-2.5 py-1 font-mono">{tool.pages === "*" ? "All pages" : tool.pages}</span>
                    <button onClick={() => editTool(tool)} className="text-saabai-teal hover:text-saabai-teal-bright transition-colors">Edit →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
