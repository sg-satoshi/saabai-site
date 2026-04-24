"use client";

import React from "react";
import { Zap, DollarSign, Activity } from "lucide-react";
import Link from "next/link";

interface ProjectStats {
  name: string;
  type: "agent" | "project";
  tokens: number;
  cost: number;
  status: "active" | "beta" | "monitoring";
  icon: string;
  trend: number;
}

const PROJECT_STATS: ProjectStats[] = [
  {
    name: "Atlas",
    type: "agent",
    tokens: 54000,
    cost: 5.4,
    status: "active",
    icon: "⚙",
    trend: 2,
  },
  {
    name: "PLON / Rex",
    type: "project",
    tokens: 28500,
    cost: 2.85,
    status: "active",
    icon: "🤖",
    trend: 5,
  },
  {
    name: "Lex / Tributum Law",
    type: "project",
    tokens: 12300,
    cost: 1.23,
    status: "beta",
    icon: "⚖️",
    trend: 8,
  },
  {
    name: "Mia Sales Agent",
    type: "agent",
    tokens: 8900,
    cost: 0.89,
    status: "active",
    icon: "👩",
    trend: -3,
  },
  {
    name: "Saabai Admin",
    type: "project",
    tokens: 4200,
    cost: 0.42,
    status: "active",
    icon: "🎛️",
    trend: 1,
  },
];

export default function AtlasStats() {
  const totalTokens = PROJECT_STATS.reduce((sum, p) => sum + p.tokens, 0);
  const totalCost = PROJECT_STATS.reduce((sum, p) => sum + p.cost, 0);
  const atlasStats = PROJECT_STATS[0];
  const otherProjects = PROJECT_STATS.slice(1);

  const cardStyle = { backgroundColor: "#0e1128", border: "1px solid rgba(255,255,255,0.09)" };
  const textPrimary = { color: "#eef0ff" };
  const textSecondary = { color: "#9aa0b8" };
  const textMuted = { color: "#727899" };
  const teal = { color: "#25D366" };
  const dividerStyle = { borderColor: "rgba(255,255,255,0.07)" };

  return (
    <>
      {/* Atlas Stats Card */}
      <div className="mb-6">
        <Link href="/atlas-memory-control" className="group">
          <div className="rounded-xl px-5 py-4 hover:shadow-md transition-all" style={{ ...cardStyle, borderColor: "rgba(255,255,255,0.09)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg bg-cyan-500 border border-cyan-600 flex items-center justify-center text-xs font-bold" style={{ color: "#07091a" }}>
                  A
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={textSecondary}>Atlas Memory System</p>
                  <p className="text-xs mt-0.5" style={textMuted}>Token usage & efficiency tracking</p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-lg font-black" style={teal}>{atlasStats.tokens.toLocaleString()}</p>
                  <p className="text-xs" style={textMuted}>tokens (today)</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black" style={textPrimary}>${atlasStats.cost.toFixed(2)}</p>
                  <p className="text-xs" style={textMuted}>cost</p>
                </div>
                <span className="group-hover:translate-x-1 transition-transform" style={teal}>→</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Projects & Agents Usage Grid */}
      <div className="mb-6">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={textPrimary}>
          <Activity className="w-4 h-4" style={teal} />
          All Agents & Projects
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {otherProjects.map((project) => (
            <div
              key={project.name}
              className="rounded-lg p-3 hover:shadow-md transition-all"
              style={cardStyle}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{project.icon}</span>
                  <div>
                    <p className="text-xs font-semibold leading-tight" style={textPrimary}>{project.name}</p>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={
                      project.status === "active"
                        ? { backgroundColor: "rgba(37,211,102,0.1)", color: "#25D366" }
                        : { backgroundColor: "rgba(255,255,255,0.06)", color: "#9aa0b8" }
                    }>
                      {project.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tokens */}
              <div className="mb-2 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-xs mb-1" style={textMuted}>Tokens</p>
                <p className="text-sm font-black" style={teal}>{(project.tokens / 1000).toFixed(1)}k</p>
              </div>

              {/* Cost & Trend */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs mb-0.5" style={textMuted}>Cost</p>
                  <p className="text-xs font-bold" style={textSecondary}>${project.cost.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs mb-0.5" style={textMuted}>Trend</p>
                  <p className="text-xs font-bold" style={textSecondary}>
                    {project.trend > 0 ? "+" : ""}{project.trend}%
                  </p>
                </div>
              </div>

              {/* Type badge */}
              <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-xs font-medium px-2 py-1 rounded-full inline-block" style={{ backgroundColor: "rgba(37,211,102,0.06)", color: "#25D366" }}>
                  {project.type === "agent" ? "🤖 Agent" : "📦 Project"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-4 rounded-lg p-4 flex items-center justify-between" style={cardStyle}>
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={textMuted}>Total System Usage (All Projects)</p>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-black" style={teal}>{(totalTokens / 1000).toFixed(1)}k</span>
              <span className="text-lg font-bold" style={textPrimary}>${totalCost.toFixed(2)}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider mb-1" style={textMuted}>Efficiency Savings</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black" style={teal}>60%</span>
              <span className="text-sm" style={textSecondary}>reduction</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
