"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Archive, Zap, Clock, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import TokenAnalytics from "./TokenAnalytics";

interface MemoryTier {
  name: string;
  files: string[];
  size: string;
  tokenCost: number;
  loadTime: string;
  status: "active" | "on-demand" | "archive";
  description: string;
}

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  lastRun?: string;
  nextRun: string;
  status: "active" | "paused";
  description: string;
}

const MEMORY_TIERS: MemoryTier[] = [
  {
    name: "Tier 1: Core (Always Load)",
    files: ["USER.md", "SOUL.md", "active-projects.md", "decisions.md"],
    size: "~10KB",
    tokenCost: 3000,
    loadTime: "~10 min",
    status: "active",
    description: "Essential context loaded at every session start",
  },
  {
    name: "Tier 2: Conditional (Load When Relevant)",
    files: ["AGENTS.md", "CLIENTS.md", "PROJECTS.md", "CLAUDE.md", "IDENTITY.md", "TOOLS.md", "HEARTBEAT.md"],
    size: "~10KB",
    tokenCost: 0,
    loadTime: "On-demand",
    status: "on-demand",
    description: "Load only when the task requires them",
  },
  {
    name: "Tier 3: Reference (Task-Specific Only)",
    files: [
      "reference/rex-capabilities.md",
      "reference/REX-TECHNICAL.md",
      "reference/REX-KNOWLEDGE-BASE.md",
      "reference/REX-AGENT.md",
      "reference/REX-SUPPLEMENT.md",
      "reference/PLON-PROJECT.md",
      "reference/PLON-PROSPECTS.md",
      "reference/rex-efficiency-review.md",
      "reference/rex-optimization-action-plan.md",
      "reference/setup-log.md",
    ],
    size: "~120KB",
    tokenCost: 5000,
    loadTime: "When needed",
    status: "on-demand",
    description: "Never auto-load; only load when explicitly needed",
  },
  {
    name: "Tier 4: Archive (Historical Only)",
    files: [
      "archive/gemini-vercel-setup.md",
      "archive/google-gemini-integration-research.md",
      "archive/rex-low-hanging-fruit.md",
      "archive/rex-mobile-deploy.md",
      "archive/project-status-phase2.md",
      "archive/rex-next-level-recommendations.md",
    ],
    size: "~60KB",
    tokenCost: 0,
    loadTime: "Historical",
    status: "archive",
    description: "Old research and completed work; reference only if asked",
  },
];

const CRON_JOBS: CronJob[] = [
  {
    id: "59bb7a75-99b7-4d38-8134-0fc6adbd0ec7",
    name: "Atlas Memory System Review & Optimization",
    schedule: "Monday 6am + Thursday 6am (Brisbane time)",
    lastRun: "2026-04-11 06:00",
    nextRun: "2026-04-14 06:00",
    status: "active",
    description: "Bi-weekly memory maintenance: review projects, archive completed work, validate structure",
  },
];

