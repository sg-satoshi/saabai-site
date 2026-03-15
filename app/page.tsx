import Image from "next/image";

export default function Home() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 border-b border-saabai-border"
        style={{ background: "var(--saabai-nav)", backdropFilter: "blur(16px)" }}
      >
        <Image
          src="/brand/saabai-logo.png"
          alt="Saabai.ai"
          width={212}
          height={56}
          priority
        />
        <a
          href="mailto:hello@saabai.ai?subject=AI Audit Enquiry"
          className="text-base font-semibold bg-saabai-teal text-saabai-bg px-5 py-2.5 rounded-lg hover:bg-saabai-teal-bright transition-colors tracking-wide"
        >
          Book an AI Audit
        </a>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-52 pb-36 px-6 text-center max-w-5xl mx-auto overflow-hidden">

        {/* Layered glow — wide ambient + tight focal */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 90% 60% at 50% 30%, var(--saabai-glow-mid) 0%, transparent 65%)"
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 40% 30% at 50% 20%, var(--saabai-glow) 0%, transparent 70%)"
        }} />

        {/* Eyebrow */}
        <div className="relative inline-flex items-center gap-2.5 mb-10">
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
          <p className="text-xs font-medium tracking-[0.2em] text-saabai-text-dim uppercase">
            AI Systems · Workflow Automation · Intelligent Infrastructure
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        {/* Headline */}
        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          Your firm runs on expertise.
          <br />
          <span className="text-gradient">Not admin.</span>
        </h1>

        {/* Sub-headline */}
        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-xl mx-auto mb-14 leading-relaxed">
          Saabai builds AI systems that remove operational drag, automate
          repetitive workflows, and give principals their time back — without
          increasing headcount.
        </p>

        {/* CTAs */}
        <div className="relative flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="mailto:hello@saabai.ai?subject=AI Audit Enquiry"
            className="bg-saabai-teal text-saabai-bg px-9 py-[14px] rounded-xl font-semibold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide"
          >
            Book a Free AI Audit
          </a>
          <a
            href="#how-it-works"
            className="border border-saabai-border px-9 py-[14px] rounded-xl font-medium text-base text-saabai-text-muted hover:border-saabai-teal/50 hover:text-saabai-text transition-colors"
          >
            See How It Works
          </a>
        </div>

        {/* Decorative bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{
          background: "linear-gradient(to bottom, transparent, var(--saabai-bg))"
        }} />
      </section>

      {/* ── Industry bar ────────────────────────────────────────────────── */}
      <div
        className="relative border-y border-saabai-border py-[18px] overflow-hidden"
        style={{
          background: "linear-gradient(90deg, var(--saabai-bg), var(--saabai-surface) 50%, var(--saabai-bg))"
        }}
      >
        {/* Edge fade masks */}
        <div className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none z-10" style={{
          background: "linear-gradient(to right, var(--saabai-bg), transparent)"
        }} />
        <div className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none z-10" style={{
          background: "linear-gradient(to left, var(--saabai-bg), transparent)"
        }} />
        <div className="flex items-center justify-center flex-wrap gap-x-9 gap-y-3 px-12 text-[11px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase">
          {["Law Firms", "Real Estate Agencies", "Accounting Firms", "Financial Advisory", "Professional Services", "Advisory Businesses"].map((name, i, arr) => (
            <span key={name} className="flex items-center gap-9">
              {name}
              {i < arr.length - 1 && <span className="text-saabai-border">·</span>}
            </span>
          ))}
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          The Cost of Manual Operations
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-20 max-w-2xl mx-auto leading-snug">
          Your team is doing work that should be automated.
        </h2>

        <div className="grid md:grid-cols-3 gap-px bg-saabai-border rounded-xl overflow-hidden">
          {[
            {
              stat: "20–30 hrs",
              label: "Lost per week",
              detail: "The average professional firm loses 20–30 hours a week to manual admin, data entry, and chasing tasks.",
            },
            {
              stat: "40%",
              label: "Enquiries missed",
              detail: "Slow follow-up costs firms up to 40% of inbound leads. Automated response systems close that gap within minutes.",
            },
            {
              stat: "60%",
              label: "Non-billable time",
              detail: "Fee earners in service firms spend up to 60% of their time on work that generates no revenue.",
            },
          ].map(({ stat, label, detail }) => (
            <div key={label} className="bg-saabai-surface p-12 relative group">
              {/* Per-card teal accent line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
              <div className="text-5xl md:text-6xl font-semibold tracking-tight text-saabai-teal stat-glow mb-2">
                {stat}
              </div>
              <div className="text-[11px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-5">
                {label}
              </div>
              <p className="text-base text-saabai-text-muted leading-relaxed">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Services ────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto" id="services">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          Services
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-20 max-w-2xl mx-auto leading-snug">
          How Saabai builds your operational advantage.
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-saabai-border rounded-xl overflow-hidden">
          {[
            {
              tag: "Start here",
              title: "AI Audit",
              body: "We map your entire operation, identify the highest-value automation opportunities, and deliver a prioritised implementation roadmap with projected ROI.",
              featured: true,
            },
            {
              tag: null,
              title: "AI Agents",
              body: "Custom AI agents that handle client intake, follow-up, scheduling, internal queries, and 24/7 front-of-house — without adding headcount.",
              featured: false,
            },
            {
              tag: null,
              title: "Workflow Automation",
              body: "Connect your CRM, email, documents, calendars, and internal systems into a single intelligent pipeline that runs without manual intervention.",
              featured: false,
            },
            {
              tag: null,
              title: "Systems Architecture",
              body: "End-to-end AI infrastructure designed for your business model — scalable, secure, and built to handle volume growth without friction.",
              featured: false,
            },
            {
              tag: null,
              title: "Ongoing Optimisation",
              body: "Monthly review cycles, performance monitoring, and continuous improvements to keep your systems compounding in efficiency over time.",
              featured: false,
            },
          ].map(({ tag, title, body, featured }) => (
            <div
              key={title}
              className={`relative p-12 transition-colors ${featured ? "bg-saabai-surface-raised" : "bg-saabai-surface hover:bg-saabai-surface-raised"}`}
            >
              {/* Top accent line */}
              <div className={`absolute top-0 left-0 right-0 h-px ${featured
                ? "bg-gradient-to-r from-transparent via-saabai-teal/60 to-transparent"
                : "bg-gradient-to-r from-transparent via-saabai-border to-transparent"
              }`} />

              {tag && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] text-saabai-bg bg-saabai-teal px-3 py-1 rounded-full uppercase mb-6">
                  <span className="w-1 h-1 rounded-full bg-saabai-bg/60 inline-block" />
                  {tag}
                </span>
              )}
              <h3 className="text-lg font-semibold mb-3 tracking-tight">{title}</h3>
              <p className="text-base text-saabai-text-muted leading-relaxed">{body}</p>
            </div>
          ))}

          {/* Filler cell */}
          <div className="bg-saabai-surface p-12 flex flex-col items-start justify-between gap-8">
            <p className="text-base text-saabai-text-dim leading-relaxed">
              Not sure where to start? An AI Audit maps every opportunity in your operation.
            </p>
            <a
              href="mailto:hello@saabai.ai?subject=AI Audit Enquiry"
              className="text-base font-semibold text-saabai-teal hover:text-saabai-teal-bright transition-colors flex items-center gap-2 group"
            >
              Book a free audit
              <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Industries ──────────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          Who We Work With
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-20 max-w-2xl mx-auto leading-snug">
          Built for firms that run on expertise.
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-saabai-border rounded-xl overflow-hidden">
          {[
            { industry: "Law Firms", use: "Client intake, matter tracking, document drafting, billing automation" },
            { industry: "Real Estate Agencies", use: "Lead qualification, listing follow-up, inspection scheduling, appraisal workflows" },
            { industry: "Accounting Firms", use: "Client onboarding, data collection, deadline reminders, report generation" },
            { industry: "Financial Advisory", use: "Compliance documentation, client communications, review scheduling, reporting" },
            { industry: "Professional Services", use: "Proposal generation, project tracking, invoicing, client status updates" },
            { industry: "Advisory Businesses", use: "Discovery workflows, knowledge bases, recurring deliverables, client portals" },
          ].map(({ industry, use }) => (
            <div key={industry} className="bg-saabai-surface p-10 hover:bg-saabai-surface-raised transition-colors group relative overflow-hidden">
              {/* Left accent reveal on hover */}
              <div className="absolute left-0 top-6 bottom-6 w-px bg-saabai-teal/0 group-hover:bg-saabai-teal/50 transition-colors" />
              <h3 className="text-base font-semibold mb-2.5 tracking-tight">{industry}</h3>
              <p className="text-base text-saabai-text-muted leading-relaxed">{use}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section
        className="py-32 px-6 max-w-4xl mx-auto border-t border-saabai-border"
        id="how-it-works"
      >
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          Process
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-24 max-w-2xl mx-auto leading-snug">
          From audit to operating advantage — in weeks.
        </h2>

        <div className="grid md:grid-cols-3 gap-12 md:gap-16">
          {[
            {
              step: "01",
              title: "AI Audit",
              body: "We spend 90 minutes mapping your workflows, tools, and bottlenecks. You receive a written report detailing exactly where automation will generate the highest return.",
            },
            {
              step: "02",
              title: "Design",
              body: "We build a custom automation architecture for your firm — specific to your systems, team size, and commercial priorities. No generic templates.",
            },
            {
              step: "03",
              title: "Build & Optimise",
              body: "We implement, test, and refine each system. Post-launch, we monitor performance and iterate monthly to compound the gains over time.",
            },
          ].map(({ step, title, body }) => (
            <div key={step} className="relative">
              {/* Large decorative step number */}
              <div
                className="text-[80px] font-bold leading-none tracking-tight mb-6 select-none"
                style={{ color: "var(--saabai-glow-mid)" }}
              >
                {step}
              </div>
              {/* Teal accent line */}
              <div className="w-8 h-px bg-saabai-teal/50 mb-6" />
              <h3 className="text-lg font-semibold mb-3 tracking-tight">{title}</h3>
              <p className="text-base text-saabai-text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative py-40 px-6 text-center border-t border-saabai-border overflow-hidden">
        {/* Multi-layer glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 70% at 50% 50%, var(--saabai-glow-strong) 0%, transparent 65%)"
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 40% 40% at 50% 45%, var(--saabai-glow-mid) 0%, transparent 60%)"
        }} />

        {/* Top accent line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-saabai-teal/50 to-transparent" />

        <p className="relative text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-8">
          Get Started
        </p>
        <h2 className="relative text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.02em] mb-7 max-w-2xl mx-auto leading-[1.08]">
          Discover what your<br />
          <span className="text-gradient">firm could recover.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Book a free AI Audit. We&apos;ll identify your highest-value automation
          opportunities and show you the numbers.
        </p>
        <a
          href="mailto:hello@saabai.ai?subject=AI Audit Enquiry"
          className="relative inline-block bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
        >
          Book a Free AI Audit
        </a>
        <p className="relative text-saabai-text-dim text-xs mt-7 tracking-wide">
          No obligation. No jargon. Just a clear picture of what&apos;s possible.
        </p>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-saabai-border py-10 px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Image
          src="/brand/saabai-logo.png"
          alt="Saabai.ai"
          width={100}
          height={28}
        />
        <p className="text-xs text-saabai-text-dim tracking-wide">
          © {new Date().getFullYear()} Saabai.ai. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
