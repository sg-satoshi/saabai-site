"use client";

import { useState, useEffect } from "react";
import type { LexClientRow } from "../../api/admin/lex-clients/route";

const C = {
  bg:           "#f5f5f7",
  surface:      "#ffffff",
  surface2:     "#f3f4f6",
  rowHover:     "rgba(0,0,0,0.025)",
  border:       "rgba(0,0,0,0.08)",
  border2:      "rgba(0,0,0,0.12)",
  divider:      "rgba(0,0,0,0.06)",
  gold:         "#b45309",
  goldB:        "#d97706",
  goldBg:       "rgba(180,83,9,0.08)",
  goldBdr:      "rgba(180,83,9,0.25)",
  green:        "#16a34a",
  greenBg:      "rgba(22,163,74,0.08)",
  greenBdr:     "rgba(22,163,74,0.25)",
  amber:        "#d97706",
  amberBg:      "rgba(217,119,6,0.08)",
  red:          "#dc2626",
  blue:         "#2563eb",
  blueBg:       "rgba(37,99,235,0.08)",
  blueBdr:      "rgba(37,99,235,0.25)",
  text:         "#111827",
  textDim:      "#6b7280",
  muted:        "#9ca3af",
};

type Stats = { total: number; configured: number; withLlmKey: number };

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 8px",
      background: ok ? C.greenBg : C.amberBg,
      color: ok ? C.green : C.amber,
      border: `1px solid ${ok ? C.greenBdr : "rgba(245,166,35,0.30)"}`,
      borderRadius: 4,
      fontSize: 10, fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase" as const,
      whiteSpace: "nowrap" as const,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: ok ? C.green : C.amber }} />
      {label}
    </span>
  );
}

function ModeBadge({ mode }: { mode: "internal" | "external" }) {
  const isInt = mode === "internal";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 8px",
      background: isInt ? C.blueBg : C.goldBg,
      color: isInt ? C.blue : C.gold,
      border: `1px solid ${isInt ? C.blueBdr : C.goldBdr}`,
      borderRadius: 4,
      fontSize: 10, fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase" as const,
      whiteSpace: "nowrap" as const,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: isInt ? C.blue : C.gold }} />
      {isInt ? "Internal" : "External"}
    </span>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, gap: 12 }}>
      <span style={{ fontSize: 11, color: C.muted, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: C.text, textAlign: "right" as const, fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all" as const }}>
        {value}
      </span>
    </div>
  );
}

