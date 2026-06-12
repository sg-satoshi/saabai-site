import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "AI Automation Pricing for Accounting & Professional Firms | Saabai",
  description:
    "Three engagement tiers for accounting firms: AI Efficiency Audit ($2,500), Efficiency Sprint ($12K–18K), and Managed AI Operations ($2,500–6K/mo). Book a free strategy call.",
  alternates: { canonical: "https://www.saabai.ai/offers" },
  openGraph: {
    url: "https://www.saabai.ai/offers",
    title: "AI Automation Pricing for Accounting & Professional Firms | Saabai",
    description:
      "Three engagement tiers for accounting firms: AI Efficiency Audit ($2,500), Efficiency Sprint ($12K–18K), and Managed AI Operations ($2,500–6K/mo).",
  },
};

const tiers = [
  {
    name: "AI Efficiency Audit",
    tagline: "Find your firm's hidden capacity — the first step.",
    price: "$2,500",
    duration: "Delivered in 1 week",
    description:
      "A focused, fixed-price audit that maps your current workflows and surfaces exactly where automation will recover the most time. No speculation, no fluff — just a dollar-figure plan.",
    guarantee:
      "If we don't find at least $50K/yr in recoverable capacity, you don't pay.",
    features: [
      "Workflow mapping of up to 5 core firm processes",
      "Dollar-figure roadmap of recoverable capacity",
      "Prioritised build plan ranked by ROI and complexity",
      "30-minute findings walkthrough call",
      "100% credited toward your first implementation engagement",
    ],
    highlight: false,
  },
  {
    name: "Efficiency Sprint",
    tagline: "The mid-tier build: install 2–3 systems, recover weeks per year.",
    price: "$12,000–18,000",
    duration: "4–6 weeks",
    description:
      "A concentrated build sprint that deploys 2–3 automation systems into your firm's daily operations. Ideal for firms that have completed an audit or already know their bottlenecks.",
    features: [
      "Deploy 2–3 production-ready automation systems",
      "Integration with your existing tools (Xero, Practice Manager, etc.)",
      "Team onboarding and documentation",
      "30 days of post-deployment support and tuning",
      "Clear ROI tracking from day one",
    ],
    highlight: true,
  },
  {
    name: "Managed AI Operations",
    tagline: "Ongoing AI operations — your firm keeps getting faster.",
    price: "$2,500–6,000/mo",
    duration: "Ongoing retainer",
    description:
      "For firms that want continuous AI operations without hiring in-house. A dedicated Saabai retainer that expands your automation footprint month over month, compounding efficiency gains.",
    features: [
      "Monthly sprint cycle: one new system deployed or optimised per month",
      "24/7 monitoring and management of all AI systems",
      "Quarterly strategic review and roadmap refresh",
      "Priority support and same-business-day escalation",
      "Flexible scaling — add or remove capacity as your practice evolves",
    ],
    highlight: false,
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Discovery",
    body: "We learn your firm — your tools, your workflows, your team structure, and your commercial priorities. This can be an existing audit or a targeted scoping call.",
  },
  {
    step: "02",
    title: "Build & Integrate",
    body: "Custom AI systems are built and integrated directly into your existing technology stack. No forced migrations, no replacing tools that work.",
  },
  {
    step: "03",
    title: "Deploy & Onboard",
    body: "Systems go live with full team onboarding, documentation, and a clear runbook. Your team knows exactly how to work with the new automation from day one.",
  },
  {
    step: "04",
    title: "Optimise & Scale",
    body: "We monitor, measure, and refine. Every month compounds the efficiency gains, and every quarter we revisit the roadmap to identify the next opportunity.",
  },
];

const faqs = [
  {
    q: "How do I know which tier is right for my firm?",
    a: "Most firms start with the AI Efficiency Audit ($2,500) to get a clear picture of where automation creates the most impact. If you already know your bottlenecks and are ready to build, the Efficiency Sprint is the right entry point. Managed AI Operations suits firms that want ongoing, compounding automation without internal AI staff. Book a free 30-minute call and we'll recommend the right starting point based on your firm size and goals.",
  },
  {
    q: "What does 'recoverable capacity' mean, and how do you measure it?",
    a: "Recoverable capacity is the hours your team is spending on work that could be handled by an AI system — manual data entry, client follow-ups, report generation, compliance paperwork. We map your current workflows, measure the time spent on each task, and calculate the dollar value of the hours that automation can recover. If the total doesn't reach $50K/yr, the audit is free. Simple as that.",
  },
  {
    q: "Do you work with firms outside accounting?",
    a: "Yes. While we have deep experience with accounting firms, our systems work across law firms, financial services, real estate agencies, trade businesses, and professional services firms of all types. The three-tier model is the same; the tools and workflows differ by industry.",
  },
  {
    q: "Can I start with a Sprint without doing an audit first?",
    a: "Absolutely. If you already know your bottlenecks — senior staff spending hours on quote generation, client intake consuming two paralegals, report production eating three days a month — we can scope a Sprint directly. The audit is designed for firms that want a data-backed case before committing to a build.",
  },
  {
    q: "What's the commitment for Managed AI Operations?",
    a: "Managed AI Operations is a month-to-month retainer with a 3-month minimum commitment. This ensures we have enough time to deploy meaningful systems and start compounding gains. After the initial period, you can scale up, scale down, or cancel with 30 days' notice.",
  },
  {
    q: "How quickly can you start?",
    a: "We can typically begin within 1–2 weeks of engagement. Audits take 1 week and are delivered on schedule. Sprints begin after scope is confirmed and typically run 4–6 weeks. Managed Operations starts with a kickoff sprint and runs continuously from there.",
  },
];

