import Image from "next/image";

export default function Home() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 border-b border-saabai-border"
        style={{ background: "var(--saabai-nav)", backdropFilter: "blur(12px)" }}
      >
        <Image
          src="/brand/saabai-logo.png"
          alt="Saabai.ai"
          width={130}
          height={34}
          priority
        />
        <a
          href="mailto:hello@saabai.ai?subject=AI Audit Enquiry"
          className="text-sm font-medium bg-saabai-teal text-saabai-bg px-5 py-2.5 rounded-lg hover:bg-saabai-teal-bright transition-colors"
        >
          Book an AI Audit
        </a>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-28 px-6 text-center max-w-4xl mx-auto overflow-hidden">
        {/* Subtle glow behind hero text */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 40%, var(--saabai-glow) 0%, transparent 70%)",
          }}
        />
        <p className="relative text-xs font-medium tracking-widest text-saabai-text-dim uppercase mb-8">
          AI Systems · Workflow Automation · Intelligent Infrastructure
        </p>
        <h1 className="relative text-5xl md:text-7xl font-semibold tracking-tight leading-[1.08] mb-8">
          Your firm runs on expertise.
          <br />
          <span className="text-saabai-text-muted">Not admin.</span>
        </h1>
        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-12 leading-relaxed">
          Saabai builds AI systems that remove operational drag, automate
          repetitive workflows, and give principals their time back — without
          increasing headcount.
        </p>
        <div className="relative flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="mailto:hello@saabai.ai?subject=AI Audit Enquiry"
            className="bg-saabai-teal text-saabai-bg px-8 py-4 rounded-lg font-semibold text-sm hover:bg-saabai-teal-bright transition-colors"
          >
            Book a Free AI Audit
          </a>
          <a
            href="#how-it-works"
            className="border border-saabai-border px-8 py-4 rounded-lg font-medium text-sm text-saabai-text-muted hover:border-saabai-teal/40 hover:text-saabai-text transition-colors"
          >
            See How It Works
          </a>
        </div>
      </section>

      {/* Industry bar */}
      <div className="border-y border-saabai-border py-5 overflow-hidden">
        <div className="flex items-center justify-center flex-wrap gap-x-10 gap-y-3 px-8 text-xs font-medium tracking-widest text-saabai-text-dim uppercase">
          <span>Law Firms</span>
          <span className="opacity-30">·</span>
          <span>Real Estate Agencies</span>
          <span className="opacity-30">·</span>
          <span>Accounting Firms</span>
          <span className="opacity-30">·</span>
          <span>Financial Advisory</span>
          <span className="opacity-30">·</span>
          <span>Professional Services</span>
          <span className="opacity-30">·</span>
          <span>Advisory Businesses</span>
        </div>
      </div>

      {/* Problem — stats */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <p className="text-xs font-medium tracking-widest text-saabai-text-dim uppercase text-center mb-4">
          The Cost of Manual Operations
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-16">
          Your team is doing work that should be automated.
        </h2>
        <div className="grid md:grid-cols-3 gap-px bg-saabai-border">
          {[
            {
              stat: "20–30 hrs",
              label: "Lost per week",
              detail:
                "The average professional firm loses 20–30 hours a week to manual admin, data entry, and chasing tasks.",
            },
            {
              stat: "40%",
              label: "Enquiries missed",
              detail:
                "Slow follow-up costs firms up to 40% of inbound leads. Automated response systems close that gap within minutes.",
            },
            {
              stat: "60%",
              label: "Non-billable time",
              detail:
                "Fee earners in service firms spend up to 60% of their time on work that generates no revenue.",
            },
          ].map(({ stat, label, detail }) => (
            <div key={label} className="bg-saabai-bg p-10">
              <div className="text-4xl md:text-5xl font-semibold tracking-tight text-saabai-teal mb-2">
                {stat}
              </div>
              <div className="text-xs font-medium tracking-widest text-saabai-text-dim uppercase mb-4">
                {label}
              </div>
              <p className="text-sm text-saabai-text-muted leading-relaxed">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="py-24 px-6 max-w-5xl mx-auto" id="services">
        <p className="text-xs font-medium tracking-widest text-saabai-text-dim uppercase text-center mb-4">
          Services
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-16">
          How Saabai builds your operational advantage.
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-saabai-border">
          {[
            {
              tag: "Start here",
              title: "AI Audit",
              body: "We map your entire operation, identify the highest-value automation opportunities, and deliver a prioritised implementation roadmap with projected ROI.",
            },
            {
              tag: null,
              title: "AI Agents",
              body: "Custom AI agents that handle client intake, follow-up, scheduling, internal queries, and 24/7 front-of-house — without adding headcount.",
            },
            {
              tag: null,
              title: "Workflow Automation",
              body: "Connect your CRM, email, documents, calendars, and internal systems into a single intelligent pipeline that runs without manual intervention.",
            },
            {
              tag: null,
              title: "Systems Architecture",
              body: "End-to-end AI infrastructure designed for your business model — scalable, secure, and built to handle volume growth without friction.",
            },
            {
              tag: null,
              title: "Ongoing Optimisation",
              body: "Monthly review cycles, performance monitoring, and continuous improvements to keep your systems compounding in efficiency over time.",
            },
          ].map(({ tag, title, body }) => (
            <div key={title} className="bg-saabai-surface p-10 relative hover:bg-saabai-surface-raised transition-colors">
              {tag && (
                <span className="inline-block text-xs font-semibold tracking-widest text-saabai-bg bg-saabai-teal px-3 py-1 rounded-full uppercase mb-5">
                  {tag}
                </span>
              )}
              <h3 className="text-lg font-semibold mb-3">{title}</h3>
              <p className="text-sm text-saabai-text-muted leading-relaxed">{body}</p>
            </div>
          ))}
          {/* Filler cell */}
          <div className="bg-saabai-surface p-10 flex items-center justify-center">
            <a
              href="mailto:hello@saabai.ai?subject=AI Audit Enquiry"
              className="text-sm font-medium text-saabai-teal/60 hover:text-saabai-teal transition-colors underline underline-offset-4"
            >
              Book a free audit →
            </a>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-xs font-medium tracking-widest text-saabai-text-dim uppercase text-center mb-4">
          Who We Work With
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-16">
          Built for firms that run on expertise.
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-saabai-border">
          {[
            {
              industry: "Law Firms",
              use: "Client intake, matter tracking, document drafting, billing automation",
            },
            {
              industry: "Real Estate Agencies",
              use: "Lead qualification, listing follow-up, inspection scheduling, appraisal workflows",
            },
            {
              industry: "Accounting Firms",
              use: "Client onboarding, data collection, deadline reminders, report generation",
            },
            {
              industry: "Financial Advisory",
              use: "Compliance documentation, client communications, review scheduling, reporting",
            },
            {
              industry: "Professional Services",
              use: "Proposal generation, project tracking, invoicing, client status updates",
            },
            {
              industry: "Advisory Businesses",
              use: "Discovery workflows, knowledge bases, recurring deliverables, client portals",
            },
          ].map(({ industry, use }) => (
            <div key={industry} className="bg-saabai-surface p-8 hover:bg-saabai-surface-raised transition-colors">
              <h3 className="text-base font-semibold mb-2">{industry}</h3>
              <p className="text-sm text-saabai-text-muted leading-relaxed">{use}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section
        className="py-24 px-6 max-w-4xl mx-auto border-t border-saabai-border"
        id="how-it-works"
      >
        <p className="text-xs font-medium tracking-widest text-saabai-text-dim uppercase text-center mb-4">
          Process
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-20">
          From audit to operating advantage — in weeks.
        </h2>
        <div className="grid md:grid-cols-3 gap-12">
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
            <div key={step}>
              <div className="text-xs font-medium tracking-widest text-saabai-teal/40 mb-5">
                {step}
              </div>
              <h3 className="text-lg font-semibold mb-3">{title}</h3>
              <p className="text-sm text-saabai-text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-28 px-6 text-center border-t border-saabai-border overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 50% 50%, var(--saabai-glow) 0%, transparent 70%)",
          }}
        />
        <p className="relative text-xs font-medium tracking-widest text-saabai-text-dim uppercase mb-6">
          Get Started
        </p>
        <h2 className="relative text-3xl md:text-5xl font-semibold tracking-tight mb-6 max-w-2xl mx-auto">
          Discover what your firm could recover.
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-12 max-w-xl mx-auto">
          Book a free AI Audit. We&apos;ll identify your highest-value automation
          opportunities and show you the numbers.
        </p>
        <a
          href="mailto:hello@saabai.ai?subject=AI Audit Enquiry"
          className="relative inline-block bg-saabai-teal text-saabai-bg px-10 py-4 rounded-lg font-semibold text-sm hover:bg-saabai-teal-bright transition-colors"
        >
          Book a Free AI Audit
        </a>
        <p className="relative text-saabai-text-dim text-xs mt-6 tracking-wide">
          No obligation. No jargon. Just a clear picture of what&apos;s possible.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-saabai-border py-10 px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Image
          src="/brand/saabai-logo.png"
          alt="Saabai.ai"
          width={100}
          height={28}
          className="opacity-40"
        />
        <p className="text-xs text-saabai-text-dim">
          © {new Date().getFullYear()} Saabai.ai. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
