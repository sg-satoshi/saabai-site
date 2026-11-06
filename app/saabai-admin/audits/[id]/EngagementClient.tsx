"use client";

/**
 * Audit engagement detail - profile, fact-find (with interview mode),
 * AI assessment, notes.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "../../AdminSidebar";
import PortalTab from "./PortalTab";
import {
  legacyAnswers,
  questionsForTier,
  sectionsForTier,
} from "../../../../lib/audit-factfind";
import type {
  AuditEngagement,
  AuditTier,
  FirmType,
  FactFindValue,
} from "../../../../lib/audit-types";
import { ClipboardList, Wallet, Building2 } from "lucide-react";
import { CreditUsePanel } from "./CreditUsePanel";
import { PageHeader } from "../../ui/PageHeader";
import { SectionCard } from "../../ui/SectionCard";
import { FieldLabel } from "../../ui/FieldLabel";
import { AdminTabs } from "../../ui/AdminTabs";

const C = {
  card: "#ffffff",
  border: "rgba(0,0,0,0.08)",
  text: "#111827",
  muted: "#64748b",
  dim: "#475569",
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

type Tab = "overview" | "factfind" | "portal" | "assessment" | "reports" | "notes";

export default function EngagementClient({ id, reviewRequired = false }: { id: string; reviewRequired?: boolean }) {
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
        showFlash("Assessment generated - review and edit before delivery.");
      } else {
        showFlash(data.error ?? "Generation failed.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function generateReport() {
    setBusy("report");
    try {
      const res = await fetch(`/api/audit/engagements/${id}/report`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setEng(data.engagement);
        showFlash(`Report v${data.report.version} generated.`);
      } else {
        showFlash(data.error ?? "Report generation failed.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function markReviewed(reportId: string) {
    setBusy("review");
    try {
      const res = await fetch(`/api/audit/engagements/${id}/report`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action: "review" }),
      });
      const data = await res.json();
      if (res.ok) {
        setEng(data.engagement);
        showFlash("Marked reviewed. You can deliver it now.");
      } else {
        showFlash(data.error ?? "Failed.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function markDelivered(reportId: string) {
    setBusy("deliver");
    try {
      const res = await fetch(`/api/audit/engagements/${id}/report`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const data = await res.json();
      if (res.ok) {
        setEng(data.engagement);
        showFlash("Marked delivered - engagement status updated.");
      } else {
        showFlash(data.error ?? "Failed.");
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
  const onboardingLink = `${typeof window !== "undefined" ? window.location.origin : ""}/audit/onboarding/${eng.factFindToken}`;
  const answeredCount = Object.keys(eng.responses ?? {}).length;

  const card: React.CSSProperties = {
    background: C.card,
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    padding: "20px 24px",
  };
  const btn: React.CSSProperties = {
    background: C.navy,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    height: 36,
    padding: "0 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  };
  const btnGhost: React.CSSProperties = {
    background: "#fff",
    color: "#1e293b",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    height: 36,
    padding: "0 12px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 40,
    padding: "8px 12px",
    lineHeight: "22px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    color: "#0f172a",
    outline: "none",
    background: "#fff",
  };

  return (
    <AdminShell activePath="/saabai-admin/audits">
      <div className="au-scope au-fab-safe">
        <PageHeader
          back={{ href: "/saabai-admin/audits", label: "Blueprints" }}
          title={eng.firmName}
          meta={
            <>
              {eng.tier.charAt(0).toUpperCase() + eng.tier.slice(1)} tier · {eng.firmType} ·{" "}
              {eng.contactName} ({eng.contactEmail})
            </>
          }
          actions={
            <select
              aria-label="Engagement status"
              value={eng.status}
              onChange={(e) => patch({ status: e.target.value }, "status")}
              style={{ ...inputStyle, width: "auto", fontWeight: 600 }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          }
        />

        {flash && (
          <div style={{ background: C.greenBg, color: C.green, borderRadius: 8, padding: "9px 14px", fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
            {flash}
          </div>
        )}

        <AdminTabs
          label="Engagement sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "factfind", label: "Fact-Find", count: answeredCount },
            { id: "portal", label: "Portal" },
            { id: "assessment", label: "Assessment" },
            { id: "reports", label: "Reports", count: eng.reports?.length ?? 0 },
            { id: "notes", label: "Notes", count: eng.notes?.length ?? 0 },
          ]}
        />

        {tab === "portal" && <PortalTab id={id} onChanged={load} />}

        {/* ── Overview ── */}
        {tab === "overview" && (
          <div className="au-detail">
            <SectionCard
              className="au-main"
              icon={ClipboardList}
              title="Fact-Find Questionnaire"
              badge={!eng.factFindCompletedAt && !eng.factFindSentAt ? <span className="au-pill">Not yet sent</span> : null}
            >
              {(eng.factFindCompletedAt || eng.factFindSentAt) && (
                <p className="au-body" style={{ marginBottom: 12 }}>
                  {eng.factFindCompletedAt
                    ? `Completed ${new Date(eng.factFindCompletedAt).toLocaleString("en-AU")} - ${answeredCount} answers.`
                    : `Sent ${new Date(eng.factFindSentAt!).toLocaleString("en-AU")} - awaiting completion (${answeredCount} answers so far).`}
                </p>
              )}
              {eng.factFindCompletedAt && (
                <p className="au-body" style={{ marginBottom: 12 }}>
                  Anonymous quote consent:{" "}
                  <strong style={{ color: eng.quoteConsent ? C.gold : C.text }}>
                    {eng.quoteConsent ? "Yes, their words may be used without name or business" : "No, do not reuse their words"}
                  </strong>
                </p>
              )}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" className="btn pri au-1" onClick={sendQuestionnaire} disabled={busy === "send"}>
                  {busy === "send" ? "Sending…" : eng.factFindSentAt ? "Re-send questionnaire email" : "Email questionnaire to client"}
                </button>
                <button
                  type="button"
                  className="btn au-2"
                  onClick={() => {
                    navigator.clipboard.writeText(factFindLink);
                    showFlash("Link copied.");
                  }}
                >
                  Copy client link
                </button>
                <button
                  type="button"
                  className="au-link"
                  onClick={() => {
                    navigator.clipboard.writeText(onboardingLink);
                    showFlash("Search onboarding link copied. It is not emailed.");
                  }}
                >
                  Copy search onboarding link
                </button>
              </div>
            </SectionCard>

            <SectionCard className="au-side" icon={Wallet} title="Blueprint credit">
              <CreditUsePanel
                eng={eng}
                onSaved={(next) => {
                  setEng(next);
                  showFlash("Credit recorded.");
                }}
                inputStyle={inputStyle}
                btn={btn}
              />
            </SectionCard>

            <SectionCard className="au-main" icon={Building2} title="Firm Profile">
              <ProfileEditor eng={eng} onSave={(p) => patch(p, "profile")} inputStyle={inputStyle} btn={btn} busy={busy === "profile"} />
            </SectionCard>

            <SectionCard className="au-main" title="Client Timeline">
              {(eng.timeline ?? []).length === 0 ? (
                <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                  No events yet. Touchpoints are logged automatically: questionnaire sent, fact-find progress, sessions, assessment and report delivery.
                </p>
              ) : (
                <div style={{ position: "relative", paddingLeft: 22 }}>
                  <div style={{ position: "absolute", left: 6, top: 6, bottom: 6, width: 2, background: "rgba(0,0,0,0.07)", borderRadius: 2 }} />
                  {(eng.timeline ?? []).map((ev) => {
                    const dotColor =
                      ev.type === "report_delivered" || ev.type === "factfind_completed"
                        ? C.green
                        : ev.type === "assessment_generated" || ev.type === "report_generated"
                          ? C.gold
                          : ev.type === "status_changed"
                            ? C.blue
                            : "#0e0c2e";
                    return (
                      <div key={ev.id} style={{ position: "relative", marginBottom: 16 }}>
                        <div
                          style={{
                            position: "absolute",
                            left: -22,
                            top: 4,
                            width: 11,
                            height: 11,
                            borderRadius: "50%",
                            background: dotColor,
                            border: "2px solid #fff",
                            boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
                          }}
                        />
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>
                          {ev.label}
                          {ev.detail && (
                            <span style={{ fontWeight: 400, color: C.dim }}> - {ev.detail}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                          {new Date(ev.at).toLocaleString("en-AU", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* ── Fact-Find / Interview ── */}
        {tab === "factfind" && (
          <div className="au-stack">
            <div style={{ ...card, background: C.goldBg, border: `1px solid rgba(180,83,9,0.2)` }}>
              <p style={{ margin: 0, fontSize: 13, color: C.gold, fontWeight: 500 }}>
                Interview mode: gold prompts below each question are your discovery-session script - they never appear to clients.
                Edit any answer live during the session, then save.
              </p>
            </div>
            {legacyAnswers(eng.responses).length > 0 && (
              <div style={card}>
                <h3 style={{ margin: "0 0 4px", fontSize: 18, lineHeight: "28px", fontWeight: 600, letterSpacing: "-0.025em", color: "#0b092e" }}>Earlier answers</h3>
                <p style={{ margin: "0 0 16px", fontSize: 14, color: C.muted }}>Answers to questions no longer on the form. Still used by the assessment.</p>
                {legacyAnswers(eng.responses).map((l) => (
                  <div key={l.id} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, marginBottom: 3 }}>{l.label}</div>
                    <div style={{ fontSize: 13.5, color: C.dim, whiteSpace: "pre-wrap" }}>{l.value}</div>
                  </div>
                ))}
              </div>
            )}
            {sections.map((s) => {
              const qs = questions.filter((q) => q.section === s.id);
              if (qs.length === 0) return null;
              return (
                <div key={s.id} style={card}>
                  <h3 style={{ margin: "0 0 4px", fontSize: 18, lineHeight: "28px", fontWeight: 600, letterSpacing: "-0.025em", color: "#0b092e" }}>{s.title}</h3>
                  <p style={{ margin: "0 0 16px", fontSize: 14, color: C.muted }}>{s.description}</p>
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
          <div className="au-stack">
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, lineHeight: "28px", fontWeight: 600, letterSpacing: "-0.025em", color: "#0b092e" }}>AI Assessment</h3>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: C.muted }}>
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
                  {eng.assessment.avoidRepeating && (
                    <>
                      <h4 style={{ margin: "16px 0 8px", fontSize: 13.5, color: C.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>Not repeating (from answer 2)</h4>
                      <p style={{ margin: 0, fontSize: 13.5, color: C.text, lineHeight: 1.6 }}>{eng.assessment.avoidRepeating}</p>
                    </>
                  )}
                  {eng.assessment.concernsNote && (
                    <>
                      <h4 style={{ margin: "16px 0 8px", fontSize: 13.5, color: C.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>Response to answer 3</h4>
                      <p style={{ margin: 0, fontSize: 13.5, color: C.text, lineHeight: 1.6 }}>{eng.assessment.concernsNote}</p>
                    </>
                  )}
                  <p style={{ margin: "14px 0 0", fontSize: 11.5, color: C.muted }}>
                    Generated {new Date(eng.assessment.generatedAt).toLocaleString("en-AU")} · {eng.assessment.modelNotes}
                  </p>
                </div>

                {eng.assessment.opportunities.map((o) => (
                  <div key={o.id} style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <h4 style={{ margin: 0, fontSize: 18, lineHeight: "28px", fontWeight: 600, letterSpacing: "-0.025em", color: "#0b092e" }}>
                        #{o.rank} - {o.title}
                        {o.fixesMainFrustration && (
                          <span style={{ marginLeft: 8, fontSize: 11.5, fontWeight: 500, color: C.gold }}>Fixes their #1 frustration</span>
                        )}
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

        {/* ── Reports ── */}
        {tab === "reports" && (
          <div className="au-stack">
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, lineHeight: "28px", fontWeight: 600, letterSpacing: "-0.025em", color: "#0b092e" }}>Audit Report</h3>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: C.muted }}>
                    Generates a branded .docx draft from the profile + assessment. Polish in Word, then deliver.
                  </p>
                </div>
                <button onClick={generateReport} disabled={busy === "report"} style={btn}>
                  {busy === "report" ? "Generating…" : "Generate report draft"}
                </button>
              </div>
              {!eng.assessment && (
                <p style={{ margin: "12px 0 0", fontSize: 12.5, color: C.gold }}>
                  Tip: generate the assessment first - the report pulls its summary, opportunities and roadmap from it.
                </p>
              )}
            </div>

            {(eng.reports ?? []).length === 0 ? (
              <div style={{ ...card, textAlign: "center", color: C.muted, fontSize: 13.5 }}>
                No report versions yet.
              </div>
            ) : (
              (eng.reports ?? []).map((r) => (
                <div key={r.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>
                      v{r.version} - {r.filename}
                      {r.deliveredAt && (
                        <span style={{ marginLeft: 8, background: C.greenBg, color: C.green, padding: "2px 9px", borderRadius: 99, fontSize: 11.5, fontWeight: 600 }}>
                          Delivered
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                      Generated {new Date(r.generatedAt).toLocaleString("en-AU")}
                      {r.reviewedAt && ` · reviewed ${new Date(r.reviewedAt).toLocaleString("en-AU")}`}
                      {r.deliveredAt && ` · delivered ${new Date(r.deliveredAt).toLocaleString("en-AU")}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <a href={r.url} download={r.filename} style={{ ...btnGhost, textDecoration: "none", display: "inline-block" }}>
                      Download .docx
                    </a>
                    {reviewRequired && !r.deliveredAt && !r.reviewedAt && (
                      <button onClick={() => markReviewed(r.id)} disabled={busy === "review"} style={btnGhost}>
                        Mark reviewed
                      </button>
                    )}
                    {!r.deliveredAt && (
                      <button onClick={() => markDelivered(r.id)} disabled={busy === "deliver"} style={btn}>
                        Mark delivered
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Notes ── */}
        {tab === "notes" && (
          <div className="au-stack">
            <div style={card}>
              <textarea
                rows={3}
                placeholder="Add a note - observations, commitments made, follow-ups…"
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
      <FieldLabel htmlFor={`pf-${key}`}>{label}</FieldLabel>
      <input
        id={`pf-${key}`}
        style={inputStyle}
        value={p[key]}
        onChange={(e) => setP({ ...p, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="au-form">
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
