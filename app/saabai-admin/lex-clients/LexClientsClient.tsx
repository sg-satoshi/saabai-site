"use client";

import { useState, useEffect } from "react";
import AdminShell from "../AdminSidebar";
import type { LexClientRow } from "../../api/admin/lex-clients/route";

const C = {
  bg:           "#07091a",
  card:         "#0e1128",
  surface:      "#131729",
  surfaceHi:    "#181c32",
  border:       "rgba(255,255,255,0.07)",
  borderBright: "rgba(255,255,255,0.14)",
  text:         "#e2e4f0",
  muted:        "#525873",
  dim:          "#2a2d47",
  gold:         "#C9A84C",
  goldB:        "#E0BC6A",
  goldBg:       "rgba(201,168,76,0.08)",
  goldBdr:      "rgba(201,168,76,0.20)",
  green:        "#22c55e",
  greenBg:      "rgba(34,197,94,0.10)",
  greenBdr:     "rgba(34,197,94,0.25)",
  amber:        "#f5a623",
  amberBg:      "rgba(245,166,35,0.10)",
  red:          "#ef4444",
  blue:         "#4d8ef6",
  blueBg:       "rgba(77,142,246,0.10)",
};

type Stats = { total: number; configured: number; withLlmKey: number };

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
      padding: "3px 8px", borderRadius: 20,
      color: ok ? C.green : C.amber,
      background: ok ? C.greenBg : C.amberBg,
      border: `1px solid ${ok ? C.greenBdr : "rgba(245,166,35,0.25)"}`,
      whiteSpace: "nowrap" as const,
    }}>
      {ok ? "✓" : "○"} {label}
    </span>
  );
}

function ModeBadge({ mode }: { mode: "internal" | "external" }) {
  const isInt = mode === "internal";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
      padding: "2px 8px", borderRadius: 20,
      color: isInt ? C.blue : C.gold,
      background: isInt ? C.blueBg : C.goldBg,
      border: `1px solid ${isInt ? "rgba(77,142,246,0.25)" : C.goldBdr}`,
      whiteSpace: "nowrap" as const,
    }}>
      {isInt ? "Internal" : "External"}
    </span>
  );
}

