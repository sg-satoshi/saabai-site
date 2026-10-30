"use client";
/** "Trial: N days left" pill, plus day 45 and day 55 reminders to subscribe. Light mode, navy button. */
import { useEffect, useState } from "react";
import { trialMessage, type Trial } from "@/lib/lex-trial-copy";

type Plan = { plan: "firm" | null; status?: string; isAdmin?: boolean; admin?: string; trial?: Trial | null };

export default function TrialBanner() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => { fetch("/api/lex/team").then((r) => r.json()).then(setPlan).catch(() => {}); }, []);
  const t = plan?.status === "trial" ? plan.trial : null;
  useEffect(() => { if (t) setHidden(localStorage.getItem(`lex-trial-dismiss-${t.stage}`) === "1"); }, [t]);
  if (!t) return null;
  const msg = trialMessage(t, !!plan?.isAdmin, plan?.admin);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "8px 14px", background: "#f6f7f9", borderBottom: "1px solid #e3e6ec", fontSize: 13, color: "#14172b" }}>
      <span style={{ background: "#e8ebf5", color: "#1b2559", borderRadius: 999, padding: "2px 10px", fontWeight: 600 }}>Trial: {t.daysLeft} {t.daysLeft === 1 ? "day" : "days"} left</span>
      {msg && !hidden ? (
        <>
          <span role="status">{msg}</span>
          {plan?.isAdmin ? <a href="/lex/signup" style={{ background: "#1b2559", color: "#fff", borderRadius: 8, padding: "5px 12px", fontWeight: 600, textDecoration: "none" }}>Subscribe</a> : null}
          {t.stage !== "ended" ? <button type="button" onClick={() => { localStorage.setItem(`lex-trial-dismiss-${t.stage}`, "1"); setHidden(true); }} style={{ background: "none", border: 0, color: "#555d6e", cursor: "pointer", fontSize: 12 }}>Dismiss</button> : null}
        </>
      ) : null}
    </div>
  );
}