export default function Offers() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <Nav activePage="/offers" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
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
            Pricing &amp; Engagement Models · For Accounting Firms
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          From audit to
          <br />
          <span className="text-gradient">ongoing AI operations.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-14 leading-relaxed">
          Three engagement tiers, each designed for a different stage of your
          automation journey. Start with a low-risk audit, scale into a build
          sprint, or go all-in with managed operations.
        </p>

        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, var(--saabai-bg))",
          }}
        />
      </section>

      {/* ── Pricing Tiers ──────────────────────────────────────────────────── */}
      <section className="pt-4 pb-24 px-6 max-w-7xl mx-auto">
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
              </div>

              <p className="text-sm text-saabai-text-muted leading-relaxed mb-2">
                {tier.description}
              </p>

              {tier.guarantee && (
                <p className="text-[11px] font-semibold tracking-[0.12em] text-saabai-teal uppercase mb-3 leading-relaxed">
                  {tier.guarantee}
                </p>
              )}

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
                href="https://calendly.com/shanegoldberg/30min"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-center px-6 py-3.5 rounded-xl font-semibold text-sm transition-colors tracking-wide mb-3 ${
                  tier.highlight
                    ? "bg-saabai-teal text-saabai-bg hover:bg-saabai-teal-bright shadow-[0_0_30px_var(--saabai-glow-mid)]"
                    : "bg-saabai-teal text-saabai-bg hover:bg-saabai-teal-bright"
                }`}
              >
                Book a Free 30-Min Call
              </a>

              <p className="text-center text-xs text-saabai-text-dim tracking-wide">
                No obligation. We&apos;ll recommend the right path for your firm.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          How Every Engagement Works
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-24 max-w-2xl mx-auto leading-snug">
          From discovery to compounding efficiency, in weeks.
        </h2>

        <div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-saabai-border rounded-xl overflow-hidden"
          style={{
            boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)",
          }}
        >
          {howItWorks.map(({ step, title, body }) => (
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

      {/* ── Guarantee Highlight ───────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <div
          className="relative rounded-xl overflow-hidden border border-saabai-border-accent bg-saabai-surface p-14 text-center"
          style={{
            boxShadow: "0 0 80px rgba(98,197,209,0.35), 0 0 32px rgba(98,197,209,0.15)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/40 to-transparent" />
          <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-teal uppercase mb-6">
            The Saabai Guarantee
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6 max-w-3xl mx-auto leading-snug">
            &ldquo;If we don&apos;t find at least $50K/yr in recoverable
            capacity, you don&apos;t pay.&rdquo;
          </h2>
          <p className="text-base text-saabai-text-muted max-w-2xl mx-auto leading-relaxed mb-10">
            Every AI Efficiency Audit comes with this guarantee. We don&apos;t
            bill for audits that don&apos;t uncover significant, actionable
            capacity. If your firm has manual processes, repetitive admin, or
            workflows that slow your team down, we&apos;ll find them. If we
            don&apos;t, the audit is on us.
          </p>
          <a
            href="https://calendly.com/shanegoldberg/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-saabai-teal text-saabai-bg px-9 py-[14px] rounded-xl font-semibold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_30px_var(--saabai-glow-mid)]"
          >
            Book Your Free Strategy Call
          </a>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-3xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-teal uppercase text-center mb-5">
          Pricing &amp; Engagement FAQ
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-16 max-w-2xl mx-auto leading-snug">
          Questions about pricing and engagement models, answered directly.
        </h2>

        <div
          className="flex flex-col divide-y divide-saabai-border border border-saabai-border rounded-2xl overflow-hidden"
          style={{
            boxShadow: "0 0 60px rgba(98,197,209,0.25), 0 0 24px rgba(98,197,209,0.15)",
          }}
        >
          {faqs.map(({ q, a }) => (
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

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
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
          Not Sure Where to Start?
        </p>
        <h2 className="relative text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.02em] mb-7 max-w-2xl mx-auto leading-[1.08]">
          Book a free call,
          <br />
          <span className="text-gradient">we&apos;ll figure it out together.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          A 30-minute conversation is all it takes to map your firm&apos;s
          current bottlenecks and recommend the right engagement tier. No
          pitch, no invoice, no follow-up pressure.
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