function ClientDetailPanel({ client, onClose }: { client: LexClientRow; onClose: () => void }) {
  const s = client.settingsSummary;

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 200,
        display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 460, height: "100vh",
          background: C.surface,
          borderLeft: `1px solid ${C.border2}`,
          display: "flex", flexDirection: "column",
          overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: "20px 24px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: C.text }}>{client.firmName}</p>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{client.email}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18, padding: "2px 4px", lineHeight: 1 }}
          >✕</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
            <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Identity</p>
            <Row label="Client ID" value={client.id} mono />
            <Row label="Agent Name" value={client.agentName} />
            <Row label="Mode" value={<ModeBadge mode={client.mode} />} />
            <Row label="Portal Config" value={<StatusBadge ok={client.hasPortalSettings} label={client.hasPortalSettings ? "Configured" : "Not set"} />} />
            <Row label="Custom LLM" value={<StatusBadge ok={client.hasLlmConfig} label={client.hasLlmConfig ? `${client.llmProvider} / ${client.llmModel}` : "Using default"} />} />
          </div>

          <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
            <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Practice Areas</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {client.practiceAreas.map(a => (
                <span key={a} style={{
                  fontSize: 11, padding: "3px 9px", borderRadius: 4,
                  background: C.goldBg, border: `1px solid ${C.goldBdr}`, color: C.goldB, fontWeight: 600,
                }}>{a}</span>
              ))}
            </div>
          </div>

          {s && (
            <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
              <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Agent Config</p>
              {s.primaryGoal && <Row label="Primary Goal" value={s.primaryGoal} />}
              {s.practiceFocus && <Row label="Practice Focus" value={s.practiceFocus} />}
              {s.responseLength && <Row label="Response Length" value={s.responseLength} />}
              {typeof s.formalityLevel === "number" && (
                <Row label="Formality / Warmth" value={`${s.formalityLevel}% formal, ${s.warmthLevel ?? "?"}% warm`} />
              )}
              {s.personalityTraits && s.personalityTraits.length > 0 && (
                <Row label="Traits" value={s.personalityTraits.join(", ")} />
              )}
              {s.lastSaved && <Row label="Last Saved" value={new Date(s.lastSaved).toLocaleString("en-AU")} />}
              {s.agentNameOverride && <Row label="Agent Name Override" value={s.agentNameOverride} />}
            </div>
          )}

          {!s && (
            <div style={{ background: C.amberBg, border: `1px solid rgba(245,166,35,0.22)`, borderRadius: 10, padding: "16px 18px" }}>
              <p style={{ margin: 0, fontSize: 13, color: C.amber }}>
                No portal configuration saved yet. The client hasn&apos;t completed setup.
              </p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a
              href="/client-portal"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "10px 0", borderRadius: 8,
                background: C.goldBg, border: `1px solid ${C.goldBdr}`,
                color: C.gold, fontSize: 13, fontWeight: 700, textDecoration: "none",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1.5h-5v10h10v-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 1.5h2.5v2.5M11.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Open Client Portal
            </a>
            <a
              href={`/lex-widget?client=${client.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "10px 0", borderRadius: 8,
                background: "transparent", border: `1px solid ${C.border2}`,
                color: C.textDim, fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}
            >
              Test Agent Widget ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LexClientsClient() {
  const [clients, setClients] = useState<LexClientRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LexClientRow | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "internal" | "external">("all");
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/lex-clients")
      .then(r => r.json())
      .then(data => {
        setClients(data.clients ?? []);
        setStats(data.stats ?? null);
      })
      .catch(() => setError("Failed to load clients."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(c => filterMode === "all" || c.mode === filterMode);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      {/* Page header */}
      <header style={{
        padding: "22px 28px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{
            margin: "0 0 4px",
            fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span>Lex Clients</span>
            <span style={{
              fontSize: 11, color: C.textDim,
              background: "rgba(0,0,0,0.04)",
              border: `1px solid ${C.border}`,
              padding: "2px 8px", borderRadius: 4, fontWeight: 600,
            }}>{clients.length}</span>
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: C.textDim }}>
            All law firms connected to the Lex platform — configuration status, agent settings, and LLM keys.
          </p>
        </div>

        {/* Stat pills */}
        {stats && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[
              { label: "Configured", value: stats.configured, color: C.green, bg: C.greenBg, bdr: C.greenBdr },
              { label: "Custom LLM", value: stats.withLlmKey, color: C.blue, bg: C.blueBg, bdr: C.blueBdr },
            ].map(s => (
              <div key={s.label} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "5px 12px",
                background: s.bg, border: `1px solid ${s.bdr}`,
                borderRadius: 6, fontSize: 12,
              }}>
                <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>
                <span style={{ color: C.muted }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Toolbar */}
      <div style={{
        padding: "12px 28px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {(["all", "internal", "external"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterMode(f)}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12,
              fontWeight: filterMode === f ? 700 : 500,
              border: `1px solid ${filterMode === f ? C.goldBdr : C.border}`,
              background: filterMode === f ? C.goldBg : "transparent",
              color: filterMode === f ? C.gold : C.muted,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {f === "all"
              ? `All ${clients.length}`
              : f === "internal"
                ? `Internal ${clients.filter(c => c.mode === "internal").length}`
                : `External ${clients.filter(c => c.mode === "external").length}`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ margin: "24px 28px", background: "rgba(0,0,0,0.02)", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        {/* Header row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(200px,1fr) 200px 110px 130px 120px 80px",
          borderBottom: `1px solid ${C.border}`,
          background: "#f9fafb",
        }}>
          {["Firm", "Email", "Mode", "Portal Config", "LLM Key", ""].map(h => (
            <div key={h} style={{
              padding: "0 16px", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.10em", textTransform: "uppercase" as const,
              color: C.muted, display: "flex", alignItems: "center", height: 36,
            }}>{h}</div>
          ))}
        </div>

        {loading && (
          <div style={{ padding: "60px 20px", textAlign: "center" as const, color: C.textDim }}>
            <div style={{ fontSize: 14 }}>Loading clients…</div>
          </div>
        )}
        {error && (
          <div style={{ padding: "60px 20px", textAlign: "center" as const }}>
            <div style={{ fontSize: 14, color: C.red }}>{error}</div>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ padding: "60px 20px", textAlign: "center" as const, color: C.textDim }}>
            <div style={{ fontSize: 14, marginBottom: 6 }}>No clients found</div>
            <div style={{ fontSize: 12, color: C.muted }}>Try a different filter.</div>
          </div>
        )}

        {!loading && !error && filtered.map((client, i) => (
          <div
            key={client.id}
            onMouseEnter={() => setHoveredRow(client.id)}
            onMouseLeave={() => setHoveredRow(null)}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(200px,1fr) 200px 110px 130px 120px 80px",
              height: 56,
              background: hoveredRow === client.id ? C.rowHover : "transparent",
              borderBottom: i < filtered.length - 1 ? `1px solid ${C.divider}` : "none",
              transition: "background 0.08s",
              alignItems: "center",
            }}
          >
            <div style={{ padding: "0 16px", minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                {client.firmName}
              </div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", marginTop: 1 }}>
                {client.id}
              </div>
            </div>

            <div style={{ padding: "0 16px", fontSize: 12, color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
              {client.email}
            </div>

            <div style={{ padding: "0 16px" }}>
              <ModeBadge mode={client.mode} />
            </div>

            <div style={{ padding: "0 16px" }}>
              <StatusBadge ok={client.hasPortalSettings} label={client.hasPortalSettings ? "Done" : "Pending"} />
            </div>

            <div style={{ padding: "0 16px" }}>
              <StatusBadge ok={client.hasLlmConfig} label={client.hasLlmConfig ? "Set" : "Default"} />
            </div>

            <div style={{ padding: "0 16px" }}>
              <button
                onClick={() => setSelected(client)}
                style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: C.goldBg, border: `1px solid ${C.goldBdr}`,
                  color: C.gold, cursor: "pointer",
                }}
              >
                View →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div style={{
        margin: "0 28px 28px",
        padding: "12px 16px", borderRadius: 8,
        background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`,
        fontSize: 12, color: C.muted, lineHeight: 1.6,
      }}>
        Clients are registered in <code style={{ fontFamily: "monospace", color: C.gold, fontSize: 11 }}>lib/lex-config.ts</code>.
        Add a new entry to <code style={{ fontFamily: "monospace", color: C.gold, fontSize: 11 }}>LEX_CLIENT_REGISTRY</code> for each new firm,
        then send them a portal sign-in link to <code style={{ fontFamily: "monospace", color: C.gold, fontSize: 11 }}>/client-portal</code>.
      </div>

      {selected && (
        <ClientDetailPanel client={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
