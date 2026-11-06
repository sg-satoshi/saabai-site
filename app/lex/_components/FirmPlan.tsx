"use client";
/** Firm Settings: seats (3 on the Firm plan) and Manage billing. Light mode, navy buttons. */
import { useEffect, useState } from "react";

type Plan = {
  plan: "firm" | null; firmName?: string; isAdmin?: boolean; status?: "active" | "grace" | "lapsed" | "trial"; lapseReason?: "unpaid" | "cancelled" | "trial_ended" | null;
  trial?: { daysLeft: number; endsAt: string } | null;
  graceUntil?: string | null; cancelAtPeriodEnd?: boolean; periodEnd?: string | null;
  seats?: { used: number; cap: number }; admin?: string; members?: string[]; error?: string; cap?: boolean;
};

const navy: React.CSSProperties = { background: "#1b2559", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const plain: React.CSSProperties = { background: "#fff", color: "#1b2559", border: "1px solid #cfd4dd", borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer" };
const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Brisbane" }) : "");

export default function FirmPlan({ fallback = null }: { fallback?: React.ReactNode } = {}) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/lex/team").then((r) => r.json()).then(setPlan).catch(() => setPlan({ plan: null }));
  }, []);

  if (!plan) return null;
  if (!plan.plan) return <>{fallback}</>;
  const used = plan.seats?.used ?? 1;
  const cap = plan.seats?.cap ?? 3;
  const full = used >= cap;

  async function act(action: "invite" | "revoke", who: string) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/lex/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, email: who }) });
      const d = (await r.json()) as Plan;
      if (d.seats) setPlan(d);
      if (!r.ok) setMsg(d.error || "Something went wrong");
      else if (action === "invite") { setEmail(""); setMsg(`Invite sent to ${who}`); }
    } catch { setMsg("Something went wrong"); }
    setBusy(false);
  }

  async function billing() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/lex/billing-portal", { method: "POST" });
      const d = await r.json();
      if (d.url) { window.location.href = d.url; return; }
      setMsg(d.error || "Could not open billing");
    } catch { setMsg("Could not open billing"); }
    setBusy(false);
  }

  return (
    <div className="field" style={{ borderTop: "1px solid #e3e6ec", paddingTop: 14, marginTop: 6 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1b2559", margin: "0 0 8px" }}>Firm plan</h3>
      {plan.status === "lapsed" ? (
        <p style={{ fontSize: 13, color: "#b42318", margin: "0 0 8px" }}>
          {plan.lapseReason === "trial_ended"
            ? <>Your free trial has ended and Lex is switched off. {plan.isAdmin ? <><a href="/lex/signup" style={{ color: "#1b2559" }}>Subscribe</a> with this email within 30 days of the trial end to keep your firm&apos;s Lex data.</> : <>Ask {plan.admin} to subscribe.</>}</>
            : plan.lapseReason === "cancelled"
            ? <>Your Firm plan has ended. {plan.isAdmin ? <a href="/lex/signup" style={{ color: "#1b2559" }}>Start a new plan</a> : <>Ask {plan.admin} to restart it.</>}</>
            : <>Lex is paused because a payment didn&apos;t go through. {plan.isAdmin ? "Use Manage billing to pay the open invoice and Lex comes back on straight away." : <>Ask {plan.admin} to update billing.</>}</>}
        </p>
      ) : null}
      {plan.status === "trial" && plan.trial ? <p style={{ fontSize: 13, color: "#555d6e", margin: "0 0 8px" }}>Free trial: <strong>{plan.trial.daysLeft} {plan.trial.daysLeft === 1 ? "day" : "days"} left</strong> (ends {day(plan.trial.endsAt)}). {plan.isAdmin ? <a href="/lex/signup" style={{ color: "#1b2559", fontWeight: 600 }}>Subscribe now</a> : null}</p> : null}
      {plan.status === "grace" ? <p style={{ fontSize: 13, color: "#b42318", margin: "0 0 8px" }}>Your last payment didn&apos;t go through. {plan.graceUntil ? <>Please update your card by {day(plan.graceUntil)} to keep Lex on.</> : <>Please update your card within 7 days to keep Lex on.</>}</p> : null}
      {plan.cancelAtPeriodEnd ? <p style={{ fontSize: 13, color: "#555d6e", margin: "0 0 8px" }}>Cancelled. {plan.periodEnd ? <>Lex stays on until {day(plan.periodEnd)}.</> : <>Lex stays on until the end of your current billing period.</>}</p> : null}
      <p style={{ fontSize: 13, color: "#555d6e", margin: "0 0 8px" }}>Seats used: <strong>{used} of {cap}</strong></p>
      {plan.isAdmin ? (
        <>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 10px", fontSize: 13 }}>
            <li style={{ padding: "4px 0" }}>{plan.admin} <span style={{ color: "#7a8191" }}>(owner)</span></li>
            {(plan.members ?? []).map((m) => (
              <li key={m} style={{ padding: "4px 0", display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>{m}</span>
                <button type="button" style={plain} disabled={busy} onClick={() => act("revoke", m)}>Remove</button>
              </li>
            ))}
          </ul>
          {full ? (
            <p style={{ fontSize: 13, margin: "0 0 10px" }}>Need more seats? <a href="/contact" style={{ color: "#1b2559", fontWeight: 600 }}>Ask about Enterprise</a></p>
          ) : (
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@yourfirm.com.au" aria-label="Colleague's email" style={{ flex: 1 }} />
              <button type="button" style={navy} disabled={busy || !email.trim() || (plan.status !== "active" && plan.status !== "trial")} onClick={() => act("invite", email.trim())}>Invite</button>
            </div>
          )}
          {plan.status === "trial" || plan.lapseReason === "trial_ended" ? null : <button type="button" style={navy} disabled={busy} onClick={billing}>Manage billing</button>}
        </>
      ) : (
        <p style={{ fontSize: 13, color: "#555d6e", margin: 0 }}>Seats and billing are managed by {plan.admin}.</p>
      )}
      {msg ? <p role="status" style={{ fontSize: 13, color: "#1b2559", marginTop: 8 }}>{msg}</p> : null}
    </div>
  );
}
