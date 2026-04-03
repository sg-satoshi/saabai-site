"use client";

import { useState } from "react";
import type { RexStats, LeadEvent } from "../../lib/rex-stats";
import RexNav from "../components/RexNav";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function fmtPrice(v: number): string {
  if (!v) return "—";
  return `$${v.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pct(a: number, b: number): string {
  if (!b) return "—";
  return `${Math.round((a / b) * 100)}%`;
}

const SOURCE_LABELS: Record<string, string> = {
  rex_quote_email: "Quote form",
  rex_mid_chat:    "Mid-chat",
  pete_ended:      "End panel",
  rex_quick_reply: "Quick reply",
};

// ── Components ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent = false,
}: {
  label: string; value: string | number; sub?: string; accent?: boolean;
}) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: "20px 24px",
      borderTop: accent ? "3px solid #e13f00" : "3px solid #e5e7eb",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <p style={{ margin: "0 0 6px", fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: "0 0 4px", fontSize: 34, fontWeight: 800, color: accent ? "#e13f00" : "#111827", letterSpacing: -1.5, lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>{sub}</p>}
    </div>
  );
}

function BarChart({ days }: { days: { label: string; count: number }[] }) {
  const max = Math.max(...days.map(d => d.count), 1);
  const last14 = days.slice(-14);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
      {last14.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
            <div
              title={`${d.label}: ${d.count} lead${d.count !== 1 ? "s" : ""}`}
              style={{
                width: "100%",
                height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2)}%`,
                background: d.count > 0 ? "#e13f00" : "#f3f4f6",
                borderRadius: "4px 4px 0 0",
                transition: "height 0.3s ease",
                minHeight: d.count > 0 ? 4 : 1,
              }}
            />
          </div>
          {i % 2 === 0 && (
            <span style={{ fontSize: 9, color: "#9ca3af", whiteSpace: "nowrap", transform: "rotate(-35deg)", transformOrigin: "top center" }}>
              {d.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function HBar({ label, count, max, color = "#e13f00" }: { label: string; count: number; max: number; color?: string }) {
  const p = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{count}</span>
      </div>
      <div style={{ height: 6, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${p}%`, background: color, borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16,
      padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600 }}>{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function DashboardClient({ stats }: { stats: RexStats }) {
  const [tab, setTab] = useState<"overview" | "leads">("overview");

  const topMaterials = Object.entries(stats.materials)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxMaterial = topMaterials[0]?.[1] ?? 1;

  const topSources = Object.entries(stats.sources)
    .sort((a, b) => b[1] - a[1]);

  const pickupCount   = stats.despatch?.pickup   ?? 0;
  const deliveryCount = stats.despatch?.delivery ?? 0;
  const totalDespatch = pickupCount + deliveryCount;

  const todayStr = new Date(Date.now() + 10 * 3600 * 1000).toISOString().slice(0, 10);
  const todayCount = stats.dailyCounts.find(d => d.date === todayStr)?.count ?? 0;
  const weekCount = stats.dailyCounts.slice(-7).reduce((s, d) => s + d.count, 0);

  const hasData = stats.total > 0;

  return (
    <div style={{
      minHeight: "100vh", background: "#f9fafb",
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      color: "#111827",
    }}>

      <RexNav />

      {/* Sub-nav tabs */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 2, height: 44, alignItems: "center" }}>
          {(["overview", "leads"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: "none", cursor: "pointer", transition: "all 0.15s",
                background: tab === t ? "#e13f0010" : "transparent",
                color: tab === t ? "#e13f00" : "#6b7280",
              }}
            >
              {t === "overview" ? "Overview" : "Recent Leads"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px 64px" }}>

        {!hasData && (
          <div style={{
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16,
            padding: "32px", textAlign: "center", marginBottom: 28,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            <p style={{ margin: "0 0 6px", fontSize: 15, color: "#111827", fontWeight: 600 }}>Tracking is live</p>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>Stats will appear here as leads come in through Rex.</p>
          </div>
        )}

        {tab === "overview" && (
          <>
            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              <StatCard label="Total Leads" value={stats.total} sub={`${todayCount} today · ${weekCount} this week`} accent />
              <StatCard label="Email Captured" value={pct(stats.withEmail, stats.total)} sub={`${stats.withEmail} of ${stats.total}`} />
              <StatCard label="Quotes with Price" value={stats.withPrice} sub={pct(stats.withPrice, stats.total) + " of leads"} />
              <StatCard label="Avg Quote Value" value={fmtPrice(stats.avgPrice)} sub="Ex GST" />
            </div>

            {/* Activity chart + sources */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
              <Section title="Daily Leads — Last 14 Days">
                {stats.dailyCounts.some(d => d.count > 0) ? (
                  <BarChart days={stats.dailyCounts} />
                ) : (
                  <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>No data yet</p>
                  </div>
                )}
              </Section>

              <Section title="Lead Sources">
                {topSources.length > 0 ? topSources.map(([source, count]) => (
                  <HBar
                    key={source}
                    label={SOURCE_LABELS[source] ?? source}
                    count={count}
                    max={topSources[0][1]}
                    color="#e13f00"
                  />
                )) : <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>No data yet</p>}
              </Section>
            </div>

            {/* Material mix + despatch */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
              <Section title="Material Mix">
                {topMaterials.length > 0 ? topMaterials.map(([mat, count]) => (
                  <HBar key={mat} label={mat} count={count} max={maxMaterial} />
                )) : <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>No data yet</p>}
              </Section>

              <Section title="Fulfilment Preference">
                {totalDespatch > 0 ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: "#111827" }}>
                          {Math.round((pickupCount / totalDespatch) * 100)}%
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>Pick Up</p>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: "#e13f00" }}>
                          {Math.round((deliveryCount / totalDespatch) * 100)}%
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>Delivery</p>
                      </div>
                    </div>
                    <div style={{ height: 8, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${(pickupCount / totalDespatch) * 100}%`,
                        background: "linear-gradient(90deg, #d1d5db 0%, #e13f00 100%)",
                      }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>Pick Up ({pickupCount})</span>
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>Delivery ({deliveryCount})</span>
                    </div>
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>No data yet</p>
                )}
              </Section>
            </div>

            {/* Recent leads preview */}
            <Section title="Recent Leads" action={
              <button
                onClick={() => setTab("leads")}
                style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
              >
                View all →
              </button>
            }>
              <LeadsTable leads={stats.recentLeads.slice(0, 5)} />
            </Section>
          </>
        )}

        {tab === "leads" && (
          <Section title={`Recent Leads (${stats.recentLeads.length})`}>
            <LeadsTable leads={stats.recentLeads} />
          </Section>
        )}

        {/* Footer */}
        <p style={{ marginTop: 32, textAlign: "center", fontSize: 11, color: "#9ca3af" }}>
          {stats.trackingSince
            ? `Tracking since ${new Date(stats.trackingSince).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`
            : "Tracking active"
          }
          {" · "}
          <a href="/rex-dashboard" style={{ color: "#6b7280", textDecoration: "none" }}>Refresh</a>
        </p>
      </div>
    </div>
  );
}

