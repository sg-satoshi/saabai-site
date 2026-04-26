"use client";

import { useState } from "react";
import Image from "next/image";

// ── Data ──────────────────────────────────────────────────────────────────────

const STATS = [
  { value: "68%", label: "of legal enquiries arrive outside business hours" },
  { value: "4.2x", label: "higher conversion if responded to within 5 minutes" },
  { value: "$180k+", label: "average annual revenue lost per unanswered lead" },
];

const PILLARS = [
  {
    number: "01",
    title: "24/7 Intake — zero missed enquiries",
    desc: "Lex handles every inbound enquiry — at 11pm on a Friday, over a long weekend, during trial. It asks the right questions, captures contact details, and qualifies the matter before your team sees it.",
    outcome: "You stop losing leads to silence",
  },
  {
    number: "02",
    title: "Matter qualification — before the first call",
    desc: "Instead of arriving at a first consultation with no context, your team gets a structured brief: matter type, urgency, key facts, what the client actually wants. Every time, automatically.",
    outcome: "First call is focused and billable",
  },
  {
    number: "03",
    title: "Client-ready outputs — not just notes",
    desc: "Lex doesn't just capture information. It structures it into briefing documents, follow-up emails, and intake summaries — formatted for your team and ready to act on, with no manual writeup required.",
    outcome: "Junior intake work, automated",
  },
];

const USECASES = [
  {
    area: "Tax & ATO Disputes",
    scenario: "A client receives an ATO audit notice on Friday evening. They find your site in a panic. Lex captures everything: notice date, amounts, audit type, company structure. Your team gets a full brief Monday morning.",
    outcome: "0 panic-enquiries lost to after-hours",
  },
  {
    area: "Commercial Contracts",
    scenario: "A business owner needs a contract reviewed before signing on Tuesday. Lex qualifies the urgency, captures the key parties and deal value, and books a consultation — all before your team logs in.",
    outcome: "High-value matters captured instantly",
  },
  {
    area: "Estate Planning",
    scenario: "A client wants to discuss their will and succession. Lex guides them through a structured conversation about family structure, assets, and goals — so the first consultation has real substance.",
    outcome: "Complex matters properly scoped",
  },
  {
    area: "Property & Conveyancing",
    scenario: "A buyer with exchange pressure at 9pm finds your site. Lex captures their property details, timeline, and key concerns. You wake up to a qualified lead, not a voicemail no-one can action.",
    outcome: "Time-sensitive leads never missed",
  },
  {
    area: "Employment Law",
    scenario: "An employee contacts your firm after a dismissal. Lex sensitively captures the facts, assesses urgency, and lets you know if it's time-critical — so the right person picks it up first.",
    outcome: "Urgency flagged before the first call",
  },
  {
    area: "Business Disputes",
    scenario: "A client with a dispute needs to know if they have a case — before paying for a consultation. Lex gathers the core facts and helps them feel heard, while your team gets the context they need.",
    outcome: "Qualified prospects, not tyre-kickers",
  },
];

const INCLUDED = [
  { label: "Custom AI agent", desc: "Trained on your practice areas, firm identity, and how you want to communicate" },
  { label: "24/7 intake coverage", desc: "Never miss an enquiry — weekends, public holidays, after hours" },
  { label: "Unlimited team members", desc: "Every partner, associate, paralegal, and admin gets full access — no per-seat charges, ever" },
  { label: "Instant team notification", desc: "Email alert the moment a new lead comes in, with full conversation transcript" },
  { label: "Structured lead briefs", desc: "Every enquiry formatted into a matter brief — ready to action, no manual writeup" },
  { label: "Automated client follow-up", desc: "Follow-up email goes to every enquiry automatically, before your team has seen it" },
  { label: "Embedded on your website", desc: "Live on your site within 5 business days, invisible seam with your brand" },
  { label: "Full leads dashboard", desc: "Every lead, conversation, and pipeline value in one place" },
  { label: "Your own AI account", desc: "Lex runs on your Anthropic account — your data never passes through us, and API costs go directly to you (typically $5–30/mo)" },
  { label: "Ongoing optimisation", desc: "Monthly review of conversation data — we tune it as your firm grows" },
];

