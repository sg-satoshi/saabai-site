"use client";

import { useEffect, useState } from "react";
import SbNav from "../../components/sb/SbNav";
import "../../components/sb/checkout.css";
import { gaEvent } from "@/lib/ga";
import { PRESENCE } from "@/lib/website-presence";

const CALENDLY = "https://calendly.com/shanegoldberg/30min";
const STORE = "saabai_presence_onboarding";

const FIELDS = [
  { k: "business", label: "Business name", req: true },
  { k: "offer", label: "What do you sell, in one sentence", req: true },
  { k: "currentSite", label: "Current website (if any)" },
  { k: "domain", label: "Domain you want to use" },
  { k: "brand", label: "Brand colours and logo (share a Drive or Dropbox link, or describe)" },
  { k: "pages", label: "Three pages you need live first", req: true },
  { k: "faqs", label: "Top 5 FAQs for the chatbot", area: true },
  { k: "leadEmail", label: "Where should leads go (email)", req: true, type: "email" },
] as const;

type Form = Record<(typeof FIELDS)[number]["k"], string>;
const EMPTY = Object.fromEntries(FIELDS.map((f) => [f.k, ""])) as Form;

export default function OnboardingClient({ sessionId }: { sessionId: string }) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save and return: drafts are kept in this browser only.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) setForm({ ...EMPTY, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  function set(k: keyof Form, v: string) {
    const next = { ...form, [k]: v };
    setForm(next);
    try { localStorage.setItem(STORE, JSON.stringify(next)); setSaved(true); } catch { /* ignore */ }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("busy");
    try {
      const res = await fetch("/api/websites/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sessionId }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        gaEvent("generate_lead", { form: "website_onboarding" });
        try { localStorage.removeItem(STORE); } catch { /* ignore */ }
        setState("done");
        return;
      }
      setError(d.error || "Something went wrong. Please try again, or email hello@saabai.ai.");
    } catch {
      setError("Something went wrong. Please try again, or email hello@saabai.ai.");
    }
    setState("idle");
  }

  return (
    <div className="sb">
      <SbNav minimal right={<a className="btn sm" href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a call</a>} />
      <div className="wrap" style={{ maxWidth: 680, paddingTop: 32, paddingBottom: 64 }}>
        <div className="steps" style={{ justifyContent: "center" }}>
          <span>1 Deposit paid</span>›<b>2 Onboarding</b>›<span>3 Build</span>
        </div>
        {state === "done" ? (
          <div className="cbox" style={{ paddingTop: 32 }}>
            <div className="ok">✓</div>
            <h1 style={{ fontSize: 36, marginTop: 14 }}>Thanks, we&apos;ve got it.</h1>
            <p style={{ marginTop: 12 }}>We reply within 1 business day with a start date. The ${PRESENCE.balance.toLocaleString("en-AU")} balance is invoiced before go-live.</p>
          </div>
        ) : (
          <>
            <span className="eyebrow" style={{ display: "block", marginTop: 24 }}>Onboarding</span>
            <h1 style={{ fontSize: 34, marginTop: 10 }}>Tell us about the site</h1>
            <p className="dim" style={{ marginTop: 10, fontSize: 15 }}>About 8 minutes. Your answers save in this browser as you type, so you can come back later.</p>
            <form onSubmit={submit} style={{ marginTop: 22, display: "grid", gap: 14 }}>
              {FIELDS.map((f) => (
                <label key={f.k}>
                  {f.label}
                  {"area" in f && f.area ? (
                    <textarea rows={5} value={form[f.k]} onChange={(e) => set(f.k, e.target.value)} style={{ width: "100%", marginTop: 6, padding: 12, borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.14)", color: "inherit", font: "inherit" }} />
                  ) : (
                    <input type={"type" in f ? f.type : "text"} required={"req" in f && f.req} value={form[f.k]} onChange={(e) => set(f.k, e.target.value)} />
                  )}
                </label>
              ))}
              <button className="btn full" type="submit" disabled={state === "busy"} style={{ minHeight: 48 }}>
                {state === "busy" ? "Sending..." : "Submit and start my build"}
              </button>
            </form>
            {saved && <p className="dim" style={{ fontSize: 12, marginTop: 8 }}>Draft saved in this browser.</p>}
            {error && <div className="err" role="alert">{error}</div>}
            <p className="dim" style={{ fontSize: 13, marginTop: 14, textAlign: "center" }}>We reply within 1 business day with a start date. Balance of ${PRESENCE.balance.toLocaleString("en-AU")} is due before go-live.</p>
          </>
        )}
      </div>
    </div>
  );
}
