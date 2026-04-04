"use client";

import { useState } from "react";

const STATS = [
  { value: "68%", label: "of legal enquiries go unanswered after hours" },
  { value: "4.2x", label: "more likely to convert if responded to within 5 minutes" },
  { value: "40%", label: "of potential clients don't leave a voicemail" },
];

const USECASES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" stroke="#c9a84c" strokeWidth="1.5"/></svg>
    ),
    title: "ATO Audit Notices",
    desc: "Someone receives an ATO audit notice on a Friday night. They're panicking. Your website is open. Lex captures their details, asks the right questions, and has a full brief ready for Monday morning.",
    outcome: "0 leads lost to after-hours panic",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="#c9a84c" strokeWidth="1.5"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/></svg>
    ),
    title: "New Client Intake",
    desc: "Instead of phone tag and intake forms no-one fills in, Lex qualifies potential clients in a natural conversation — matter type, urgency, brief facts. You get a structured brief before the first call.",
    outcome: "First consultation starts 2 steps ahead",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#c9a84c" strokeWidth="1.5"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/></svg>
    ),
    title: "Business Succession Enquiries",
    desc: "A family business owner researching succession planning at 10pm finds your site. Lex asks the right questions about their structure, timeline, and goals — and books them into your calendar automatically.",
    outcome: "Complex matters captured, not bounced",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    title: "Trust Structure Questions",
    desc: "Clients with trust and structuring questions often need to explain complex situations before knowing if you can help. Lex handles that conversation — gathering context without giving advice — so your first call is focused and billable.",
    outcome: "Better qualified, more efficient consultations",
  },
];

const WHATS_INCLUDED = [
  "Custom AI agent trained on your practice areas and firm identity",
  "24/7 intake — captures leads at 2am as well as 2pm",
  "Instant email notification to your team when a new enquiry comes in",
  "Full conversation transcript so you know exactly what was discussed",
  "Embedded directly on tributumlaw.com — invisible seam",
  "Follow-up email sequence to every enquiry",
  "Dashboard showing all leads, conversations, and pipeline value",
  "Ongoing optimisation based on real conversation data",
];

