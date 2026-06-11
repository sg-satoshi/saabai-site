"use client";

/**
 * Audit engagement detail — profile, fact-find (with interview mode),
 * AI assessment, notes.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell from "../../AdminSidebar";
import {
  questionsForTier,
  sectionsForTier,
} from "../../../../lib/audit-factfind";
import type {
  AuditEngagement,
  AuditTier,
  FirmType,
  FactFindValue,
} from "../../../../lib/audit-types";

const C = {
  card: "#ffffff",
  border: "rgba(0,0,0,0.08)",
  text: "#111827",
  muted: "#9ca3af",
  dim: "#6b7280",
  gold: "#b45309",
  goldBg: "rgba(180,83,9,0.07)",
  green: "#16a34a",
  greenBg: "rgba(22,163,74,0.08)",
  blue: "#2563eb",
  red: "#dc2626",
  navy: "#0e0c2e",
};

const STATUSES = [
  "purchased",
  "questionnaire_sent",
  "factfind_complete",
  "discovery",
  "assessment",
  "report",
  "delivered",
  "closed",
] as const;

const STATUS_LABELS: Record<string, string> = {
  purchased: "Purchased",
  questionnaire_sent: "Questionnaire Sent",
  factfind_complete: "Fact-Find Complete",
  discovery: "Discovery Sessions",
  assessment: "Assessment",
  report: "Report Drafting",
  delivered: "Delivered",
  closed: "Closed",
};

type Tab = "overview" | "factfind" | "assessment" | "notes";

export default function EngagementClient({ id }: { id: string }) {
  const [eng, setEng] = useState<AuditEngagement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Interview-mode local edits
  const [edits, setEdits] = useState<Record<string, FactFindValue>>({});
  const [noteText, setNoteText] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/audit/engagements/${id}`);
    if (!res.ok) {
      setError("Engagement not found.");
      return;
    }
    const data = await res.json();
    setEng(data.engagement);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3000);
  }

  async function patch(body: Record<string, unknown>, action: string) {
    setBusy(action);
    try {
      const res = await fetch(`/api/audit/engagements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setEng(data.engagement);
        showFlash("Saved.");
      } else {
        showFlash(data.error ?? "Failed.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function sendQuestionnaire() {
    setBusy("send");
    try {
      const res = await fetch(`/api/audit/engagements/${id}/send-questionnaire`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setEng(data.engagement);
        showFlash(`Questionnaire emailed to ${data.engagement.contactEmail}.`);
      } else {
        showFlash(data.error ?? "Email failed.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function generateAssessment() {
    setBusy("assessment");
    try {
      const res = await fetch(`/api/audit/engagements/${id}/assessment`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setEng(data.engagement);
        showFlash("Assessment generated — review and edit before delivery.");
      } else {
        showFlash(data.error ?? "Generation failed.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function saveInterviewEdits() {
    const responses = Object.entries(edits).map(([questionId, value]) => ({
      questionId,
      value,
    }));
    if (responses.length === 0) {
      showFlash("No changes to save.");
      return;
    }
    await patch({ responses }, "interview");
    setEdits({});
  }

  async function addNote() {
    if (!noteText.trim()) return;
    await patch({ addNote: noteText }, "note");
    setNoteText("");
  }

  const questions = useMemo(
    () =>
      eng
        ? questionsForTier(eng.tier as AuditTier, eng.firmType as FirmType)
        : [],
    [eng]
  );
  const sections = useMemo(
    () => (eng ? sectionsForTier(eng.tier as AuditTier) : []),
    [eng]
  );

  if (error) {
    return (
      <AdminShell activePath="/saabai-admin/audits">
        <div style={{ padding: 40, color: C.muted }}>{error}</div>
      </AdminShell>
    );
  }
  if (!eng) {
    return (
      <AdminShell activePath="/saabai-admin/audits">
        <div style={{ padding: 40, color: C.muted }}>Loading…</div>
      </AdminShell>
    );
  }

  const factFindLink = `${typeof window !== "undefined" ? window.location.origin : ""}/audit/factfind/${eng.factFindToken}`;
  const answeredCount = Object.keys(eng.responses ?? {}).length;

  const card: React.CSSProperties = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 20,
  };
  const btn: React.CSSProperties = {
    background: C.navy,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };
  const btnGhost: React.CSSProperties = {
    background: "transparent",
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 11px",
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    fontSize: 13.5,
    color: C.text,
    outline: "none",
    background: "#fff",
  };

  return (
    <AdminShell activePath="/saabai-admin/audits">
      <div style={{ padding: "32px 36px", maxWidth: 1000 }}>
        {/* Header */}
        <Link href="/saabai-admin/audits" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>
          ← All audits
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", margin: "10px 0 6px" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>{eng.firmName}</h1>
          <select
            value={eng.status}
            onChange={(e) => patch({ status: e.target.value }, "status")}
            style={{ ...inputStyle, width: "auto", fontWeight: 600 }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <p style={{ fontSize: 13.5, color: C.dim, margin: "0 0 18px" }}>
          {eng.tier.charAt(0).toUpperCase() + eng.tier.slice(1)} tier · {eng.firmType} ·{" "}
          {eng.contactName} ({eng.contactEmail})
        </p>

        {flash && (
          <div style={{ background: C.greenBg, color: C.green, borderRadius: 8, padding: "9px 14px", fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
            {flash}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
          {(
            [
              ["overview", "Overview"],
              ["factfind", `Fact-Find (${answeredCount})`],
              ["assessment", "Assessment"],
              ["notes", `Notes (${eng.notes?.length ?? 0})`],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: "none",
                border: "none",
                borderBottom: tab === t ? `2px solid ${C.navy}` : "2px solid transparent",
                padding: "10px 14px",
                fontSize: 13.5,
                fontWeight: tab === t ? 700 : 500,
                color: tab === t ? C.text : C.dim,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === "overview" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={card}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14.5, color: C.text }}>Fact-Find Questionnaire</h3>
              <p style={{ fontSize: 13, color: C.dim, margin: "0 0 12px" }}>
                {eng.factFindCompletedAt
                  ? `Completed ${new Date(eng.factFindCompletedAt).toLocaleString("en-AU")} — ${answeredCount} answers.`
                  : eng.factFindSentAt
                    ? `Sent ${new Date(eng.factFindSentAt).toLocaleString("en-AU")} — awaiting completion (${answeredCount} answers so far).`
                    : "Not yet sent to the client."}
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={sendQuestionnaire} disabled={busy === "send"} style={btn}>
                  {busy === "send" ? "Sending…" : eng.factFindSentAt ? "Re-send questionnaire email" : "Email questionnaire to client"}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(factFindLink);
                    showFlash("Link copied.");
                  }}
                  style={btnGhost}
                >
                  Copy client link
                </button>
              </div>
            </div>

            <div style={card}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14.5, color: C.text }}>Firm Profile</h3>
              <ProfileEditor eng={eng} onSave={(p) => patch(p, "profile")} inputStyle={inputStyle} btn={btn} busy={busy === "profile"} />
            </div>
          </div>
        )}

        {/* ── Fact-Find / Interview ── */}
        {tab === "factfind" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ ...card, background: C.goldBg, border: `1px solid rgba(180,83,9,0.2)` }}>
              <p style={{ margin: 0, fontSize: 13, color: C.gold, fontWeight: 500 }}>
                Interview mode: gold prompts below each question are your discovery-session script — they never appear to clients.
                Edit any answer live during the session, then save.
              </p>
            </div>
            {sections.map((s) => {
              const qs = questions.filter((q) => q.section === s.id);
              if (qs.length === 0) return null;
              return (
                <div key={s.id} style={card}>
                  <h3 style={{ margin: "0 0 4px", fontSize: 15, color: C.text }}>{s.title}</h3>
                  <p style={{ margin: "0 0 16px", fontSize: 12.5, color: C.muted }}>{s.description}</p>
                  <div style={{ display: "grid", gap: 18 }}>
                    {qs.map((q) => {
                      const saved = eng.responses?.[q.id];
                      const current = q.id in edits ? edits[q.id] : (saved?.value ?? null);
                      const display = Array.isArray(current) ? current.join(", ") : current === null || current === undefined ? "" : String(current);
                      return (
                        <div key={q.id}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, marginBottom: 3 }}>
                            {q.label}
                            {saved && (
                              <span style={{ fontWeight: 400, color: C.muted, fontSize: 11.5 }}>
                                {" "}· {saved.mode === "client" ? "client answer" : "interview"}
                              </span>
                            )}
                          </div>
                          {q.interviewPrompt && (
                            <div style={{ fontSize: 12.5, color: C.gold, fontStyle: "italic", marginBottom: 6 }}>
                              ◆ {q.interviewPrompt}
                            </div>
                          )}
                          {q.type === "textarea" ? (
                            <textarea
                              rows={3}
                              value={display}
                              onChange={(e) => setEdits({ ...edits, [q.id]: e.target.value })}
                              style={{ ...inputStyle, resize: "vertical" }}
                            />
                          ) : (
                            <input
                              type="text"
                              value={display}
                              onChange={(e) =>
                                setEdits({
                                  ...edits,
                                  [q.id]: q.type === "number" || q.type === "scale"
                                    ? (e.target.value === "" ? null : Number(e.target.value) || e.target.value)
                                    : e.target.value,
                                })
                              }
                              style={inputStyle}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div style={{ position: "sticky", bottom: 16 }}>
              <button onClick={saveInterviewEdits} disabled={busy === "interview"} style={{ ...btn, boxShadow: "0 4px 14px rgba(0,0,0,0.18)" }}>
                {busy === "interview" ? "Saving…" : `Save interview answers${Object.keys(edits).length ? ` (${Object.keys(edits).length} changed)` : ""}`}
              </button>
            </div>
          </div>
        )}

        {/* ── Assessment ── */}
        {tab === "assessment" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14.5, color: C.text }}>AI Assessment</h3>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: C.muted }}>
                    Crosses the fact-find against the capability matrix to draft ranked opportunities. Always review before client delivery.
                  </p>
                </div>
                <button onClick={generateAssessment} disabled={busy === "assessment"} style={btn}>
                  {busy === "assessment" ? "Generating… (can take a minute)" : eng.assessment ? "Regenerate" : "Generate assessment"}
                </button>
              </div>
            </div>

            {eng.assessment ? (
              <>
                <div style={card}>
                  <h4 style={{ margin: "0 0 8px", fontSize: 13.5, color: C.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>Executive Summary</h4>
                  <p style={{ margin: 0, fontSize: 13.5, color: C.text, lineHeight: 1.6 }}>{eng.assessment.summary}</p>
                  {eng.assessment.quickWins && (
                    <>
                      <h4 style={{ margin: "16px 0 8px", fontSize: 13.5, color: C.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>Quick Wins</h4>
                      <p style={{ margin: 0, fontSize: 13.5, color: C.text, lineHeight: 1.6 }}>{eng.assessment.quickWins}</p>
                    </>
                  )}
                  {eng.assessment.risks && (
                    <>
                      <h4 style={{ margin: "16px 0 8px", fontSize: 13.5, color: C.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>Risks & Constraints</h4>
                      <p style={{ margin: 0, fontSize: 13.5, color: C.text, lineHeight: 1.6 }}>{eng.assessment.risks}</p>
                    </>
                  )}
                  <p style={{ margin: "14px 0 0", fontSize: 11.5, color: C.muted }}>
                    Generated {new Date(eng.assessment.generatedAt).toLocaleString("en-AU")} · {eng.assessment.modelNotes}
                  </p>
                </div>

                {eng.assessment.opportunities.map((o) => (
                  <div key={o.id} style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <h4 style={{ margin: 0, fontSize: 14.5, color: C.text }}>
                        #{o.rank} — {o.title}
                      </h4>
                      <span style={{ fontSize: 12, color: C.muted }}>
                        {o.patternId && o.patternId !== "custom" ? `pattern: ${o.patternId}` : "custom"}
                      </span>
                    </div>
                    <p style={{ margin: "8px 0", fontSize: 13.5, color: C.text, lineHeight: 1.6 }}>{o.description}</p>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: C.dim }}>
                      {o.hoursSavedPerWeek !== undefined && <span>⏱ ~{o.hoursSavedPerWeek}h/week saved</span>}
                      <span>complexity: {o.complexity}</span>
                      {o.costBandAud && <span>build: {o.costBandAud}</span>}
                    </div>
                    {o.roiNotes && (
                      <p style={{ margin: "10px 0 0", fontSize: 12.5, color: C.dim, background: "rgba(0,0,0,0.03)", borderRadius: 8, padding: "8px 12px" }}>
                        ROI: {o.roiNotes}
                      </p>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div style={{ ...card, textAlign: "center", color: C.muted, fontSize: 13.5 }}>
                No assessment yet. Complete the fact-find (or interview), then generate.
              </div>
            )}
          </div>
        )}

        {/* ── Notes ── */}
        {tab === "notes" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={card}>
              <textarea
                rows={3}
                placeholder="Add a note — observations, commitments made, follow-ups…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                style={{ ...inputStyle, resize: "vertical", marginBottom: 10 }}
              />
              <button onClick={addNote} disabled={busy === "note"} style={btn}>
                {busy === "note" ? "Saving…" : "Add note"}
              </button>
            </div>
            {(eng.notes ?? []).map((n) => (
              <div key={n.id} style={card}>
                <p style={{ margin: 0, fontSize: 13.5, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{n.text}</p>
                <p style={{ margin: "8px 0 0", fontSize: 11.5, color: C.muted }}>
                  {n.author} · {new Date(n.createdAt).toLocaleString("en-AU")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function ProfileEditor({
  eng,
  onSave,
  inputStyle,
  btn,
  busy,
}: {
  eng: AuditEngagement;
  onSave: (patch: Record<string, unknown>) => void;
  inputStyle: React.CSSProperties;
  btn: React.CSSProperties;
  busy: boolean;
}) {
  const [p, setP] = useState({
    firmName: eng.firmName,
    firmSize: eng.firmSize ?? "",
    website: eng.website ?? "",
    location: eng.location ?? "",
    contactName: eng.contactName,
    contactEmail: eng.contactEmail,
    contactPhone: eng.contactPhone ?? "",
  });

  const field = (label: string, key: keyof typeof p) => (
    <div>
      <label style={{ fontSize: 11.5, color: "#9ca3af", display: "block", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </label>
      <input
        style={inputStyle}
        value={p[key]}
        onChange={(e) => setP({ ...p, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {field("Firm name", "firmName")}
      {field("Firm size", "firmSize")}
      {field("Website", "website")}
      {field("Location", "location")}
      {field("Contact name", "contactName")}
      {field("Contact email", "contactEmail")}
      {field("Contact phone", "contactPhone")}
      <div style={{ alignSelf: "end" }}>
        <button onClick={() => onSave(p)} disabled={busy} style={btn}>
          {busy ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
