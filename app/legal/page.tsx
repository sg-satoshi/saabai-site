"use client";

import { useState, useEffect } from "react";

// ─── Brand tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        "#0a1628",
  surface:   "#0f1f35",
  raised:    "#162236",
  border:    "#1e3050",
  gold:      "#C9A84C",
  goldBright:"#E0BC6A",
  goldBg:    "rgba(201,168,76,0.08)",
  goldBdr:   "rgba(201,168,76,0.2)",
  text:      "#e8edf5",
  muted:     "#8fa3c0",
  dim:       "#4a6080",
  green:     "#22c55e",
} as const;

// ─── Queries cycling in hero ──────────────────────────────────────────────────
const QUERIES = [
  "What are the elements of negligence under Australian law?",
  "CGT implications of a trust distribution",
  "Director duties under Corporations Act s180",
  "Fair Work Act unfair dismissal threshold",
  "Adverse possession elements — New South Wales",
];

// ─── Feature cards ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: "⚖",
    title: "Live Case Law Search",
    desc: "Searches AustLII across HCA, FCA, all State Supreme Courts and 1,000+ tribunal databases in real time.",
  },
  {
    icon: "📊",
    title: "ATO Research",
    desc: "Tax rulings, PCGs, LCRs, private rulings, and interpretive decisions — searched and synthesised instantly.",
  },
  {
    icon: "📜",
    title: "Federal Legislation",
    desc: "Exact text from legislation.gov.au. Every Commonwealth Act and Regulation, always current.",
  },
  {
    icon: "✓",
    title: "Citation-Perfect",
    desc: "Every proposition is cited with case name, year, court, and URL. No hallucinated authorities.",
  },
  {
    icon: "✍",
    title: "Drafting Ready",
    desc: "Produces advices, research memos, and letters in proper legal format — ready to review, not rewrite.",
  },
  {
    icon: "🌏",
    title: "International Law",
    desc: "BAILII, NZLII, and WorldLII for comparative law and persuasive foreign authority.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function GoldDot() {
  return (
    <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: C.gold, margin: "0 10px", verticalAlign: "middle" }} />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LegalPage() {
  const [scrolled, setScrolled]         = useState(false);
  const [queryIdx, setQueryIdx]         = useState(0);
  const [queryVisible, setQueryVisible] = useState(true);

  // Scroll-linked nav shadow
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Rotating query examples with fade
  useEffect(() => {
    const id = setInterval(() => {
      setQueryVisible(false);
      setTimeout(() => {
        setQueryIdx(i => (i + 1) % QUERIES.length);
        setQueryVisible(true);
      }, 400);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'Geist', 'Inter', system-ui, sans-serif", minHeight: "100vh", overflowX: "hidden" }}>

      {/* ── Injected keyframes for animations ── */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-orb {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50%       { opacity: 0.55; transform: scale(1.08); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .lex-query-fade {
          transition: opacity 0.35s ease;
        }
        .lex-card:hover {
          border-color: ${C.goldBdr} !important;
          background: ${C.raised} !important;
          transform: translateY(-2px);
          transition: all 0.22s ease;
        }
        .lex-cta-btn:hover {
          background: ${C.goldBright} !important;
          transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(201,168,76,0.35) !important;
        }
        .lex-ghost-btn:hover {
          color: ${C.goldBright} !important;
        }
        .lex-nav-link:hover {
          color: ${C.goldBright} !important;
        }
        .lex-mode-card:hover {
          border-color: ${C.gold} !important;
        }
        .lex-step:hover .lex-step-num {
          background: ${C.gold} !important;
          color: ${C.bg} !important;
        }
        * { box-sizing: border-box; }
        ::selection { background: rgba(201,168,76,0.3); }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════════
          1. NAV
      ═══════════════════════════════════════════════════════════════════════ */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: C.bg,
        borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
        boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.4)" : "none",
        transition: "border-color 0.25s, box-shadow 0.25s",
        padding: "0 24px",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo + badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/saabai-logo-white-v2.png" alt="Saabai" style={{ height: 24, display: "block" }} />
            <span style={{
              background: C.goldBg,
              border: `1px solid ${C.goldBdr}`,
              color: C.gold,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              padding: "3px 9px",
              borderRadius: 4,
              textTransform: "uppercase",
            }}>Lex</span>
          </div>

          {/* Right nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a href="/client-portal" className="lex-nav-link" style={{ color: C.muted, textDecoration: "none", fontSize: 14, transition: "color 0.2s" }}>
              Sign in
            </a>
            <a href="mailto:hello@saabai.ai" className="lex-cta-btn" style={{
              background: C.gold,
              color: "#0a1628",
              fontWeight: 700,
              fontSize: 14,
              padding: "9px 20px",
              borderRadius: 8,
              textDecoration: "none",
              transition: "all 0.2s",
              letterSpacing: "0.01em",
            }}>
              Book a Demo
            </a>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. HERO
      ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px 24px 100px",
        overflow: "hidden",
      }}>
        {/* Background diagonal grid */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(201,168,76,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.035) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          transform: "skewY(-6deg)",
          transformOrigin: "top left",
        }} />

        {/* Gold orbs */}
        <div style={{ position: "absolute", top: "8%", left: "-8%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)", animation: "pulse-orb 7s ease-in-out infinite", zIndex: 0 }} />
        <div style={{ position: "absolute", bottom: "5%", right: "-6%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.09) 0%, transparent 70%)", animation: "pulse-orb 9s ease-in-out infinite reverse", zIndex: 0 }} />
        <div style={{ position: "absolute", top: "40%", right: "10%", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)", animation: "pulse-orb 11s ease-in-out infinite", zIndex: 0 }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", width: "100%", textAlign: "center" }}>
          {/* Eyebrow */}
          <div style={{ display: "inline-flex", alignItems: "center", marginBottom: 28, animation: "fadeUp 0.6s ease both" }}>
            <span style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              Legal AI
            </span>
            <GoldDot />
            <span style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              Built for Australia
            </span>
          </div>

          {/* H1 */}
          <h1 style={{
            fontSize: "clamp(40px, 6vw, 70px)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            margin: "0 0 24px",
            animation: "fadeUp 0.65s ease 0.1s both",
          }}>
            The{" "}
            <span style={{
              background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldBright} 60%, #f5d98a 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              research tool
            </span>
            <br />
            your firm has been waiting for.
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: "clamp(17px, 2vw, 21px)",
            color: C.muted,
            lineHeight: 1.65,
            maxWidth: 660,
            margin: "0 auto 40px",
            animation: "fadeUp 0.65s ease 0.2s both",
          }}>
            Lex searches AustLII, ATO, and Federal Legislation in real time — and returns cited answers your lawyers can actually use. In seconds.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 40, animation: "fadeUp 0.65s ease 0.3s both" }}>
            <a href="mailto:hello@saabai.ai" className="lex-cta-btn" style={{
              background: C.gold,
              color: "#0a1628",
              fontWeight: 700,
              fontSize: 17,
              padding: "15px 34px",
              borderRadius: 10,
              textDecoration: "none",
              transition: "all 0.2s",
              letterSpacing: "0.01em",
              boxShadow: "0 4px 20px rgba(201,168,76,0.25)",
            }}>
              Book a Demo
            </a>
            <a href="/lex" className="lex-ghost-btn" style={{
              color: C.gold,
              fontSize: 17,
              fontWeight: 600,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "color 0.2s",
              padding: "15px 8px",
            }}>
              See it live <span style={{ fontSize: 20 }}>→</span>
            </a>
          </div>

          {/* Social proof line */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 60, animation: "fadeUp 0.65s ease 0.4s both" }}>
            {["Used by leading Australian law firms", "Every answer cited", "Results in under 3 seconds"].map((item, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <GoldDot />}
                <span style={{ fontSize: 13, color: C.dim, fontWeight: 500 }}>{item}</span>
              </span>
            ))}
          </div>

          {/* Mock search bar with rotating queries */}
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: "20px 24px",
            maxWidth: 740,
            margin: "0 auto",
            textAlign: "left",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            animation: "fadeUp 0.65s ease 0.5s both",
          }}>
            {/* Search bar top */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["#ff5f57", "#febc2e", "#28c840"].map((col, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: col, opacity: 0.7 }} />
                ))}
              </div>
              <div style={{ flex: 1, background: C.raised, borderRadius: 6, height: 28, display: "flex", alignItems: "center", padding: "0 12px" }}>
                <span style={{ fontSize: 11, color: C.dim }}>app.saabai.ai/lex</span>
              </div>
            </div>

            {/* Lex label */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: C.goldBg, border: `1px solid ${C.goldBdr}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: C.gold, fontSize: 13, fontWeight: 700 }}>L</span>
              </div>
              <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>Lex · Australian Legal AI</span>
            </div>

            {/* Rotating query */}
            <div
              className="lex-query-fade"
              style={{
                opacity: queryVisible ? 1 : 0,
                background: C.raised,
                border: `1px solid ${C.goldBdr}`,
                borderRadius: 8,
                padding: "13px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ color: C.gold, fontSize: 16 }}>⚖</span>
              <span style={{ color: C.text, fontSize: 15, fontWeight: 500 }}>{QUERIES[queryIdx]}</span>
              <span style={{ marginLeft: "auto", width: 2, height: 18, background: C.gold, borderRadius: 1, animation: "pulse-orb 1.2s ease infinite" }} />
            </div>

            {/* Hint row */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {["AustLII", "ATO", "Legislation.gov.au", "BAILII"].map(src => (
                <span key={src} style={{
                  fontSize: 11,
                  color: C.dim,
                  background: C.raised,
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  padding: "3px 8px",
                  fontWeight: 500,
                }}>
                  {src}
                </span>
              ))}
              <span style={{ fontSize: 11, color: C.dim, alignSelf: "center" }}>+ 1,000 more</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          3. LOGOS / DATABASES STRIP
      ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "28px 24px", background: C.surface }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ fontSize: 12, color: C.dim, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              Searching across
            </span>
            {[
              "AustLII",
              "High Court of Australia",
              "Federal Court",
              "ATO",
              "legislation.gov.au",
              "BAILII",
              "NZLII",
            ].map(db => (
              <span key={db} style={{
                fontSize: 13,
                fontWeight: 600,
                color: C.muted,
                padding: "6px 14px",
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: C.raised,
                whiteSpace: "nowrap",
                letterSpacing: "0.01em",
              }}>
                {db}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          4. STATS BAR
      ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "64px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 2,
            background: C.border,
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid ${C.border}`,
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          }}>
            {[
              { value: "1,000+",  label: "Legal Databases" },
              { value: "< 3s",    label: "Average Response" },
              { value: "100%",    label: "Cited Results" },
              { value: "24/7",    label: "Available" },
            ].map((stat, i) => (
              <div key={i} style={{
                background: C.surface,
                padding: "36px 28px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "clamp(30px, 4vw, 42px)", fontWeight: 800, color: C.goldBright, lineHeight: 1, marginBottom: 8, letterSpacing: "-0.02em" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 14, color: C.muted, fontWeight: 500, letterSpacing: "0.02em" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          5. PROBLEM SECTION
      ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "80px 24px", background: C.surface }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 60,
            alignItems: "center",
          }}>
            {/* Left */}
            <div>
              <div style={{
                display: "inline-block",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 6,
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 700,
                color: "#f87171",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 20,
              }}>
                The Problem
              </div>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, lineHeight: 1.2, margin: "0 0 40px", letterSpacing: "-0.02em" }}>
                Australian lawyers spend{" "}
                <span style={{ color: C.goldBright }}>60% of their time</span>
                {" "}on work AI can do.
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                {[
                  { icon: "⏱", title: "Endless research through case law databases", desc: "Hours lost browsing AustLII, cross-referencing decisions, and tracking whether a case is still good law." },
                  { icon: "✍", title: "Drafting advice letters from scratch", desc: "Blank page syndrome on every matter — even when you've written the same letter twenty times before." },
                  { icon: "📋", title: "Manually verifying citations and cross-referencing legislation", desc: "Checking and double-checking authorities. Work that demands precision and consumes billable hours." },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: "rgba(239,68,68,0.06)",
                      border: "1px solid rgba(239,68,68,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right */}
            <div style={{
              background: C.raised,
              border: `1px solid ${C.goldBdr}`,
              borderRadius: 20,
              padding: "48px 40px",
              textAlign: "center",
              boxShadow: `0 0 60px rgba(201,168,76,0.08)`,
            }}>
              <div style={{ fontSize: 48, marginBottom: 24 }}>⚖</div>
              <h3 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 800, color: C.goldBright, margin: "0 0 20px", lineHeight: 1.2 }}>
                Lex changes all of that.
              </h3>
              <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, margin: "0 0 32px" }}>
                Your lawyers ask a question. Lex searches every relevant database simultaneously and returns a structured, fully cited answer — in under three seconds.
              </p>
              <a href="/lex" className="lex-cta-btn" style={{
                display: "inline-block",
                background: C.gold,
                color: "#0a1628",
                fontWeight: 700,
                fontSize: 15,
                padding: "12px 28px",
                borderRadius: 8,
                textDecoration: "none",
                transition: "all 0.2s",
              }}>
                Open Lex →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          6. FEATURES GRID
      ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Section header */}
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-block", background: C.goldBg, border: `1px solid ${C.goldBdr}`, borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              Capabilities
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
              Everything your practice needs.{" "}
              <span style={{ color: C.goldBright }}>Nothing it doesn&apos;t.</span>
            </h2>
            <p style={{ fontSize: 17, color: C.muted, maxWidth: 540, margin: "0 auto", lineHeight: 1.65 }}>
              Lex is purpose-built for Australian law — not a general AI dressed up with a legal skin.
            </p>
          </div>

          {/* Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
            gap: 2,
            background: C.border,
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid ${C.border}`,
          }}>
            {FEATURES.map((feat, i) => (
              <div key={i} className="lex-card" style={{
                background: C.surface,
                padding: "36px 32px",
                cursor: "default",
                transition: "all 0.22s ease",
                border: `1px solid transparent`,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: C.goldBg,
                  border: `1px solid ${C.goldBdr}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, marginBottom: 18,
                }}>
                  {feat.icon}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: "0 0 10px" }}>
                  {feat.title}
                </h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65, margin: 0 }}>
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          7. TWO MODES
      ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-block", background: C.goldBg, border: `1px solid ${C.goldBdr}`, borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              Two Modes
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              One platform. Dual deployment.
            </h2>
          </div>

          {/* Two panels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 2, background: C.border, borderRadius: 20, overflow: "hidden" }}>
            {/* Internal */}
            <div className="lex-mode-card" style={{
              background: C.surface,
              padding: "52px 44px",
              transition: "border-color 0.2s",
              border: "1px solid transparent",
            }}>
              <div style={{ fontSize: 32, marginBottom: 20 }}>👑</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
                Internal Mode — For your lawyers
              </div>
              <h3 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 800, margin: "0 0 18px", lineHeight: 1.2 }}>
                The daily research and drafting tool.
              </h3>
              <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, margin: "0 0 28px" }}>
                Your lawyers search AustLII, interrogate the ATO, and draft advices — all in one interface.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 36px", display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  "Live legal database search",
                  "Citation generation",
                  "Research memo drafting",
                  "Thread history",
                  "Available at saabai.ai/lex",
                ].map((item, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: C.muted }}>
                    <span style={{ color: C.green, fontSize: 16, flexShrink: 0 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a href="/lex" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                color: C.gold, fontWeight: 700, fontSize: 15, textDecoration: "none",
                borderBottom: `1px solid ${C.goldBdr}`, paddingBottom: 2,
                transition: "color 0.2s",
              }}>
                Open Research Tool →
              </a>
            </div>

            {/* External */}
            <div className="lex-mode-card" style={{
              background: C.raised,
              padding: "52px 44px",
              transition: "border-color 0.2s",
              border: "1px solid transparent",
            }}>
              <div style={{ fontSize: 32, marginBottom: 20 }}>🛡</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
                External Mode — For your clients
              </div>
              <h3 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 800, margin: "0 0 18px", lineHeight: 1.2 }}>
                An AI intake agent on your website.
              </h3>
              <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, margin: "0 0 28px" }}>
                Answers general legal questions, captures leads, and routes high-value enquiries to your team.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 36px", display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  "Client intake & lead capture",
                  "Practice area routing",
                  "Instant responses 24/7",
                  "Embeds in minutes",
                  "Fully customisable voice",
                ].map((item, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: C.muted }}>
                    <span style={{ color: C.green, fontSize: 16, flexShrink: 0 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a href="mailto:hello@saabai.ai" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                color: C.gold, fontWeight: 700, fontSize: 15, textDecoration: "none",
                borderBottom: `1px solid ${C.goldBdr}`, paddingBottom: 2,
                transition: "color 0.2s",
              }}>
                See Widget Demo →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          8. HOW IT WORKS
      ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "80px 24px", background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-block", background: C.goldBg, border: `1px solid ${C.goldBdr}`, borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              How It Works
            </div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              From question to cited answer in{" "}
              <span style={{ color: C.goldBright }}>three seconds.</span>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 0, position: "relative" }}>
            {[
              { step: "01", icon: "💬", title: "Ask", desc: "Type your research question or drafting task in plain English — no boolean operators, no training required." },
              { step: "02", icon: "🔍", title: "Research", desc: "Lex searches across all connected databases simultaneously — AustLII, ATO, legislation.gov.au, BAILII, and more." },
              { step: "03", icon: "📄", title: "Cite & Draft", desc: "Returns a structured, fully cited answer ready for your file. Case names, years, courts, URLs — all included." },
            ].map((item, i) => (
              <div key={i} className="lex-step" style={{ padding: "40px 32px", position: "relative", textAlign: "center" }}>
                {/* Connector line */}
                {i < 2 && (
                  <div style={{
                    position: "absolute",
                    top: 52,
                    right: 0,
                    width: "50%",
                    height: 1,
                    background: `linear-gradient(90deg, ${C.goldBdr}, transparent)`,
                    display: "none",
                  }} />
                )}
                <div
                  className="lex-step-num"
                  style={{
                    width: 52, height: 52, borderRadius: "50%",
                    background: C.goldBg,
                    border: `2px solid ${C.goldBdr}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 800, color: C.gold,
                    margin: "0 auto 20px",
                    transition: "all 0.2s",
                    letterSpacing: "0.05em",
                  }}
                >
                  {item.step}
                </div>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 12px" }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, margin: 0 }}>{item.desc}</p>

                {/* Gold connecting line between steps */}
                {i < 2 && (
                  <div style={{
                    position: "absolute",
                    top: 26,
                    right: "-1px",
                    width: 2,
                    height: 1,
                    background: C.border,
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* Horizontal connector overlay — decorative */}
          <div style={{ display: "flex", justifyContent: "center", gap: 0, marginTop: -8 }}>
            <div style={{ height: 2, flex: 1, background: `linear-gradient(90deg, transparent, ${C.goldBdr} 30%, ${C.goldBdr} 70%, transparent)`, borderRadius: 1, maxWidth: 500 }} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          9. BUILT FOR AUSTRALIAN LAW
      ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 40, marginBottom: 20 }}>🇦🇺</div>
            <div style={{ display: "inline-block", background: C.goldBg, border: `1px solid ${C.goldBdr}`, borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              Jurisdiction Coverage
            </div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 800, margin: "0 0 24px", letterSpacing: "-0.02em" }}>
              Built for Australian law.
              <br />
              <span style={{ color: C.goldBright }}>Coverage that counts.</span>
            </h2>
            <p style={{ fontSize: 16, color: C.muted, maxWidth: 700, margin: "0 auto", lineHeight: 1.75 }}>
              Primary jurisdiction: Commonwealth + all States and Territories. Common law applies generally. Key courts: High Court of Australia (binding all), Federal Court, State Supreme Courts, AAT, VCAT, NCAT, QCAT, and 100+ specialist tribunals. Plus comparative authority from BAILII, NZLII, and WorldLII.
            </p>
          </div>

          {/* Mock Lex response */}
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            overflow: "hidden",
            maxWidth: 820,
            margin: "0 auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          }}>
            {/* Window chrome */}
            <div style={{ background: C.raised, padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["#ff5f57", "#febc2e", "#28c840"].map((col, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: col, opacity: 0.7 }} />
                ))}
              </div>
              <div style={{ flex: 1, background: C.surface, borderRadius: 5, height: 24, display: "flex", alignItems: "center", padding: "0 10px" }}>
                <span style={{ fontSize: 11, color: C.dim }}>app.saabai.ai/lex</span>
              </div>
            </div>

            {/* Query */}
            <div style={{ padding: "24px 28px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: C.goldBg, border: `1px solid ${C.goldBdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: C.gold, fontSize: 14 }}>?</span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.dim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Your question</div>
                  <p style={{ fontSize: 15, color: C.text, margin: 0, fontWeight: 500 }}>
                    What are the elements of negligence under Australian law?
                  </p>
                </div>
              </div>
            </div>

            {/* Response */}
            <div style={{ padding: "28px 28px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: C.goldBg, border: `1px solid ${C.goldBdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: C.gold, fontSize: 13, fontWeight: 800 }}>L</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.gold, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Lex · Australian Legal AI</div>
                  <p style={{ fontSize: 14, color: C.text, lineHeight: 1.75, margin: "0 0 16px" }}>
                    Under Australian law, negligence requires the plaintiff to establish four elements:
                  </p>
                  <ol style={{ margin: "0 0 20px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                    <li style={{ fontSize: 14, color: C.text, lineHeight: 1.65 }}>
                      <strong style={{ color: C.goldBright }}>Duty of care</strong> — the defendant owed a duty of care to the plaintiff: <span style={{ color: C.muted }}>Donoghue v Stevenson [1932] AC 562; Wyong Shire Council v Shirt (1980) 146 CLR 40.</span>
                    </li>
                    <li style={{ fontSize: 14, color: C.text, lineHeight: 1.65 }}>
                      <strong style={{ color: C.goldBright }}>Breach</strong> — the defendant breached that duty by failing to meet the standard of a reasonable person: <span style={{ color: C.muted }}>Civil Liability Act 2002 (NSW) s 5B; Imbree v McNeilly (2008) 236 CLR 510.</span>
                    </li>
                    <li style={{ fontSize: 14, color: C.text, lineHeight: 1.65 }}>
                      <strong style={{ color: C.goldBright }}>Causation</strong> — the breach caused the harm (factual causation + scope of liability): <span style={{ color: C.muted }}>Civil Liability Act 2002 (NSW) s 5D; Strong v Woolworths Ltd (2012) 246 CLR 182.</span>
                    </li>
                    <li style={{ fontSize: 14, color: C.text, lineHeight: 1.65 }}>
                      <strong style={{ color: C.goldBright }}>Damage</strong> — the plaintiff suffered loss that is not too remote: <span style={{ color: C.muted }}>Overseas Tankship (UK) Ltd v Morts Dock & Engineering Co Ltd [1961] AC 388.</span>
                    </li>
                  </ol>

                  {/* Citations row */}
                  <div style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Sources</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {["AustLII — HCA", "AustLII — NSWLEC", "legislation.gov.au", "AustLII — FCA"].map(src => (
                        <span key={src} style={{
                          fontSize: 11, color: C.gold,
                          background: C.goldBg, border: `1px solid ${C.goldBdr}`,
                          borderRadius: 4, padding: "3px 8px", fontWeight: 600,
                        }}>
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          10. CUSTOMISATION
      ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "80px 24px", background: C.surface, borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 60, alignItems: "center" }}>
            {/* Left */}
            <div>
              <div style={{ display: "inline-block", background: C.goldBg, border: `1px solid ${C.goldBdr}`, borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>
                Customisation
              </div>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, margin: "0 0 18px", lineHeight: 1.2 }}>
                Lex sounds like{" "}
                <span style={{ color: C.goldBright }}>your firm</span>
                {" "}— not a generic AI.
              </h2>
              <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, margin: "0 0 32px" }}>
                Adjust formality, warmth, humour level, practice area focus, and more from your client portal. The voice is yours — Lex is just the engine.
              </p>
              <a href="/client-portal" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                color: C.gold, fontWeight: 700, fontSize: 15, textDecoration: "none",
                borderBottom: `1px solid ${C.goldBdr}`, paddingBottom: 2,
              }}>
                Open Client Portal →
              </a>
            </div>

            {/* Right — personality dials */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[
                { label: "Formality",     left: "Conversational",  right: "Formal",    pct: 75 },
                { label: "Warmth",        left: "Clinical",        right: "Warm",      pct: 60 },
                { label: "Depth",         left: "Brief",           right: "Detailed",  pct: 85 },
                { label: "Humour",        left: "Serious",         right: "Playful",   pct: 20 },
                { label: "Practice Focus",left: "General",         right: "Specialist",pct: 70 },
              ].map((dial, i) => (
                <div key={i} style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{dial.label}</span>
                    <span style={{ fontSize: 11, color: C.dim }}>Adjustable</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: C.dim }}>{dial.left}</span>
                    <span style={{ fontSize: 11, color: C.dim }}>{dial.right}</span>
                  </div>
                  {/* Track */}
                  <div style={{ height: 6, background: C.surface, borderRadius: 3, position: "relative", border: `1px solid ${C.border}` }}>
                    <div style={{
                      position: "absolute", left: 0, top: 0, bottom: 0,
                      width: `${dial.pct}%`,
                      background: `linear-gradient(90deg, ${C.gold}, ${C.goldBright})`,
                      borderRadius: 3,
                    }} />
                    {/* Thumb */}
                    <div style={{
                      position: "absolute",
                      left: `${dial.pct}%`,
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 14, height: 14,
                      borderRadius: "50%",
                      background: C.goldBright,
                      border: `2px solid ${C.bg}`,
                      boxShadow: "0 0 0 1px rgba(201,168,76,0.4)",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          11. FINAL CTA
      ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{
        padding: "120px 24px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        borderTop: `1px solid ${C.border}`,
      }}>
        {/* Subtle gold bg gradient */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(201,168,76,0.07) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(201,168,76,0.04) 0%, transparent 70%)",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: C.goldBg, border: `1px solid ${C.goldBdr}`, borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 24 }}>
            Get Started
          </div>
          <h2 style={{ fontSize: "clamp(30px, 5vw, 54px)", fontWeight: 800, margin: "0 0 20px", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            Ready to give your firm an{" "}
            <span style={{ color: C.goldBright }}>unfair advantage?</span>
          </h2>
          <p style={{ fontSize: 18, color: C.muted, margin: "0 0 44px", lineHeight: 1.65 }}>
            Book a demo and see Lex in action. We&apos;ll show you how Australian firms are using it today.
          </p>
          <a href="mailto:hello@saabai.ai" className="lex-cta-btn" style={{
            display: "inline-block",
            background: C.gold,
            color: "#0a1628",
            fontWeight: 800,
            fontSize: 18,
            padding: "18px 44px",
            borderRadius: 12,
            textDecoration: "none",
            transition: "all 0.2s",
            letterSpacing: "0.01em",
            boxShadow: "0 8px 32px rgba(201,168,76,0.3)",
          }}>
            Book a Demo
          </a>
          <div style={{ marginTop: 20, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {["Setup takes less than a day", "No lock-in", "Cancel anytime"].map((item, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <GoldDot />}
                <span style={{ fontSize: 13, color: C.dim }}>{item}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          12. FOOTER
      ═══════════════════════════════════════════════════════════════════════ */}
      <footer style={{
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
        padding: "40px 24px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/saabai-logo-white-v2.png" alt="Saabai" style={{ height: 22, opacity: 0.7, display: "block" }} />
          </div>

          {/* Nav links */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { label: "Home",    href: "/" },
              { label: "Lex",     href: "/lex" },
              { label: "Contact", href: "mailto:hello@saabai.ai" },
              { label: "Privacy", href: "/privacy" },
            ].map(link => (
              <a key={link.label} href={link.href} style={{
                fontSize: 14, color: C.dim, textDecoration: "none", transition: "color 0.2s",
              }}
              className="lex-nav-link"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <div style={{ fontSize: 13, color: C.dim }}>
            © 2026 Saabai Pty Ltd. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