export default function TributumPitchPage() {
  const [copied, setCopied] = useState(false);

  function copyEmail() {
    navigator.clipboard.writeText("shane@saabai.ai").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ background: "#0a0c10", minHeight: "100vh", color: "#f0f0f0", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav */}
      <div style={{ borderBottom: "1px solid #1e2028", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #c9a84c, #e8c96b)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#ffffff" }}>Saabai</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c" }} />
          <span style={{ fontSize: 11, color: "#888", letterSpacing: "0.8px", textTransform: "uppercase" }}>Confidential · For Tributum Law</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "72px 32px 56px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#15180f", border: "1px solid #c9a84c33", borderRadius: 20, padding: "6px 14px", marginBottom: 28 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c" }} />
          <span style={{ fontSize: 11, color: "#c9a84c", letterSpacing: "0.8px", textTransform: "uppercase", fontWeight: 600 }}>Tax & Trust Law · Adelaide</span>
        </div>

        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-1.5px", margin: "0 0 20px", color: "#ffffff" }}>
          Every client who finds<br />
          Tributum Law at 11pm<br />
          <span style={{ color: "#c9a84c" }}>should become a client.</span>
        </h1>

        <p style={{ fontSize: 18, color: "#9ca3af", lineHeight: 1.65, margin: "0 0 40px", maxWidth: 580 }}>
          Lex is an AI intake agent built specifically for Tributum Law. It qualifies potential clients, captures their details, and gets you a full brief — day or night, without a receptionist.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            href="mailto:shane@saabai.ai?subject=Let's talk — Tributum Law AI Agent"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#c9a84c", color: "#0a0c10", padding: "14px 28px", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", letterSpacing: "-0.2px" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/></svg>
            Email Shane to discuss
          </a>
          <a
            href="#demo"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "#c9a84c", padding: "14px 28px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none", border: "1px solid #c9a84c44" }}
          >
            See Lex in action ↓
          </a>
        </div>
      </div>

      {/* Stats */}
      <div style={{ borderTop: "1px solid #1e2028", borderBottom: "1px solid #1e2028", background: "#0d0f14" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: "#c9a84c", letterSpacing: "-1px", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 8, lineHeight: 1.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Demo */}
      <div id="demo" style={{ maxWidth: 860, margin: "0 auto", padding: "72px 32px 56px" }}>
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, color: "#c9a84c", letterSpacing: "1px", textTransform: "uppercase", fontWeight: 600, margin: "0 0 12px" }}>Live Demo</p>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.8px", margin: "0 0 12px", color: "#ffffff" }}>Say hello to Lex</h2>
          <p style={{ fontSize: 15, color: "#9ca3af", margin: 0, lineHeight: 1.6 }}>
            This is the actual agent — not a mockup. Ask it anything a potential Tributum client might ask. Try: <em style={{ color: "#c9a84c" }}>"I've received an ATO audit notice"</em>
          </p>
        </div>

        <div style={{ display: "flex", gap: 40, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Phone frame with widget */}
          <div style={{ flexShrink: 0, position: "relative" }}>
            <div style={{ width: 340, height: 620, background: "#111418", border: "2px solid #2a2d35", borderRadius: 28, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px #ffffff08", position: "relative" }}>
              {/* Phone notch */}
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 100, height: 24, background: "#0a0c10", borderRadius: "0 0 14px 14px", zIndex: 10 }} />
              <iframe
                src="/rex-widget?client=tributumlaw"
                style={{ width: "100%", height: "100%", border: "none" }}
                allow="microphone"
                title="Lex — Tributum Law AI"
              />
            </div>
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <span style={{ fontSize: 11, color: "#4b5563", letterSpacing: "0.5px" }}>Live · Powered by Saabai</span>
            </div>
          </div>

          {/* Demo callouts */}
          <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
            {[
              { label: "Try asking:", prompt: "I've received an ATO audit notice" },
              { label: "Or:", prompt: "I need to restructure my family trust" },
              { label: "Or:", prompt: "What does an initial consultation cost?" },
            ].map((item, i) => (
              <div key={i} style={{ background: "#111418", border: "1px solid #1e2028", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 13, color: "#c9a84c", fontStyle: "italic" }}>"{item.prompt}"</div>
              </div>
            ))}
            <div style={{ background: "#0f1a0a", border: "1px solid #2a3d1a", borderRadius: 12, padding: "14px 16px", marginTop: 4 }}>
              <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 700, marginBottom: 4 }}>What happens next</div>
              <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>Lex captures the lead, your team gets an instant email with the full conversation transcript, and a follow-up email goes to the client automatically.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div style={{ background: "#0d0f14", borderTop: "1px solid #1e2028", borderBottom: "1px solid #1e2028" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "72px 32px" }}>
          <p style={{ fontSize: 11, color: "#c9a84c", letterSpacing: "1px", textTransform: "uppercase", fontWeight: 600, margin: "0 0 12px" }}>Use Cases</p>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.8px", margin: "0 0 48px", color: "#ffffff" }}>Where Lex makes the difference</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {USECASES.map((u, i) => (
              <div key={i} style={{ background: "#0a0c10", border: "1px solid #1e2028", borderRadius: 16, padding: "24px" }}>
                <div style={{ marginBottom: 14 }}>{u.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: "0 0 10px", letterSpacing: "-0.3px" }}>{u.title}</h3>
                <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.7, margin: "0 0 16px" }}>{u.desc}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#c9a84c", fontWeight: 600 }}>{u.outcome}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What's Included */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "72px 32px" }}>
        <p style={{ fontSize: 11, color: "#c9a84c", letterSpacing: "1px", textTransform: "uppercase", fontWeight: 600, margin: "0 0 12px" }}>What&apos;s Included</p>
        <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.8px", margin: "0 0 40px", color: "#ffffff" }}>Everything, done for you</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
          {WHATS_INCLUDED.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 0", borderBottom: "1px solid #1a1d24" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#15180f", border: "1px solid #c9a84c44", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M1 6l3.5 3.5 6.5-6" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span style={{ fontSize: 14, color: "#d1d5db", lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* About Saabai */}
      <div style={{ background: "#0d0f14", borderTop: "1px solid #1e2028", borderBottom: "1px solid #1e2028" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "56px 32px", display: "flex", gap: 48, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <p style={{ fontSize: 11, color: "#c9a84c", letterSpacing: "1px", textTransform: "uppercase", fontWeight: 600, margin: "0 0 12px" }}>About Saabai</p>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", margin: "0 0 14px", color: "#ffffff" }}>Built by someone who knows both sides</h2>
            <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>
              Saabai builds AI agents for professional services firms. Not off-the-shelf chatbots — custom agents trained on how your firm actually works, embedded in your site, integrated with your systems. PlasticOnline has been running Rex for several months, capturing leads around the clock and auto-creating CRM deals. Tributum Law would be the first legal practice.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 200 }}>
            {[
              { num: "24/7", label: "Intake coverage" },
              { num: "<2s", label: "Response time" },
              { num: "100%", label: "Leads captured" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#0a0c10", border: "1px solid #1e2028", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#c9a84c", letterSpacing: "-0.5px" }}>{s.num}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "80px 32px 96px", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, letterSpacing: "-1px", margin: "0 0 16px", color: "#ffffff", lineHeight: 1.1 }}>
          Ready to talk about<br />
          <span style={{ color: "#c9a84c" }}>what this could look like for Tributum?</span>
        </h2>
        <p style={{ fontSize: 16, color: "#6b7280", margin: "0 0 40px", lineHeight: 1.6 }}>
          No obligation. 30 minutes to walk through the demo, discuss your intake process, and scope what&apos;s possible.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="mailto:shane@saabai.ai?subject=Let's talk — Tributum Law AI Agent"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#c9a84c", color: "#0a0c10", padding: "16px 32px", borderRadius: 12, fontWeight: 800, fontSize: 15, textDecoration: "none", letterSpacing: "-0.3px", boxShadow: "0 8px 32px rgba(201,168,76,0.3)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/></svg>
            Email Shane
          </a>
          <button
            onClick={copyEmail}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "#c9a84c", padding: "16px 32px", borderRadius: 12, fontWeight: 600, fontSize: 15, border: "1px solid #c9a84c44", cursor: "pointer", letterSpacing: "-0.2px" }}
          >
            {copied ? (
              <><svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M1 6l3.5 3.5 6.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> Copied!</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8"/></svg> Copy email</>
            )}
          </button>
        </div>
        <p style={{ fontSize: 13, color: "#374151", marginTop: 24 }}>shane@saabai.ai · This page is private and was prepared specifically for Tributum Law.</p>
      </div>

    </div>
  );
}
