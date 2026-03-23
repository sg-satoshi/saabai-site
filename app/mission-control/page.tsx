"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";

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
    name: "Pete",
    role: "Founder · Saabai.ai",
    systemPrompt: "You are Pete, founder of Saabai.ai...",
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

// ─── Growth types (mirrors lib/redis.ts) ─────────────────────────────────────

interface LeadRecord {
  id: string;
  name?: string;
  business?: string;
  industry?: string;
  team_size?: string;
  pain_points?: string[];
  qualification_score?: number;
  outcome: "booked" | "lead_captured" | "browsing" | "qualified";
  page?: string;
  messages?: number;
  createdAt: string;
}

interface ConversationRecord {
  id: string;
  visitorFacts?: Record<string, unknown>;
  qualificationScore?: number;
  outcome?: string;
  messageCount?: number;
  pageContext?: string;
  keyTopics?: string[];
  createdAt: string;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Growth View ──────────────────────────────────────────────────────────────

function GrowthView() {
  const [stats, setStats] = useState<{ totalLeads: number; booked: number; captured: number; qualified: number; totalConvs: number } | null>(null);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [convs, setConvs] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"leads" | "conversations">("leads");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | "booked" | "lead_captured" | "qualified" | "browsing">("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [statsRes, leadsRes, convsRes] = await Promise.all([
        fetch("/api/growth").then(r => r.json()).catch(() => null),
        fetch("/api/growth?type=leads").then(r => r.json()).catch(() => ({ leads: [] })),
        fetch("/api/growth?type=conversations").then(r => r.json()).catch(() => ({ conversations: [] })),
      ]);
      setStats(statsRes);
      setLeads(leadsRes.leads ?? []);
      setConvs(convsRes.conversations ?? []);
      setLoading(false);
    }
    load();
  }, []);

  function outcomeStyle(outcome: string) {
    if (outcome === "booked") return "bg-green-500/10 text-green-400 border-green-500/20";
    if (outcome === "lead_captured") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (outcome === "qualified") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-white/5 text-saabai-text-dim border-white/10";
  }

  function outcomeLabel(outcome: string) {
    if (outcome === "booked") return "Booking shown";
    if (outcome === "lead_captured") return "Lead captured";
    if (outcome === "qualified") return "Qualified";
    return "Browsing";
  }

  const noRedis = stats === null && !loading;

  const avgScore = leads.length > 0
    ? (leads.reduce((s, l) => s + (Number(l.qualification_score) ?? 0), 0) / leads.length).toFixed(1)
    : null;

  const filteredLeads = outcomeFilter === "all" ? leads : leads.filter(l => l.outcome === outcomeFilter);

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Growth</h1>
          <p className="text-saabai-text-dim text-sm">Leads, conversations, and Mia&apos;s performance across all pages.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const headers = ["Name","Business","Industry","Team Size","Outcome","Score","Page","Messages","Date"];
              const rows = leads.map(l => [l.name??"",l.business??"",l.industry??"",l.team_size??"",l.outcome,l.qualification_score??"",l.page??"",l.messages??"",l.createdAt]);
              const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
              const blob = new Blob([csv],{type:"text/csv"});
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href=url; a.download=`leads-${new Date().toISOString().split("T")[0]}.csv`; a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-xs text-saabai-text-dim hover:text-saabai-teal transition-colors px-3 py-2 border border-saabai-border rounded-lg"
          >
            ↓ Export CSV
          </button>
          <button
            onClick={() => { setLoading(true); fetch("/api/growth").then(r => r.json()).then(d => { setStats(d); setLoading(false); }); }}
            className="text-xs text-saabai-text-dim hover:text-saabai-teal transition-colors px-3 py-2 border border-saabai-border rounded-lg"
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      {noRedis && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-6">
          <p className="text-sm font-medium text-amber-400 mb-1">Redis not connected</p>
          <p className="text-xs text-amber-400/70">Add <code className="bg-black/20 px-1 rounded">UPSTASH_REDIS_REST_URL</code> and <code className="bg-black/20 px-1 rounded">UPSTASH_REDIS_REST_TOKEN</code> to Vercel env vars to start capturing leads and conversations.</p>
          <a href="https://upstash.com" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400 hover:text-amber-300 mt-2 inline-block">Set up Upstash Redis free →</a>
        </div>
      )}

      {/* Stats + funnel side by side */}
      <div className="grid grid-cols-[1fr_200px] gap-4 mb-6">

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Leads", value: stats?.totalLeads ?? 0, color: "text-saabai-teal", dot: "bg-saabai-teal", bar: "bg-saabai-teal" },
            { label: "Conversations", value: stats?.totalConvs ?? 0, color: "text-indigo-400", dot: "bg-indigo-400", bar: "bg-indigo-400" },
            { label: "Qualified", value: stats?.qualified ?? 0, color: "text-amber-400", dot: "bg-amber-400", bar: "bg-amber-400" },
            { label: "Booking Shown", value: stats?.booked ?? 0, color: "text-green-400", dot: "bg-green-400", bar: "bg-green-400" },
            { label: "Lead Captured", value: stats?.captured ?? 0, color: "text-blue-400", dot: "bg-blue-400", bar: "bg-blue-400" },
            { label: "Conv. Rate", value: stats?.totalConvs ? `${Math.round(((stats.booked + stats.captured) / stats.totalConvs) * 100)}%` : "—", color: "text-pink-400", dot: "bg-pink-400", bar: null },
          ].map((s) => {
            const max = stats?.totalConvs || 1;
            const pct = typeof s.value === "number" ? Math.min((s.value / max) * 100, 100) : null;
            return (
              <div key={s.label} className="bg-saabai-surface border border-saabai-border rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  <span className={`text-[10px] font-medium ${s.color}`}>{s.label}</span>
                </div>
                <div className={`text-2xl font-semibold mb-2 ${loading ? "text-saabai-text-dim animate-pulse" : "text-saabai-text"}`}>{s.value}</div>
                {pct !== null && s.bar && (
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${s.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Funnel diagram */}
        <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-4 flex flex-col">
          <p className="text-base font-semibold text-saabai-text mb-4">Mia Funnel</p>
          {[
            { label: "Conversations", value: stats?.totalConvs ?? 0, color: "bg-indigo-400/60", w: "100%" },
            { label: "Qualified", value: stats?.qualified ?? 0, color: "bg-amber-400/60", w: stats?.totalConvs ? `${Math.max(20, Math.round(((stats.qualified) / stats.totalConvs) * 100))}%` : "60%" },
            { label: "Captured", value: stats?.captured ?? 0, color: "bg-blue-400/60", w: stats?.totalConvs ? `${Math.max(15, Math.round((stats.captured / stats.totalConvs) * 100))}%` : "45%" },
            { label: "Booked", value: stats?.booked ?? 0, color: "bg-green-400/70", w: stats?.totalConvs ? `${Math.max(10, Math.round((stats.booked / stats.totalConvs) * 100))}%` : "30%" },
          ].map((stage) => (
            <div key={stage.label} className="mb-2 flex flex-col items-center">
              <div className="w-full flex justify-center mb-0.5">
                <div className={`h-6 rounded-md ${stage.color} flex items-center justify-center gap-1.5 transition-all duration-700`} style={{ width: stage.w }}>
                  <span className="text-[9px] font-semibold text-white/90 whitespace-nowrap px-1">{stage.label}</span>
                </div>
              </div>
              <span className="text-[10px] text-saabai-text-dim">{loading ? "…" : stage.value}</span>
            </div>
          ))}
        </div>
      </div>

      {avgScore && (
        <div className="mt-3 bg-saabai-surface border border-saabai-border rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0" />
          <span className="text-[10px] font-medium text-pink-400">Avg Qualification Score</span>
          <span className="text-lg font-semibold text-saabai-text ml-auto">{avgScore}<span className="text-[11px] text-saabai-text-dim">/3</span></span>
        </div>
      )}

      {/* Section tabs + filters */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2 mt-6">
        <div className="flex items-center gap-1 bg-saabai-surface border border-saabai-border rounded-xl p-1">
          {(["leads", "conversations"] as const).map((s) => (
            <button key={s} onClick={() => setActiveSection(s)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeSection === s ? "bg-saabai-teal text-saabai-bg" : "text-saabai-text-dim hover:text-saabai-text"}`}>
              {s === "leads" ? `Leads (${leads.length})` : `Conversations (${convs.length})`}
            </button>
          ))}
        </div>
        {activeSection === "leads" && (
          <div className="flex items-center gap-1 flex-wrap">
            {(["all", "booked", "qualified", "lead_captured", "browsing"] as const).map((f) => {
              const count = f === "all" ? leads.length : leads.filter(l => l.outcome === f).length;
              const labels: Record<string, string> = { all: "All", booked: "Booking", qualified: "Qualified", lead_captured: "Captured", browsing: "Browsing" };
              return (
                <button key={f} onClick={() => setOutcomeFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${outcomeFilter === f ? "bg-saabai-teal text-saabai-bg" : "bg-saabai-surface border border-saabai-border text-saabai-text-dim hover:text-saabai-text"}`}>
                  {labels[f]} {count > 0 ? `(${count})` : ""}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Leads list */}
      {activeSection === "leads" && (
        <div>
          {loading ? (
            <div className="flex flex-col gap-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-saabai-surface border border-saabai-border rounded-xl animate-pulse" />)}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-saabai-teal/10 border border-saabai-teal/20 flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="var(--saabai-teal)" strokeWidth="1.5" /><path d="M3 17c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="var(--saabai-teal)" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </div>
              <p className="text-sm font-medium text-saabai-text mb-1">No leads yet</p>
              <p className="text-xs text-saabai-text-dim">Leads appear here when Mia learns about a visitor — name, business, industry, or pain points.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredLeads.map((lead) => (
                <div key={lead.id} className={`rounded-xl p-4 hover:border-saabai-border-accent transition-colors border ${(lead.qualification_score ?? 0) >= 2 ? "bg-amber-500/5 border-amber-500/25" : "bg-saabai-surface border-saabai-border"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-saabai-teal/20 to-indigo-800/30 border border-saabai-teal/20 flex items-center justify-center text-[10px] font-bold text-saabai-teal shrink-0 mt-0.5">
                        {(lead.name ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-medium text-saabai-text">{lead.name ?? "Anonymous visitor"}</p>
                          <span className={`text-[9px] font-medium border rounded-full px-1.5 py-0.5 ${outcomeStyle(lead.outcome)}`}>{outcomeLabel(lead.outcome)}</span>
                        </div>
                        {lead.business && <p className="text-xs text-saabai-text-muted mb-1">{lead.business}</p>}
                        <div className="flex flex-wrap gap-1.5">
                          {lead.industry && <span className="text-[10px] bg-white/5 text-saabai-text-dim rounded px-1.5 py-0.5">{lead.industry}</span>}
                          {lead.team_size && <span className="text-[10px] bg-white/5 text-saabai-text-dim rounded px-1.5 py-0.5">{lead.team_size}</span>}
                          {lead.qualification_score !== undefined && <span className="text-[10px] bg-saabai-teal/10 text-saabai-teal rounded px-1.5 py-0.5">Score {lead.qualification_score}/3</span>}
                          {lead.page && lead.page !== "/" && <span className="text-[10px] bg-white/5 text-saabai-text-dim rounded px-1.5 py-0.5 font-mono">{lead.page}</span>}
                        </div>
                        {lead.pain_points && lead.pain_points.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {lead.pain_points.slice(0, 3).map((p, i) => (
                              <span key={i} className="text-[10px] bg-amber-500/10 text-amber-400/80 border border-amber-500/15 rounded px-1.5 py-0.5">{p}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-saabai-text-dim">{timeAgo(lead.createdAt)}</p>
                      {lead.messages && <p className="text-[10px] text-saabai-text-dim mt-0.5">{lead.messages} msgs</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conversations list */}
      {activeSection === "conversations" && (
        <div>
          {loading ? (
            <div className="flex flex-col gap-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-saabai-surface border border-saabai-border rounded-xl animate-pulse" />)}
            </div>
          ) : convs.length === 0 ? (
            <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-saabai-teal/10 border border-saabai-teal/20 flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H7l-4 3V5a1 1 0 0 1 1-1z" stroke="var(--saabai-teal)" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              </div>
              <p className="text-sm font-medium text-saabai-text mb-1">No conversations yet</p>
              <p className="text-xs text-saabai-text-dim">Conversations appear here after Mia qualifies or captures a lead.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {convs.map((conv) => (
                <div key={conv.id} className="bg-saabai-surface border border-saabai-border rounded-xl px-4 py-3.5 hover:border-saabai-border-accent transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-saabai-teal/15 to-indigo-800/20 border border-saabai-teal/20 flex items-center justify-center shrink-0">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4" r="2" stroke="var(--saabai-teal)" strokeWidth="1.2" /><path d="M2 10c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="var(--saabai-teal)" strokeWidth="1.2" strokeLinecap="round" /></svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-medium text-saabai-text">
                            {conv.visitorFacts?.name as string ?? "Anonymous"}
                            {conv.visitorFacts?.business ? ` · ${conv.visitorFacts.business as string}` : ""}
                          </p>
                          {conv.outcome && (
                            <span className={`text-[9px] font-medium border rounded-full px-1.5 py-0.5 ${outcomeStyle(conv.outcome)}`}>{outcomeLabel(conv.outcome)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {conv.qualificationScore !== undefined && <span className="text-[10px] text-saabai-text-dim">Qual: {conv.qualificationScore}/3</span>}
                          {conv.messageCount ? <span className="text-[10px] text-saabai-text-dim">{conv.messageCount} msgs</span> : null}
                          {conv.pageContext && conv.pageContext !== "/" && <span className="text-[10px] font-mono text-saabai-text-dim">{conv.pageContext}</span>}
                          {conv.keyTopics && conv.keyTopics.slice(0, 3).map((t, i) => (
                            <span key={i} className="text-[10px] bg-white/5 text-saabai-text-dim rounded px-1 py-0.5">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-saabai-text-dim shrink-0">{timeAgo(conv.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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

  const [activityLeads, setActivityLeads] = useState<LeadRecord[]>([]);
  const [perfStats, setPerfStats] = useState<{totalLeads: number; booked: number; captured: number; qualified: number; totalConvs: number} | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/growth?type=leads").then(r => r.json()).catch(() => ({ leads: [] })),
      fetch("/api/growth").then(r => r.json()).catch(() => null),
    ]).then(([leadsRes, statsRes]) => {
      setActivityLeads((leadsRes.leads ?? []).slice(0, 6));
      setPerfStats(statsRes);
    });
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
          { label: "Active Tools", value: activeCount, sub: `${tools.length} total`, color: "text-green-400", dot: "bg-green-400", tab: "tools" as Tab },
          { label: "Active Agents", value: AGENTS.filter(a => a.status === "active").length, sub: `${AGENTS.length} total`, color: "text-saabai-teal", dot: "bg-saabai-teal", tab: "agents" as Tab },
          { label: "Voices Live", value: tools.filter(t => t.voiceId && t.status === "active").length, sub: "ElevenLabs", color: "text-indigo-400", dot: "bg-indigo-400", tab: "tools" as Tab },
          { label: "Client Engagements", value: VENTURES.filter(v => v.type === "Client Engagement").length, sub: "Active", color: "text-amber-400", dot: "bg-amber-400", tab: "growth" as Tab },
        ].map((s) => (
          <button key={s.label} onClick={() => onTabChange(s.tab)}
            className="bg-saabai-surface border border-saabai-border rounded-2xl p-4 hover:border-saabai-border-accent hover:bg-white/[0.02] transition-colors cursor-pointer text-left group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                <span className={`text-[11px] font-medium ${s.color}`}>{s.label}</span>
              </div>
              <span className={`text-[10px] ${s.color} opacity-0 group-hover:opacity-100 transition-opacity`}>View →</span>
            </div>
            <div className="text-3xl font-semibold text-saabai-text stat-glow mb-0.5">{s.value}</div>
            <div className="text-[11px] text-saabai-text-dim">{s.sub}</div>
          </button>
        ))}
      </div>

      {/* Mia Performance Bar */}
      <div className="bg-saabai-surface border border-saabai-border rounded-2xl px-5 py-4 mb-6 flex items-center gap-5 flex-wrap">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-saabai-teal/30 to-indigo-700/40 border border-saabai-teal/30 flex items-center justify-center text-[10px] font-bold text-saabai-teal">M</div>
          <div>
            <p className="text-xs font-semibold text-saabai-text leading-none">Mia</p>
            <p className="text-[10px] text-saabai-text-dim mt-0.5">Live performance</p>
          </div>
        </div>
        <div className="w-px h-8 bg-saabai-border shrink-0" />
        {[
          { label: "Conversations", value: perfStats?.totalConvs ?? "—", color: "text-indigo-400" },
          { label: "Qualified", value: perfStats?.qualified ?? "—", color: "text-amber-400" },
          { label: "Bookings", value: perfStats?.booked ?? "—", color: "text-green-400" },
          { label: "Conv Rate", value: perfStats && perfStats.totalConvs > 0 ? `${Math.round(((perfStats.booked + perfStats.captured) / perfStats.totalConvs) * 100)}%` : "—", color: "text-saabai-teal" },
          { label: "Avg Score", value: activityLeads.length > 0 ? `${(activityLeads.reduce((s, l) => s + (l.qualification_score ?? 0), 0) / activityLeads.length).toFixed(1)}/3` : "—", color: "text-pink-400" },
          { label: "Last Active", value: activityLeads[0] ? timeAgo(activityLeads[0].createdAt) : "—", color: "text-saabai-text-dim" },
        ].map((m) => (
          <div key={m.label} className="flex flex-col items-center min-w-[56px]">
            <span className={`text-lg font-semibold ${m.color}`}>{m.value}</span>
            <span className="text-[9px] text-saabai-text-dim mt-0.5 text-center">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-saabai-text mb-3">Quick Actions</h2>
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
          <h2 className="text-base font-semibold text-saabai-text mb-3">Venture Tracker</h2>
          <div className="flex flex-col gap-2">
            {VENTURES.map((v) => {
              const CardWrapper = v.url
                ? ({ children }: { children: React.ReactNode }) => (
                    <a href={v.url} target="_blank" rel="noopener noreferrer"
                      className="bg-saabai-surface border border-saabai-border rounded-xl p-4 hover:border-saabai-border-accent hover:bg-white/[0.02] transition-colors cursor-pointer block group">
                      {children}
                    </a>
                  )
                : ({ children }: { children: React.ReactNode }) => (
                    <button onClick={() => onTabChange("growth")}
                      className="bg-saabai-surface border border-saabai-border rounded-xl p-4 hover:border-saabai-border-accent hover:bg-white/[0.02] transition-colors cursor-pointer w-full text-left block group">
                      {children}
                    </button>
                  );
              return (
                <CardWrapper key={v.id}>
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
                        <span className="text-[10px] text-saabai-teal group-hover:text-saabai-teal-bright transition-colors">Open ↗</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-saabai-border/50 flex items-start gap-1.5">
                    <span className="text-[9px] text-saabai-teal uppercase font-semibold mt-0.5 shrink-0">Next</span>
                    <p className="text-[11px] text-saabai-text-muted">{v.nextAction}</p>
                  </div>
                </CardWrapper>
              );
            })}
          </div>
        </div>

        {/* System Health */}
        <div>
          <h2 className="text-base font-semibold text-saabai-text mb-3">System Health</h2>
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

      {/* Active Tools + Activity Feed */}
      <div className="grid grid-cols-2 gap-4">
        {/* Active Tools */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-saabai-text">Active Tools</h2>
            <button onClick={() => onTabChange("tools")} className="text-[11px] text-saabai-teal hover:text-saabai-teal-bright transition-colors">View all →</button>
          </div>
          <div className="flex flex-col gap-2">
            {tools.filter(t => t.status === "active").map((tool) => (
              <button key={tool.id} onClick={() => onEditTool(tool)} className="bg-saabai-surface border border-saabai-border rounded-xl px-4 py-3.5 flex items-center justify-between hover:border-saabai-border-accent hover:bg-white/[0.02] transition-colors group w-full text-left cursor-pointer">
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
                  <span className="text-[11px] text-saabai-teal group-hover:text-saabai-teal-bright transition-colors ml-1 opacity-0 group-hover:opacity-100">Edit →</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-saabai-text">Activity Feed</h2>
            <button onClick={() => onTabChange("growth")} className="text-[11px] text-saabai-teal hover:text-saabai-teal-bright transition-colors">View all →</button>
          </div>
          {activityLeads.length === 0 ? (
            <div className="bg-saabai-surface border border-saabai-border rounded-xl p-6 text-center">
              <div className="w-8 h-8 rounded-full bg-saabai-teal/10 border border-saabai-teal/20 flex items-center justify-center mx-auto mb-3">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 8l3-3.5 2.5 2L9 3l4 5" stroke="var(--saabai-teal)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <p className="text-xs text-saabai-text-dim">No activity yet — Mia conversations will appear here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activityLeads.slice(0, 5).map((lead) => {
                const outcomeColor = lead.outcome === "booked" ? "text-green-400 bg-green-500/10 border-green-500/20"
                  : lead.outcome === "lead_captured" ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
                  : lead.outcome === "qualified" ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                  : "text-saabai-text-dim bg-white/5 border-white/10";
                const outcomeLabel = lead.outcome === "booked" ? "Booking" : lead.outcome === "lead_captured" ? "Captured" : lead.outcome === "qualified" ? "Qualified" : "Browsing";
                const dotColor = lead.outcome === "booked" ? "bg-green-400" : lead.outcome === "lead_captured" ? "bg-blue-400" : lead.outcome === "qualified" ? "bg-amber-400" : "bg-white/20";
                return (
                  <div key={lead.id} className="bg-saabai-surface border border-saabai-border rounded-xl px-3 py-2.5 flex items-center gap-3 hover:border-saabai-border-accent transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-saabai-text truncate">
                        {lead.name ?? "Anonymous visitor"}{lead.business ? ` · ${lead.business}` : ""}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-medium border rounded-full px-1.5 py-0.5 ${outcomeColor}`}>{outcomeLabel}</span>
                        {(lead.qualification_score ?? 0) > 0 && (
                          <span className="text-[9px] text-saabai-text-dim">{lead.qualification_score}/3</span>
                        )}
                        {lead.industry && <span className="text-[9px] text-saabai-text-dim">{lead.industry}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-saabai-text-dim shrink-0">{timeAgo(lead.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          )}
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

  const [agentNotes, setAgentNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mc_agent_notes_v1");
      if (stored) setAgentNotes(JSON.parse(stored));
    } catch {}
  }, []);

  function saveNote(agentId: string, note: string) {
    const updated = { ...agentNotes, [agentId]: note };
    setAgentNotes(updated);
    localStorage.setItem("mc_agent_notes_v1", JSON.stringify(updated));
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
              <span className="text-base font-semibold text-saabai-text">{agent.name}</span>
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

            {/* Improvement Notes */}
            <div className="mt-4 pt-3 border-t border-saabai-border/50">
              <p className="text-[10px] font-semibold text-saabai-text-dim uppercase tracking-wider mb-2">Improvement Notes</p>
              <textarea
                value={agentNotes[agent.id] ?? ""}
                onChange={(e) => saveNote(agent.id, e.target.value)}
                placeholder={`What should ${agent.name} learn or do better? Notes persist across sessions.`}
                rows={2}
                className="w-full bg-saabai-bg border border-saabai-border rounded-lg px-3 py-2 text-xs text-saabai-text placeholder:text-saabai-text-dim/40 focus:outline-none focus:border-saabai-teal/40 transition-colors resize-none leading-relaxed"
                onClick={(e) => e.stopPropagation()}
              />
              {agentNotes[agent.id] && (
                <p className="text-[9px] text-green-400/70 mt-1">✓ Notes saved</p>
              )}
            </div>
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

// ─── Edge — Performance Coach ─────────────────────────────────────────────────

const EDGE_TRUTHS = [
  "You don't rise to the level of your goals. You fall to the level of your systems.",
  "Pressure is a privilege. Only people who matter to outcomes feel it.",
  "The obstacle is not in the way. The obstacle is the way.",
  "Comfort is the enemy of growth. Seek discomfort deliberately.",
  "Your identity precedes your results. What you believe about yourself sets the ceiling.",
  "Energy is not unlimited. Where you invest it reveals your real priorities.",
  "Most people optimise for how they look. Optimise for what you produce.",
  "The voice that says you can't is lying. The one that says it's fine when it's not — that one's dangerous.",
  "You can be tired and still move. Tired is not the same as done.",
  "If you wouldn't choose it today, why are you still carrying it?",
  "Winning is a habit. So is losing. You're building one right now.",
  "The gap between who you are and who you want to be is closed by action, not intention.",
  "Standards you tolerate are standards you set.",
  "Fear of failure is usually fear of judgement. Name it correctly.",
  "The goal is not to feel motivated. The goal is to act whether you do or not.",
];

interface EdgeProfileData {
  updatedAt?: string;
  totalSessions?: number;
  lastMood?: number;
  lastSessionDate?: string;
  coreGoals?: string;
  currentFocus?: string;
  patterns?: string;
  strengths?: string;
  challenges?: string;
  breakthroughs?: string;
  commitments?: string;
  watchFor?: string;
  worksWith?: string;
  rawNotes?: string;
}

interface EdgeSessionData {
  id: string;
  createdAt: string;
  mood?: number;
  summary?: string;
  topics?: string;
  insights?: string;
  newCommitments?: string;
  messageCount?: number;
}

function moodColor(mood: number) {
  if (mood >= 8) return "bg-green-400";
  if (mood >= 5) return "bg-amber-400";
  return "bg-red-400";
}

function moodLabel(mood: number) {
  if (mood >= 9) return "Peak";
  if (mood >= 7) return "Strong";
  if (mood >= 5) return "Steady";
  if (mood >= 3) return "Low";
  return "Rough";
}

function dateBrisbane(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" });
}

function getEdgeMessageText(message: UIMessage): string {
  // Handle AI SDK v5 parts array
  if (Array.isArray(message.parts) && message.parts.length > 0) {
    const fromParts = message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n\n");
    if (fromParts) return fromParts;
  }
  // Fallback: content may be a plain string (e.g. from sessionStorage restore of older format)
  if (typeof (message as unknown as { content: unknown }).content === "string") {
    return (message as unknown as { content: string }).content;
  }
  return "";
}

function EdgeView() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const edgeChatOptions: any = {
    transport: new DefaultChatTransport({ api: "/api/edge/chat" }),
  };
  const { messages, sendMessage, status, setMessages } = useChat(edgeChatOptions);
  const isLoading = status === "submitted" || status === "streaming";

  const [input, setInput] = React.useState("");
  const [profile, setProfile] = React.useState<EdgeProfileData | null>(null);
  const [sessions, setSessions] = React.useState<EdgeSessionData[]>([]);
  const hasTodaySession = sessions.some(s => dateBrisbane(new Date(s.createdAt)) === dateBrisbane(new Date()));
  const [mood, setMood] = React.useState<number | null>(null);
  const [sessionStarted, setSessionStarted] = React.useState(false);
  const [sessionEnding, setSessionEnding] = React.useState(false);
  const [sessionEnded, setSessionEnded] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);
  const [voiceEnabled, setVoiceEnabled] = React.useState(false);
  const [sessionStart] = React.useState(Date.now());
  const [elapsed, setElapsed] = React.useState(0);
  const [todayTruth] = React.useState(() => EDGE_TRUTHS[Math.floor(Date.now() / 86400000) % EDGE_TRUTHS.length]);
  const [historyExpanded, setHistoryExpanded] = React.useState(true);
  const [leftPanelOpen, setLeftPanelOpen] = React.useState(true);
  const [endError, setEndError] = React.useState<string | null>(null);
  const [viewingSessionId, setViewingSessionId] = React.useState<string | null>(null);
  const [viewingSession, setViewingSession] = React.useState<EdgeSessionData | null>(null);
  const [viewingTranscript, setViewingTranscript] = React.useState<Array<{ role: string; content: string }> | null>(null);
  const [transcriptLoading, setTranscriptLoading] = React.useState(false);
  const [pendingImage, setPendingImage] = React.useState<{ preview: string | null; base64: string; mimeType: string; fileName: string } | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load profile and sessions
  React.useEffect(() => {
    fetch("/api/edge/profile")
      .then(r => r.json())
      .then(d => {
        setProfile(d.profile);
        setSessions(d.sessions ?? []);
      })
      .catch(() => {});
  }, []);

  // Session timer
  React.useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 60000)), 30000);
    return () => clearInterval(t);
  }, [sessionStart]);

  // Auto-scroll
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-focus input after Edge responds
  React.useEffect(() => {
    if (!isLoading && sessionStarted && !sessionEnded) {
      inputRef.current?.focus();
    }
  }, [isLoading, sessionStarted, sessionEnded]);

  // Voice: speak last Edge message
  React.useEffect(() => {
    if (!voiceEnabled || !messages.length) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;
    const content = getEdgeMessageText(last);
    if (!content) return;
    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: content.slice(0, 500) }),
    }).then(r => r.arrayBuffer()).then(buf => {
      const audio = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" })));
      audio.play().catch(() => {});
    }).catch(() => {});
  }, [messages, voiceEnabled]);

  // Auto-save to sessionStorage
  React.useEffect(() => {
    if (messages.length > 1) {
      sessionStorage.setItem("edge_session_messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Restore from sessionStorage
  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem("edge_session_messages");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 1) {
          setMessages(parsed);
          setSessionStarted(true);
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resizeImage(dataUrl: string, maxPx = 1200): Promise<{ dataUrl: string; mimeType: string }> {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.82), mimeType: "image/jpeg" });
      };
      img.src = dataUrl;
    });
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    if (file.type === "application/pdf") {
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        setPendingImage({ preview: null, base64, mimeType: "application/pdf", fileName: file.name });
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = async () => {
        const { dataUrl, mimeType } = await resizeImage(reader.result as string);
        const base64 = dataUrl.split(",")[1];
        setPendingImage({ preview: dataUrl, base64, mimeType, fileName: file.name });
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleEdgeSend() {
    const text = input.trim();
    if (!text && !pendingImage) return;
    setInput("");
    const img = pendingImage;
    setPendingImage(null);

    if (!img) {
      await sendMessage({ text });
      return;
    }

    // File message (image or PDF) — bypass sendMessage and make a direct streaming fetch.
    const base64 = img.base64;

    // Add user message to the conversation for display
    const userMsgId = `user_img_${Date.now()}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withUser: any[] = [
      ...messages,
      {
        id: userMsgId,
        role: "user",
        parts: [
          ...(text ? [{ type: "text", text }] : []),
          { type: "file", mediaType: img.mimeType, url: img.preview ?? "", fileName: img.fileName },
        ],
        createdAt: new Date(),
      },
    ];
    setMessages(withUser);

    // Build flat history for API (text only — image is sent separately, skip empty-content messages)
    const historyForApi = messages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role, content: getEdgeMessageText(m) }))
      .filter(m => m.content.trim() !== "");

    try {
      const res = await fetch("/api/edge/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyForApi,
          imageAttachment: { base64, mimeType: img.mimeType, text: text || undefined },
        }),
      });
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        setMessages([
          ...withUser,
          { id: `edge_err_${Date.now()}`, role: "assistant" as const, parts: [{ type: "text" as const, text: `[Image send failed${errText ? `: ${errText.slice(0, 120)}` : ""}]` }], createdAt: new Date() },
        ]);
        return;
      }

      // Stream the response and build the assistant message incrementally
      const assistantMsgId = `edge_img_${Date.now()}`;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const withAssistant = (t: string): any[] => [
        ...withUser,
        { id: assistantMsgId, role: "assistant", parts: [{ type: "text", text: t }], createdAt: new Date() },
      ];

      setMessages(withAssistant(""));

      let streamError: string | null = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "text-delta" && typeof parsed.delta === "string") {
              fullText += parsed.delta;
            } else if (parsed.type === "error") {
              streamError = String(parsed.errorText ?? parsed.error ?? parsed.message ?? "Unknown error");
            }
          } catch { /* ignore malformed lines */ }
        }
        setMessages(withAssistant(fullText));
      }
      // If nothing came back, show what went wrong
      if (!fullText) {
        const fallback = streamError ?? "No response — image may be too large or in an unsupported format.";
        setMessages([...withUser, { id: assistantMsgId, role: "assistant" as const, parts: [{ type: "text" as const, text: `[${fallback}]` }], createdAt: new Date() }]);
      }
    } catch (err) {
      setMessages([...withUser, { id: `edge_err_${Date.now()}`, role: "assistant" as const, parts: [{ type: "text" as const, text: `[Error: ${err instanceof Error ? err.message : String(err)}]` }], createdAt: new Date() }]);
    }
  }

  async function startSession(selectedMood: number | null) {
    setMood(selectedMood);
    setSessionStarted(true);
    const moodStr = selectedMood != null
      ? `My energy/mood today: ${selectedMood}/10 — ${moodLabel(selectedMood)}.`
      : "No mood check-in this session.";
    await sendMessage({
      text: `[Session start. ${moodStr} Open this session based on what you know about me and where we left off. Keep it direct.]`,
    });
  }

  async function endSession() {
    if (messages.length < 2 || sessionEnding) return;
    setSessionEnding(true);
    setEndError(null);
    // Flatten UIMessage parts to a simple {role, content} format for the summarise API
    const flatMessages = messages.map(m => ({
      role: m.role,
      content: getEdgeMessageText(m),
    }));
    try {
      const res = await fetch("/api/edge/summarise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: flatMessages, mood }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setEndError((errData as { error?: string }).error || `Save failed (${res.status})`);
        setSessionEnding(false);
        return;
      }
      setSessionEnded(true);
      sessionStorage.removeItem("edge_session_messages");
      // Reload profile
      fetch("/api/edge/profile").then(r => r.json()).then(d => {
        setProfile(d.profile);
        setSessions(d.sessions ?? []);
      }).catch(() => {});
    } catch (e) {
      setEndError(String(e).slice(0, 120));
      setSessionEnding(false);
      return;
    }
    setSessionEnding(false);
  }

  async function loadSessionTranscript(session: EdgeSessionData) {
    if (viewingSessionId === session.id) {
      setViewingSessionId(null);
      setViewingSession(null);
      setViewingTranscript(null);
      return;
    }
    setTranscriptLoading(true);
    setViewingSessionId(session.id);
    setViewingSession(session);
    try {
      const res = await fetch(`/api/edge/session/${session.id}`);
      const data = await res.json();
      setViewingTranscript(data.transcript ?? null);
    } catch {
      setViewingTranscript(null);
    }
    setTranscriptLoading(false);
  }

  function continueFromSession() {
    if (!viewingTranscript) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reconstructed: any[] = viewingTranscript.map((m, i) => ({
      id: `resumed_${i}`,
      role: m.role,
      parts: [{ type: "text", text: m.content }],
      createdAt: new Date(),
    }));
    setMessages(reconstructed);
    setSessionStarted(true);
    setSessionEnded(false);
    setMood(viewingSession?.mood ?? null);
    setViewingSessionId(null);
    setViewingSession(null);
    setViewingTranscript(null);
    sessionStorage.setItem("edge_session_messages", JSON.stringify(reconstructed));
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function exitWithoutSaving() {
    setSessionEnded(true);
    sessionStorage.removeItem("edge_session_messages");
    setMessages([]);
  }

  const commitments = profile?.commitments ? profile.commitments.split(",").map(s => s.trim()).filter(Boolean) : [];
  const hasProfile = profile && Object.keys(profile).length > 1;

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Left Panel */}
      {leftPanelOpen
        ? <div className="w-[260px] shrink-0 border-r border-saabai-border hidden md:flex flex-col overflow-y-auto">

          {/* Today's Truth */}
          <div className="p-4 border-b border-saabai-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-semibold text-saabai-teal uppercase tracking-widest">Truth of the Day</p>
              <button
                onClick={() => setLeftPanelOpen(false)}
                title="Collapse panel"
                className="w-5 h-5 flex items-center justify-center rounded text-saabai-text-dim hover:text-saabai-text hover:bg-white/5 transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <p className="text-xs text-saabai-text leading-relaxed italic">&ldquo;{todayTruth}&rdquo;</p>
          </div>

        {/* Edge's Current Read */}
        {profile?.rawNotes && (
          <div className="p-4 border-b border-saabai-border">
            <p className="text-[9px] font-semibold text-amber-400 uppercase tracking-widest mb-2">Edge&apos;s Read on You</p>
            <p className="text-[11px] text-saabai-text-muted leading-relaxed">{profile.rawNotes}</p>
          </div>
        )}

        {/* Active Commitments */}
        {commitments.length > 0 && (
          <div className="p-4 border-b border-saabai-border">
            <p className="text-[9px] font-semibold text-saabai-text-dim uppercase tracking-widest mb-2">Your Commitments</p>
            <div className="flex flex-col gap-1.5">
              {commitments.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded border border-saabai-teal/40 shrink-0 mt-0.5 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-saabai-teal/40" />
                  </div>
                  <p className="text-[11px] text-saabai-text-muted leading-tight">{c}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patterns */}
        {profile?.patterns && (
          <div className="p-4 border-b border-saabai-border">
            <p className="text-[9px] font-semibold text-pink-400 uppercase tracking-widest mb-2">Patterns Noticed</p>
            <p className="text-[11px] text-saabai-text-muted leading-relaxed">{profile.patterns}</p>
          </div>
        )}

        {/* Mood Trend */}
        {sessions.filter(s => s.mood).length > 0 && (
          <div className="p-4 border-b border-saabai-border">
            <p className="text-[9px] font-semibold text-saabai-text-dim uppercase tracking-widest mb-3">Mood Trend</p>
            <div className="flex items-end gap-1.5 h-8">
              {sessions.filter(s => s.mood).slice(0, 10).reverse().map((s, i) => {
                const h = Math.round(((s.mood ?? 5) / 10) * 100);
                const col = (s.mood ?? 5) >= 8 ? "bg-green-400" : (s.mood ?? 5) >= 5 ? "bg-amber-400" : "bg-red-400";
                return (
                  <div key={i} title={`${s.mood}/10 — ${s.createdAt.split("T")[0]}`}
                    className={`flex-1 rounded-sm ${col} opacity-80 min-h-[4px]`}
                    style={{ height: `${h}%` }} />
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-saabai-text-dim">Older</span>
              <span className="text-[9px] text-saabai-text-dim">Recent</span>
            </div>
          </div>
        )}

        {/* Session History */}
        <div className="p-4 border-b border-saabai-border">
          <button
            onClick={() => setHistoryExpanded(p => !p)}
            className="flex items-center justify-between w-full mb-2"
          >
            <p className="text-[9px] font-semibold text-saabai-text-dim uppercase tracking-widest">Session History</p>
            <span className="text-[9px] text-saabai-text-dim">{historyExpanded ? "▲" : "▼"} {sessions.length}</span>
          </button>
          {historyExpanded && (
            <div className="flex flex-col gap-2">
              {sessions.slice(0, 20).map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadSessionTranscript(s)}
                  className={`w-full text-left rounded-lg p-2.5 border transition-all hover:border-saabai-teal/40 ${viewingSessionId === s.id ? "bg-saabai-teal/5 border-saabai-teal/40" : "bg-saabai-bg border-saabai-border"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-saabai-text-dim">{s.createdAt.split("T")[0]}</span>
                    <div className="flex items-center gap-1.5">
                      {s.mood && (
                        <>
                          <div className={`w-1.5 h-1.5 rounded-full ${moodColor(s.mood)}`} />
                          <span className="text-[9px] text-saabai-text-dim">{s.mood}/10</span>
                        </>
                      )}
                      <span className="text-[9px] text-saabai-teal/60">{viewingSessionId === s.id ? "▸" : "↗"}</span>
                    </div>
                  </div>
                  {s.summary && <p className="text-[10px] text-saabai-text-muted leading-relaxed">{s.summary}</p>}
                  {s.newCommitments && (
                    <p className="text-[9px] text-saabai-teal mt-1">↳ {s.newCommitments}</p>
                  )}
                </button>
              ))}
              {sessions.length === 0 && (
                <p className="text-[10px] text-saabai-text-dim">No sessions recorded yet.</p>
              )}
            </div>
          )}
        </div>

        {/* What Edge Knows */}
        <div className="p-4">
          <button
            onClick={() => setShowProfile(p => !p)}
            className="flex items-center justify-between w-full mb-2"
          >
            <p className="text-[9px] font-semibold text-saabai-text-dim uppercase tracking-widest">What Edge Knows</p>
            <span className="text-[9px] text-saabai-text-dim">{showProfile ? "Hide" : hasProfile ? "Show" : "Empty"}</span>
          </button>
          {showProfile && (
            <div className="flex flex-col gap-2">
              {hasProfile ? (
                [
                  { key: "coreGoals", label: "Goals", color: "text-saabai-teal" },
                  { key: "currentFocus", label: "Focus", color: "text-indigo-400" },
                  { key: "strengths", label: "Strengths", color: "text-green-400" },
                  { key: "challenges", label: "Challenges", color: "text-amber-400" },
                  { key: "breakthroughs", label: "Breakthroughs", color: "text-pink-400" },
                  { key: "watchFor", label: "Watch For", color: "text-red-400" },
                  { key: "worksWith", label: "Works With", color: "text-blue-400" },
                ].filter(f => profile?.[f.key as keyof EdgeProfileData]).map(f => (
                  <div key={f.key}>
                    <p className={`text-[9px] font-semibold ${f.color} uppercase tracking-wider mb-0.5`}>{f.label}</p>
                    <p className="text-[10px] text-saabai-text-muted leading-relaxed">{profile?.[f.key as keyof EdgeProfileData] as string}</p>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-saabai-text-dim">Edge will build your profile as you talk.</p>
              )}
              {profile?.totalSessions ? (
                <p className="text-[9px] text-saabai-text-dim mt-1">{profile.totalSessions} sessions recorded</p>
              ) : null}
            </div>
          )}
        </div>
        </div>
        : <div className="hidden md:flex w-8 shrink-0 border-r border-saabai-border flex-col items-center pt-4">
            <button
              onClick={() => setLeftPanelOpen(true)}
              title="Expand panel"
              className="w-6 h-6 flex items-center justify-center rounded text-saabai-text-dim hover:text-saabai-text hover:bg-white/5 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M4 2l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
      }

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-saabai-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700/60 to-slate-900/80 border border-white/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L10 6H14L11 8.5L12 13L8 10.5L4 13L5 8.5L2 6H6L8 2Z" stroke="var(--saabai-teal)" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-saabai-text leading-none">Edge</p>
              <p className="text-[10px] text-saabai-text-dim mt-0.5">Performance Coach · Truth over comfort</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sessionStarted && !sessionEnded && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-saabai-text-dim">{elapsed > 0 ? `${elapsed}m` : "Live"}</span>
              </div>
            )}
            {mood !== null && (
              <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium ${mood >= 8 ? "border-green-500/30 text-green-400 bg-green-500/5" : mood >= 5 ? "border-amber-500/30 text-amber-400 bg-amber-500/5" : "border-red-500/30 text-red-400 bg-red-500/5"}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${moodColor(mood)}`} />
                {mood}/10 · {moodLabel(mood)}
              </div>
            )}
            <button
              onClick={() => setVoiceEnabled(v => !v)}
              className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors ${voiceEnabled ? "border-indigo-500/40 text-indigo-400 bg-indigo-500/10" : "border-saabai-border text-saabai-text-dim hover:text-saabai-text"}`}
            >
              {voiceEnabled ? "Voice On" : "Voice Off"}
            </button>
            {sessionStarted && !sessionEnded && messages.length > 2 && (
              <div className="flex items-center gap-2">
                {endError && (
                  <span className="text-[10px] text-red-400 max-w-[140px] truncate" title={endError}>{endError}</span>
                )}
                <button
                  onClick={exitWithoutSaving}
                  disabled={sessionEnding}
                  className="px-3 py-1.5 rounded-lg text-[11px] border border-saabai-border text-saabai-text-dim hover:border-saabai-border hover:text-saabai-text transition-colors disabled:opacity-40"
                >
                  Exit
                </button>
                <button
                  onClick={endSession}
                  disabled={sessionEnding}
                  className="px-3 py-1.5 rounded-lg text-[11px] border border-saabai-teal/30 text-saabai-teal bg-saabai-teal/5 hover:bg-saabai-teal/10 transition-colors disabled:opacity-40"
                >
                  {sessionEnding ? "Saving…" : "Save & Exit"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Messages or Mood Check-in */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          {viewingSessionId ? (
            <div className="flex flex-col h-full">
              {/* Session replay header */}
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setViewingSessionId(null); setViewingSession(null); setViewingTranscript(null); }}
                    className="flex items-center gap-1.5 text-[11px] text-saabai-text-dim hover:text-saabai-text transition-colors"
                  >
                    ← Back
                  </button>
                  <div className="h-3 w-px bg-saabai-border" />
                  <p className="text-[11px] text-saabai-text-dim">
                    Session · {viewingSession?.createdAt?.split("T")[0]}
                    {viewingSession?.mood ? ` · ${viewingSession.mood}/10 ${moodLabel(viewingSession.mood)}` : ""}
                    {viewingSession?.messageCount ? ` · ${viewingSession.messageCount} messages` : ""}
                  </p>
                </div>
                {!sessionStarted && viewingTranscript && viewingTranscript.length > 0 && (
                  <button
                    onClick={continueFromSession}
                    className="px-3 py-1.5 rounded-lg text-[11px] border border-saabai-teal/30 text-saabai-teal bg-saabai-teal/5 hover:bg-saabai-teal/10 transition-colors"
                  >
                    Continue this thread →
                  </button>
                )}
              </div>
              {/* Transcript */}
              <div className="flex-1 overflow-y-auto">
                {transcriptLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-saabai-teal/40 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />)}
                    </div>
                  </div>
                ) : viewingTranscript && viewingTranscript.length > 0 ? (
                  <div className="flex flex-col gap-4 max-w-2xl pb-6">
                    {viewingTranscript.filter(m => !m.content.startsWith("[Session start.")).map((m, i) => {
                      const isEdge = m.role === "assistant";
                      return (
                        <div key={i} className={`flex ${isEdge ? "items-start gap-3" : "justify-end"}`}>
                          {isEdge && (
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700/60 to-slate-900/80 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M6 1L7.5 4H11L8.5 5.8L9.5 9L6 7L2.5 9L3.5 5.8L1 4H4.5L6 1Z" stroke="var(--saabai-teal)" strokeWidth="1" strokeLinejoin="round" fill="none" />
                              </svg>
                            </div>
                          )}
                          <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${isEdge ? "bg-saabai-surface border border-saabai-border text-saabai-text" : "bg-saabai-teal/10 border border-saabai-teal/20 text-saabai-text ml-auto"}`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                          </div>
                        </div>
                      );
                    })}
                    {!sessionStarted && (
                      <div className="flex justify-center pt-4">
                        <button
                          onClick={continueFromSession}
                          className="px-5 py-2.5 rounded-xl text-[11px] border border-saabai-teal/30 text-saabai-teal bg-saabai-teal/5 hover:bg-saabai-teal/10 transition-colors font-medium"
                        >
                          Continue this thread →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-saabai-text-dim mt-8 text-center">
                    Transcript not available — only sessions saved after this update will have full replays.
                  </p>
                )}
              </div>
            </div>
          ) : sessionEnded ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-sm">
                <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <p className="text-sm font-semibold text-saabai-text mb-2">Session saved.</p>
                <p className="text-xs text-saabai-text-dim mb-4">Edge has updated your profile. Come back when you&apos;re ready.</p>
                <button
                  onClick={() => {
                    setSessionEnded(false);
                    setSessionStarted(false);
                    setMood(null);
                    setMessages([]);
                  }}
                  className="px-4 py-2 rounded-lg bg-saabai-teal/10 border border-saabai-teal/30 text-saabai-teal text-xs hover:bg-saabai-teal/20 transition-colors"
                >
                  Start New Session
                </button>
              </div>
            </div>
          ) : !sessionStarted ? (
            <div className="flex items-center justify-center h-full">
              <div className="max-w-md w-full">
                <div className="text-center mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700/60 to-slate-900/80 border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2L13 8H19L14 11.5L16 18L10 14.5L4 18L6 11.5L1 8H7L10 2Z" stroke="var(--saabai-teal)" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                  {hasTodaySession ? (
                    <>
                      <h2 className="text-lg font-semibold text-saabai-text mb-1">Back again.</h2>
                      <p className="text-sm text-saabai-text-dim">You&apos;ve already checked in today.</p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-saabai-text mb-1">Ready to work?</h2>
                      <p className="text-sm text-saabai-text-dim">Where are you at today? Be honest.</p>
                    </>
                  )}
                </div>

                {hasTodaySession ? (
                  <div className="flex flex-col items-center gap-3">
                    <button
                      onClick={() => startSession(null)}
                      className="w-full py-3.5 rounded-xl text-sm font-semibold border border-saabai-teal/30 text-saabai-teal bg-saabai-teal/5 hover:bg-saabai-teal/10 transition-all"
                    >
                      Jump back in →
                    </button>
                    <button
                      onClick={() => {
                        // Show the rating grid anyway
                        const el = document.getElementById("edge-mood-grid");
                        if (el) el.style.display = "block";
                      }}
                      className="text-[11px] text-saabai-text-dim hover:text-saabai-text transition-colors"
                    >
                      Rate your mood anyway
                    </button>
                    <div id="edge-mood-grid" style={{ display: "none" }} className="w-full">
                      <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-6 mt-2">
                        <p className="text-[11px] font-semibold text-saabai-text-dim uppercase tracking-wider mb-4 text-center">Energy &amp; Mindset — Rate 1 to 10</p>
                        <div className="grid grid-cols-5 gap-2 mb-4">
                          {[1,2,3,4,5,6,7,8,9,10].map(n => (
                            <button
                              key={n}
                              onClick={() => startSession(n)}
                              className={`py-3 rounded-xl text-sm font-semibold transition-all border hover:scale-105 ${
                                n <= 3 ? "border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/50"
                                : n <= 6 ? "border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50"
                                : "border-green-500/30 text-green-400 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500/50"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-saabai-text-dim">
                          <span>Running on empty</span>
                          <span>Locked in</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-6">
                      <p className="text-[11px] font-semibold text-saabai-text-dim uppercase tracking-wider mb-4 text-center">Energy &amp; Mindset — Rate 1 to 10</p>
                      <div className="grid grid-cols-5 gap-2 mb-4">
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <button
                            key={n}
                            onClick={() => startSession(n)}
                            className={`py-3 rounded-xl text-sm font-semibold transition-all border hover:scale-105 ${
                              n <= 3 ? "border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/50"
                              : n <= 6 ? "border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50"
                              : "border-green-500/30 text-green-400 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500/50"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-saabai-text-dim">
                        <span>Running on empty</span>
                        <span>Locked in</span>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <button
                        onClick={() => startSession(null)}
                        className="text-[11px] text-saabai-text-dim hover:text-saabai-text transition-colors"
                      >
                        Skip, just chat →
                      </button>
                    </div>
                  </>
                )}

                {sessions.length > 0 && (
                  <div className="mt-4 text-center">
                    <p className="text-[11px] text-saabai-text-dim">
                      Last session: {sessions[0]?.createdAt?.split("T")[0] ?? "—"}
                      {sessions[0]?.mood ? ` · ${sessions[0].mood}/10` : ""}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 max-w-2xl">
              {messages.map((m) => {
                const content = getEdgeMessageText(m);
                if (!content && !m.parts?.some((p: {type:string}) => p.type === "file")) return null;
                if (content.startsWith("[Session start.")) return null;
                const isEdge = m.role === "assistant";
                // Extract file parts (images and PDFs)
                const fileParts = Array.isArray(m.parts)
                  ? m.parts.filter((p: {type:string}) => p.type === "file")
                  : [];
                return (
                  <div key={m.id} className={`flex ${isEdge ? "items-start gap-3" : "justify-end"}`}>
                    {isEdge && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700/60 to-slate-900/80 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M6 1L7.5 4H11L8.5 5.8L9.5 9L6 7L2.5 9L3.5 5.8L1 4H4.5L6 1Z" stroke="var(--saabai-teal)" strokeWidth="1" strokeLinejoin="round" fill="none" />
                        </svg>
                      </div>
                    )}
                    <div className={`max-w-[80%] flex flex-col gap-1.5 ${isEdge ? "" : "items-end ml-auto"}`}>
                      {fileParts.map((p: {type:string; url?: string; mediaType?: string; fileName?: string}, i: number) => (
                        p.mediaType === "application/pdf" ? (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-saabai-teal/20 bg-saabai-teal/5">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="var(--saabai-teal)" strokeWidth="1.2"/>
                              <path d="M9 1v4h4" stroke="var(--saabai-teal)" strokeWidth="1.2" strokeLinecap="round"/>
                              <path d="M4.5 8h5M4.5 10.5h3" stroke="var(--saabai-teal)" strokeWidth="1.1" strokeLinecap="round"/>
                            </svg>
                            <span className="text-[11px] text-saabai-teal">{p.fileName ?? "document.pdf"}</span>
                          </div>
                        ) : (
                          <div key={i} className="rounded-xl overflow-hidden border border-saabai-teal/20 max-w-[220px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.url} alt="Attached image" className="w-full block" />
                          </div>
                        )
                      ))}
                      {content && (
                        <div className={`rounded-2xl px-4 py-3 ${isEdge ? "bg-saabai-surface border border-saabai-border text-saabai-text" : "bg-saabai-teal/10 border border-saabai-teal/20 text-saabai-text"}`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700/60 to-slate-900/80 border border-white/10 flex items-center justify-center shrink-0">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1L7.5 4H11L8.5 5.8L9.5 9L6 7L2.5 9L3.5 5.8L1 4H4.5L6 1Z" stroke="var(--saabai-teal)" strokeWidth="1" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                  <div className="bg-saabai-surface border border-saabai-border rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-saabai-teal/50 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        {sessionStarted && !sessionEnded && !viewingSessionId && (
          <div className="px-4 md:px-6 py-3 md:py-4 border-t border-saabai-border shrink-0">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleImageSelect}
            />
            {/* File preview */}
            {pendingImage && (
              <div className="mb-2 flex items-center gap-2">
                {pendingImage.preview ? (
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-saabai-teal/30 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pendingImage.preview} alt="Attached" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setPendingImage(null)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center text-white text-[10px] leading-none">×</button>
                  </div>
                ) : (
                  <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg border border-saabai-teal/30 bg-saabai-teal/5 shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="var(--saabai-teal)" strokeWidth="1.2"/>
                      <path d="M9 1v4h4" stroke="var(--saabai-teal)" strokeWidth="1.2" strokeLinecap="round"/>
                      <path d="M4.5 8h5M4.5 10.5h3" stroke="var(--saabai-teal)" strokeWidth="1.1" strokeLinecap="round"/>
                    </svg>
                    <span className="text-[11px] text-saabai-teal max-w-[140px] truncate">{pendingImage.fileName}</span>
                    <button type="button" onClick={() => setPendingImage(null)}
                      className="w-4 h-4 rounded-full bg-black/40 flex items-center justify-center text-white text-[10px] leading-none ml-1">×</button>
                  </div>
                )}
                <p className="text-[10px] text-saabai-text-dim">
                  {pendingImage.mimeType === "application/pdf" ? "PDF attached — add a message or send as-is" : "Image attached — add a message or send as-is"}
                </p>
              </div>
            )}
            <div className="flex items-end gap-2">
              {/* + attach button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                title="Attach image or PDF (or paste an image)"
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-150 disabled:opacity-40 active:scale-95"
                style={{
                  background: pendingImage
                    ? "rgba(98,197,209,0.18)"
                    : "linear-gradient(135deg,rgba(98,197,209,0.12),rgba(99,102,241,0.10))",
                  border: pendingImage
                    ? "1.5px solid rgba(98,197,209,0.55)"
                    : "1.5px solid rgba(98,197,209,0.25)",
                  color: pendingImage ? "var(--saabai-teal)" : "rgba(98,197,209,0.7)",
                  boxShadow: pendingImage ? "0 0 12px rgba(98,197,209,0.25)" : "none",
                }}
              >
                {pendingImage ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="2.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <circle cx="4.5" cy="6.5" r="1.2" fill="currentColor"/>
                    <path d="M8 6.5l2.5 3H3.5L5.5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!isLoading) handleEdgeSend();
                  }
                }}
                onPaste={async (e) => {
                  const items = Array.from(e.clipboardData.items);
                  const imageItem = items.find(it => it.type.startsWith("image/"));
                  if (!imageItem) return;
                  e.preventDefault();
                  const file = imageItem.getAsFile();
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async () => {
                    const { dataUrl, mimeType } = await resizeImage(reader.result as string);
                    const base64 = dataUrl.split(",")[1];
                    setPendingImage({ preview: dataUrl, base64, mimeType, fileName: "pasted-image.jpg" });
                  };
                  reader.readAsDataURL(file);
                }}
                ref={inputRef}
                placeholder="Say what's on your mind… (paste a screenshot anytime)"
                rows={2}
                disabled={isLoading}
                className="flex-1 bg-saabai-surface border border-saabai-border rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-sm text-saabai-text placeholder:text-saabai-text-dim focus:outline-none focus:border-saabai-teal/50 transition-colors resize-none leading-relaxed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => { if (!isLoading) handleEdgeSend(); }}
                disabled={isLoading || (!input.trim() && !pendingImage)}
                className="px-3 md:px-4 py-3 bg-saabai-teal text-saabai-bg rounded-xl text-sm font-semibold hover:bg-saabai-teal-bright disabled:opacity-40 transition-colors shrink-0"
                style={{ boxShadow: "0 0 16px rgba(98,197,209,0.15)" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 8L2 2l5 6-5 6 12-6z" fill="currentColor" /></svg>
              </button>
            </div>
            <p className="text-[10px] text-saabai-text-dim mt-2 text-center hidden md:block">Enter to send · Shift+Enter for new line · End session when done to save to Edge&apos;s memory</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "agents" | "growth" | "tools" | "builder" | "settings" | "coach";

export default function MissionControl() {
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [tools, setTools] = useState<Tool[]>(DEFAULT_TOOLS);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [draftTool, setDraftTool] = useState<Partial<Tool>>(BLANK_TOOL);
  const [saved, setSaved] = useState(false);

  // Check session + default to Edge on mobile + restore nav state
  useEffect(() => {
    if (sessionStorage.getItem(MC_KEY) === "1") setAuthed(true);
    if (window.innerWidth < 768) setActiveTab("coach");
    if (localStorage.getItem("mc_nav_collapsed") === "1") setNavCollapsed(true);
  }, []);

  function toggleNav() {
    const next = !navCollapsed;
    setNavCollapsed(next);
    localStorage.setItem("mc_nav_collapsed", next ? "1" : "0");
  }

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

      {/* Sidebar — hidden on mobile, collapsible on desktop */}
      <aside className={`shrink-0 border-r border-saabai-border hidden md:flex flex-col py-4 sticky top-0 h-screen transition-all duration-200 ${navCollapsed ? "w-12 px-1.5" : "w-56 px-4"}`}>

        {/* Logo / header */}
        <div className={`mb-5 ${navCollapsed ? "flex justify-center" : "px-2"}`}>
          {navCollapsed ? (
            <div className="w-6 h-6 rounded-md bg-saabai-teal/20 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-saabai-teal" />
            </div>
          ) : (
            <>
              <a href="https://www.saabai.ai" target="_blank" rel="noopener noreferrer">
                <Image src="/brand/saabai-logo.png" alt="Saabai.ai" width={110} height={30} className="opacity-90 hover:opacity-100 transition-opacity" />
              </a>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-saabai-teal animate-pulse" />
                <p className="text-[10px] text-saabai-text-dim font-medium">Mission Control</p>
              </div>
            </>
          )}
        </div>

        <nav className="flex flex-col gap-0.5 flex-1">
          {!navCollapsed && <p className="text-[9px] font-semibold text-saabai-text-dim uppercase tracking-widest px-3 mb-1">Workspace</p>}
          {(["dashboard", "agents", "growth", "coach"] as const).map((tab) => {
            const icons: Record<string, React.ReactElement> = {
              dashboard: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /></svg>,
              agents: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" /><circle cx="10" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M1 11c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M10 7c1.7 0 3 1.3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
              growth: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 11l3.5-4 3 2.5L11 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 4h2v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
              coach: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L8.5 4H12L9.5 5.8L10.5 9L7 7L3.5 9L4.5 5.8L2 4H5.5L7 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" /></svg>,
            };
            const labels: Record<string, string> = { dashboard: "Dashboard", agents: "Agents", growth: "Growth", coach: "Edge" };
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                title={navCollapsed ? labels[tab] : undefined}
                className={`flex items-center rounded-lg transition-colors text-left ${navCollapsed ? "justify-center w-9 h-9 mx-auto" : "gap-2.5 px-3 py-2.5 text-sm"} ${active ? "bg-saabai-teal/10 text-saabai-teal border border-saabai-teal/20" : "text-saabai-text-muted hover:text-saabai-text hover:bg-white/5"}`}
              >
                {icons[tab]}
                {!navCollapsed && <span>{labels[tab]}</span>}
                {!navCollapsed && tab === "agents" && <span className="ml-auto text-[10px] bg-saabai-teal/10 text-saabai-teal rounded-full px-1.5 py-0.5">{AGENTS.filter(a => a.status === "active").length}</span>}
              </button>
            );
          })}

          {!navCollapsed && <p className="text-[9px] font-semibold text-saabai-text-dim uppercase tracking-widest px-3 mt-4 mb-1">Build</p>}
          {navCollapsed && <div className="my-2 h-px bg-saabai-border mx-1" />}
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
                title={navCollapsed ? labels[tab] : undefined}
                className={`flex items-center rounded-lg transition-colors text-left ${navCollapsed ? "justify-center w-9 h-9 mx-auto" : "gap-2.5 px-3 py-2.5 text-sm"} ${active ? "bg-saabai-teal/10 text-saabai-teal border border-saabai-teal/20" : "text-saabai-text-muted hover:text-saabai-text hover:bg-white/5"}`}
              >
                {icons[tab]}
                {!navCollapsed && <span>{labels[tab]}</span>}
                {!navCollapsed && tab === "tools" && <span className="ml-auto text-[10px] bg-saabai-teal/10 text-saabai-teal rounded-full px-1.5 py-0.5">{tools.length}</span>}
              </button>
            );
          })}
        </nav>

        <div className={`pt-3 border-t border-saabai-border flex flex-col gap-2 ${navCollapsed ? "items-center" : ""}`}>
          {!navCollapsed && (
            <button onClick={startNewTool} className="w-full flex items-center justify-center gap-2 py-2 bg-saabai-teal text-saabai-bg rounded-lg text-xs font-semibold hover:bg-saabai-teal-bright transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              New Tool
            </button>
          )}
          {/* Collapse toggle */}
          <button
            onClick={toggleNav}
            title={navCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-saabai-text-dim hover:text-saabai-text hover:bg-white/5 transition-colors mx-auto"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              {navCollapsed
                ? <path d="M5 2l4 5-4 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                : <path d="M9 2L5 7l4 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              }
            </svg>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-y-auto">

        {/* ── Dashboard ── */}
        {activeTab === "dashboard" && <DashboardView tools={tools} activeCount={activeCount} onEditTool={editTool} onNewTool={startNewTool} onTabChange={setActiveTab} />}

        {/* ── Agents ── */}
        {activeTab === "agents" && <AgentsView />}

        {/* ── Growth ── */}
        {activeTab === "growth" && <GrowthView />}

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

        {/* ── Coach (Edge) ── */}
        {activeTab === "coach" && <EdgeView />}

      </main>
    </div>
  );
}
