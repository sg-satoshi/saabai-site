import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "AI Audit: Fixed-Price Automation Roadmap for Professional Firms",
  description:
    "Fixed-price AI Audit for Australian professional firms. Three tiers from $3,500. Written automation roadmap, ranked opportunities, projected ROI. Delivered in 1-3 weeks.",
  alternates: { canonical: "https://www.saabai.ai/ai-audit" },
  openGraph: {
    url: "https://www.saabai.ai/ai-audit",
    title: "AI Audit: Fixed-Price Automation Roadmap | Saabai",
    description:
      "Fixed-price AI Audit for Australian professional firms. Three tiers from $3,500. Written automation roadmap, ranked opportunities, projected ROI.",
  },
};

const tiers = [
  {
    name: "Essential",
    tagline: "For firms with 1–5 staff",
    price: "$3,500",
    priceNote: "one-time",
    duration: "Delivered in 1 week",
    description:
      "A focused audit for small firms ready to automate their first high-impact workflow.",
    features: [
      "One 90-minute discovery session",
      "Focused review of up to 3 core workflows",
      "Written report (8–12 pages) with top 3 automation opportunities",
      "ROI ranking with time savings, complexity, and build cost estimates",
      "30-minute findings walkthrough call",
    ],
    cta: "Buy Now $3,500",
    ctaLink: "https://buy.stripe.com/4gMdRbeBM1vQ5ht2yn8og02",
    ctaType: "stripe" as const,
    secondaryCta: "Questions? Book a call",
    highlight: false,
  },
  {
    name: "Professional",
    tagline: "For firms with 6–20 staff",
    price: "$7,500",
    priceNote: "one-time",
    duration: "Delivered in 2 weeks",
    description:
      "Our most popular audit. Multi-department review with a 90-day roadmap and post-delivery support.",
    features: [
      "Two 90-minute sessions (kickoff + deep-dive)",
      "Multi-department review of up to 8 workflows",
      "Tools audit (CRM, email, documents, calendar)",
      "Interviews with up to 2 department heads",
      "Written report (20–30 pages) with top 8 opportunities",
      "90-day prioritised implementation roadmap",
      "60-minute walkthrough call + recorded video summary",
      "30 days of post-delivery email support",
    ],
    cta: "Buy Now $7,500",
    ctaLink: "https://buy.stripe.com/9B6aEZgJU8Yi8tF1uj8og03",
    ctaType: "stripe" as const,
    secondaryCta: "Discuss first",
    highlight: true,
  },
  {
    name: "Enterprise",
    tagline: "For firms with 20+ staff",
    price: "$15,000",
    priceNote: "$1,500 deposit, $13,500 invoiced after kickoff",
    duration: "Delivered in 3 weeks",
    description:
      "Comprehensive audit for established firms. Full operational mapping, executive presentation, ongoing review.",
    features: [
      "Three sessions over 3 weeks (kickoff, mid-point, final)",
      "Complete operational map across all departments",
      "Interviews with up to 5 senior staff",
      "Competitive benchmarking against similar firms",
      "Comprehensive report (40–50 pages) with 15–25 opportunities",
      "Detailed ROI modelling for top 10 opportunities",
      "12-month phased implementation roadmap",
      "90-minute leadership presentation",
      "60 days of post-delivery support",
      "90-day follow-up review call",
    ],
    cta: "Secure with $1,500 deposit",
    ctaLink: "https://buy.stripe.com/00wfZjeBM5M6aBNc8X8og04",
    ctaType: "stripe" as const,
    secondaryCta: "Book a discovery call first",
    highlight: false,
  },
];

const processSteps = [
  {
    step: "01",
    title: "Purchase or book",
    body: "Choose your tier and pay securely via Stripe, or book a discovery call first if you'd prefer to discuss before committing.",
  },
  {
    step: "02",
    title: "Pre-audit questionnaire",
    body: "Within 24 hours, you receive a short questionnaire (10 minutes) and a Calendly link to schedule your discovery session.",
  },
  {
    step: "03",
    title: "Discovery sessions",
    body: "Working sessions with you and your team to map workflows, surface bottlenecks, and identify automation opportunities.",
  },
  {
    step: "04",
    title: "Written audit report",
    body: "Delivered within your tier's timeframe. Ranked opportunities, projected ROI, implementation roadmap. Build engagements quoted separately if you want to proceed.",
  },
];

