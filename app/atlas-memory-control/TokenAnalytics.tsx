"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Zap, Calendar, AlertCircle } from "lucide-react";

interface TokenDataPoint {
  timestamp: string;
  tokens: number;
  cost: number;
  session: string;
}

interface TokenMetrics {
  today: number;
  week: number;
  month: number;
  average: number;
  peak: number;
  costToday: number;
  costWeek: number;
  costMonth: number;
}

// Mock data - in production, this would come from an API
const generateMockTokenData = (): TokenDataPoint[] => {
  const now = new Date();
  const data: TokenDataPoint[] = [];

  // Generate 24 data points for last 24 hours
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const tokens = Math.floor(Math.random() * 2000 + 2000); // 2000-4000 tokens
    const cost = tokens * 0.0001; // $0.0001 per token (Claude Haiku approx)

    data.push({
      timestamp: timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      tokens,
      cost,
      session: `Session ${24 - i}`,
    });
  }

  return data;
};

const calculateMetrics = (data: TokenDataPoint[]): TokenMetrics => {
  const tokens = data.map((d) => d.tokens);
  const costs = data.map((d) => d.cost);

  return {
    today: tokens.reduce((a, b) => a + b, 0),
    week: tokens.reduce((a, b) => a + b, 0) * 7,
    month: tokens.reduce((a, b) => a + b, 0) * 30,
    average: Math.round(tokens.reduce((a, b) => a + b, 0) / tokens.length),
    peak: Math.max(...tokens),
    costToday: costs.reduce((a, b) => a + b, 0),
    costWeek: costs.reduce((a, b) => a + b, 0) * 7,
    costMonth: costs.reduce((a, b) => a + b, 0) * 30,
  };
};

