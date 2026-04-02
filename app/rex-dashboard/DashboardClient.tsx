"use client";

import { useState } from "react";
import type { RexStats, LeadEvent } from "../../lib/rex-stats";

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
      background: "#161b22", border: `1px solid ${accent ? "#e13f0040" : "#30363d"}`,
      borderRadius: 14, padding: "20px 24px",
      borderTop: accent ? "3px solid #e13f00" : "3px solid #30363d",
    }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2 }}>{label}</p>
      <p style={{ margin: "0 0 2px", fontSize: 32, fontWeight: 800, color: accent ? "#e13f00" : "#fff", letterSpacing: -1, lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ margin: 0, fontSize: 11, color: "#555" }}>{sub}</p>}
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
                background: d.count > 0 ? "#e13f00" : "#1e242c",
                borderRadius: "3px 3px 0 0",
                transition: "height 0.3s ease",
                minHeight: d.count > 0 ? 4 : 1,
              }}
            />
          </div>
          {i % 2 === 0 && (
            <span style={{ fontSize: 9, color: "#444", whiteSpace: "nowrap", transform: "rotate(-35deg)", transformOrigin: "top center" }}>
              {d.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function HBar({ label, count, max, color = "#e13f00" }: { label: string; count: number; max: number; color?: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#ccc" }}>{label}</span>
        <span style={{ fontSize: 12, color: "#666" }}>{count}</span>
      </div>
      <div style={{ height: 6, background: "#1e242c", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 14, padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2 }}>{title}</p>
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
      minHeight: "100vh", background: "#0d1117",
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      color: "#fff",
    }}>

      {/* Header */}
      <div style={{ background: "#161b22", borderBottom: "1px solid #30363d", padding: "0 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>
              Plastic<span style={{ color: "#e13f00" }}>Online</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: "#555", marginLeft: 10, letterSpacing: 0 }}>Rex Dashboard</span>
            </p>
            <div style={{ display: "flex", gap: 2, marginLeft: 16 }}>
              {(["overview", "leads"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: "none", cursor: "pointer", transition: "all 0.15s",
                    background: tab === t ? "#e13f0020" : "transparent",
                    color: tab === t ? "#e13f00" : "#666",
                  }}
                >
                  {t === "overview" ? "Overview" : "Recent Leads"}
                </button>
              ))}
            </div>
          </div>
          <a
            href="/rex-changelog"
            style={{ fontSize: 12, color: "#555", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v5l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            Changelog →
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 64px" }}>

        {!hasData && (
          <div style={{
            background: "#161b22", border: "1px solid #30363d", borderRadius: 14,
            padding: "32px", textAlign: "center", marginBottom: 32,
          }}>
            <p style={{ margin: "0 0 8px", fontSize: 15, color: "#fff", fontWeight: 600 }}>Tracking is live</p>
            <p style={{ margin: 0, fontSize: 13, color: "#555" }}>Stats will appear here as leads come in through Rex.</p>
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
                    <p style={{ margin: 0, fontSize: 12, color: "#444" }}>No data yet</p>
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
                )) : <p style={{ margin: 0, fontSize: 12, color: "#444" }}>No data yet</p>}
              </Section>
            </div>

            {/* Material mix + despatch */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
              <Section title="Material Mix">
                {topMaterials.length > 0 ? topMaterials.map(([mat, count]) => (
                  <HBar key={mat} label={mat} count={count} max={maxMaterial} />
                )) : <p style={{ margin: 0, fontSize: 12, color: "#444" }}>No data yet</p>}
              </Section>

              <Section title="Fulfilment Preference">
                {totalDespatch > 0 ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: "#fff" }}>
                          {Math.round((pickupCount / totalDespatch) * 100)}%
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: "#555" }}>Pick Up</p>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: "#e13f00" }}>
                          {Math.round((deliveryCount / totalDespatch) * 100)}%
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: "#555" }}>Delivery</p>
                      </div>
                    </div>
                    <div style={{ height: 8, background: "#1e242c", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${(pickupCount / totalDespatch) * 100}%`,
                        background: "linear-gradient(90deg, #666 0%, #e13f00 100%)",
                      }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: "#444" }}>Pick Up ({pickupCount})</span>
                      <span style={{ fontSize: 10, color: "#444" }}>Delivery ({deliveryCount})</span>
                    </div>
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: "#444" }}>No data yet</p>
                )}
              </Section>
            </div>

            {/* Recent leads preview */}
            <Section title="Recent Leads" action={
              <button
                onClick={() => setTab("leads")}
                style={{ fontSize: 11, color: "#555", background: "none", border: "none", cursor: "pointer" }}
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
        <p style={{ marginTop: 32, textAlign: "center", fontSize: 11, color: "#333" }}>
          {stats.trackingSince
            ? `Tracking since ${new Date(stats.trackingSince).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`
            : "Tracking active"
          }
          {" · "}
          <a href="/rex-dashboard" style={{ color: "#444", textDecoration: "none" }}>Refresh</a>
        </p>
      </div>
    </div>
  );
}

function LeadsTable({ leads }: { leads: LeadEvent[] }) {
  if (!leads.length) {
    return <p style={{ margin: 0, fontSize: 12, color: "#444" }}>No leads yet — they&apos;ll appear here as they come in.</p>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {["Time", "Name", "Email", "Material", "Price", "Despatch", "Source"].map(h => (
              <th key={h} style={{
                textAlign: "left", padding: "0 12px 10px 0",
                fontSize: 10, color: "#444", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 1,
                borderBottom: "1px solid #21262d",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #21262d" }}>
              <td style={{ padding: "10px 12px 10px 0", color: "#555", whiteSpace: "nowrap" }}>
                {timeAgo(lead.timestamp)}
              </td>
              <td style={{ padding: "10px 12px 10px 0", color: "#ccc" }}>
                {lead.name ?? <span style={{ color: "#333" }}>—</span>}
              </td>
              <td style={{ padding: "10px 12px 10px 0", color: "#666", fontFamily: "monospace", fontSize: 11 }}>
                {lead.email ?? <span style={{ color: "#333" }}>—</span>}
              </td>
              <td style={{ padding: "10px 12px 10px 0" }}>
                {lead.material ? (
                  <span style={{
                    background: "#e13f0015", color: "#e13f00",
                    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                  }}>{lead.material}</span>
                ) : <span style={{ color: "#333" }}>—</span>}
              </td>
              <td style={{ padding: "10px 12px 10px 0", color: lead.priceValue ? "#fff" : "#333", fontWeight: lead.priceValue ? 700 : 400 }}>
                {lead.price ?? "—"}
              </td>
              <td style={{ padding: "10px 12px 10px 0", color: "#666" }}>
                {lead.despatch ?? <span style={{ color: "#333" }}>—</span>}
              </td>
              <td style={{ padding: "10px 0 10px 0", color: "#444", fontSize: 11 }}>
                {SOURCE_LABELS[lead.source ?? ""] ?? lead.source ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