const audit_faqs = [
  {
    q: "What's the difference between the three tiers?",
    a: "Tier size scales with firm complexity. More staff means more workflows, more stakeholders, and a deeper audit. Essential covers a single principal and up to 3 workflows. Professional adds multi-department review, department head interviews, and a 90-day implementation roadmap. Enterprise covers the entire operation across all departments with executive presentation and ongoing review. Pick based on your firm size, not your appetite for spend.",
  },
  {
    q: "What if I'm not sure which tier fits?",
    a: "Book a free 30-minute strategy call. We'll talk through your operation and recommend the right tier, or tell you if a tier isn't needed at all for what you're trying to solve. No pressure, no upselling.",
  },
  {
    q: "What does the audit actually deliver?",
    a: "A written report (length varies by tier) identifying your highest-ROI automation opportunities, ranked by impact and ease of implementation. For each opportunity: estimated hours/week recovered, build complexity, projected cost, and recommended sequencing. Plus a walkthrough call to present findings and answer questions.",
  },
  {
    q: "Does the audit price include the actual build?",
    a: "No. The audit is the roadmap. Build engagements are scoped and quoted separately once you've reviewed the audit. Build engagements typically range from $15,000 to $60,000 depending on complexity and number of workflows automated. Many clients begin with a single high-ROI build before expanding.",
  },
  {
    q: "What if I buy and decide it's not for me?",
    a: "You have 7 days from purchase to cancel for a full refund, no questions asked, provided the discovery session hasn't started yet. Once the discovery session begins, the engagement is non-refundable. We don't pressure anyone into proceeding to a build after the audit. If the report says there's nothing high-impact to automate, we'll tell you.",
  },
  {
    q: "Why a deposit for Enterprise instead of paying upfront?",
    a: "Most enterprise buyers want a kickoff conversation before committing the full amount. The $1,500 deposit secures your engagement slot, funds the initial discovery phase, and is fully credited toward the $15,000 total. The $13,500 balance is invoiced after the kickoff call once scope is confirmed.",
  },
  {
    q: "Can I pay by invoice instead of card?",
    a: "Yes, for Professional and Enterprise tiers. Email shane@saabai.ai with your firm details and we'll send a Stripe invoice with net-7 payment terms. Essential is card payment only.",
  },
];

