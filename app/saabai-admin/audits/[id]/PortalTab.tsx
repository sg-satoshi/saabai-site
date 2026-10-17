"use client";

/** Admin view of the client portal for one engagement: status, completeness, answers, actions. */
import { useCallback, useEffect, useState } from "react";

interface Q { id: string; label: string; required: boolean; value: unknown; by: string | null; answeredAt: string | null; changedSinceSubmit: boolean }
interface Sec { id: string; title: string; questions: Q[] }
interface Data {
  mode: string; allowedForClient: boolean; status: "not_started" | "in_progress" | "submitted";
  submittedAt: string | null; reopenedAt: string[]; lastClientActivityAt: string | null; lastLoginAt: string | null;
  progress: { percent: number; answered: number; total: number; missingRequired: number };
  sections: Sec[];
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Never");
const show = (v: unknown) => (v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length) ? null : Array.isArray(v) ? v.join(", ") : String(v));

export default function PortalTab({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/audit/engagements/${id}/portal`);
    if (r.ok) setD(await r.json());
  }, [id]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function act(path: "unlock" | "resend-link", confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(path);
    const r = await fetch(`/api/audit/engagements/${id}/portal/${path}`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? (path === "unlock" ? "Reopened. The client has been emailed." : "Sign-in link sent.") : j.error || "Failed.");
    setBusy("");
    await load();
    onChanged();
  }

  if (!d) return <p style={{ color: "#6b7280", fontSize: 13 }}>Loading portal status...</p>;
  const chip = d.status === "submitted" ? { t: `Submitted ${fmt(d.submittedAt)}`, bg: "rgba(22,163,74,0.1)", c: "#16a34a" }
    : d.status === "in_progress" ? { t: "In progress", bg: "rgba(37,99,235,0.1)", c: "#2563eb" } : { t: "Not started", bg: "rgba(0,0,0,0.06)", c: "#6b7280" };
  const btn = { padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.15)", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" } as const;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {d.mode === "off" && <div style={{ background: "rgba(180,83,9,0.07)", color: "#b45309", borderRadius: 8, padding: "9px 14px", fontSize: 13 }}>The client portal flag is OFF (BLUEPRINT_PORTAL_MODE). Clients cannot reach it yet.</div>}
      {d.mode === "allowlist" && !d.allowedForClient && <div style={{ background: "rgba(180,83,9,0.07)", color: "#b45309", borderRadius: 8, padding: "9px 14px", fontSize: 13 }}>Portal is in allowlist mode and this client is not on the list.</div>}
      {msg && <div style={{ background: "rgba(22,163,74,0.08)", color: "#16a34a", borderRadius: 8, padding: "9px 14px", fontSize: 13 }}>{msg}</div>}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 18 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ background: chip.bg, color: chip.c, borderRadius: 99, padding: "3px 12px", fontSize: 12.5, fontWeight: 700 }}>{chip.t}</span>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Completeness {d.progress.percent}% ({d.progress.answered} of {d.progress.total}){d.progress.missingRequired ? `, ${d.progress.missingRequired} required blank` : ""}</span>
        </div>
        <div style={{ height: 6, background: "#eee", borderRadius: 9, margin: "12px 0" }}><div style={{ height: 6, width: `${d.progress.percent}%`, background: "#2454c8", borderRadius: 9 }} /></div>
        <div style={{ fontSize: 13, color: "#6b7280" }}>Last client activity: {fmt(d.lastClientActivityAt)} · Last sign-in: {fmt(d.lastLoginAt)}{d.reopenedAt.length ? ` · Reopened ${d.reopenedAt.length}x` : ""}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button style={btn} disabled={busy !== ""} onClick={() => act("resend-link")}>{busy === "resend-link" ? "Sending..." : "Resend sign-in link"}</button>
          {d.status === "submitted" && <button style={btn} disabled={busy !== ""} onClick={() => act("unlock", "Reopen this fact-find for client edits? The client will be emailed.")}>{busy === "unlock" ? "Reopening..." : "Unlock for edits"}</button>}
        </div>
      </div>
      {d.sections.map((s) => (
        <div key={s.id} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
          {s.questions.map((q) => {
            const v = show(q.value);
            return (
              <div key={q.id} style={{ padding: "8px 0", borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: 13.5 }}>
                <div style={{ color: "#6b7280" }}>{q.label}{q.required ? " *" : ""}</div>
                <div style={{ whiteSpace: "pre-wrap", color: v ? "#111827" : "#b45309" }}>
                  {v ?? "Blank"}
                  {q.by && <span style={{ marginLeft: 8, fontSize: 11.5, color: "#6b7280" }}>{q.by === "client" ? "answered by client" : "interview"}</span>}
                  {q.changedSinceSubmit && <span style={{ marginLeft: 8, fontSize: 11.5, color: "#b45309", fontWeight: 700 }}>changed since submit</span>}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
