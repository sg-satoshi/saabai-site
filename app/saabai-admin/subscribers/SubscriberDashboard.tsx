"use client";
import { confirmDialog } from "../ui/Feedback";
import { escapeHtml } from "../../../lib/html-escape";
import { NONE_SENT_MSG, broadcastResult } from "../../../lib/broadcast-result";
import { MERGE_FIELDS, SAMPLE_VALUES, mergeToken, personaliseHtml, personaliseText, valuesFor } from "../../../lib/personalise";

import { useState, useEffect, useRef } from "react";
import AdminShell from "../AdminSidebar";

// ── Light theme tokens ────────────────────────────────────────────────────────

const D = {
  bg:       "#f5f5f7",
  card:     "#ffffff",
  surface:  "#f3f4f6",
  border:   "rgba(0,0,0,0.08)",
  borderHi: "rgba(0,0,0,0.12)",
  text:     "#111827",
  secondary:"#6b7280",
  muted:    "#9ca3af",
  teal:     "#0891b2",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Subscriber {
  email: string;
  firstName: string;
  industry: string;
  source: string;
  subscribedAt: string;
  status: string;
  ip?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  marketingConsent?: string;
}

/** Same rule as the server (lib/subscribers canReceiveMarketing): only these get a real broadcast. */
const optedIn = (s: Subscriber) => s.status === "active" && s.marketingConsent === "yes";

const INDUSTRY_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  "Law / Legal":          { color: "#818cf8", bg: "rgba(99,102,241,0.15)",  dot: "#6366f1" },
  "Accounting / Finance": { color: "#fbbf24", bg: "rgba(245,158,11,0.12)",  dot: "#f59e0b" },
  "Real Estate":          { color: "#34d399", bg: "rgba(16,185,129,0.12)",  dot: "#10b981" },
  "Other":                { color: "#9ca3af", bg: "rgba(156,163,175,0.12)", dot: "#9ca3af" },
};

function getIC(industry: string) {
  return INDUSTRY_CONFIG[industry] ?? INDUSTRY_CONFIG["Other"];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function buildGrowthData(subs: Subscriber[], days = 30) {
  const counts: Record<string, number> = {};
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000).toISOString().slice(0, 10);
    counts[d] = 0;
  }
  subs.forEach(s => {
    const d = s.subscribedAt.slice(0, 10);
    if (counts[d] !== undefined) counts[d]++;
  });
  return Object.entries(counts).map(([date, count]) => ({ date, count }));
}

function buildIndustryBreakdown(subs: Subscriber[]) {
  const totals: Record<string, number> = {};
  subs.forEach(s => { const k = s.industry || "Other"; totals[k] = (totals[k] ?? 0) + 1; });
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, pct: Math.round((count / subs.length) * 100) }));
}

function buildSourceBreakdown(subs: Subscriber[]) {
  const totals: Record<string, number> = {};
  subs.forEach(s => { const k = s.source || "/"; totals[k] = (totals[k] ?? 0) + 1; });
  return Object.entries(totals).sort((a, b) => b[1] - a[1]);
}