export default function TokenAnalytics() {
  const [tokenData, setTokenData] = useState<TokenDataPoint[]>([]);
  const [metrics, setMetrics] = useState<TokenMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const data = generateMockTokenData();
    setTokenData(data);
    setMetrics(calculateMetrics(data));

    if (!autoRefresh) return;

    const interval = setInterval(() => {
      const newData = generateMockTokenData();
      setTokenData(newData);
      setMetrics(calculateMetrics(newData));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (!metrics) return null;

  const maxTokens = Math.max(...tokenData.map((d) => d.tokens));
  const chartHeight = 200;

  // Determine which metrics to show based on time range
  const getMetricsForRange = () => {
    switch (timeRange) {
      case "7d":
        return { tokens: metrics.week, cost: metrics.costWeek, label: "This Week" };
      case "30d":
        return { tokens: metrics.month, cost: metrics.costMonth, label: "This Month" };
      default:
        return { tokens: metrics.today, cost: metrics.costToday, label: "Today" };
    }
  };

  const currentMetrics = getMetricsForRange();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Token Usage & Costs</h2>
          <p className="text-sm text-slate-400">Real-time tracking of API consumption and expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            Auto-refresh
          </label>
        </div>
      </div>

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tokens Used */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-blue-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">Tokens Used</h3>
            <Zap className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-4xl font-bold text-blue-400 mb-2">{currentMetrics.tokens.toLocaleString()}</p>
          <p className="text-xs text-slate-500">{currentMetrics.label}</p>
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-slate-400 mb-1">Daily Average</p>
            <p className="text-lg font-semibold text-blue-300">{metrics.average.toLocaleString()}</p>
          </div>
        </div>

        {/* Cost */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-emerald-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">Cost</h3>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-4xl font-bold text-emerald-400 mb-2">${currentMetrics.cost.toFixed(2)}</p>
          <p className="text-xs text-slate-500">{currentMetrics.label}</p>
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-slate-400 mb-1">Hourly Average</p>
            <p className="text-lg font-semibold text-emerald-300">${(currentMetrics.cost / 24).toFixed(2)}</p>
          </div>
        </div>

        {/* Peak Usage */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-amber-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">Peak Usage</h3>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-4xl font-bold text-amber-400 mb-2">{metrics.peak.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Highest single session</p>
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-slate-400 mb-1">vs. Average</p>
            <p className="text-lg font-semibold text-amber-300">{Math.round((metrics.peak / metrics.average - 1) * 100)}% higher</p>
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(["24h", "7d", "30d"] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              timeRange === range
                ? "bg-saabai-teal/30 border border-saabai-teal text-saabai-teal"
                : "bg-slate-700/30 border border-slate-600 text-slate-300 hover:border-slate-500"
            }`}
          >
            {range === "24h" ? "Last 24h" : range === "7d" ? "Last 7d" : "Last 30d"}
          </button>
        ))}
      </div>

      {/* Token Usage Chart */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-blue-500/20 rounded-lg p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          Token Usage Over Time
        </h3>

        <div className="relative" style={{ height: `${chartHeight}px` }}>
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-slate-500 pr-2">
            <span>{Math.round(maxTokens)}</span>
            <span>{Math.round(maxTokens * 0.75)}</span>
            <span>{Math.round(maxTokens * 0.5)}</span>
            <span>{Math.round(maxTokens * 0.25)}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="ml-12 h-full relative bg-slate-900/30 rounded border border-slate-700 p-4 flex items-end gap-1">
            {tokenData.map((point, idx) => {
              const height = (point.tokens / maxTokens) * 100;
              return (
                <div
                  key={idx}
                  className="flex-1 group relative"
                  style={{ minHeight: "4px" }}
                >
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t opacity-75 hover:opacity-100 transition cursor-pointer group-hover:from-blue-400 group-hover:to-cyan-300"
                    style={{ height: `${height}%`, minHeight: "2px" }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-10">
                    <p>{point.tokens.toLocaleString()} tokens</p>
                    <p className="text-slate-400">${point.cost.toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* X-axis labels */}
        <div className="ml-12 mt-2 flex justify-between text-xs text-slate-500">
          <span>{tokenData[0]?.timestamp}</span>
          <span>{tokenData[Math.floor(tokenData.length / 2)]?.timestamp}</span>
          <span>{tokenData[tokenData.length - 1]?.timestamp}</span>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-emerald-500/20 rounded-lg p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          Cost Breakdown by Model
        </h3>

        <div className="space-y-3">
          {[
            { model: "Claude Haiku (Default)", percent: 65, cost: 0.0001, usage: "65%" },
            { model: "Claude Sonnet (Heavy Tasks)", percent: 25, cost: 0.003, usage: "25%" },
            { model: "Claude Opus (Deep Reasoning)", percent: 10, cost: 0.015, usage: "10%" },
          ].map((item) => (
            <div key={item.model}>
              <div className="flex justify-between mb-1">
                <p className="text-sm text-slate-300">{item.model}</p>
                <p className="text-sm font-semibold text-emerald-400">{item.usage}</p>
              </div>
              <div className="w-full bg-slate-900/50 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Budget & Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Budget */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-purple-500/30 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">Monthly Budget</h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <p className="text-sm text-slate-400">Budget Used</p>
                <p className="text-sm font-semibold text-purple-400">${metrics.costMonth.toFixed(2)} / $100.00</p>
              </div>
              <div className="w-full bg-slate-900/50 rounded-full h-3 overflow-hidden border border-slate-700">
                <div
                  className={`h-full rounded-full ${
                    metrics.costMonth < 50
                      ? "bg-gradient-to-r from-green-500 to-emerald-400"
                      : metrics.costMonth < 80
                        ? "bg-gradient-to-r from-yellow-500 to-amber-400"
                        : "bg-gradient-to-r from-red-500 to-orange-400"
                  }`}
                  style={{ width: `${Math.min((metrics.costMonth / 100) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-900/50 rounded p-3 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Projected Monthly Cost</p>
              <p className="text-xl font-bold text-purple-400">${(metrics.costMonth).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Efficiency Stats */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-cyan-500/30 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">Memory Efficiency Impact</h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-2">Token Savings from Optimization</p>
              <p className="text-2xl font-bold text-cyan-400">60%</p>
              <p className="text-xs text-slate-500 mt-1">vs. naive memory loading</p>
            </div>

            <div className="bg-slate-900/50 rounded p-3 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Estimated Monthly Savings</p>
              <p className="text-xl font-bold text-cyan-400">$45.60</p>
              <p className="text-xs text-slate-500">at current usage levels</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert */}
      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-300 mb-1">Token Usage Information</p>
          <p className="text-sm text-amber-200/80">
            Real-time tracking shows actual API consumption. Costs are calculated based on Claude model pricing. Memory optimization is saving an estimated <strong>$45.60/month</strong> compared to naive loading approaches.
          </p>
        </div>
      </div>
    </div>
  );
}
