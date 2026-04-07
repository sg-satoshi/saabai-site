import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Lex — AI Legal Research for Australian Law Firms",
  description:
    "AI-powered legal research, document drafting, and QA verification built for Australian solicitors. Search AustLII, ATO, Federal Legislation instantly. Draft trust deeds, BFAs, and commercial agreements with clause-by-clause verification.",
};

// ── Brand palette ──────────────────────────────────────────────────────────────
const C = {
  bg:            "#0d1b2a",
  surface:       "#162236",
  surfaceRaised: "#1e3050",
  border:        "#243550",
  gold:          "#C9A84C",
  goldBright:    "#E0BC6A",
  goldDim:       "#8a6e30",
  goldBg:        "rgba(201,168,76,0.08)",
  goldBorder:    "rgba(201,168,76,0.2)",
  text:          "#e8edf5",
  textMuted:     "#8fa3c0",
  textDim:       "#4a6080",
  green:         "#22c55e",
};

// ── SVG icons ──────────────────────────────────────────────────────────────────
function IconSearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconDocument() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9,12 11,14 15,10" />
    </svg>
  );
}
function IconMap() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}
function IconWarning() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12,5 19,12 12,19" />
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function LegalPage() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Pulse animation keyframes injected via style tag */}
      <style>{`
        @keyframes heroPulse {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50%       { opacity: 0.7;  transform: scale(1.08); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <Nav activePage="/legal" />

      {/* ── 1. HERO ────────────────────────────────────────────────────────── */}
      <section style={{
        paddingTop: 140, paddingBottom: 96,
        position: "relative", overflow: "hidden",
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
      }}>
        {/* Radial gold glow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -60%)",
          width: 700, height: 500, borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(201,168,76,0.18) 0%, transparent 70%)",
          animation: "heroPulse 4s ease-in-out infinite",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px", position: "relative", textAlign: "center" }}>

          {/* Eyebrow */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            marginBottom: 28,
            animation: "fadeUp 0.6s ease both",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.gold, display: "inline-block" }} />
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
              color: C.gold,
            }}>Lex by Saabai</span>
          </div>

          {/* H1 */}
          <h1 style={{
            fontSize: "clamp(42px, 6vw, 64px)", fontWeight: 800, lineHeight: 1.08,
            letterSpacing: "-0.02em", color: C.text,
            marginBottom: 24, marginTop: 0,
            animation: "fadeUp 0.7s ease 0.1s both",
          }}>
            Australian Legal Research,<br />Reimagined.
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: 18, lineHeight: 1.7, color: C.textMuted,
            maxWidth: 680, margin: "0 auto 40px",
            animation: "fadeUp 0.7s ease 0.2s both",
          }}>
            Lex gives your firm instant access to AustLII, ATO rulings, Federal and State legislation — and drafts
            court-ready documents in seconds, with AI-powered QA verification.
          </p>

          {/* CTAs */}
          <div style={{
            display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap",
            marginBottom: 36,
            animation: "fadeUp 0.7s ease 0.3s both",
          }}>
            <a
              href="https://calendly.com/shanegoldberg/30min"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: C.gold, color: C.bg,
                fontWeight: 700, fontSize: 15, letterSpacing: "0.02em",
                padding: "14px 28px", borderRadius: 10,
                textDecoration: "none", transition: "background 0.2s",
                boxShadow: "0 4px 20px rgba(201,168,76,0.35)",
              }}
            >
              Book a Demo
            </a>
            <a
              href="/lex"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "transparent", color: C.gold,
                fontWeight: 600, fontSize: 15, letterSpacing: "0.02em",
                padding: "14px 28px", borderRadius: 10,
                textDecoration: "none",
                border: `1.5px solid ${C.goldBorder}`,
                transition: "border-color 0.2s, color 0.2s",
              }}
            >
              See It in Action
            </a>
          </div>

          {/* Trust badges */}
          <div style={{
            display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap",
            animation: "fadeUp 0.7s ease 0.4s both",
          }}>
            {["No hallucinations", "Australian law only", "Clause-by-clause QA"].map((badge) => (
              <div key={badge} style={{
                display: "flex", alignItems: "center", gap: 7,
                fontSize: 12, color: C.textMuted, letterSpacing: "0.04em",
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: "50%",
                  background: C.goldBg, border: `1px solid ${C.goldBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: C.gold, fontWeight: 900, flexShrink: 0,
                }}>✓</span>
                {badge}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. SOCIAL PROOF BAR ────────────────────────────────────────────── */}
      <section style={{
        padding: "36px 32px",
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
        textAlign: "center",
      }}>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
          color: C.textDim, marginBottom: 24, marginTop: 0,
        }}>
          Trusted by forward-thinking Australian law firms
        </p>
        <div style={{
          display: "flex", gap: 48, justifyContent: "center", alignItems: "center",
          flexWrap: "wrap",
        }}>
          {["Smith & Partners", "Chen Legal", "Burke Chambers", "Meridian Law Group", "Coastal Legal"].map((firm) => (
            <span key={firm} style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 15, color: C.text, opacity: 0.4,
              letterSpacing: "0.04em",
            }}>
              {firm}
            </span>
          ))}
        </div>
      </section>

      {/* ── 3. FEATURE GRID ────────────────────────────────────────────────── */}
      <section style={{
        padding: "88px 32px",
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
              Everything Your Firm Needs
            </h2>
            <p style={{ fontSize: 16, color: C.textMuted, margin: 0 }}>
              Purpose-built for Australian solicitors. No generic AI — jurisdiction-specific, legislation-verified.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}>
            {[
              {
                icon: <IconSearch />,
                title: "Instant Legal Research",
                desc: "Search AustLII, ATO rulings, Federal and State legislation, ASIC, AAT, Fair Work Commission, and Family Law databases simultaneously — in seconds.",
              },
              {
                icon: <IconDocument />,
                title: "AI Document Drafting",
                desc: "Trust deeds, BFAs, service agreements, employment contracts, commercial leases, shareholders agreements — ten document types, drafted with legislation references built in.",
              },
              {
                icon: <IconShield />,
                title: "QA Verification Panel",
                desc: "Clause-by-clause confidence scoring. Critical issue flagging. Every clause returns a verified, flagged, or unverified status before you sign off.",
              },
              {
                icon: <IconMap />,
                title: "Multi-Jurisdiction",
                desc: "NSW, VIC, QLD, WA, SA, TAS, ACT, NT — and cross-border matters. Lex knows which legislation applies where.",
              },
              {
                icon: <IconChat />,
                title: "Thread Memory",
                desc: "Full conversation history per research session, persisted across sessions. Return to any matter thread exactly where you left it.",
              },
              {
                icon: <IconChart />,
                title: "Firm Dashboard",
                desc: "See all research threads, document history, top questions, and usage by team member — from a single dashboard.",
              },
            ].map((f) => (
              <div key={f.title} style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderTop: `2px solid ${C.gold}`,
                borderRadius: 14,
                padding: "28px 28px 32px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: C.goldBg, border: `1px solid ${C.goldBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 18,
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 10px", color: C.text }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.65, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. HOW IT WORKS ────────────────────────────────────────────────── */}
      <section style={{
        padding: "88px 32px",
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
        background: C.surface,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
              How It Works
            </h2>
            <p style={{ fontSize: 16, color: C.textMuted, margin: 0 }}>
              Three steps from question to court-ready document.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 32,
          }}>
            {[
              {
                num: "01",
                title: "Ask a research question",
                desc: "Type any legal question. Lex searches AustLII, ATO rulings, federal legislation, and more in real time — returning cited, current results.",
              },
              {
                num: "02",
                title: "Draft a document",
                desc: "Select a document type, add parties and instructions. Lex drafts a jurisdiction-specific, legislation-referenced document in seconds.",
              },
              {
                num: "03",
                title: "Verify with QA",
                desc: "Lex auto-runs a QA pass on every draft: clause confidence scores, critical issue flags, and recommended checks — before you sign off.",
              },
            ].map((step) => (
              <div key={step.num}>
                <div style={{
                  fontSize: 52, fontWeight: 900, lineHeight: 1,
                  color: C.goldBorder,
                  fontFamily: "Georgia, serif",
                  marginBottom: 16,
                  letterSpacing: "-0.03em",
                }}>
                  {step.num}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: C.text }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7, margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. RESEARCH CAPABILITIES ───────────────────────────────────────── */}
      <section style={{
        padding: "88px 32px",
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 64, alignItems: "start",
        }}>
          {/* Left */}
          <div>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 20px" }}>
              Search Every Australian Legal Database
            </h2>
            <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.7, margin: "0 0 28px" }}>
              Lex searches the full breadth of Australian legal sources simultaneously — no tab-switching, no manual cross-referencing.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { db: "AustLII", note: "case law, tribunal decisions, legislation" },
                { db: "ATO", note: "tax rulings, PCGs, interpretive decisions" },
                { db: "Federal Register of Legislation", note: "Acts, Regulations, Determinations" },
                { db: "State legislation", note: "all 8 jurisdictions" },
                { db: "ASIC", note: "corporate law guidance" },
                { db: "AAT", note: "administrative tribunal decisions" },
                { db: "Fair Work Commission", note: "employment law" },
                { db: "Family Law", note: "Full Court + Federal Circuit" },
              ].map((item) => (
                <li key={item.db} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%", background: C.gold,
                    marginTop: 6, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 14, color: C.text, lineHeight: 1.5 }}>
                    <strong style={{ color: C.text }}>{item.db}</strong>
                    <span style={{ color: C.textMuted }}> — {item.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Terminal card */}
          <div style={{
            background: "#0a1520",
            border: `1px solid ${C.goldBorder}`,
            borderRadius: 16,
            padding: "28px 28px 32px",
            fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
            fontSize: 13,
            lineHeight: 1.75,
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          }}>
            <div style={{ color: C.gold, fontWeight: 700, marginBottom: 4, fontSize: 12, letterSpacing: "0.08em" }}>
              Lex Research — AustLII
            </div>
            <div style={{ color: C.border, marginBottom: 16 }}>
              ──────────────────────
            </div>
            <div style={{ color: C.textMuted, marginBottom: 16 }}>
              <span style={{ color: C.gold }}>Query:</span> &quot;director duty of care&quot;
            </div>
            <div style={{ color: C.text, marginBottom: 8 }}>
              <span style={{ color: C.gold }}>Found:</span> Asic v Rich [2003] NSWSC 85
            </div>
            <div style={{ color: C.textMuted, paddingLeft: 16, marginBottom: 8 }}>
              Section 180(1) Corporations Act 2001
            </div>
            <div style={{ color: C.textMuted, paddingLeft: 16, marginBottom: 4 }}>
              → Duty of care and diligence
            </div>
            <div style={{ paddingLeft: 16, marginBottom: 16 }}>
              → Verified: <span style={{ color: C.green }}>✓ Current legislation</span>
            </div>
            <div style={{ color: C.textMuted, marginBottom: 4 }}>
              <span style={{ color: C.gold }}>Cross-referenced:</span> 3 related cases
            </div>
            <div style={{ color: C.textMuted }}>
              <span style={{ color: C.gold }}>Confidence:</span>{" "}
              <span style={{ color: C.green, fontWeight: 700 }}>94%</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. DOCUMENT DRAFTING ───────────────────────────────────────────── */}
      <section style={{
        padding: "88px 32px",
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
        background: C.surface,
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 64, alignItems: "start",
        }}>
          {/* Left: Document preview */}
          <div style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: "32px 32px 36px",
            fontFamily: "Georgia, 'Times New Roman', serif",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textAlign: "center", color: C.text, marginBottom: 12 }}>
              DISCRETIONARY TRUST DEED
            </div>
            <div style={{ height: 1, background: C.border, marginBottom: 20 }} />
            <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.8 }}>
              <p style={{ margin: "0 0 14px" }}>This Deed is made on [DATE]</p>
              <p style={{ margin: "0 0 6px", color: C.text, fontWeight: 600 }}>PARTIES:</p>
              <p style={{ margin: "0 0 4px" }}>Trustee: [TRUSTEE NAME]</p>
              <p style={{ margin: "0 0 18px" }}>Settlor: [SETTLOR NAME]</p>
              <p style={{ margin: "0 0 6px", color: C.text, fontWeight: 600 }}>RECITALS:</p>
              <p style={{ margin: "0 0 4px" }}>1. The Trustee agrees to hold the</p>
              <p style={{ margin: "0 0 4px", paddingLeft: 20 }}>Trust Fund on the terms set out</p>
              <p style={{ margin: "0 0 4px", paddingLeft: 20 }}>herein pursuant to the Trusts Act</p>
              <p style={{ margin: "0 0 20px", paddingLeft: 20 }}>1973 (Qld) s.8&hellip;</p>
              <div style={{
                borderTop: `1px solid ${C.border}`,
                paddingTop: 14,
                fontFamily: "system-ui, sans-serif",
                fontSize: 12,
              }}>
                <span style={{ color: C.green, fontWeight: 700 }}>✓ QA Status: Verified</span>
                <span style={{ color: C.textMuted }}> — 94% confidence</span>
              </div>
            </div>
          </div>

          {/* Right */}
          <div>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 20px" }}>
              Ten Document Types, Court-Ready in Seconds
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Discretionary Trust Deeds",
                "Binding Financial Agreements (BFAs)",
                "Service Agreements",
                "Employment Contracts",
                "Commercial Leases",
                "Shareholders Agreements",
                "Non-Disclosure Agreements (NDAs)",
                "Partnership Agreements",
                "Loan Agreements",
                "Contractor / Consultant Agreements",
              ].map((doc) => (
                <li key={doc} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%", background: C.gold, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 14, color: C.text }}>{doc}</span>
                </li>
              ))}
            </ul>
            <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, margin: 0 }}>
              Each document includes jurisdiction-specific legislation references and auto-runs QA verification before delivery.
            </p>
          </div>
        </div>
      </section>

      {/* ── 7. QA VERIFICATION ─────────────────────────────────────────────── */}
      <section style={{
        padding: "88px 32px",
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            display: "inline-block",
            background: C.goldBg, border: `1px solid ${C.goldBorder}`,
            borderRadius: 8, padding: "6px 16px", marginBottom: 24,
            fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.gold,
          }}>
            Built-in Quality Assurance
          </div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            The Only AI Legal Tool<br />With Built-In QA
          </h2>
          <p style={{ fontSize: 17, color: C.textMuted, maxWidth: 600, margin: "0 auto 56px", lineHeight: 1.65 }}>
            Every document Lex drafts automatically triggers a QA verification pass. Clause by clause.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
            textAlign: "left",
          }}>
            {/* Confidence Score */}
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: "32px 28px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "conic-gradient(#C9A84C 0% 94%, #243550 94% 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20,
                position: "relative",
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: C.surface,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, color: C.gold,
                }}>
                  94%
                </div>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 10px", color: C.text }}>
                Confidence Score
              </h3>
              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.65, margin: 0 }}>
                Every clause receives a confidence score based on legislation currency, case law alignment, and jurisdictional accuracy.
              </p>
            </div>

            {/* Critical Issues */}
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: "32px 28px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20,
              }}>
                <IconWarning />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 10px", color: C.text }}>
                Critical Issues
              </h3>
              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.65, margin: 0 }}>
                Flags legislation mismatches, missing required clauses, and jurisdiction conflicts before you sign off — not after.
              </p>
            </div>

            {/* Recommended Checks */}
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: "32px 28px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: C.goldBg, border: `1px solid ${C.goldBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20,
              }}>
                <IconArrow />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 10px", color: C.text }}>
                Recommended Checks
              </h3>
              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.65, margin: 0 }}>
                Tells you exactly what a senior lawyer should verify before filing or executing — no guesswork, no surprises.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. PRICING ─────────────────────────────────────────────────────── */}
      <section style={{
        padding: "88px 32px",
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
        background: C.surface,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
              Simple, Transparent Pricing
            </h2>
            <p style={{ fontSize: 16, color: C.textMuted, margin: 0 }}>
              No surprises. No lock-in. Australian-hosted.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24, maxWidth: 800, margin: "0 auto",
          }}>
            {/* Firm */}
            <div style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 16, padding: "36px 32px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", color: C.textMuted, textTransform: "uppercase", marginBottom: 12 }}>
                Firm
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: C.text }}>$299</span>
                <span style={{ fontSize: 14, color: C.textMuted }}>/month</span>
              </div>
              <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 28px" }}>
                Perfect for small-to-mid sized firms.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Unlimited legal research",
                  "20 documents per month",
                  "3 lawyer seats",
                  "All Australian databases",
                  "QA verification on every draft",
                  "Thread memory & history",
                ].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: C.textMuted }}>
                    <span style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="https://calendly.com/shanegoldberg/30min"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", textAlign: "center",
                  background: C.goldBg, color: C.gold,
                  border: `1.5px solid ${C.goldBorder}`,
                  fontWeight: 700, fontSize: 14, letterSpacing: "0.04em",
                  padding: "13px 24px", borderRadius: 10,
                  textDecoration: "none",
                }}
              >
                Start 14-Day Trial
              </a>
            </div>

            {/* Enterprise */}
            <div style={{
              background: C.bg,
              border: `2px solid ${C.gold}`,
              borderRadius: 16, padding: "36px 32px",
              boxShadow: `0 4px 32px rgba(201,168,76,0.2), 0 4px 24px rgba(0,0,0,0.4)`,
              position: "relative",
            }}>
              <div style={{
                position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                background: C.gold, color: C.bg,
                fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
                padding: "4px 16px", borderRadius: 100,
                whiteSpace: "nowrap",
              }}>
                Most Popular
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", color: C.gold, textTransform: "uppercase", marginBottom: 12 }}>
                Enterprise
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: C.text }}>Custom</span>
              </div>
              <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 28px" }}>
                For larger firms and legal networks.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Unlimited research & documents",
                  "Unlimited lawyer seats",
                  "Custom clientId embedding",
                  "White-label widget option",
                  "Dedicated onboarding",
                  "Priority support & SLA",
                ].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: C.textMuted }}>
                    <span style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="https://calendly.com/shanegoldberg/30min"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", textAlign: "center",
                  background: C.gold, color: C.bg,
                  fontWeight: 700, fontSize: 14, letterSpacing: "0.04em",
                  padding: "13px 24px", borderRadius: 10,
                  textDecoration: "none",
                  boxShadow: "0 4px 20px rgba(201,168,76,0.35)",
                }}
              >
                Contact Us
              </a>
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: 13, color: C.textDim, marginTop: 28 }}>
            No lock-in. Cancel anytime. Australian-hosted.
          </p>
        </div>
      </section>

      {/* ── 9. FINAL CTA ───────────────────────────────────────────────────── */}
      <section style={{ padding: "88px 32px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 20, padding: "60px 48px",
            textAlign: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
              Ready to see Lex in your firm?
            </h2>
            <p style={{ fontSize: 16, color: C.textMuted, lineHeight: 1.7, margin: "0 0 36px" }}>
              Book a free 30-minute demo. We&apos;ll show you live research and document drafting for your exact practice areas.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <a
                href="https://calendly.com/shanegoldberg/30min"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center",
                  background: C.gold, color: C.bg,
                  fontWeight: 700, fontSize: 15, letterSpacing: "0.02em",
                  padding: "14px 28px", borderRadius: 10,
                  textDecoration: "none",
                  boxShadow: "0 4px 20px rgba(201,168,76,0.35)",
                }}
              >
                Book a Free Demo
              </a>
              <a
                href="/lex"
                style={{
                  display: "inline-flex", alignItems: "center",
                  background: "transparent", color: C.gold,
                  fontWeight: 600, fontSize: 15, letterSpacing: "0.02em",
                  padding: "14px 28px", borderRadius: 10,
                  textDecoration: "none",
                  border: `1.5px solid ${C.goldBorder}`,
                }}
              >
                Try Lex Now
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
