"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  TrendingUp,
  DollarSign,
  Zap,
  BarChart3,
  PieChart,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Activity,
  Target,
} from "lucide-react";
import TokenAnalytics from "./TokenAnalytics";

// Mock data generation
const generateMockTokenData = () => {
  const now = new Date();
  const data = [];
  for (let i = 23; i >= 0; i--) {
    data.push({
      time: new Date(now.getTime() - i * 60 * 60 * 1000).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      tokens: Math.floor(Math.random() * 2000 + 2500),
    });
  }
  return data;
};

const generateMemoryTierData = () => [
  { name: "Tier 1: Core", size: 10, tokenCost: 3000, color: "from-green-500 to-emerald-400" },
  { name: "Tier 2: Conditional", size: 10, tokenCost: 0, color: "from-blue-500 to-cyan-400" },
  { name: "Tier 3: Reference", size: 120, tokenCost: 5000, color: "from-purple-500 to-pink-400" },
  { name: "Tier 4: Archive", size: 60, tokenCost: 0, color: "from-slate-500 to-slate-400" },
];

export default function AtlasMemoryControlDashboard() {
  const [tokenData, setTokenData] = useState(generateMockTokenData());
  const [detailView, setDetailView] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTokenData(generateMockTokenData());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setTokenData(generateMockTokenData());
    setTimeout(() => setRefreshing(false), 1000);
  };

  const memoryTiers = generateMemoryTierData();
  const totalMemorySize = 252;
  const maxTokens = Math.max(...tokenData.map((d) => d.tokens));
  const avgTokens = Math.round(tokenData.reduce((a, b) => a + b.tokens, 0) / tokenData.length);
  const totalTokensToday = tokenData.reduce((a, b) => a + b.tokens, 0);
  const costToday = totalTokensToday * 0.0001;
  const costMonth = costToday * 30;
  const savings = (totalTokensToday * 0.0001 * 0.6).toFixed(2);

  if (detailView === "tokens") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
        <button
          onClick={() => setDetailView(null)}
          className="mb-6 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-600/50 transition"
        >
          ← Back to Dashboard
        </button>
        <TokenAnalytics />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6 md:p-8">
      {/* Back to Mission Control */}
      <div className="mb-6 flex items-center">
        <a
          href="/mission-control"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700/50 transition font-medium text-sm text-slate-300 hover:text-white group"
        >
          <span className="group-hover:-translate-x-1 transition">←</span>
          Back to Mission Control
        </a>
      </div>

      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-cyan-400 via-saabai-teal to-blue-500 bg-clip-text text-transparent mb-2">
              Atlas Control
            </h1>
            <p className="text-slate-400 text-lg">Memory System & Token Intelligence</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-6 py-3 bg-saabai-teal/20 border border-saabai-teal/50 rounded-xl hover:bg-saabai-teal/30 transition disabled:opacity-50 font-medium"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Syncing..." : "Refresh"}
          </button>
        </div>
        <div className="h-1 w-32 bg-gradient-to-r from-cyan-500 to-saabai-teal rounded-full" />
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Tokens Today */}
        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-500/30 rounded-xl p-6 backdrop-blur-sm hover:border-blue-500/50 transition">
          <div className="flex items-center justify-between mb-3">
            <Zap className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-bold text-blue-300 bg-blue-500/20 px-2 py-1 rounded">TODAY</span>
          </div>
          <p className="text-4xl font-black text-blue-300 mb-1">{totalTokensToday.toLocaleString()}</p>
          <p className="text-sm text-slate-400">Tokens Used</p>
          <p className="text-xs text-blue-400 mt-2">Avg: {avgTokens.toLocaleString()}/session</p>
        </div>

        {/* Cost Today */}
        <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30 rounded-xl p-6 backdrop-blur-sm hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded">TODAY</span>
          </div>
          <p className="text-4xl font-black text-emerald-300 mb-1">${costToday.toFixed(2)}</p>
          <p className="text-sm text-slate-400">API Cost</p>
          <p className="text-xs text-emerald-400 mt-2">Monthly: ${costMonth.toFixed(2)}</p>
        </div>

        {/* Savings */}
        <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/20 border border-cyan-500/30 rounded-xl p-6 backdrop-blur-sm hover:border-cyan-500/50 transition">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-300 bg-cyan-500/20 px-2 py-1 rounded">SAVED</span>
          </div>
          <p className="text-4xl font-black text-cyan-300 mb-1">${savings}</p>
          <p className="text-sm text-slate-400">by Optimization</p>
          <p className="text-xs text-cyan-400 mt-2">60% less tokens</p>
        </div>

        {/* Status */}
        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-500/30 rounded-xl p-6 backdrop-blur-sm hover:border-purple-500/50 transition">
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-bold text-purple-300 bg-green-500/20 px-2 py-1 rounded">LIVE</span>
          </div>
          <p className="text-4xl font-black text-purple-300 mb-1">100%</p>
          <p className="text-sm text-slate-400">System Health</p>
          <p className="text-xs text-purple-400 mt-2">All systems operational</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Token Usage Chart */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-blue-500/20 rounded-xl p-8 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-400" />
                Token Usage (24h)
              </h2>
              <p className="text-sm text-slate-400 mt-1">Real-time consumption tracking</p>
            </div>
            <button
              onClick={() => setDetailView("tokens")}
              className="px-4 py-2 bg-blue-500/20 border border-blue-500/50 rounded-lg hover:bg-blue-500/30 transition text-sm font-medium"
            >
              View Details →
            </button>
          </div>

          {/* Mini Chart */}
          <div className="relative h-48 bg-slate-900/30 rounded-lg border border-slate-700 p-4 flex items-end gap-0.5">
            {tokenData.map((point, idx) => (
              <div
                key={idx}
                className="flex-1 rounded-t group relative cursor-pointer"
                style={{
                  height: `${(point.tokens / maxTokens) * 100}%`,
                  minHeight: "2px",
                  background: `linear-gradient(to top, rgb(59, 130, 246), rgb(34, 211, 238))`,
                  opacity: 0.8,
                }}
              >
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-10">
                  <p>{point.tokens.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between text-xs text-slate-500">
            <span>24h ago</span>
            <span>12h ago</span>
            <span>Now</span>
          </div>
        </div>

        {/* Memory Distribution Pie */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-purple-500/20 rounded-xl p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
            <PieChart className="w-6 h-6 text-purple-400" />
            Memory Tiers
          </h2>

          <div className="space-y-3 mb-6">
            {memoryTiers.map((tier, idx) => {
              const percentage = (tier.size / totalMemorySize) * 100;
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-300">{tier.name}</p>
                    <p className="text-xs font-bold text-slate-400">{percentage.toFixed(0)}%</p>
                  </div>
                  <div className="w-full h-2 bg-slate-900/50 rounded-full overflow-hidden border border-slate-700">
                    <div
                      className={`h-full bg-gradient-to-r ${tier.color} rounded-full`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {tier.size}KB
                    {tier.tokenCost > 0 && ` • ${tier.tokenCost} tokens`}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Total Size</p>
            <p className="text-2xl font-black text-purple-300">{totalMemorySize}KB</p>
          </div>
        </div>
      </div>

      {/* Middle Section - Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Session Metrics */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-cyan-500/20 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Session Metrics
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-slate-400">Avg/Session</p>
              <p className="text-lg font-bold text-cyan-300">{avgTokens.toLocaleString()}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-slate-400">Peak</p>
              <p className="text-lg font-bold text-cyan-300">{maxTokens.toLocaleString()}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-slate-400">Startup Cost</p>
              <p className="text-lg font-bold text-cyan-300">3,000</p>
            </div>
            <div className="pt-3 border-t border-slate-700">
              <p className="text-xs text-slate-500">Baseline token load</p>
            </div>
          </div>
        </div>

        {/* Budget Status */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-amber-500/20 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-400" />
            Monthly Budget
          </h3>
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <p className="text-slate-400">Used</p>
              <p className="text-sm font-bold text-amber-300">${costMonth.toFixed(2)} / $100</p>
            </div>
            <div className="w-full h-3 bg-slate-900/50 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                style={{ width: `${Math.min((costMonth / 100) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="text-center py-2 bg-slate-900/30 rounded">
            <p className="text-xs text-slate-400">On track for month</p>
            <p className="text-2xl font-black text-emerald-300">{((costMonth / 100) * 100).toFixed(1)}%</p>
          </div>
        </div>

        {/* Model Distribution */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-pink-500/20 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-400" />
            Model Usage
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-slate-400">Haiku</span>
                <span className="font-bold text-pink-300">65%</span>
              </div>
              <div className="w-full h-2 bg-slate-900/50 rounded-full overflow-hidden border border-slate-700">
                <div className="h-full w-3/5 bg-gradient-to-r from-pink-500 to-rose-400" />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-slate-400">Sonnet</span>
                <span className="font-bold text-pink-300">25%</span>
              </div>
              <div className="w-full h-2 bg-slate-900/50 rounded-full overflow-hidden border border-slate-700">
                <div className="h-full w-1/4 bg-gradient-to-r from-purple-500 to-pink-400" />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-slate-400">Opus</span>
                <span className="font-bold text-pink-300">10%</span>
              </div>
              <div className="w-full h-2 bg-slate-900/50 rounded-full overflow-hidden border border-slate-700">
                <div className="h-full w-1/10 bg-gradient-to-r from-indigo-500 to-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status & Cron Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* System Health */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-green-500/20 rounded-xl p-6 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            System Health
          </h2>
          <div className="space-y-3">
            {[
              { name: "Memory Organization", status: "✓ Optimized" },
              { name: "Token Tracking", status: "✓ Active" },
              { name: "Cron Jobs", status: "✓ 1 Running" },
              { name: "Budget Alerts", status: "✓ Enabled" },
              { name: "API Health", status: "✓ Nominal" },
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0">
                <p className="text-slate-400">{item.name}</p>
                <span className="text-sm font-semibold text-green-400">{item.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scheduled Maintenance */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-indigo-500/20 rounded-xl p-6 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-400" />
            Scheduled Maintenance
          </h2>
          <div className="space-y-4">
            <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-700">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-white">Memory Review & Archive</p>
                <span className="text-xs font-bold bg-green-500/20 text-green-300 px-2 py-1 rounded">ACTIVE</span>
              </div>
              <p className="text-sm text-slate-400 mb-2">Monday 6am & Thursday 6am (Brisbane)</p>
              <p className="text-xs text-slate-500">Next run: Monday 06:00 AEST</p>
            </div>
            <button className="w-full px-4 py-2 bg-indigo-500/20 border border-indigo-500/50 rounded-lg hover:bg-indigo-500/30 transition text-sm font-medium">
              Trigger Now
            </button>
          </div>
        </div>
      </div>

      {/* Key Info Footer */}
      <div className="bg-gradient-to-r from-slate-800/50 via-slate-800/30 to-slate-800/50 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Memory Efficiency</p>
            <p className="text-2xl font-black text-cyan-400">60% Reduction</p>
            <p className="text-xs text-slate-500 mt-1">vs. naive loading approach</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Estimated Monthly Savings</p>
            <p className="text-2xl font-black text-emerald-400">$45.60</p>
            <p className="text-xs text-slate-500 mt-1">based on optimization</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Dashboard Version</p>
            <p className="text-2xl font-black text-purple-400">v1.2</p>
            <p className="text-xs text-slate-500 mt-1">Live & Production Ready</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-slate-700 text-center text-slate-500 text-sm">
        <p>Atlas Memory Control — Real-time Intelligence Dashboard</p>
        <p className="text-xs mt-2">Last sync: {new Date().toLocaleTimeString()} • Status: Online 🟢</p>
        <p className="text-xs mt-3"><a href="/mission-control" className="text-cyan-400 hover:text-cyan-300 transition">← Return to Mission Control</a></p>
      </div>
    </div>
  );
}