function LeadsTable({ leads }: { leads: LeadEvent[] }) {
  if (!leads.length) {
    return <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>No leads yet — they&apos;ll appear here as they come in.</p>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {["Time", "Name", "Email", "Material", "Price", "Despatch", "Source"].map(h => (
              <th key={h} style={{
                textAlign: "left", padding: "0 12px 10px 0",
                fontSize: 10, color: "#9ca3af", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 1,
                borderBottom: "1px solid #f3f4f6",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
              <td style={{ padding: "10px 12px 10px 0", color: "#9ca3af", whiteSpace: "nowrap" }}>
                {timeAgo(lead.timestamp)}
              </td>
              <td style={{ padding: "10px 12px 10px 0", color: "#111827", fontWeight: 500 }}>
                {lead.name ?? <span style={{ color: "#d1d5db" }}>—</span>}
              </td>
              <td style={{ padding: "10px 12px 10px 0", color: "#6b7280", fontFamily: "monospace", fontSize: 11 }}>
                {lead.email ?? <span style={{ color: "#d1d5db" }}>—</span>}
              </td>
              <td style={{ padding: "10px 12px 10px 0" }}>
                {lead.material ? (
                  <span style={{
                    background: "#e13f0010", color: "#e13f00",
                    padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  }}>{lead.material}</span>
                ) : <span style={{ color: "#d1d5db" }}>—</span>}
              </td>
              <td style={{ padding: "10px 12px 10px 0", color: lead.priceValue ? "#111827" : "#d1d5db", fontWeight: lead.priceValue ? 700 : 400 }}>
                {lead.price ?? "—"}
              </td>
              <td style={{ padding: "10px 12px 10px 0", color: "#6b7280" }}>
                {lead.despatch ?? <span style={{ color: "#d1d5db" }}>—</span>}
              </td>
              <td style={{ padding: "10px 0 10px 0", color: "#9ca3af", fontSize: 11 }}>
                {SOURCE_LABELS[lead.source ?? ""] ?? lead.source ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