// ── Bar chart ─────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);
  const showEvery = Math.ceil(data.length / 6);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80 }}>
        {data.map((d, i) => (
          <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, height: "100%" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
              <div
                title={`${d.date}: ${d.count} subscriber${d.count !== 1 ? "s" : ""}`}
                style={{
                  width: "100%",
                  height: d.count === 0 ? 2 : `${Math.max(4, Math.round((d.count / max) * 80))}px`,
                  background: d.count > 0 ? "linear-gradient(180deg, #0891b2 0%, #0284c7 100%)" : "rgba(0,0,0,0.06)",
                  borderRadius: "3px 3px 0 0",
                  transition: "height 0.3s ease",
                  cursor: "default",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
        {data.map((d, i) => (
          <div key={d.date} style={{ flex: 1, textAlign: "center" }}>
            {i % showEvery === 0 && (
              <span style={{ fontSize: 9, color: D.muted, whiteSpace: "nowrap" }}>
                {new Date(d.date + "T12:00:00Z").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        ))}
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 11, color: D.secondary }}>
        {total} new subscriber{total !== 1 ? "s" : ""} in the last {data.length} days
      </p>
    </div>
  );
}

// ── Segment definitions ───────────────────────────────────────────────────────

const SEGMENTS = [
  { label: "All Active",        filter: (s: Subscriber) => s.status !== "unsubscribed" },
  { label: "Law / Legal",       filter: (s: Subscriber) => s.industry === "Law / Legal" },
  { label: "Accounting",        filter: (s: Subscriber) => s.industry === "Accounting / Finance" },
  { label: "Real Estate",       filter: (s: Subscriber) => s.industry === "Real Estate" },
  { label: "This Month",        filter: (s: Subscriber) => Date.now() - new Date(s.subscribedAt).getTime() < 30 * 86400000 },
  { label: "This Week",         filter: (s: Subscriber) => Date.now() - new Date(s.subscribedAt).getTime() < 7 * 86400000 },
  { label: "Australia",         filter: (s: Subscriber) => s.country === "Australia" },
  { label: "Outside Australia", filter: (s: Subscriber) => !!s.country && s.country !== "Australia" },
];

// ── Broadcast Panel ───────────────────────────────────────────────────────────

/** Full-screen overlay for the broadcast panel: starts at the top, Escape or the backdrop closes it, page scroll is locked. */
function BroadcastModal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      // Leave Escape to the confirm dialog while it is open.
      if (e.key === "Escape" && !document.querySelector("[data-bc-confirm]")) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);
  return (
    <div
      className="bc-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bc-title"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(15,23,42,0.45)", overflowY: "auto", scrollbarWidth: "none", padding: "32px 16px 48px" }}
    >
      <style>{`.bc-overlay::-webkit-scrollbar{display:none}`}</style>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

function BroadcastPanel({
  recipients, allSubs, onClose, onSelectSegment,
}: {
  recipients: Subscriber[];
  allSubs: Subscriber[];
  onClose: () => void;
  onSelectSegment: (emails: Set<string>) => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ kind: "ok" | "none" | "error"; msg: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastField = useRef<"subject" | "body">("body");
  const optedInCount = recipients.filter(optedIn).length;

  // Open focused on the subject so the panel is in view and ready to type.
  useEffect(() => { subjectRef.current?.focus(); }, []);

  /** Insert a personalisation token at the cursor in the subject or body (whichever was used last). */
  function insertToken(token: string) {
    const target = lastField.current;
    if (target === "body" && preview) setPreview(false);
    const el = target === "subject" ? subjectRef.current : bodyRef.current;
    const value = target === "subject" ? subject : body;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    if (target === "subject") setSubject(next); else setBody(next);
    const caret = start + token.length;
    window.requestAnimationFrame(() => {
      const node = target === "subject" ? subjectRef.current : bodyRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(caret, caret);
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 13px", fontSize: 13,
    border: `1px solid ${D.borderHi}`, borderRadius: 8, outline: "none",
    background: D.surface, color: D.text, fontFamily: "inherit",
    boxSizing: "border-box" as const,
  };

  // Preview with the first selected subscriber's real values (blank fields show their fallback), or sample values.
  const previewSub = recipients[0];
  const previewValues = previewSub ? valuesFor(previewSub) : SAMPLE_VALUES;
  const previewHtml = personaliseHtml(body
    .split("\n").map(l => `<p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.7;">${escapeHtml(l) || "&nbsp;"}</p>`).join(""), previewValues);
  const previewSubject = personaliseText(subject, previewValues);

  async function send() {
    setResult(null);
    if (optedInCount === 0) {
      setConfirmOpen(false);
      setResult({ kind: "none", msg: NONE_SENT_MSG });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/subscribers/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: recipients.map(s => s.email), subject: subject.trim(), html: buildHtml(body) }),
      });
      const data = await res.json().catch(() => ({}));
      setResult(broadcastResult(res.ok, data));
    } catch {
      setResult({ kind: "error", msg: "The broadcast did not go out. Check your connection and try again." });
    } finally {
      setConfirmOpen(false);
      setSending(false);
    }
  }

  // Test send: the server fixes the recipient to hello@saabai.ai and never reads the subscriber list.
  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/subscribers/broadcast/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), html: buildHtml(body) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setTestResult({ ok: true, msg: `Test sent to hello@saabai.ai as "${data.subject}", with sample values in the personalisation fields. Check that inbox.` });
      else setTestResult({ ok: false, msg: data.error || "Test send failed" });
    } catch {
      setTestResult({ ok: false, msg: "Test send failed" });
    } finally {
      setTesting(false);
    }
  }

  function buildHtml(rawBody: string) {
    const paragraphs = rawBody
      .split("\n")
      .map(l => escapeHtml(l))
      .map(l => `<p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.75;">${l || "&nbsp;"}</p>`)
      .join("");
    return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <tr><td style="background:#0e0c2e;padding:28px 40px;">
    <p style="margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.3px;">Saabai<span style="color:#00bfa5;">.</span>ai</p>
  </td></tr>
  <tr><td style="padding:36px 40px 28px;">${paragraphs}</td></tr>
</table></td></tr></table></body></html>`;
  }

  const ready = subject.trim().length > 0 && body.trim().length > 0 && recipients.length > 0;
  const labelStyle: React.CSSProperties = { margin: "0 0 7px", fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: D.muted, textTransform: "uppercase" };
  const testReady = subject.trim().length > 0 && body.trim().length > 0 && !testing && !sending;

  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.18)" }}>

      {/* Panel header */}
      <div style={{ background: "rgba(8,145,178,0.06)", borderBottom: `1px solid ${D.border}`, padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(8,145,178,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: D.teal }}>BC</div>
          <div>
            <h2 id="bc-title" style={{ margin: 0, fontSize: 24, fontWeight: 700, color: D.text, letterSpacing: -0.3 }}>Broadcast Email</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: D.secondary }}>
              {recipients.length} selected · {optedInCount} opted in to marketing (only they receive it)
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={sendTest}
            disabled={!testReady}
            title="Sends one copy, with [TEST] in the subject and sample values in the fields, to hello@saabai.ai only. Never to subscribers. Works with no recipients selected."
            style={{
              padding: "9px 16px", borderRadius: 8,
              border: `1px dashed ${testReady ? D.teal : D.borderHi}`,
              background: testReady ? "rgba(8,145,178,0.06)" : "transparent",
              color: testReady ? D.teal : D.muted,
              fontSize: 13, fontWeight: 700, cursor: testReady ? "pointer" : "not-allowed",
            }}
          >
            {testing ? "Sending test..." : "Send test to hello@"}
          </button>
          <button onClick={onClose} aria-label="Close broadcast" style={{ background: "none", border: "none", color: D.muted, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "4px 8px" }}>×</button>
        </div>
      </div>

      {/* Test result, right under the header so it is seen */}
      {testResult && (
        <div role="status" style={{ margin: "16px 28px 0", padding: "12px 16px", borderRadius: 10, background: testResult.ok ? "rgba(8,145,178,0.08)" : "rgba(220,38,38,0.1)", border: `1px solid ${testResult.ok ? "rgba(8,145,178,0.3)" : "rgba(220,38,38,0.3)"}` }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: testResult.ok ? D.teal : "#dc2626" }}>{testResult.msg}</p>
        </div>
      )}

      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column" as const, gap: 20 }}>

        {/* Smart segments */}
        <div>
          <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: D.muted, textTransform: "uppercase" as const }}>Smart Segments</p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 7 }}>
            {SEGMENTS.map(seg => {
              const matches = allSubs.filter(seg.filter);
              return (
                <button
                  key={seg.label}
                  onClick={() => onSelectSegment(new Set(matches.map(s => s.email)))}
                  style={{
                    padding: "5px 13px", borderRadius: 20,
                    border: `1px solid ${D.borderHi}`, background: D.surface,
                    fontSize: 12, fontWeight: 600, color: D.secondary,
                    cursor: matches.length === 0 ? "default" : "pointer",
                    opacity: matches.length === 0 ? 0.4 : 1,
                  }}
                  onMouseEnter={e => { if (matches.length) { e.currentTarget.style.background = "rgba(8,145,178,0.1)"; e.currentTarget.style.borderColor = "rgba(8,145,178,0.4)"; e.currentTarget.style.color = D.teal; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = D.surface; e.currentTarget.style.borderColor = D.borderHi; e.currentTarget.style.color = D.secondary; }}
                >
                  {seg.label} <span style={{ color: D.muted, fontWeight: 400 }}>({matches.length})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recipient pills */}
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: D.muted, textTransform: "uppercase" as const }}>Recipients ({recipients.length})</p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, maxHeight: 72, overflowY: "auto" as const, scrollbarWidth: "none" as const }}>
            {recipients.map(s => (
              <span key={s.email} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "rgba(8,145,178,0.1)", color: D.teal, border: "1px solid rgba(8,145,178,0.25)", fontWeight: 500 }}>
                {s.firstName || s.email}
              </span>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="bc-subject" style={{ ...labelStyle, display: "block" }}>Subject Line</label>
          <input
            id="bc-subject"
            ref={subjectRef}
            value={subject}
            onChange={e => setSubject(e.target.value)}
            onFocus={() => { lastField.current = "subject"; }}
            placeholder="e.g. {{firstName|there}}, your AI score results"
            style={inputStyle}
          />
        </div>

        {/* Insert personalisation field */}
        <div>
          <p style={labelStyle}>Insert personalisation field</p>
          <div role="group" aria-label="Insert personalisation field" style={{ display: "flex", flexWrap: "wrap" as const, gap: 7 }}>
            {MERGE_FIELDS.map(f => (
              <button
                key={f.key}
                type="button"
                // Keep the cursor where it is in the subject or body.
                onMouseDown={e => e.preventDefault()}
                onClick={() => insertToken(mergeToken(f))}
                title={`Inserts ${mergeToken(f)}. If a subscriber's ${f.label.toLowerCase()} is blank, "${f.fallback}" is used.`}
                style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid rgba(8,145,178,0.35)", background: "rgba(8,145,178,0.08)", color: D.teal, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                + {f.label}
              </button>
            ))}
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: D.muted, lineHeight: 1.5 }}>
            Adds the field where your cursor is, in the subject or the message. The word after the | is used when that field is blank, for example {"{{firstName|there}}"} gives &quot;Hi there&quot;. Edit it to change the fallback.
          </p>
        </div>

        {/* Body */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <label htmlFor="bc-body" style={{ ...labelStyle, margin: 0 }}>Message Body</label>
            <div style={{ display: "flex", gap: 2 }}>
              {["Write", "Preview"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setPreview(tab === "Preview")}
                  style={{
                    padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "1px solid",
                    borderColor: (tab === "Preview") === preview ? D.teal : D.borderHi,
                    background: (tab === "Preview") === preview ? "rgba(8,145,178,0.15)" : D.surface,
                    color: (tab === "Preview") === preview ? D.teal : D.secondary,
                    cursor: "pointer",
                  }}
                >{tab}</button>
              ))}
            </div>
          </div>

          {!preview ? (
            <>
              <textarea
                id="bc-body"
                ref={bodyRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                onFocus={() => { lastField.current = "body"; }}
                placeholder={`Hi {{firstName|there}},\n\nWrite your message here.\n\nTalk soon,\nShane`}
                rows={10}
                style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.7, minHeight: 160, scrollbarWidth: "none" as const }}
              />
              <p style={{ margin: "5px 0 0", fontSize: 12, color: D.muted }}>Each subscriber gets their own values. Blank fields use the fallback after the |. Check the Preview tab before sending.</p>
            </>
          ) : (
            <div style={{ border: `1px solid ${D.border}`, borderRadius: 8, overflow: "hidden", minHeight: 200 }}>
              <div style={{ background: D.surface, borderBottom: `1px solid ${D.border}`, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ marginLeft: 8, fontSize: 11, color: D.muted }}>Email preview · {previewSub ? `As ${previewSub.email} would see it` : "Sample values (no recipient selected)"}</span>
              </div>
              <div style={{ padding: "20px 24px", background: D.card }}>
                <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: D.text }}>{previewSubject || <em style={{ color: D.muted }}>No subject yet</em>}</p>
                {body ? (
                  <div style={{ color: D.secondary, fontSize: 13, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : (
                  <p style={{ color: D.muted, fontSize: 13 }}>Start typing your message to see a preview.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Result banner */}
        {result && (
          <div role="status" style={{ padding: "12px 16px", borderRadius: 10, background: result.kind === "ok" ? "rgba(5,150,105,0.1)" : result.kind === "none" ? "rgba(217,119,6,0.1)" : "rgba(220,38,38,0.1)", border: `1px solid ${result.kind === "ok" ? "rgba(5,150,105,0.3)" : result.kind === "none" ? "rgba(217,119,6,0.3)" : "rgba(220,38,38,0.3)"}` }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: result.kind === "ok" ? "#047857" : result.kind === "none" ? "#b45309" : "#dc2626" }}>{result.msg}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4, gap: 12, flexWrap: "wrap" as const }}>
          <p style={{ margin: 0, fontSize: 12, color: D.muted }}>
            Sent from <strong style={{ color: D.secondary }}>hello@saabai.ai</strong>
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
            <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${D.borderHi}`, background: "transparent", color: D.secondary, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
            <button
              onClick={() => { if (optedInCount === 0) { setResult({ kind: "none", msg: NONE_SENT_MSG }); return; } setConfirmOpen(true); }}
              disabled={!ready || sending}
              style={{
                padding: "9px 22px", borderRadius: 8, border: "none",
                background: ready && !sending ? D.teal : "rgba(0,0,0,0.08)",
                color: ready && !sending ? "#ffffff" : D.muted,
                fontSize: 12, fontWeight: 700, cursor: ready && !sending ? "pointer" : "not-allowed",
              }}
            >
              {sending ? "Sending…" : `Send to ${optedInCount} opted in`}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmOpen && (
        <div data-bc-confirm style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: D.card, border: `1px solid ${D.borderHi}`, borderRadius: 16, width: "100%", maxWidth: 440, padding: "28px 32px" }}>
            <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: D.text }}>Confirm broadcast</p>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: D.secondary, lineHeight: 1.6 }}>
              You&apos;re about to send <strong style={{ color: D.text }}>&quot;{subject}&quot;</strong> to{" "}
              <strong style={{ color: D.text }}>{optedInCount} opted-in subscriber{optedInCount !== 1 ? "s" : ""}</strong>
              {recipients.length > optedInCount ? ` (${recipients.length - optedInCount} of your selection have not opted in and are skipped)` : ""}. Anyone who unsubscribed is also skipped. This cannot be undone.
            </p>
            <div style={{ background: D.surface, borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
              {SEGMENTS.filter(seg => recipients.every(seg.filter) || recipients.some(seg.filter)).slice(0, 3).map(seg => {
                const n = recipients.filter(seg.filter).length;
                if (!n || n === recipients.length) return null;
                return <p key={seg.label} style={{ margin: "0 0 4px", fontSize: 12, color: D.secondary }}>{n} × {seg.label}</p>;
              })}
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: D.text }}>{recipients.length} total recipients</p>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmOpen(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${D.borderHi}`, background: "transparent", color: D.secondary, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Go back
              </button>
              <button
                onClick={send}
                disabled={sending}
                style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: sending ? "rgba(0,0,0,0.08)" : "#059669", color: sending ? D.muted : "#fff", fontSize: 12, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer" }}
              >
                {sending ? "Sending…" : "Confirm send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function SubscriberDashboard() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("All");
  const [sortBy, setSortBy] = useState<"date" | "name" | "industry">("date");
  const [exportMsg, setExportMsg] = useState("");
  const [chartDays, setChartDays] = useState(30);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/subscribers")
      .then(r => r.json())
      .then(d => { setSubs(d.subscribers ?? []); setCount(d.count ?? 0); })
      .finally(() => setLoading(false));
  }, []);

  const thisWeek  = subs.filter(s => Date.now() - new Date(s.subscribedAt).getTime() < 7  * 86400000).length;
  const thisMonth = subs.filter(s => Date.now() - new Date(s.subscribedAt).getTime() < 30 * 86400000).length;

  const industryBreakdown = buildIndustryBreakdown(subs);
  const sourceBreakdown   = buildSourceBreakdown(subs);

  const filtered = subs
    .filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.email.toLowerCase().includes(q) || s.firstName.toLowerCase().includes(q);
      const matchIndustry = filterIndustry === "All" || s.industry === filterIndustry;
      return matchSearch && matchIndustry;
    })
    .sort((a, b) => {
      if (sortBy === "date") return b.subscribedAt.localeCompare(a.subscribedAt);
      if (sortBy === "name") return a.firstName.localeCompare(b.firstName);
      return (a.industry || "").localeCompare(b.industry || "");
    });

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selected.has(s.email));
  const someSelected = selected.size > 0;
  const exportTarget = someSelected ? filtered.filter(s => selected.has(s.email)) : filtered;

  function toggleSelectAll() {
    if (allFilteredSelected) {
      const next = new Set(selected); filtered.forEach(s => next.delete(s.email)); setSelected(next);
    } else {
      const next = new Set(selected); filtered.forEach(s => next.add(s.email)); setSelected(next);
    }
  }
  function toggleRow(email: string) {
    const next = new Set(selected); next.has(email) ? next.delete(email) : next.add(email); setSelected(next);
  }

  function exportCSV() {
    const rows = [
      ["First Name", "Email", "Industry", "Source", "Country", "City", "IP", "Subscribed At", "Status"],
      ...exportTarget.map(s => [s.firstName, s.email, s.industry, s.source, s.country ?? "", s.city ?? "", s.ip ?? "", fmtDateTime(s.subscribedAt), s.status ?? "active"]),
    ];
    const csv = rows.map(r => r.map(v => `"${(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `saabai-subscribers-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExportMsg(`${exportTarget.length} records exported`);
    setTimeout(() => setExportMsg(""), 3000);
  }

  async function deleteSelected() {
    const emails = Array.from(selected);
    if (!emails.length) return;
    if (!(await confirmDialog(`Permanently delete ${emails.length} subscriber${emails.length !== 1 ? "s" : ""}? This cannot be undone.`))) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/subscribers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails }) });
      const data = await res.json();
      if (data.ok) { setSubs(prev => prev.filter(s => !selected.has(s.email))); setCount(prev => prev - (data.deleted ?? 0)); setSelected(new Set()); }
    } finally { setDeleting(false); }
  }

  const inputStyle: React.CSSProperties = {
    padding: "9px 13px", fontSize: 13, border: `1px solid ${D.borderHi}`,
    borderRadius: 8, outline: "none", background: D.surface, color: D.text,
  };
  const cardStyle: React.CSSProperties = {
    background: D.card, border: `1px solid ${D.border}`, borderRadius: 16,
  };

  if (loading) {
    return (
      <AdminShell activePath="/saabai-admin/subscribers">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <p style={{ fontSize: 14, color: D.secondary }}>Loading…</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell activePath="/saabai-admin/subscribers">

      {/* Page header */}
      <div>
        <div className="mc-head">
          <div>
            <h1 className="mc-h1">Subscriber Intelligence</h1>
            <p className="mc-sub">Newsletter subscribers, segments and broadcasts</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {someSelected && <span style={{ fontSize: 12, color: D.teal, fontWeight: 600 }}>{selected.size} selected</span>}
            {exportMsg && <span style={{ fontSize: 12, color: D.teal }}>{exportMsg}</span>}
            <button onClick={() => setBroadcastOpen(true)} aria-haspopup="dialog" style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: D.teal, border: "none", color: "#ffffff", cursor: "pointer" }}>
              {someSelected ? `Broadcast to ${selected.size}` : "Broadcast"}
            </button>
            {someSelected && (
              <button onClick={deleteSelected} disabled={deleting} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1 }}>
                {deleting ? "Deleting…" : `Delete ${selected.size}`}
              </button>
            )}
            <button onClick={exportCSV} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "rgba(8,145,178,0.1)", border: "1px solid rgba(8,145,178,0.25)", color: D.teal, cursor: "pointer" }}>
              ↓ {someSelected ? `Export ${selected.size}` : "Export CSV"}
            </button>
          </div>
        </div>
      </div>

      <div>

        {/* KPI row */}
        <div className="m-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Subscribers", value: count,                   sub: "All time",        accent: D.teal },
            { label: "This Month",        value: thisMonth,               sub: "Last 30 days",    accent: "#818cf8" },
            { label: "This Week",         value: thisWeek,                sub: "Last 7 days",     accent: "#fbbf24" },
            { label: "Industries",        value: industryBreakdown.length, sub: "Segments tracked", accent: "#34d399" },
          ].map(({ label, value, sub, accent }) => (
            <div key={label} style={{ ...cardStyle, padding: "20px 24px" }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: D.muted, textTransform: "uppercase" }}>{label}</p>
              <p style={{ margin: "0 0 4px", fontSize: 36, fontWeight: 900, color: D.text, letterSpacing: -1.5, lineHeight: 1 }}>{value}</p>
              <p style={{ margin: 0, fontSize: 12, color: accent, fontWeight: 600 }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>

          {/* Growth chart */}
          <div style={{ ...cardStyle, padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 16, fontWeight: 700, color: D.text }}>Subscriber Growth</p>
                <p style={{ margin: 0, fontSize: 12, color: D.secondary }}>New sign-ups per day</p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[7, 14, 30].map(d => (
                  <button key={d} onClick={() => setChartDays(d)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: chartDays === d ? D.teal : D.surface, color: chartDays === d ? "#ffffff" : D.secondary, border: "none", cursor: "pointer" }}>{d}d</button>
                ))}
              </div>
            </div>
            <BarChart data={buildGrowthData(subs, chartDays)} />
          </div>

          {/* Industry breakdown */}
          <div style={{ ...cardStyle, padding: "24px 28px" }}>
            <p style={{ margin: "0 0 2px", fontSize: 16, fontWeight: 700, color: D.text }}>Industry Mix</p>
            <p style={{ margin: "0 0 20px", fontSize: 12, color: D.secondary }}>Subscriber segments</p>
            {industryBreakdown.length === 0 ? (
              <p style={{ fontSize: 13, color: D.muted }}>No data yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {industryBreakdown.map(({ name, count: c, pct }) => {
                  const ic = getIC(name);
                  return (
                    <div key={name}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: ic.dot, display: "inline-block" }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: D.secondary }}>{name}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: D.text }}>{c} <span style={{ color: D.muted, fontWeight: 400 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: ic.dot, borderRadius: 3, transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {sourceBreakdown.length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${D.border}` }}>
                <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: D.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>Top Sources</p>
                {sourceBreakdown.slice(0, 5).map(([src, n]) => (
                  <div key={src} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: D.secondary, fontFamily: "monospace" }}>{src || "/"}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: D.text }}>{n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subscriber table */}
        <div style={{ ...cardStyle, overflowX: "auto" }}>

          {/* Table controls */}
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${D.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 16, fontWeight: 700, color: D.text }}>All Subscribers</p>
              <p style={{ margin: 0, fontSize: 12, color: D.secondary }}>
                {filtered.length} of {subs.length} shown{someSelected ? ` · ${selected.size} selected` : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
              <input placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: 220 }} />
              <select value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="All">All industries</option>
                {Object.keys(INDUSTRY_CONFIG).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as "date" | "name" | "industry")} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="date">Newest first</option>
                <option value="name">Name A–Z</option>
                <option value="industry">Industry</option>
              </select>
              <button onClick={() => setBroadcastOpen(true)} aria-haspopup="dialog" style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: D.teal, border: "none", color: "#ffffff", cursor: "pointer" }}>
                {someSelected ? `Send Email to ${selected.size}` : "Broadcast"}
              </button>
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "48px 40px 1fr 200px 130px 160px 160px 100px", minWidth: 1040, padding: "10px 24px", background: D.surface, borderBottom: `1px solid ${D.border}`, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={allFilteredSelected}
                ref={el => { if (el) el.indeterminate = someSelected && !allFilteredSelected; }}
                onChange={toggleSelectAll}
                style={{ width: 15, height: 15, accentColor: D.teal, cursor: "pointer" }}
                title={allFilteredSelected ? "Deselect all" : "Select all"}
              />
            </div>
            {["", "Subscriber", "Email", "Industry", "Location", "Joined", "Status"].map(h => (
              <p key={h} style={{ margin: 0, fontSize: 10, fontWeight: 700, color: D.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</p>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center" }}>
              <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: D.text }}>
                {subs.length === 0 ? "No subscribers yet" : "No matches found"}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: D.secondary }}>
                {subs.length === 0 ? "Subscribers will appear here as they sign up." : "Try adjusting your search or filters."}
              </p>
            </div>
          ) : filtered.map((s, i) => {
            const ic = getIC(s.industry);
            const initials = (s.firstName?.[0] ?? "?").toUpperCase();
            const colours = ["#6366f1", "#00bfa5", "#f59e0b", "#10b981", "#e11d48", "#8b5cf6"];
            const avatarBg = colours[s.email.charCodeAt(0) % colours.length];
            const locationParts = [s.city, s.country].filter(Boolean);
            const locationStr = locationParts.length ? locationParts.join(", ") : null;
            const flagEmoji = s.countryCode
              ? String.fromCodePoint(...[...s.countryCode.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
              : null;

            return (
              <div
                key={s.email}
                onClick={() => toggleRow(s.email)}
                style={{
                  display: "grid", gridTemplateColumns: "48px 40px 1fr 200px 130px 160px 160px 100px", minWidth: 1040,
                  padding: "13px 24px", alignItems: "center",
                  borderBottom: i < filtered.length - 1 ? `1px solid ${D.border}` : "none",
                  background: selected.has(s.email) ? "rgba(8,145,178,0.07)" : i % 2 === 0 ? D.card : "rgba(0,0,0,0.02)",
                  transition: "background 0.1s",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }} onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(s.email)} onChange={() => toggleRow(s.email)} style={{ width: 15, height: 15, accentColor: D.teal, cursor: "pointer" }} />
                </div>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>
                  {initials}
                </div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: D.text }}>{s.firstName || "-"}</p>
                <a href={`mailto:${s.email}`} style={{ margin: 0, fontSize: 12, color: "#818cf8", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                  {s.email}
                </a>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: ic.bg, color: ic.color, fontSize: 11, fontWeight: 700, width: "fit-content" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: ic.dot }} />
                  {s.industry || "Other"}
                </span>
                <div>
                  {locationStr ? (
                    <p style={{ margin: 0, fontSize: 12, color: D.secondary, fontWeight: 500 }}>
                      {flagEmoji && <span style={{ marginRight: 4 }}>{flagEmoji}</span>}
                      {locationStr}
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: 12, color: D.muted }}>-</p>
                  )}
                  {s.ip && <p style={{ margin: "2px 0 0", fontSize: 10, color: D.muted, fontFamily: "monospace" }} title={`IP: ${s.ip}`}>{s.ip}</p>}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: D.secondary }}>{fmtDate(s.subscribedAt)}</p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: "rgba(22,163,74,0.1)", color: "#16a34a", fontSize: 11, fontWeight: 700, width: "fit-content" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a" }} />
                  Active
                </span>
              </div>
            );
          })}
        </div>

        {/* Selection action bar: stays on screen while subscribers are ticked */}
        {someSelected && !broadcastOpen && (
          <>
            <div aria-hidden style={{ height: 84 }} />
            <div role="toolbar" aria-label="Selected subscribers" style={{ position: "fixed", left: "50%", bottom: 20, transform: "translateX(-50%)", zIndex: 1200, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const, justifyContent: "center", maxWidth: "calc(100vw - 32px)", padding: "10px 14px 10px 18px", background: D.card, border: `1px solid ${D.borderHi}`, borderRadius: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.18)" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: D.text }}>{selected.size} selected</span>
              <button onClick={() => setBroadcastOpen(true)} aria-haspopup="dialog" style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: D.teal, border: "none", color: "#ffffff", cursor: "pointer" }}>
                Send Email
              </button>
              <button onClick={exportCSV} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "rgba(8,145,178,0.1)", border: "1px solid rgba(8,145,178,0.25)", color: D.teal, cursor: "pointer" }}>
                Export {selected.size}
              </button>
              <button onClick={deleteSelected} disabled={deleting} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1 }}>
                {deleting ? "Deleting…" : `Delete ${selected.size}`}
              </button>
              <button onClick={() => setSelected(new Set())} style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "transparent", border: "none", color: D.secondary, cursor: "pointer" }}>
                Clear
              </button>
            </div>
          </>
        )}

        {/* Broadcast Panel: a modal over the page, opened at the top and focused */}
        {broadcastOpen && (
          <BroadcastModal onClose={() => setBroadcastOpen(false)}>
            <BroadcastPanel
              recipients={subs.filter(s => selected.has(s.email))}
              allSubs={subs}
              onClose={() => setBroadcastOpen(false)}
              onSelectSegment={(emails) => { setSelected(emails); }}
            />
          </BroadcastModal>
        )}

      </div>
    </AdminShell>
  );
}