const PRICING = [
  {
    name: "Starter",
    price: "$299",
    period: "/month",
    setup: "+ $1,500 setup",
    ideal: "Solo practitioners and boutique firms",
    upgrade: null as string | null,
    features: [
      "1 practice area covered",
      "Standard Lex intake agent — live in 5 days",
      "24/7 lead capture and qualification",
      "Instant email notifications to your whole team",
      "Full conversation transcripts",
      "Basic leads dashboard",
      "Standard follow-up email template",
      "Unlimited team logins",
      "Email support — 48hr response",
      "Quarterly performance review",
    ],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$499",
    period: "/month",
    setup: "+ $2,500 setup",
    ideal: "Established firms that want a competitive edge",
    upgrade: "Custom training + 4 practice areas + CRM + monthly reviews",
    features: [
      "Up to 4 practice areas covered",
      "Custom-trained on your firm's voice and matter types",
      "Structured matter briefs — not just raw transcripts",
      "CRM and calendar integration",
      "Pipeline value and revenue tracking",
      "Custom follow-up email sequences",
      "Monthly performance review call",
      "Priority email support — 24hr response",
      "Unlimited team logins",
    ],
    cta: "Most popular",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    setup: "Scoped per firm",
    ideal: "Multi-practice and multi-location firms",
    upgrade: "Unlimited agents + PM integration + dedicated account manager",
    features: [
      "Unlimited practice areas",
      "Multiple specialist agents (by area or office)",
      "Practice management integration (Clio, LEAP, etc.)",
      "Dedicated account manager",
      "White-label widget option",
      "Custom analytics and reporting",
      "Phone and video support",
      "SLA guarantee",
      "Unlimited team logins",
    ],
    cta: "Talk to us",
    highlight: false,
  },
];

// ── Card badges ───────────────────────────────────────────────────────────────