export default function AIAudit() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <Nav activePage="/ai-audit" />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-52 pb-12 px-6 text-center max-w-5xl mx-auto overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 30%, var(--saabai-glow-mid) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 40% 30% at 50% 20%, var(--saabai-glow) 0%, transparent 70%)",
          }}
        />

        <div className="relative inline-flex items-center gap-2.5 mb-10">
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
          <p className="text-xs font-medium tracking-[0.2em] text-saabai-text-dim uppercase">
            AI Audit · Fixed-Price · For Professional Firms
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          Know exactly what to
          <br />
          <span className="text-gradient">automate first.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-14 leading-relaxed">
          A fixed-price audit that maps your operation, surfaces the highest-ROI
          automation opportunities, and gives you a written implementation
          roadmap. No vague proposals. No hourly billing. Three tiers, sized to
          your firm.
        </p>

        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, var(--saabai-bg))",
          }}
        />
      </section>

      {/* ── Pricing Tiers ────────────────────────────────────────────────── */}
      <section className="pt-4 pb-16 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col bg-saabai-surface border rounded-2xl p-10 transition-all ${
                tier.highlight
                  ? "border-saabai-teal/60"
                  : "border-saabai-border hover:border-saabai-teal/30"
              }`}
              style={
                tier.highlight
                  ? {
                      boxShadow:
                        "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)",
                    }
                  : undefined
              }
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-saabai-teal text-saabai-bg text-[10px] font-bold tracking-[0.18em] uppercase px-4 py-1.5 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-semibold tracking-tight mb-1">
                  {tier.name}
                </h3>
                <p className="text-sm text-saabai-text-dim">{tier.tagline}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-5xl font-semibold tracking-tight text-saabai-teal stat-glow">
                    {tier.price}
                  </span>
                  <span className="text-sm text-saabai-text-dim">AUD</span>
                </div>
                <p className="text-xs text-saabai-text-dim">{tier.priceNote}</p>
              </div>

              <p className="text-sm text-saabai-text-muted leading-relaxed mb-2">
                {tier.description}
              </p>
              <p className="text-[11px] font-medium tracking-[0.15em] text-saabai-teal uppercase mb-8">
                {tier.duration}
              </p>

              <ul className="flex flex-col gap-3 mb-10 flex-1">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-saabai-text-muted leading-relaxed"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal shrink-0 mt-2" />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={tier.ctaLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-center px-6 py-3.5 rounded-xl font-semibold text-sm transition-colors tracking-wide mb-3 ${
                  tier.highlight
                    ? "bg-saabai-teal text-saabai-bg hover:bg-saabai-teal-bright shadow-[0_0_30px_var(--saabai-glow-mid)]"
                    : "bg-saabai-teal text-saabai-bg hover:bg-saabai-teal-bright"
                }`}
              >
                {tier.cta}
              </a>

              <a
                href="https://calendly.com/shanegoldberg/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-xs text-saabai-text-dim hover:text-saabai-teal transition-colors tracking-wide"
              >
                {tier.secondaryCta} →
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-saabai-text-dim mt-10 tracking-wide">
          Secure payment via Stripe. 7-day refund window before discovery session begins.
        </p>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto border-t border-saabai-border mt-16">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          What Happens After You Purchase
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-24 max-w-2xl mx-auto leading-snug">
          From payment to written roadmap, in days, not months.
        </h2>

        <div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-saabai-border rounded-xl overflow-hidden"
          style={{
            boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)",
          }}
        >
          {processSteps.map(({ step, title, body }) => (
            <div key={step} className="bg-saabai-surface p-10 relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-border to-transparent" />
              <div
                className="text-[72px] font-bold leading-none tracking-tight mb-6 select-none"
                style={{ color: "var(--saabai-glow-mid)" }}
              >
                {step}
              </div>
              <div className="w-8 h-px bg-saabai-teal/50 mb-5" />
              <h3 className="text-base font-semibold mb-3 tracking-tight">
                {title}
              </h3>
              <p className="text-sm text-saabai-text-muted leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-3xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-teal uppercase text-center mb-5">
          AI Audit FAQ
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-16 max-w-2xl mx-auto leading-snug">
          Questions about the audit, answered honestly.
        </h2>

        <div
          className="flex flex-col divide-y divide-saabai-border border border-saabai-border rounded-2xl overflow-hidden"
          style={{
            boxShadow: "0 0 60px rgba(98,197,209,0.25), 0 0 24px rgba(98,197,209,0.15)",
          }}
        >
          {audit_faqs.map(({ q, a }) => (
            <details key={q} className="group bg-saabai-surface">
              <summary className="flex items-center justify-between gap-6 px-8 py-6 cursor-pointer list-none select-none hover:bg-saabai-surface-raised transition-colors">
                <span className="text-base font-medium text-saabai-text leading-snug">
                  {q}
                </span>
                <span className="shrink-0 w-6 h-6 rounded-full border border-saabai-border flex items-center justify-center text-saabai-text-dim text-sm font-light transition-all group-open:border-saabai-teal/60 group-open:text-saabai-teal group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="px-8 pb-7 pt-1">
                <p className="text-base text-saabai-text-muted leading-relaxed">
                  {a}
                </p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="relative py-40 px-6 text-center border-t border-saabai-border overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 50%, var(--saabai-glow-strong) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 40% 40% at 50% 45%, var(--saabai-glow-mid) 0%, transparent 60%)",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-saabai-teal/50 to-transparent" />

        <p className="relative text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-8">
          Still Deciding?
        </p>
        <h2 className="relative text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.02em] mb-7 max-w-2xl mx-auto leading-[1.08]">
          Book a free call,
          <br />
          <span className="text-gradient">no commitment.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          If you&apos;d rather talk through which tier fits your firm before
          buying, book a 30-minute strategy call. We&apos;ll recommend the right
          tier, or tell you if none of them are needed.
        </p>
        <a
          href="https://calendly.com/shanegoldberg/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-block bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
        >
          Book Your Free Strategy Call
        </a>
        <p className="relative text-saabai-text-dim text-xs mt-8 tracking-wide">
          No pitch, no invoice, no follow-up pressure. If we&apos;re not a good fit, we&apos;ll tell you.
        </p>
      </section>

      <Footer />
    </div>
  );
}
