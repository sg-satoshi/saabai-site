"use client";

import { useEffect, useState } from "react";
import type { RealtimeMetrics } from "../api/rex-analytics/realtime/route";
import RexNav from "../components/RexNav";

const POLLING_INTERVAL = 5000; // 5 seconds

export default function RealtimeAnalytics() {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch metrics on mount and set up polling
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("/api/rex-analytics/realtime", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as RealtimeMetrics;
        setMetrics(data);
        setLastUpdated(new Date().toLocaleTimeString());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch metrics");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Health status styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case "GREEN":
        return "text-green-600 bg-green-50 border-green-200";
      case "YELLOW":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "RED":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "GREEN":
        return "bg-green-100";
      case "YELLOW":
        return "bg-yellow-100";
      case "RED":
        return "bg-red-100";
      default:
        return "bg-gray-100";
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case "GREEN":
        return "🟢";
      case "YELLOW":
        return "🟡";
      case "RED":
        return "🔴";
      default:
        return "⚪";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-gray-500">Loading metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-gray-500">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RexNav />
      <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Rex Analytics · Real-Time Dashboard
          </h1>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Last updated: {lastUpdated}
            </p>
            <div className="text-xs text-gray-500">
              Refreshes every {POLLING_INTERVAL / 1000}s
            </div>
          </div>
        </div>

        {/* Health Status Card */}
        <div
          className={`mb-8 rounded-lg border-2 p-6 ${getStatusColor(
            metrics.healthStatus
          )}`}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">System Status</h2>
            <span className="text-3xl">{getStatusIndicator(metrics.healthStatus)}</span>
          </div>
          <p className="font-semibold mb-2">{metrics.healthStatus}</p>
          <p className="text-sm opacity-90">{metrics.healthReason}</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Lead Count */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Total Leads</p>
            <p className="text-3xl font-bold text-gray-900">
              {metrics.totalLeads.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {metrics.leadsLastHour} in last hour
            </p>
          </div>

          {/* Conversion Rate */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
            <p className="text-3xl font-bold text-gray-900">
              {metrics.conversionRate}%
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {metrics.leadsWithEmail} of {metrics.totalLeads} captured email
            </p>
          </div>

          {/* Avg Response Time */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Avg Response Time</p>
            <p className="text-3xl font-bold text-gray-900">
              {metrics.avgResponseTimeMs}ms
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Based on last 1000 requests
            </p>
          </div>

          {/* Leads with Price Quote */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Quoted Leads</p>
            <p className="text-3xl font-bold text-gray-900">
              {metrics.leadsWithPrice.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {metrics.totalLeads > 0
                ? Math.round((metrics.leadsWithPrice / metrics.totalLeads) * 100)
                : 0}
              % of total
            </p>
          </div>
        </div>

        {/* Response Time Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Response Time Percentiles
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Average</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.avgResponseTimeMs}ms
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">P95</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.p95ResponseTimeMs}ms
                </p>
                <p className={`text-xs font-semibold ${
                  metrics.p95ResponseTimeMs > 2500
                    ? "text-red-600"
                    : metrics.p95ResponseTimeMs > 2000
                    ? "text-yellow-600"
                    : "text-green-600"
                }`}>
                  {metrics.p95ResponseTimeMs > 2500
                    ? "⚠️ High"
                    : metrics.p95ResponseTimeMs > 2000
                    ? "⚠️ Caution"
                    : "✓ Good"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">P99</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.p99ResponseTimeMs}ms
              </p>
            </div>
          </div>
        </div>

        {/* Thresholds Reference */}
        <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-700">
          <h4 className="font-semibold mb-2">Status Thresholds</h4>
          <ul className="space-y-1 text-xs">
            <li>
              <span className="font-medium">🔴 RED:</span> Conversion {"<"} 35% OR P95{" "}
              {">"} 2500ms
            </li>
            <li>
              <span className="font-medium">🟡 YELLOW:</span> Conversion {"<"} 50% OR
              P95 {">"} 2000ms
            </li>
            <li>
              <span className="font-medium">🟢 GREEN:</span> All thresholds met
            </li>
          </ul>
        </div>
      </div>
      </div>
    </div>
  );
}