function CardBadges({ center = true }: { center?: boolean }) {
  const W = 40; const H = 26; const R = 5;
  const shadow = "0 2px 6px rgba(0,0,0,0.55)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: center ? "center" : "flex-start", flexWrap: "wrap" as const }}>

      {/* Visa */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" style={{ borderRadius: R, boxShadow: shadow, flexShrink: 0 }}>
        <rect width={W} height={H} rx={R} fill="#1A1F71"/>
        {/* White horizontal stripe at bottom — classic Visa detail */}
        <rect y={H - 7} width={W} height={7} rx={0} fill="#F7B600" opacity="0.15"/>
        <text x={W / 2} y={H * 0.69} textAnchor="middle" fill="white" fontSize="11.5" fontWeight="900" fontStyle="italic" fontFamily="Arial, Helvetica, sans-serif" letterSpacing="-0.3">VISA</text>
      </svg>

      {/* Mastercard */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" style={{ borderRadius: R, boxShadow: shadow, flexShrink: 0 }}>
        <rect width={W} height={H} rx={R} fill="#1C1C1C"/>
        {/* Left red circle */}
        <circle cx={W * 0.37} cy={H / 2} r={H * 0.38} fill="#EB001B"/>
        {/* Right yellow circle — overlaps, creating orange blend in centre */}
        <circle cx={W * 0.63} cy={H / 2} r={H * 0.38} fill="#F79E1B" opacity="0.93"/>
      </svg>

      {/* Amex */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" style={{ borderRadius: R, boxShadow: shadow, flexShrink: 0 }}>
        <defs>
          <linearGradient id="amex-grad" x1="0" y1="0" x2={W} y2={H} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1F77C8"/>
            <stop offset="100%" stopColor="#016FD0"/>
          </linearGradient>
        </defs>
        <rect width={W} height={H} rx={R} fill="url(#amex-grad)"/>
        <text x={W / 2} y={H * 0.63} textAnchor="middle" fill="white" fontSize="8.5" fontWeight="900" fontFamily="Arial, Helvetica, sans-serif" letterSpacing="0.8">AMEX</text>
      </svg>

      {/* Apple Pay */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" style={{ borderRadius: R, boxShadow: shadow, flexShrink: 0 }}>
        <rect width={W} height={H} rx={R} fill="#000"/>
        {/* Simplified Apple logo */}
        <text x={W / 2 - 5} y={H * 0.67} fill="white" fontSize="11" fontFamily="Arial, Helvetica, sans-serif"></text>
        <path d="M14.5 7.5c.7-.9.6-1.8.6-1.8s-.9.1-1.5.7c-.5.5-.8 1.3-.7 1.9.8.1 1.6-.3 1.6-.8z" fill="white"/>
        <path d="M14.5 8.4c-.9 0-1.3.5-1.9.5-.6 0-1.1-.5-1.8-.5-1 0-2 .8-2 2.4 0 2.3 1.8 4.7 2.8 4.7.6 0 1-.4 1.8-.4.7 0 1 .4 1.8.4 1 0 2.8-2.3 2.8-4.4-.1-.1-1.6-.6-1.5-2.7z" fill="white"/>
        <text x={W / 2 + 3} y={H * 0.66} textAnchor="middle" fill="white" fontSize="7" fontWeight="600" fontFamily="-apple-system, Arial, sans-serif">Pay</text>
      </svg>

      {/* Lock + Stripe */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#6b7280", fontSize: 10, marginLeft: 1, flexShrink: 0 }}>
        <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
          <path d="M1.8 4.4V3.2a2.7 2.7 0 0 1 5.4 0v1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <rect x="0.5" y="4.4" width="8" height="6.1" rx="1.5" fill="currentColor" opacity="0.65"/>
          <circle cx="4.5" cy="7.5" r="0.9" fill="white" opacity="0.85"/>
        </svg>
        <span style={{ letterSpacing: "0.2px" }}>Secured by Stripe</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CounselPage() {
  const [copied, setCopied] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [monthlyEnquiries, setMonthlyEnquiries] = useState(20);
  const [afterHoursPct, setAfterHoursPct] = useState(68);
  const [avgMatterValue, setAvgMatterValue] = useState(3000);

  function copyEmail() {
    navigator.clipboard.writeText("hello@saabai.ai").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const gold = "#c9a84c";
  const goldDim = "rgba(201,168,76,0.2)";
  const goldBorder = "rgba(201,168,76,0.25)";
  const bg = "#080a0f";
  const surface = "#0d0f14";
  const card = "#111418";
  const border = "#1a1d24";
  const textPrimary = "#ffffff";
  const textSecondary = "#9ca3af";
  const textMuted = "#4b5563";

  // ROI calculator — computed outputs
  const afterHoursLeads = monthlyEnquiries * afterHoursPct / 100;
  const missedLeads = afterHoursLeads * 0.6;
  const monthlyRevenueLost = missedLeads * avgMatterValue;
  const annualRevenueLost = monthlyRevenueLost * 12;
  const lexGrowthYr1 = 499 * 12 + 2500; // $8,488
  const roiYear1 = annualRevenueLost - lexGrowthYr1;
  const paybackMonths = monthlyRevenueLost > 0 ? lexGrowthYr1 / monthlyRevenueLost : 0;

  async function handleCheckout(plan: string) {
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setCheckoutLoading(null);
    }
  }

  function fmtCurrency(n: number) {
    if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
    if (n >= 1_000) return "$" + Math.round(n / 1_000) + "k";
    return "$" + Math.round(n);
  }

  return (
    <div style={{ background: bg, minHeight: "100vh", color: textPrimary, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>

      {/* Nav */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 32px", position: "sticky", top: 0, background: "#0b092e", backdropFilter: "blur(12px)", zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <a href="https://www.saabai.ai" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <Image src="/brand/saabai-logo.png" alt="Saabai" width={40} height={40} style={{ height: 40, width: "auto" }} priority />
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a href="#demo" style={{ fontSize: 13, color: textSecondary, textDecoration: "none", fontWeight: 500 }}>See demo</a>
            <a href="#pricing" style={{ fontSize: 13, color: textSecondary, textDecoration: "none", fontWeight: 500 }}>Pricing</a>
            <a
              href="https://calendly.com/shanegoldberg/30min"
              style={{ fontSize: 13, background: gold, color: bg, padding: "8px 18px", borderRadius: 8, fontWeight: 700, textDecoration: "none", letterSpacing: "-0.1px" }}
            >
              Talk to us
            </a>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 32px 80px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.08)", border: `1px solid ${goldBorder}`, borderRadius: 20, padding: "6px 16px", marginBottom: 32 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: gold }} />
          <span style={{ fontSize: 11, color: gold, letterSpacing: "1px", textTransform: "uppercase" as const, fontWeight: 700 }}>AI Intake Agent for Law Firms</span>
        </div>

        <div style={{ maxWidth: 760 }}>
          <h1 style={{ fontSize: "clamp(36px, 5.5vw, 64px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-2px", margin: "0 0 24px", color: textPrimary }}>
            Your firm&apos;s first AI hire<br />
            <span style={{ color: gold }}>works the hours you don&apos;t.</span>
          </h1>

          <p style={{ fontSize: 19, color: textSecondary, lineHeight: 1.7, margin: "0 0 16px", maxWidth: 620 }}>
            Lex is an AI intake agent built for law firms. It qualifies new enquiries, captures matter details, and delivers structured client briefs — 24 hours a day, without a receptionist.
          </p>
          <p style={{ fontSize: 16, color: textMuted, lineHeight: 1.7, margin: "0 0 48px", maxWidth: 560 }}>
            Every missed after-hours call is a matter that went to your competitor. Lex closes that gap permanently.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const, alignItems: "center" }}>
            <a
              href="https://calendly.com/shanegoldberg/30min"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: gold, color: bg, padding: "15px 30px", borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: "none", letterSpacing: "-0.3px", boxShadow: `0 8px 32px rgba(201,168,76,0.25)` }}
            >
              Book a 30-min demo
            </a>
            <a
              href="#demo"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: textSecondary, padding: "15px 30px", borderRadius: 10, fontWeight: 600, fontSize: 15, textDecoration: "none", border: `1px solid ${border}` }}
            >
              Try Lex live ↓
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, background: surface }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 40 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 44, fontWeight: 900, color: gold, letterSpacing: "-2px", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: textMuted, marginTop: 10, lineHeight: 1.5, maxWidth: 200, margin: "10px auto 0" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* What Lex does */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 32px 80px" }}>
        <div style={{ marginBottom: 56 }}>
          <p style={{ fontSize: 11, color: gold, letterSpacing: "1.2px", textTransform: "uppercase" as const, fontWeight: 700, margin: "0 0 14px" }}>What Lex does</p>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 900, letterSpacing: "-1px", margin: "0 0 16px", color: textPrimary, lineHeight: 1.1 }}>
            Not a chatbot.<br />An AI legal operator.
          </h2>
          <p style={{ fontSize: 16, color: textSecondary, maxWidth: 540, margin: 0, lineHeight: 1.7 }}>
            Lex replaces the intake work that currently either falls through the cracks or takes a junior team member hours to complete manually.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {PILLARS.map((p, i) => (
            <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 20, padding: "32px 28px", position: "relative" as const, overflow: "hidden" as const }}>
              <div style={{ position: "absolute" as const, top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${gold}, transparent)` }} />
              <div style={{ fontSize: 11, fontWeight: 800, color: gold, letterSpacing: "1.5px", marginBottom: 20, opacity: 0.7 }}>{p.number}</div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: textPrimary, margin: "0 0 14px", lineHeight: 1.3, letterSpacing: "-0.3px" }}>{p.title}</h3>
              <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.75, margin: "0 0 24px" }}>{p.desc}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20, borderTop: `1px solid ${border}` }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: gold, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: gold, fontWeight: 700 }}>{p.outcome}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Demo */}
      <div id="demo" style={{ background: surface, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 64, alignItems: "start" }}>

            {/* Left: copy */}
            <div>
              <p style={{ fontSize: 11, color: gold, letterSpacing: "1.2px", textTransform: "uppercase" as const, fontWeight: 700, margin: "0 0 14px" }}>Live Demo</p>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 900, letterSpacing: "-1px", margin: "0 0 20px", color: textPrimary, lineHeight: 1.1 }}>
                This is Lex.<br />Say hello.
              </h2>
              <p style={{ fontSize: 16, color: textSecondary, lineHeight: 1.7, margin: "0 0 40px", maxWidth: 480 }}>
                This is the actual agent — not a mockup. Ask it something a potential client at a law firm might ask.
              </p>

              <div style={{ display: "flex", flexDirection: "column" as const, gap: 12, marginBottom: 40 }}>
                {[
                  "I've received an ATO audit notice",
                  "I need to review a commercial contract before signing",
                  "I want to update my will",
                  "We have a business dispute with a former partner",
                ].map((prompt, i) => (
                  <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 11, color: gold, fontWeight: 700, letterSpacing: "0.5px", flexShrink: 0 }}>Try:</span>
                    <span style={{ fontSize: 13, color: textSecondary, fontStyle: "italic" }}>"{prompt}"</span>
                  </div>
                ))}
              </div>

              <div style={{ background: "rgba(201,168,76,0.06)", border: `1px solid ${goldBorder}`, borderRadius: 14, padding: "20px 24px" }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: gold, letterSpacing: "0.5px" }}>What happens after Lex captures a lead</p>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {["Your team gets an instant email with the full conversation", "A structured matter brief is generated automatically", "A follow-up email goes to the client within seconds", "The lead appears in your Saabai dashboard"].map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", background: goldDim, border: `1px solid ${goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M1 5l3 3 5-4" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <span style={{ fontSize: 13, color: textSecondary }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: phone */}
            <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center" }}>
              <div style={{ width: 340, height: 620, background: "#0a0c10", border: `2px solid #222530`, borderRadius: 32, overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)", position: "relative" as const }}>
                <div style={{ position: "absolute" as const, top: 0, left: "50%", transform: "translateX(-50%)", width: 100, height: 26, background: "#080a0f", borderRadius: "0 0 16px 16px", zIndex: 10 }} />
                <iframe
                  src="/lex-widget?client=tributumlaw"
                  style={{ width: "100%", height: "100%", border: "none" }}
                  allow="microphone"
                  title="Lex AI Agent — Live Demo"
                />
              </div>
              <p style={{ fontSize: 11, color: textMuted, marginTop: 16, letterSpacing: "0.5px" }}>Live · Powered by Saabai</p>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 32px 80px" }}>
        <div style={{ marginBottom: 56 }}>
          <p style={{ fontSize: 11, color: gold, letterSpacing: "1.2px", textTransform: "uppercase" as const, fontWeight: 700, margin: "0 0 14px" }}>Practice areas</p>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 900, letterSpacing: "-1px", margin: "0 0 16px", color: textPrimary, lineHeight: 1.1 }}>Where Lex earns its keep</h2>
          <p style={{ fontSize: 16, color: textSecondary, maxWidth: 500, margin: 0, lineHeight: 1.7 }}>Lex works across practice areas — the intake process is the same whether it&apos;s tax, property, estates, or commercial work.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          {USECASES.map((u, i) => (
            <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: "26px 24px" }}>
              <div style={{ display: "inline-block", background: goldDim, border: `1px solid ${goldBorder}`, borderRadius: 6, padding: "3px 10px", marginBottom: 16 }}>
                <span style={{ fontSize: 11, color: gold, fontWeight: 700, letterSpacing: "0.5px" }}>{u.area}</span>
              </div>
              <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.75, margin: "0 0 20px" }}>{u.scenario}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 16, borderTop: `1px solid ${border}` }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: gold, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: gold, fontWeight: 700 }}>{u.outcome}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What's included */}
      <div style={{ background: surface, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
            <div>
              <p style={{ fontSize: 11, color: gold, letterSpacing: "1.2px", textTransform: "uppercase" as const, fontWeight: 700, margin: "0 0 14px" }}>What&apos;s included</p>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 900, letterSpacing: "-1px", margin: "0 0 20px", color: textPrimary, lineHeight: 1.1 }}>
                Done for you,<br />live in 5 days.
              </h2>
              <p style={{ fontSize: 16, color: textSecondary, lineHeight: 1.7, margin: "0 0 32px" }}>
                We build, train, and deploy your Lex agent. You approve the persona and practice areas. We handle everything else — from initial setup to ongoing optimisation.
              </p>
              <a
                href="https://calendly.com/shanegoldberg/30min"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: gold, color: bg, padding: "14px 28px", borderRadius: 10, fontWeight: 800, fontSize: 14, textDecoration: "none" }}
              >
                Start the conversation
              </a>

              {/* BYOAK + unlimited seats callout */}
              <div style={{ marginTop: 32, display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {[
                  { icon: "∞", heading: "Unlimited team members", body: "Every partner, associate, and admin gets access. No per-seat charges — ever." },
                  { icon: "🔑", heading: "Your own AI account", body: "Lex runs on your Anthropic account. Your data is yours, and AI costs go directly to you at cost — typically $5–30/mo. We never mark up your API usage." },
                ].map((item, i) => (
                  <div key={i} style={{ background: "rgba(201,168,76,0.04)", border: `1px solid ${goldBorder}`, borderRadius: 12, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: textPrimary }}>{item.heading}</p>
                      <p style={{ margin: 0, fontSize: 12, color: textSecondary, lineHeight: 1.6 }}>{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
              {INCLUDED.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 0", borderBottom: i < INCLUDED.length - 1 ? `1px solid ${border}` : "none" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: goldDim, border: `1px solid ${goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1 5l3 3 5-4" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 700, color: textPrimary }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: 13, color: textMuted, lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ROI Calculator */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 32px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 11, color: gold, letterSpacing: "1.2px", textTransform: "uppercase" as const, fontWeight: 700, margin: "0 0 14px" }}>Revenue at risk</p>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 900, letterSpacing: "-1px", margin: "0 0 16px", color: textPrimary, lineHeight: 1.1 }}>
            See what your firm is losing<br />without Lex.
          </h2>
          <p style={{ fontSize: 16, color: textSecondary, maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
            Adjust the numbers to match your firm. The output is conservative — it assumes you&apos;re only missing 60% of after-hours enquiries.
          </p>
        </div>

        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 24, padding: "48px 48px 40px", position: "relative" as const, overflow: "hidden" as const }}>
          <div style={{ position: "absolute" as const, top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${gold}, transparent)` }} />

          {/* Sliders */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 40, marginBottom: 48 }}>
            {/* Slider 1 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>Enquiries per month</label>
                <span style={{ fontSize: 22, fontWeight: 900, color: gold, letterSpacing: "-1px" }}>{monthlyEnquiries}</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={1}
                value={monthlyEnquiries}
                onChange={e => setMonthlyEnquiries(Number(e.target.value))}
                style={{ width: "100%", accentColor: gold, cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: textMuted }}>5</span>
                <span style={{ fontSize: 11, color: textMuted }}>100 / mo</span>
              </div>
            </div>

            {/* Slider 2 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>Arrive after hours</label>
                <span style={{ fontSize: 22, fontWeight: 900, color: gold, letterSpacing: "-1px" }}>{afterHoursPct}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={90}
                step={1}
                value={afterHoursPct}
                onChange={e => setAfterHoursPct(Number(e.target.value))}
                style={{ width: "100%", accentColor: gold, cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: textMuted }}>20%</span>
                <span style={{ fontSize: 11, color: textMuted }}>90%</span>
              </div>
            </div>

            {/* Slider 3 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>Avg matter value</label>
                <span style={{ fontSize: 22, fontWeight: 900, color: gold, letterSpacing: "-1px" }}>{fmtCurrency(avgMatterValue)}</span>
              </div>
              <input
                type="range"
                min={500}
                max={50000}
                step={500}
                value={avgMatterValue}
                onChange={e => setAvgMatterValue(Number(e.target.value))}
                style={{ width: "100%", accentColor: gold, cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: textMuted }}>$500</span>
                <span style={{ fontSize: 11, color: textMuted }}>$50k</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: border, marginBottom: 40 }} />

          {/* Output stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 20, marginBottom: 32 }}>
            {[
              { label: "After-hours leads / mo", value: Math.round(afterHoursLeads).toString(), sub: "go unanswered without Lex" },
              { label: "Leads lost / mo", value: Math.round(missedLeads).toString(), sub: "60% missed without 24/7 cover" },
              { label: "Revenue lost / mo", value: fmtCurrency(monthlyRevenueLost), sub: "conservative estimate" },
              { label: "Revenue lost / year", value: fmtCurrency(annualRevenueLost), sub: "before Lex", highlight: true },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  background: stat.highlight ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${stat.highlight ? goldBorder : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 14,
                  padding: "20px 20px 16px",
                }}
              >
                <div style={{ fontSize: 11, color: stat.highlight ? gold : textMuted, fontWeight: 600, marginBottom: 8, letterSpacing: "0.3px" }}>{stat.label}</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: stat.highlight ? gold : textPrimary, letterSpacing: "-1.5px", lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: textMuted, marginTop: 6, lineHeight: 1.4 }}>{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* ROI vs Lex */}
          <div style={{ background: "rgba(201,168,76,0.05)", border: `1px solid ${goldBorder}`, borderRadius: 16, padding: "24px 28px", display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center" }}>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: gold }}>Year 1 ROI — Lex Growth plan</p>
              <p style={{ margin: 0, fontSize: 13, color: textSecondary, lineHeight: 1.6 }}>
                Lex Growth costs <strong style={{ color: textPrimary }}>$8,488 in year one</strong> ($499/mo + $2,500 setup).
                Your firm is currently losing an estimated{" "}
                <strong style={{ color: gold }}>{fmtCurrency(annualRevenueLost)}/year</strong> in missed leads.
                {roiYear1 > 0
                  ? <> That&apos;s a <strong style={{ color: gold }}>{fmtCurrency(roiYear1)} net gain</strong> in year one.</>
                  : <> At this volume, Lex pays back in <strong style={{ color: gold }}>{paybackMonths < 1 ? "under 1 month" : `${Math.ceil(paybackMonths)} months`}</strong>.</>
                }
              </p>
            </div>
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: textMuted, marginBottom: 4, whiteSpace: "nowrap" as const }}>Payback period</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: gold, letterSpacing: "-1.5px", lineHeight: 1 }}>
                {paybackMonths < 1 ? "<1" : Math.ceil(paybackMonths) > 24 ? "24+" : Math.ceil(paybackMonths)}
              </div>
              <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>months</div>
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: 12, color: textMuted, marginTop: 24, marginBottom: 0 }}>
            Assumptions: 60% of after-hours enquiries are lost without 24/7 coverage · 80% conversion rate on captured leads · Year 1 includes setup fee
          </p>
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 32px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 11, color: gold, letterSpacing: "1.2px", textTransform: "uppercase" as const, fontWeight: 700, margin: "0 0 14px" }}>Pricing</p>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 900, letterSpacing: "-1px", margin: "0 0 16px", color: textPrimary, lineHeight: 1.1 }}>
            Less than one missed matter<br />pays for a year.
          </h2>
          <p style={{ fontSize: 16, color: textSecondary, maxWidth: 540, margin: "0 auto 16px", lineHeight: 1.7 }}>
            One setup fee, one monthly fee. Unlimited team members. No per-seat charges, no usage caps, no lock-in contracts.
          </p>
          <p style={{ fontSize: 14, color: textMuted, maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.7 }}>
            Lex runs on your own Anthropic account — your data stays yours, AI costs go directly to you at cost (typically $5–30/mo). Most legal software charges $50–150 per user per month on top of that. We don&apos;t.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <CardBadges />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {PRICING.map((plan, i) => (
            <div
              key={i}
              style={{
                background: plan.highlight ? "rgba(201,168,76,0.06)" : card,
                border: `1px solid ${plan.highlight ? goldBorder : border}`,
                borderRadius: 20,
                padding: "32px 28px",
                position: "relative" as const,
              }}
            >
              {plan.highlight && (
                <div style={{ position: "absolute" as const, top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${gold}, transparent)` }} />
              )}
              {plan.highlight && (
                <div style={{ position: "absolute" as const, top: -12, left: "50%", transform: "translateX(-50%)", background: gold, color: bg, fontSize: 10, fontWeight: 800, padding: "4px 14px", borderRadius: 20, letterSpacing: "0.8px", whiteSpace: "nowrap" as const }}>
                  MOST POPULAR
                </div>
              )}
              <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: textMuted, textTransform: "uppercase" as const, letterSpacing: "0.8px" }}>{plan.name}</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: plan.price === "Custom" ? 32 : 40, fontWeight: 900, color: textPrimary, letterSpacing: "-2px", lineHeight: 1 }}>{plan.price}</span>
                {plan.period && <span style={{ fontSize: 14, color: textMuted }}>{plan.period}</span>}
              </div>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: textMuted }}>{plan.setup}</p>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: textSecondary, paddingTop: 12, borderTop: `1px solid ${border}` }}>{plan.ideal}</p>

              {/* Upgrade callout — Growth and Enterprise only */}
              {plan.upgrade && (
                <div style={{ background: "rgba(201,168,76,0.07)", border: `1px solid ${goldBorder}`, borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
                  <p style={{ margin: "0 0 3px", fontSize: 10, fontWeight: 800, color: gold, letterSpacing: "0.8px", textTransform: "uppercase" as const }}>What you gain</p>
                  <p style={{ margin: 0, fontSize: 12, color: textSecondary, lineHeight: 1.5 }}>{plan.upgrade}</p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, marginBottom: 28 }}>
                {plan.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><path d="M2 7l3.5 3.5 6.5-5" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontSize: 13, color: textSecondary, lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
              {plan.name === "Enterprise" ? (
                <a
                  href="https://calendly.com/shanegoldberg/30min"
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: "block", textAlign: "center", padding: "13px 20px", borderRadius: 10,
                    fontWeight: 700, fontSize: 14, textDecoration: "none",
                    background: "transparent", color: gold, border: `1px solid ${goldBorder}`,
                  }}
                >
                  {plan.cta}
                </a>
              ) : (
                <>
                  <button
                    onClick={() => handleCheckout(plan.name.toLowerCase())}
                    disabled={checkoutLoading === plan.name.toLowerCase()}
                    style={{
                      width: "100%", padding: "13px 20px", borderRadius: 10,
                      fontWeight: 700, fontSize: 14, cursor: checkoutLoading ? "wait" : "pointer",
                      background: plan.highlight ? gold : "transparent",
                      color: plan.highlight ? bg : gold,
                      border: `1px solid ${plan.highlight ? gold : goldBorder}`,
                      opacity: checkoutLoading === plan.name.toLowerCase() ? 0.7 : 1,
                    }}
                  >
                    {checkoutLoading === plan.name.toLowerCase() ? "Loading…" : plan.cta}
                  </button>
                  <div style={{ marginTop: 14 }}>
                    <CardBadges />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: textMuted, marginTop: 32, lineHeight: 1.7 }}>
          All plans include a 30-day review period. If Lex isn&apos;t capturing leads within the first month, we&apos;ll work with you until it is.
          <br />AI processing runs on your Anthropic account — we&apos;ll walk you through the 5-minute setup as part of onboarding.
        </p>
      </div>

      {/* About Saabai */}
      <div style={{ background: surface, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 32px", display: "grid", gridTemplateColumns: "1fr auto", gap: 64, alignItems: "center" }}>
          <div style={{ maxWidth: 580 }}>
            <p style={{ fontSize: 11, color: gold, letterSpacing: "1.2px", textTransform: "uppercase" as const, fontWeight: 700, margin: "0 0 14px" }}>About Saabai</p>
            <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.8px", margin: "0 0 16px", color: textPrimary, lineHeight: 1.2 }}>We build AI agents for professional services firms.</h2>
            <p style={{ fontSize: 15, color: textSecondary, lineHeight: 1.8, margin: 0 }}>
              Saabai is an AI automation business based in Adelaide. We don&apos;t sell off-the-shelf chatbots — we build custom agents trained on how your firm actually works. Rex has been running for Plastics Online for several months, capturing leads around the clock and auto-generating CRM records. Lex brings the same system to law firms.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 14, minWidth: 180 }}>
            {[
              { num: "24/7", label: "Intake coverage" },
              { num: "<2s", label: "Response time" },
              { num: "5 days", label: "Time to live" },
            ].map((s, i) => (
              <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: "18px 22px" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: gold, letterSpacing: "-1px", lineHeight: 1 }}>{s.num}</div>
                <div style={{ fontSize: 12, color: textMuted, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "96px 32px 112px", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(30px, 4.5vw, 52px)", fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 20px", color: textPrimary, lineHeight: 1.05 }}>
          Your firm is losing leads<br />
          <span style={{ color: gold }}>every night it doesn&apos;t have Lex.</span>
        </h2>
        <p style={{ fontSize: 17, color: textSecondary, margin: "0 0 48px", lineHeight: 1.7, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
          Book a 30-minute demo. We&apos;ll show you how Lex works, walk through what the intake flow would look like for your firm, and tell you what it costs.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" as const }}>
          <a
            href="https://calendly.com/shanegoldberg/30min"
            style={{ display: "inline-flex", alignItems: "center", gap: 10, background: gold, color: bg, padding: "17px 36px", borderRadius: 12, fontWeight: 800, fontSize: 16, textDecoration: "none", letterSpacing: "-0.3px", boxShadow: `0 12px 40px rgba(201,168,76,0.3)` }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/></svg>
            Book a demo
          </a>
          <button
            onClick={copyEmail}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "transparent", color: gold, padding: "17px 36px", borderRadius: 12, fontWeight: 600, fontSize: 16, border: `1px solid ${goldBorder}`, cursor: "pointer", letterSpacing: "-0.2px" }}
          >
            {copied ? (
              <><svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M1 6l3.5 3.5 6.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> Copied!</>
            ) : (
              <>hello@saabai.ai</>
            )}
          </button>
        </div>
        <p style={{ fontSize: 13, color: textMuted, marginTop: 32 }}>No lock-in contracts. Live in 5 business days.</p>
      </div>

    </div>
  );
}
