"use client";

import { useState, useEffect, useCallback } from "react";

const COOKIE_KEY = "saabai_subscribed";
const SKIP_PATHS = ["/login", "/saabai-admin", "/rex-dashboard", "/rex-analytics", "/rex-changelog", "/rex-widget", "/lex-widget", "/plon", "/mission-control", "/onboarding"];

const INDUSTRIES = ["Law / Legal", "Accounting / Finance", "Real Estate", "Other"];

function setCookie(name: string, days: number) {
  const exp = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=1; expires=${exp}; path=/; SameSite=Lax`;
}

function hasCookie(name: string) {
  return document.cookie.split(";").some(c => c.trim().startsWith(name + "="));
}

export default function EmailCapturePopup() {
  const [visible, setVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  const show = useCallback(() => {
    if (hasCookie(COOKIE_KEY)) return;
    const path = window.location.pathname;
    if (SKIP_PATHS.some(p => path.startsWith(p))) return;
    setVisible(true);
  }, []);

  useEffect(() => {
    // Exit intent — mouse leaves viewport from the top
    function onMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0) show();
    }
    // Time-based fallback — 35 seconds
    const timer = setTimeout(show, 35000);

    document.addEventListener("mouseleave", onMouseLeave);
    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
      clearTimeout(timer);
    };
  }, [show]);

  function dismiss() {
    setCookie(COOKIE_KEY, 7); // don't show again for 7 days
    setVisible(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !firstName.trim()) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
          industry: industry || "Other",
          source: window.location.pathname,
        }),
      });
      if (res.ok) {
        setStatus("done");
        setCookie(COOKIE_KEY, 30); // subscribed — don't show for 30 days
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(14,12,46,0.75)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
      onClick={dismiss}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          background: "#0e0c2e",
          border: "1px solid rgba(0,191,165,0.25)",
          borderRadius: 20,
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,191,165,0.08)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Teal accent bar */}
        <div style={{ height: 3, background: "linear-gradient(90deg, #00bfa5 0%, #00e5cc 100%)" }} />

        {/* Close button */}
        <button
          onClick={dismiss}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "rgba(255,255,255,0.06)", border: "none",
            borderRadius: 8, width: 28, height: 28,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#8b8fa8", fontSize: 16, lineHeight: 1,
          }}
          aria-label="Close"
        >×</button>

        <div style={{ padding: "32px 36px 36px" }}>

          {status === "done" ? (
            /* ── Success state ── */
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(0,191,165,0.12)", border: "1px solid rgba(0,191,165,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px", fontSize: 24,
              }}>✓</div>
              <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
                Checklist on its way
              </h2>
              <p style={{ margin: "0 0 24px", fontSize: 14, color: "#8b8fa8", lineHeight: 1.6 }}>
                Check your inbox — the AI Readiness Audit is headed your way now.
              </p>
              <button
                onClick={() => setVisible(false)}
                style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10, padding: "10px 24px", color: "#8b8fa8",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          ) : (
            /* ── Capture form ── */
            <>
              {/* Eyebrow */}
              <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: "#00bfa5", textTransform: "uppercase" }}>
                Free — AI Readiness Audit
              </p>

              <h2 style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 800, color: "#fff", lineHeight: 1.25, letterSpacing: -0.5 }}>
                Find out where your firm is losing time to admin
              </h2>

              <p style={{ margin: "0 0 28px", fontSize: 14, color: "#8b8fa8", lineHeight: 1.65 }}>
                12 questions. 5 minutes. A clear picture of your biggest automation opportunity — sent straight to your inbox.
              </p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <input
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                    style={{
                      flex: 1, padding: "13px 16px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10, color: "#fff", fontSize: 14,
                      outline: "none",
                    }}
                  />
                  <input
                    type="email"
                    placeholder="Work email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{
                      flex: 2, padding: "13px 16px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10, color: "#fff", fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>

                <select
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  style={{
                    padding: "13px 16px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10, color: industry ? "#fff" : "#8b8fa8",
                    fontSize: 14, outline: "none", cursor: "pointer",
                    appearance: "none",
                  }}
                >
                  <option value="" style={{ background: "#0e0c2e" }}>Industry (optional)</option>
                  {INDUSTRIES.map(i => (
                    <option key={i} value={i} style={{ background: "#0e0c2e" }}>{i}</option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  style={{
                    marginTop: 4,
                    padding: "14px 24px",
                    background: status === "submitting" ? "rgba(0,191,165,0.6)" : "#00bfa5",
                    border: "none", borderRadius: 10,
                    color: "#0e0c2e", fontSize: 14, fontWeight: 800,
                    letterSpacing: 0.3, cursor: status === "submitting" ? "not-allowed" : "pointer",
                    transition: "background 0.2s",
                  }}
                >
                  {status === "submitting" ? "Sending…" : "Send me the free checklist →"}
                </button>

                {status === "error" && (
                  <p style={{ margin: 0, fontSize: 13, color: "#f87171", textAlign: "center" }}>
                    Something went wrong — try again or email hello@saabai.ai
                  </p>
                )}

                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#4b5563", textAlign: "center" }}>
                  No spam. Unsubscribe any time.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