export default function AtlasMemoryControl() {
  const [activeTab, setActiveTab] = useState<"overview" | "tiers" | "cron" | "metrics" | "tokens">("overview");
  const [refreshing, setRefreshing] = useState(false);

  const totalSize = "252KB";
  const totalTokenCost = 3000;
  const sessionReduction = "60%";

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getTierColor = (status: string) => {
    switch (status) {
      case "active":
        return "from-green-500/20 to-emerald-500/20 border-green-500/50";
      case "on-demand":
        return "from-blue-500/20 to-cyan-500/20 border-blue-500/50";
      case "archive":
        return "from-gray-500/20 to-slate-500/20 border-gray-500/50";
      default:
        return "from-gray-500/20 to-gray-500/20 border-gray-500/50";
    }
  };

  const getTierIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "on-demand":
        return <Zap className="w-5 h-5 text-blue-500" />;
      case "archive":
        return <Archive className="w-5 h-5 text-gray-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-saabai-teal via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Atlas Memory Control
            </h1>
            <p className="text-slate-400">Intelligent memory system for optimal token efficiency</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-6 py-2 bg-saabai-teal/20 border border-saabai-teal/50 rounded-lg hover:bg-saabai-teal/30 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700 overflow-x-auto">
          {(["overview", "tiers", "cron", "metrics", "tokens"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium transition capitalize border-b-2 ${
                activeTab === tab
                  ? "border-saabai-teal text-saabai-teal"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {/* Tokens Tab */}
        {activeTab === "tokens" && <TokenAnalytics />}

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Key Metrics Cards */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-saabai-teal/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-slate-400 text-sm font-medium">Total Memory Size</h3>
                <FileText className="w-4 h-4 text-saabai-teal" />
              </div>
              <p className="text-3xl font-bold text-saabai-teal">{totalSize}</p>
              <p className="text-xs text-slate-500 mt-2">Organized across 4 tiers</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-green-500/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-slate-400 text-sm font-medium">Session Baseline</h3>
                <Zap className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-green-500">{totalTokenCost.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-2">Tokens per session start</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-blue-500/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-slate-400 text-sm font-medium">Token Savings</h3>
                <TrendingDown className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-blue-500">{sessionReduction}</p>
              <p className="text-xs text-slate-500 mt-2">vs. naive loading</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-emerald-500/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-slate-400 text-sm font-medium">Status</h3>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-3xl font-bold text-emerald-500">Ready</p>
              <p className="text-xs text-slate-500 mt-2">Production optimized</p>
            </div>
          </div>
        )}

        {/* Tiers Tab */}
        {activeTab === "tiers" && (
          <div className="space-y-6">
            {MEMORY_TIERS.map((tier, idx) => (
              <div key={idx} className={`bg-gradient-to-br ${getTierColor(tier.status)} border rounded-lg p-6`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getTierIcon(tier.status)}
                    <div>
                      <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                      <p className="text-sm text-slate-300 mt-1">{tier.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{tier.size}</p>
                    <p className="text-xs text-slate-400">{tier.tokenCost > 0 ? `${tier.tokenCost} tokens` : "On-demand"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Load Time</p>
                    <p className="font-semibold">{tier.loadTime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Files</p>
                    <p className="font-semibold">{tier.files.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Status</p>
                    <p className="font-semibold capitalize">{tier.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Token Cost</p>
                    <p className="font-semibold">{tier.tokenCost > 0 ? `${tier.tokenCost}` : "None"}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-slate-400 mb-2 font-semibold">Files in tier:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {tier.files.map((file, i) => (
                      <div key={i} className="text-sm text-slate-300 font-mono bg-black/30 px-3 py-1 rounded">
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cron Jobs Tab */}
        {activeTab === "cron" && (
          <div className="space-y-6">
            {CRON_JOBS.map((job) => (
              <div key={job.id} className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-purple-500" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">{job.name}</h3>
                      <p className="text-sm text-slate-300 mt-1">{job.description}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded text-xs font-semibold ${job.status === "active" ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"}`}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Schedule</p>
                    <p className="font-semibold text-sm">{job.schedule}</p>
                  </div>
                  {job.lastRun && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Last Run</p>
                      <p className="font-semibold text-sm">{job.lastRun}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Next Run</p>
                    <p className="font-semibold text-sm">{job.nextRun}</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="px-4 py-2 text-sm font-medium bg-purple-500/20 border border-purple-500/50 rounded hover:bg-purple-500/30 transition">
                    Trigger Now
                  </button>
                  <button className="px-4 py-2 text-sm font-medium bg-slate-600/20 border border-slate-500/50 rounded hover:bg-slate-600/30 transition">
                    View Logs
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === "metrics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Token Efficiency */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-saabai-teal/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-saabai-teal" />
                Token Efficiency
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-2">Before Optimization</p>
                  <div className="bg-red-500/20 border border-red-500/30 rounded px-4 py-3">
                    <p className="font-mono text-red-400">8,500+ tokens/session</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-2">After Optimization</p>
                  <div className="bg-green-500/20 border border-green-500/30 rounded px-4 py-3">
                    <p className="font-mono text-green-400">3,500 tokens/session</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-2">Savings</p>
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded px-4 py-3">
                    <p className="font-mono text-blue-400">60% reduction 🎯</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Memory Retention */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-emerald-500/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Memory Retention
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-2">Context Availability</p>
                  <div className="bg-emerald-500/20 border border-emerald-500/30 rounded px-4 py-3">
                    <p className="font-mono text-emerald-400">100% with minimal overhead</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-2">Startup Time</p>
                  <div className="bg-emerald-500/20 border border-emerald-500/30 rounded px-4 py-3">
                    <p className="font-mono text-emerald-400">~10 minutes (4 files)</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-2">Daily Updates</p>
                  <div className="bg-emerald-500/20 border border-emerald-500/30 rounded px-4 py-3">
                    <p className="font-mono text-emerald-400">1 file: active-projects.md</p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-blue-500/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                System Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-slate-400">Memory Organization</p>
                  <span className="text-sm font-semibold text-green-400">✓ Optimized</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-slate-400">File Structure</p>
                  <span className="text-sm font-semibold text-green-400">✓ Valid</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-slate-400">Cron Jobs</p>
                  <span className="text-sm font-semibold text-green-400">✓ Active (1)</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-slate-400">Token Budget</p>
                  <span className="text-sm font-semibold text-green-400">✓ On Track</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-slate-400">Last Review</p>
                  <span className="text-sm font-semibold text-green-400">2026-04-12 12:35</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-amber-500/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-500" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 text-sm font-medium bg-amber-500/20 border border-amber-500/50 rounded hover:bg-amber-500/30 transition text-left">
                  → Trigger Memory Review Now
                </button>
                <button className="w-full px-4 py-2 text-sm font-medium bg-blue-500/20 border border-blue-500/50 rounded hover:bg-blue-500/30 transition text-left">
                  → View Memory Search Logs
                </button>
                <button className="w-full px-4 py-2 text-sm font-medium bg-purple-500/20 border border-purple-500/50 rounded hover:bg-purple-500/30 transition text-left">
                  → Edit Memory Tiers
                </button>
                <button className="w-full px-4 py-2 text-sm font-medium bg-slate-600/20 border border-slate-500/50 rounded hover:bg-slate-600/30 transition text-left">
                  → View All Logs
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-700 text-center text-slate-400 text-sm">
          <p>Atlas Memory Control v1.1 • Last updated: 2026-04-12 • Status: Production Ready ✨</p>
          <p className="text-xs mt-2">Token tracking & real-time analytics enabled</p>
        </div>
      </div>
    </div>
  );
}

// TrendingDown icon (not imported from lucide-react in the original)
function TrendingDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
      <polyline points="17 18 23 18 23 12"></polyline>
    </svg>
  );
}
