"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const gold       = "#c9a84c";
const goldBorder = "rgba(201,168,76,0.25)";
const bg         = "#080a0f";
const card       = "#111418";
const border     = "#1a1d24";

function SuccessContent() {
  const params = useSearchParams();
  const plan   = params.get("plan") ?? "starter";
  const label  = plan === "growth" ? "Growth" : "Starter";

  return (
    <div style={{
      minHeight: "100vh", background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 24px",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>

        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "rgba(201,168,76,0.1)", border: `2px solid ${goldBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 32px",
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M6 16l7 7 13-11" stroke={gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 900, color: "#ffffff", letterSpacing: "-1px", margin: "0 0 16px", lineHeight: 1.1 }}>
          You&apos;re in.
        </h1>
        <p style={{ fontSize: 18, color: "#9ca3af", lineHeight: 1.7, margin: "0 0 40px" }}>
          Welcome to Lex {label}. We&apos;ll be in touch within one business day to kick off your onboarding and get your agent live within 5 days.
        </p>

        {/* Next steps */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 20, padding: "32px 28px", textAlign: "left", marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: gold, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 20px" }}>What happens next</p>
          {[
            { step: "1", title: "Onboarding call", desc: "We book a 30-min call to understand your firm, practice areas, and how you want Lex to sound." },
            { step: "2", title: "Agent build", desc: "We train and configure your Lex agent. You review and approve before anything goes live." },
            { step: "3", title: "We connect your Anthropic account", desc: "Takes 5 minutes. Your agent runs on your key — your data, your costs, full transparency." },
            { step: "4", title: "Go live", desc: "Lex is embedded on your website and capturing leads — within 5 business days of kickoff." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 16, marginBottom: i < 3 ? 20 : 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "rgba(201,168,76,0.1)", border: `1px solid ${goldBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: gold,
              }}>{item.step}</div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#ffffff" }}>{item.title}</p>
                <p style={{ margin: 0, fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 24 }}>
          Questions? Email us at{" "}
          <a href="mailto:hello@saabai.ai" style={{ color: gold, textDecoration: "none" }}>hello@saabai.ai</a>
        </p>

        <a
          href="/"
          style={{ fontSize: 13, color: "#6b7280", textDecoration: "none", borderBottom: "1px solid #374151", paddingBottom: 1 }}
        >
          Back to Saabai
        </a>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
