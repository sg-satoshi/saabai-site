import Image from "next/image";

const services = [
  {
    title: "AI Sales & Lead Qualification",
    description:
      "Automatically qualify leads, follow up with prospects, and book meetings without manual outreach.",
    benefits: [
      "AI lead qualification",
      "Automated follow-ups",
      "CRM integration",
      "Meeting booking automation",
    ],
  },
  {
    title: "AI Customer Support Systems",
    description:
      "Deploy AI-powered support systems that answer common questions instantly and reduce support workload.",
    benefits: [
      "24/7 automated responses",
      "Knowledge base integration",
      "Faster response times",
      "Reduced support costs",
    ],
  },
  {
    title: "Business Process Automation",
    description:
      "Remove repetitive administrative tasks by automating workflows across your tools and systems.",
    benefits: [
      "Reporting automation",
      "Data syncing across platforms",
      "Automated task routing",
      "Workflow optimisation",
    ],
  },
  {
    title: "AI Lead Generation Systems",
    description:
      "Generate and qualify new business opportunities automatically using AI-powered prospecting systems.",
    benefits: [
      "Targeted lead discovery",
      "Automated outreach",
      "CRM pipeline automation",
      "Lead enrichment",
    ],
  },
];

const steps = [
  {
    step: "01",
    title: "AI Efficiency Audit",
    body: "We analyse your current operations to identify where automation can create the biggest impact.",
  },
  {
    step: "02",
    title: "Automation System Design",
    body: "We design custom AI workflows tailored to your business processes.",
  },
  {
    step: "03",
    title: "AI Agent Deployment",
    body: "Your automation systems are implemented and integrated into your existing tools.",
  },
  {
    step: "04",
    title: "Continuous Optimisation",
    body: "We refine and improve your systems to maximise efficiency and performance.",
  },
];

const results = [
  {
    stat: "500+ hrs",
    label: "Saved annually",
    detail: "Businesses typically recover hundreds of hours each year by automating repetitive admin, outreach, and reporting tasks.",
  },
  {
    stat: "3×",
    label: "Faster response times",
    detail: "AI agents respond to leads and customers instantly — day or night — without increasing headcount.",
  },
  {
    stat: "40%",
    label: "Reduction in operational costs",
    detail: "Automating manual workflows reduces the cost of delivery, support, and administration across the business.",
  },
  {
    stat: "∞",
    label: "Scalable without friction",
    detail: "AI systems handle volume growth without the overhead of hiring, training, or managing additional staff.",
  },
];

