"use client";

import React from "react";
import { Zap, DollarSign, TrendingUp, Activity } from "lucide-react";
import Link from "next/link";

interface ProjectStats {
  name: string;
  type: "agent" | "project";
  tokens: number;
  cost: number;
  status: "active" | "beta" | "monitoring";
  icon: string;
  color: string;
  trend: number;
}

const PROJECT_STATS: ProjectStats[] = [
  // Atlas
  {
    name: "Atlas",
    type: "agent",
    tokens: 54000,
    cost: 5.4,
    status: "active",
    icon: "⚙",
    color: "text-cyan-400",
    trend: 2,
  },
  // Clients
  {
    name: "PLON / Rex",
    type: "project",
    tokens: 28500,
    cost: 2.85,
    status: "active",
    icon: "🤖",
    color: "text-amber-400",
    trend: 5,
  },
  {
    name: "Lex / Tributum Law",
    type: "project",
    tokens: 12300,
    cost: 1.23,
    status: "beta",
    icon: "⚖️",
    color: "text-blue-400",
    trend: 8,
  },
  {
    name: "Mia Sales Agent",
    type: "agent",
    tokens: 8900,
    cost: 0.89,
    status: "active",
    icon: "👩",
    color: "text-pink-400",
    trend: -3,
  },
  {
    name: "Saabai Admin",
    type: "project",
    tokens: 4200,
    cost: 0.42,
    status: "active",
    icon: "🎛️",
    color: "text-purple-400",
    trend: 1,
  },
];

export default function AtlasStats() {
  const totalTokens = PROJECT_STATS.reduce((sum, p) => sum + p.tokens, 0);
  const totalCost = PROJECT_STATS.reduce((sum, p) => sum + p.cost, 0);
  const atlasStats = PROJECT_STATS[0];
  const otherProjects = PROJECT_STATS.slice(1);

  return (
    <>
      {/* Atlas Stats Card - Compact */}
      <div className="mb-6">
        <Link href="/atlas-memory-control" className="group">
          <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/20 border border-cyan-500/30 rounded-2xl px-5 py-4 hover:border-cyan-500/60 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border border-cyan-500/50 flex items-center justify-center text-sm font-bold text-cyan-300">
                  A
                </div>
                <div>
                  <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Atlas Memory System</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Token usage & efficiency tracking</p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-lg font-black text-cyan-300">{atlasStats.tokens.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-500">tokens (today)</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-emerald-400">${atlasStats.cost.toFixed(2)}</p>
                  <p className="text-[9px] text-slate-500">cost</p>
                </div>
                <span className="text-cyan-400 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Projects & Agents Usage Grid */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-saabai-text mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          All Agents & Projects
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {otherProjects.map((project) => (
            <div
              key={project.name}
              className="bg-saabai-surface border border-saabai-border rounded-xl p-3 hover:border-saabai-border-accent transition-colors group"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{project.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-saabai-text leading-tight">{project.name}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      project.status === "active"
                        ? "bg-green-500/20 text-green-400"
                        : project.status === "beta"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-blue-500/20 text-blue-400"
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tokens */}
              <div className="mb-2 pb-2 border-b border-saabai-border">
                <p className="text-[9px] text-saabai-text-dim mb-1">Tokens</p>
                <p className="text-sm font-black text-blue-400">{(project.tokens / 1000).toFixed(1)}k</p>
              </div>

              {/* Cost & Trend */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] text-saabai-text-dim mb-0.5">Cost</p>
                  <p className="text-xs font-bold text-emerald-400">${project.cost.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-saabai-text-dim mb-0.5">Trend</p>
                  <p className={`text-xs font-bold ${project.trend > 0 ? "text-orange-400" : "text-green-400"}`}>
                    {project.trend > 0 ? "+" : ""}{project.trend}%
                  </p>
                </div>
              </div>

              {/* Type badge */}
              <div className="mt-2 pt-2 border-t border-saabai-border">
                <span className={`text-[9px] font-medium px-2 py-1 rounded-full ${project.color} opacity-70`}>
                  {project.type === "agent" ? "🤖 Agent" : "📦 Project"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-4 bg-saabai-surface border border-saabai-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-saabai-text-dim uppercase tracking-wider mb-1">Total System Usage (All Projects)</p>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-black text-blue-400">{(totalTokens / 1000).toFixed(1)}k</span>
              <span className="text-lg font-bold text-emerald-400">${totalCost.toFixed(2)}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-saabai-text-dim uppercase tracking-wider mb-1">Efficiency Savings</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-cyan-400">60%</span>
              <span className="text-sm text-slate-400">reduction</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