function ClientDetailPanel({
  client,
  onClose,
}: {
  client: LexClientRow;
  onClose: () => void;
}) {
  const s = client.settingsSummary;
  const portalUrl = `/client-portal`;

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
          background: C.card,
          borderLeft: `1px solid ${C.borderBright}`,
          display: "flex", flexDirection: "column",
          overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: C.text }}>{client.firmName}</p>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{client.email}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18, padding: "2px 4px", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Identity */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
            <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Identity</p>
            <Row label="Client ID" value={client.id} mono />
            <Row label="Agent Name" value={client.agentName} />
            <Row label="Mode" value={<ModeBadge mode={client.mode} />} />
            <Row label="Portal Config" value={<StatusBadge ok={client.hasPortalSettings} label={client.hasPortalSettings ? "Configured" : "Not set"} />} />
            <Row label="Custom LLM" value={<StatusBadge ok={client.hasLlmConfig} label={client.hasLlmConfig ? `${client.llmProvider} / ${client.llmModel}` : "Using default"} />} />
          </div>

          {/* Practice areas */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
            <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Practice Areas</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {client.practiceAreas.map(a => (
                <span key={a} style={{
                  fontSize: 11, padding: "3px 9px", borderRadius: 20,
                  background: C.goldBg, border: `1px solid ${C.goldBdr}`, color: C.goldB,
                }}>{a}</span>
              ))}
            </div>
          </div>

          {/* Settings summary */}
          {s && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
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
            <div style={{
              background: C.amberBg,
              border: `1px solid rgba(245,166,35,0.22)`,
              borderRadius: 10, padding: "16px 18px",
            }}>
              <p style={{ margin: 0, fontSize: 13, color: C.amber }}>
                No portal configuration saved yet. The client hasn&apos;t completed setup.
              </p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a
              href={portalUrl}
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
                background: "transparent", border: `1px solid ${C.border}`,
                color: C.muted, fontSize: 13, fontWeight: 600, textDecoration: "none",
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

export default function LexClientsClient() {
  const [clients, setClients] = useState<LexClientRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LexClientRow | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "internal" | "external">("all");

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
    <AdminShell activePath="/saabai-admin/lex-clients">
      <div style={{ padding: "40px 40px 60px", maxWidth: 1060 }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: -0.5 }}>
            Lex Clients
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: C.muted }}>
            All law firms connected to the Lex platform — configuration status, agent settings, and LLM keys.
          </p>
        </div>

        {/* Stats row */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Total Firms",    value: stats.total,      color: C.gold,  bg: C.goldBg,  bdr: C.goldBdr },
              { label: "Configured",     value: stats.configured, color: C.green, bg: C.greenBg, bdr: C.greenBdr },
              { label: "Custom LLM Key", value: stats.withLlmKey, color: C.blue,  bg: C.blueBg,  bdr: "rgba(77,142,246,0.25)" },
            ].map(s => (
              <div key={s.label} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderTop: `3px solid ${s.color}`,
                borderRadius: 12, padding: "20px 22px",
              }}>
                <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</p>
                <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {(["all", "internal", "external"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterMode(f)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12,
                fontWeight: filterMode === f ? 700 : 500,
                border: `1px solid ${filterMode === f ? C.goldBdr : C.border}`,
                background: filterMode === f ? C.goldBg : "transparent",
                color: filterMode === f ? C.gold : C.muted,
                cursor: "pointer",
                textTransform: "capitalize" as const,
              }}
            >
              {f === "all" ? `All (${clients.length})` : f === "internal" ? `Internal (${clients.filter(c => c.mode === "internal").length})` : `External (${clients.filter(c => c.mode === "external").length})`}
            </button>
          ))}
        </div>

        {/* Clients table */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.8fr 1fr 1fr 1fr 80px",
            gap: 12, padding: "10px 20px",
            borderBottom: `1px solid ${C.border}`,
            background: C.surface,
          }}>
            {["Firm", "Email", "Mode", "Portal Config", "LLM Key", ""].map(h => (
              <p key={h} style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{h}</p>
            ))}
          </div>

          {loading && (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Loading clients…</p>
            </div>
          )}
          {error && (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 13, color: C.red }}>{error}</p>
            </div>
          )}

          {!loading && !error && filtered.map((client, i) => (
            <div
              key={client.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.8fr 1fr 1fr 1fr 80px",
                gap: 12, padding: "14px 20px",
                borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                  {client.firmName}
                </p>
                <p style={{ margin: 0, fontSize: 10, color: C.muted, fontFamily: "monospace" }}>
                  {client.id}
                </p>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                {client.email}
              </p>
              <div><ModeBadge mode={client.mode} /></div>
              <div><StatusBadge ok={client.hasPortalSettings} label={client.hasPortalSettings ? "Done" : "Pending"} /></div>
              <div><StatusBadge ok={client.hasLlmConfig} label={client.hasLlmConfig ? "Set" : "Default"} /></div>
              <button
                onClick={() => setSelected(client)}
                style={{
                  padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: 700,
                  background: C.goldBg, border: `1px solid ${C.goldBdr}`,
                  color: C.gold, cursor: "pointer",
                }}
              >
                View →
              </button>
            </div>
          ))}

          {!loading && !error && filtered.length === 0 && (
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 13, color: C.muted }}>No clients found.</p>
            </div>
          )}
        </div>

        {/* Note about adding clients */}
        <div style={{
          marginTop: 20, padding: "14px 18px", borderRadius: 10,
          background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`,
        }}>
          <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            Clients are registered in <code style={{ fontFamily: "monospace", color: C.gold, fontSize: 11 }}>lib/lex-config.ts</code>.
            Add a new entry to <code style={{ fontFamily: "monospace", color: C.gold, fontSize: 11 }}>LEX_CLIENT_REGISTRY</code> for each new firm,
            then send them a portal sign-in link to <code style={{ fontFamily: "monospace", color: C.gold, fontSize: 11 }}>/client-portal</code>.
          </p>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <ClientDetailPanel client={selected} onClose={() => setSelected(null)} />
      )}
    </AdminShell>
  );
}