export default function Services() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 border-b border-saabai-border"
        style={{ background: "var(--saabai-nav)", backdropFilter: "blur(16px)" }}
      >
        <a href="/">
          <Image
            src="/brand/saabai-logo.png"
            alt="Saabai.ai"
            width={212}
            height={56}
            priority
          />
        </a>
        <a
          href="https://calendly.com/shanegoldberg/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="text-base font-semibold bg-saabai-teal text-saabai-bg px-5 py-2.5 rounded-lg hover:bg-saabai-teal-bright transition-colors tracking-wide"
        >
          Book an AI Automation Strategy Call
        </a>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-52 pb-36 px-6 text-center max-w-5xl mx-auto overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 90% 60% at 50% 30%, var(--saabai-glow-mid) 0%, transparent 65%)"
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 40% 30% at 50% 20%, var(--saabai-glow) 0%, transparent 70%)"
        }} />

        <div className="relative inline-flex items-center gap-2.5 mb-10">
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
          <p className="text-xs font-medium tracking-[0.2em] text-saabai-text-dim uppercase">
            AI Automation · Intelligent Workflows · Business Efficiency
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          AI Automation
          <br />
          <span className="text-gradient">Services.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-6 leading-relaxed">
          We design and deploy intelligent automation systems that remove
          repetitive work, increase operational efficiency, and unlock new
          growth opportunities for businesses.
        </p>
        <p className="relative text-base text-saabai-text-dim max-w-xl mx-auto mb-14 leading-relaxed">
          From AI sales agents to fully automated workflows, Saabai builds
          practical automation systems that deliver measurable business outcomes.
        </p>

        <div className="relative">
          <a
            href="https://calendly.com/shanegoldberg/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-saabai-teal text-saabai-bg px-9 py-[14px] rounded-xl font-semibold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide"
          >
            Book an AI Automation Strategy Call
          </a>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{
          background: "linear-gradient(to bottom, transparent, var(--saabai-bg))"
        }} />
      </section>

      {/* ── What We Help Automate ────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          What We Help Businesses Automate
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-6 max-w-2xl mx-auto leading-snug">
          Stop doing manually what AI can do automatically.
        </h2>
        <p className="text-base text-saabai-text-muted text-center max-w-2xl mx-auto mb-20 leading-relaxed">
          Most companies are overwhelmed by repetitive tasks that slow growth
          and waste valuable time. Saabai identifies these bottlenecks and
          replaces them with intelligent automation.
        </p>

        <div className="grid md:grid-cols-2 gap-px bg-saabai-border rounded-xl overflow-hidden">
          {services.map(({ title, description, benefits }) => (
            <div
              key={title}
              className="bg-saabai-surface p-12 hover:bg-saabai-surface-raised transition-colors relative group"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-border to-transparent group-hover:via-saabai-teal/30 transition-all" />
              <h3 className="text-xl font-semibold mb-3 tracking-tight">{title}</h3>
              <p className="text-base text-saabai-text-muted leading-relaxed mb-8">
                {description}
              </p>
              <ul className="flex flex-col gap-2.5">
                {benefits.map((b) => (
                  <li key={b} className="flex items-center gap-3 text-sm text-saabai-text-muted">
                    <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          How Our Automation Process Works
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-24 max-w-2xl mx-auto leading-snug">
          From bottleneck to automated — in weeks.
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-saabai-border rounded-xl overflow-hidden">
          {steps.map(({ step, title, body }) => (
            <div key={step} className="bg-saabai-surface p-10 relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-border to-transparent" />
              <div
                className="text-[72px] font-bold leading-none tracking-tight mb-6 select-none"
                style={{ color: "var(--saabai-glow-mid)" }}
              >
                {step}
              </div>
              <div className="w-8 h-px bg-saabai-teal/50 mb-5" />
              <h3 className="text-base font-semibold mb-3 tracking-tight">{title}</h3>
              <p className="text-sm text-saabai-text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Results ─────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          Results Businesses Typically See
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-20 max-w-2xl mx-auto leading-snug">
          Measurable outcomes, not just efficiency gains.
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-saabai-border rounded-xl overflow-hidden">
          {results.map(({ stat, label, detail }) => (
            <div key={label} className="bg-saabai-surface p-10 relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
              <div className="text-5xl font-semibold tracking-tight text-saabai-teal stat-glow mb-2">
                {stat}
              </div>
              <div className="text-[11px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-5">
                {label}
              </div>
              <p className="text-sm text-saabai-text-muted leading-relaxed">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="relative py-40 px-6 text-center border-t border-saabai-border overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 70% at 50% 50%, var(--saabai-glow-strong) 0%, transparent 65%)"
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 40% 40% at 50% 45%, var(--saabai-glow-mid) 0%, transparent 60%)"
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-saabai-teal/50 to-transparent" />

        <p className="relative text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-8">
          Get Started
        </p>
        <h2 className="relative text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.02em] mb-7 max-w-2xl mx-auto leading-[1.08]">
          Ready to automate<br />
          <span className="text-gradient">your business?</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Discover where AI automation can save time, reduce costs, and unlock
          new growth opportunities in your business.
        </p>

        <a
          href="https://calendly.com/shanegoldberg/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-block bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
        >
          Book an AI Automation Strategy Call
        </a>

        <ul className="relative mt-8 mb-4 flex flex-col items-start gap-3 text-left mx-auto w-fit">
          {[
            "Identify repetitive work that can be automated",
            "Discover where AI agents can save time and money",
            "Walk away with practical next steps",
          ].map((point) => (
            <li key={point} className="flex items-center gap-3 text-saabai-text-muted text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal shrink-0" />
              {point}
            </li>
          ))}
        </ul>

        <p className="relative text-saabai-text-dim text-xs mt-4 tracking-wide">
          No obligation. No jargon. Just a clear picture of what&apos;s possible.
        </p>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-saabai-border py-10 px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <a href="/">
          <Image
            src="/brand/saabai-logo.png"
            alt="Saabai.ai"
            width={100}
            height={28}
          />
        </a>
        <p className="text-xs text-saabai-text-dim tracking-wide">
          © {new Date().getFullYear()} Saabai.ai. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
