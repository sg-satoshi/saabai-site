import type { Metadata } from "next";
import Nav from "./components/Nav";
import CalculatorSection from "./components/CalculatorSection";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "AI Automation for Professional Firms Australia | Saabai",
  description:
    "Saabai builds AI systems that recover 20+ hours/week for law firms, accounting practices & professional firms across Australia. Free 30-min strategy call — no obligation.",
  alternates: { canonical: "https://www.saabai.ai" },
  openGraph: {
    url: "https://www.saabai.ai",
    title: "AI Automation for Professional Firms Australia | Saabai",
    description:
      "Saabai builds AI systems that recover 20+ hours/week for law firms, accounting practices & professional firms across Australia. Free 30-min strategy call.",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Saabai",
  url: "https://www.saabai.ai",
  logo: "https://www.saabai.ai/brand/saabai-logo.png",
  description:
    "AI automation systems for professional service firms — law firms, accounting practices, real estate agencies, and financial advisers across Australia.",
  founder: {
    "@type": "Person",
    name: "Shane Goldberg",
  },
  areaServed: {
    "@type": "Country",
    name: "Australia",
  },
  serviceType: "AI Automation",
  sameAs: ["https://saabai.ai"],
};

export default function Home() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      <Nav />

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
            AI Automation for Professional Firms · Australia
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
          We build AI systems that recover 20+ hours a week for professional
          firms — without adding staff or changing how your team works.
        </p>

        {/* CTAs */}
        <div className="relative flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://calendly.com/shanegoldberg/30min" target="_blank" rel="noopener noreferrer"
            className="bg-saabai-teal text-saabai-bg px-9 py-[14px] rounded-xl font-semibold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide"
          >
            Book Your Free Strategy Call
          </a>
          <a
            href="#how-it-works"
            className="border border-saabai-border px-9 py-[14px] rounded-xl font-medium text-base text-saabai-text-muted hover:border-saabai-teal/50 hover:text-saabai-text transition-colors"
          >
            See How It Works
          </a>
        </div>

        {/* Reassurance micro-line */}
        <p className="relative text-xs text-saabai-text-dim tracking-wide mt-8">
          Free 30-minute call. No commitment. No jargon. Clear picture of what&apos;s possible.
        </p>

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
        <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-3 px-4 sm:px-12 text-[11px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase">
          {["Law Firms", "Real Estate Agencies", "Accounting Firms", "Financial Advisory", "Professional Services", "Trade & E-commerce"].map((name, i, arr) => (
            <span key={name} className="whitespace-nowrap">
              {name}{i < arr.length - 1 && <span className="text-saabai-border mx-2.5">·</span>}
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

        <div className="grid md:grid-cols-3 gap-px bg-saabai-border rounded-xl overflow-hidden" style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)" }}>
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-saabai-border rounded-xl overflow-hidden" style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)" }}>
          {[
            {
              tag: "Start here",
              title: "AI Audit",
              body: "We map your entire operation, identify the highest-value automation opportunities, and deliver a prioritised implementation roadmap with projected ROI.",
              featured: true,
            },
            {
              tag: null,
              title: "AI Chat Agents",
              body: "Custom AI agents embedded on your website — handling enquiries, quotes, lead qualification, and client support 24/7. Currently live across specialist law firms, trade businesses, and professional services.",
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
              <p className="text-base text-saabai-text-muted leading-relaxed mb-5">{body}</p>
              {tag === "Start here" && (
                <a
                  href="https://calendly.com/shanegoldberg/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-saabai-teal hover:text-saabai-teal-bright transition-colors flex items-center gap-1.5 group"
                >
                  Book an AI Audit
                  <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
                </a>
              )}
            </div>
          ))}

          {/* Filler cell */}
          <div className="bg-saabai-surface p-12 flex flex-col items-start justify-between gap-8">
            <p className="text-base text-saabai-text-dim leading-relaxed">
              Most firms start with an AI Audit — a 90-minute session that identifies exactly where time and money are being lost, with a written roadmap of what to fix first.
            </p>
            <a
              href="https://calendly.com/shanegoldberg/30min" target="_blank" rel="noopener noreferrer"
              className="text-base font-semibold text-saabai-teal hover:text-saabai-teal-bright transition-colors flex items-center gap-2 group"
            >
              Book a strategy call
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-saabai-border rounded-xl overflow-hidden" style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)" }}>
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

        {/* CTA below process steps */}
        <div className="mt-16 text-center">
          <a
            href="https://calendly.com/shanegoldberg/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-saabai-teal hover:text-saabai-teal-bright transition-colors group"
          >
            Ready to start? Book your AI Audit
            <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
          </a>
        </div>
      </section>

      {/* ── Before / After ──────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          What Changes
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-6 max-w-2xl mx-auto leading-snug">
          What automation actually looks like in practice.
        </h2>
        <p className="text-base text-saabai-text-muted text-center max-w-xl mx-auto mb-20 leading-relaxed">
          Not theory. Specific workflows — before and after a well-built system is in place.
        </p>

        <div className="flex flex-col gap-px bg-saabai-border rounded-xl overflow-hidden" style={{ boxShadow: "0 0 80px rgba(98,197,209,0.35), 0 0 32px rgba(98,197,209,0.18)" }}>
          {[
            {
              scenario: "New client enquiry — after hours",
              before: "Partner checks emails at 8am. Client enquiry from the night before. Sends a manual reply, attaches intake form, waits for it back.",
              after: "Enquiry triggers automated response within 2 minutes. Client receives personalised acknowledgement, structured intake form, and calendar link. Partner opens their inbox to a completed intake and a booked appointment.",
              recovered: "2–3 hrs/week",
            },
            {
              scenario: "Matter status updates — law firm",
              before: "Fee earner drafts individual status update emails each week. Checks matter notes, writes update, sends to each client. Repeated across 20+ active matters.",
              after: "Status updates generated automatically from practice management data and sent on schedule. Fee earner reviews exceptions only.",
              recovered: "4–6 hrs/week",
            },
            {
              scenario: "Document chasing — accounting firm",
              before: "Admin staff manually follow up clients for missing documents by phone and email. Chasing continues until lodgement deadline. Partner escalates the stragglers.",
              after: "Automated sequence sends reminders at set intervals, escalating in tone. Exceptions flagged to admin only when the sequence fails to get a response.",
              recovered: "5–8 hrs/week",
            },
            {
              scenario: "Annual review scheduling — financial advisory",
              before: "Practice coordinator emails clients individually to schedule annual reviews. Back-and-forth to find a time. Pre-meeting data collected manually.",
              after: "Review invitations sent automatically at the right intervals. Clients self-schedule via calendar link. Pre-meeting questionnaire collected and summarised before the appointment.",
              recovered: "3–5 hrs/week",
            },
          ].map(({ scenario, before, after, recovered }) => (
            <div key={scenario} className="bg-saabai-surface p-10 md:p-12 group hover:bg-saabai-surface-raised transition-colors relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-border to-transparent" />
              <div className="flex flex-col md:flex-row md:items-start gap-10">
                {/* Label */}
                <div className="md:w-48 shrink-0">
                  <p className="text-[11px] font-medium tracking-[0.15em] text-saabai-text-dim uppercase mb-2">Scenario</p>
                  <p className="text-sm font-semibold text-saabai-text leading-snug">{scenario}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] text-saabai-teal uppercase">
                    <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
                    {recovered} recovered
                  </div>
                </div>

                {/* Before / After */}
                <div className="flex-1 grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-saabai-text-dim uppercase mb-3">Before</p>
                    <p className="text-sm text-saabai-text-muted leading-relaxed">{before}</p>
                  </div>
                  <div className="relative">
                    <div className="hidden md:block absolute -left-3 top-0 bottom-0 w-px bg-saabai-teal/20" />
                    <p className="text-[10px] font-bold tracking-[0.2em] text-saabai-teal uppercase mb-3">After</p>
                    <p className="text-sm text-saabai-text-muted leading-relaxed">{after}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href="https://calendly.com/shanegoldberg/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-saabai-teal hover:text-saabai-teal-bright transition-colors group"
          >
            See what this could look like for your firm
            <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
          </a>
        </div>
      </section>

      {/* ── Live Deployments ────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          Live in Production
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-6 max-w-2xl mx-auto leading-snug">
          Already working. Right now.
        </h2>
        <p className="text-base text-saabai-text-muted text-center max-w-xl mx-auto mb-20 leading-relaxed">
          Not demos. Not pilots. Production systems handling real enquiries, quotes, and clients — every day.
        </p>

        <div className="grid md:grid-cols-2 gap-px bg-saabai-border rounded-xl overflow-hidden" style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)" }}>

          <div className="bg-saabai-surface p-12 hover:bg-saabai-surface-raised transition-colors relative group">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
            <span className="inline-flex text-[10px] font-bold tracking-[0.18em] text-saabai-teal border border-saabai-teal/30 px-3 py-1 rounded-full uppercase mb-6">
              Trade &amp; E-commerce
            </span>
            <h3 className="text-xl font-semibold mb-1 tracking-tight mt-6">National Plastics Supplier</h3>
            <p className="text-sm text-saabai-text-dim mb-5">AI Agent: Rex</p>
            <p className="text-base text-saabai-text-muted leading-relaxed mb-6">
              Custom AI agent handling cut-to-size quotes across 100+ product variations, order status lookups, and product enquiries — 24 hours a day, without staff involvement. Qualified leads are automatically routed to CRM with full conversation context.
            </p>
            <ul className="flex flex-col gap-2.5">
              {["Instant pricing for 100+ material and size variations", "Lead capture + CRM pipeline automated", "24/7 product Q&A with zero staff overhead"].map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm text-saabai-text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-saabai-surface p-12 hover:bg-saabai-surface-raised transition-colors relative group">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
            <span className="inline-flex text-[10px] font-bold tracking-[0.18em] text-saabai-teal border border-saabai-teal/30 px-3 py-1 rounded-full uppercase mb-6">
              Specialist Law
            </span>
            <h3 className="text-xl font-semibold mb-1 tracking-tight mt-6">Tributum Law</h3>
            <p className="text-sm text-saabai-text-dim mb-5">AI Agent: Lex</p>
            <p className="text-base text-saabai-text-muted leading-relaxed mb-6">
              AI intake agent qualifying ATO dispute enquiries, tax structuring matters, and trust law questions around the clock. Collects client context, flags urgent deadlines, and routes qualified leads to the principal — so no enquiry slips through after hours.
            </p>
            <ul className="flex flex-col gap-2.5">
              {["24/7 intake across all tax and trust matter types", "Urgent ATO notices flagged and escalated immediately", "Qualified leads delivered with full conversation context"].map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm text-saabai-text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>

      {/* ── Social Proof / Results ──────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          What Clients Say
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-20 max-w-2xl mx-auto leading-snug">
          The firms that move fast win the time back first.
        </h2>

        <div className="grid md:grid-cols-2 gap-6">

          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-10 relative overflow-hidden" style={{ boxShadow: "0 0 60px rgba(98,197,209,0.3), 0 0 24px rgba(98,197,209,0.15)" }}>
            <div className="h-px absolute top-0 left-12 right-12 bg-gradient-to-r from-transparent via-saabai-teal/40 to-transparent" />
            <p className="text-lg text-saabai-text-muted leading-relaxed mb-8">
              &ldquo;Rex handles the quotes we used to miss — the Saturday afternoon ones, the after-midnight ones. Those enquiries used to go straight to a competitor. Now they get an answer within two minutes. We went live in three weeks and haven&apos;t looked back.&rdquo;
            </p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-saabai-teal/10 border border-saabai-teal/30 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-saabai-teal">NPS</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-saabai-text tracking-tight">National Plastics Supplier</p>
                <p className="text-xs text-saabai-text-dim mt-0.5">Trade &amp; E-commerce · AI Agent (Rex) · Live since 2025</p>
              </div>
            </div>
          </div>

          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-10 relative overflow-hidden" style={{ boxShadow: "0 0 60px rgba(98,197,209,0.3), 0 0 24px rgba(98,197,209,0.15)" }}>
            <div className="h-px absolute top-0 left-12 right-12 bg-gradient-to-r from-transparent via-saabai-teal/40 to-transparent" />
            <p className="text-lg text-saabai-text-muted leading-relaxed mb-8">
              &ldquo;The after-hours intake was the problem we&apos;d been putting off for years. ATO dispute clients don&apos;t wait until Monday morning. Lex qualifies the matter, captures the urgency, and flags it so nothing slips. It was live within weeks of the first conversation.&rdquo;
            </p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-saabai-teal/10 border border-saabai-teal/30 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-saabai-teal">TL</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-saabai-text tracking-tight">Tributum Law</p>
                <p className="text-xs text-saabai-text-dim mt-0.5">Specialist Tax &amp; Trust Law · AI Agent (Lex) · Live since 2025</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Industries ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-saabai-border">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">Built for your industry</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-4 leading-snug">
            Automation built around <span className="text-gradient">how you actually work</span>
          </h2>
          <p className="text-saabai-text-muted text-center max-w-2xl mx-auto mb-14 text-lg">
            Every professional services firm has the same problem — skilled people doing work a system should handle. The difference is where it hides.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                label: "Law Firms",
                href: "/for-law-firms",
                icon: "⚖️",
                headline: "Intake. Matter tracking. Document chasing.",
                detail: "Fee earners spending 20% of their week on admin that has nothing to do with practising law.",
                stat: "20+ hrs/week recovered",
              },
              {
                label: "Accounting Firms",
                href: "/for-accounting-firms",
                icon: "📊",
                headline: "Document collection. Deadline reminders. Reports.",
                detail: "Tax season coordination runs on email threads and manual chasing — until it doesn't have to.",
                stat: "12 hrs/week per staff",
              },
              {
                label: "Real Estate",
                href: "/for-real-estate",
                icon: "🏠",
                headline: "Enquiry response. Follow-up. Vendor reporting.",
                detail: "Every hour of delay on a new enquiry is a lead your competitor got to first.",
                stat: "90-second response time",
              },
            ].map(({ label, href, icon, headline, detail, stat }) => (
              <a
                key={href}
                href={href}
                className="group block bg-saabai-surface border border-saabai-border rounded-2xl p-8 hover:border-saabai-teal transition-colors"
                style={{ boxShadow: "0 0 0 0 transparent" }}
              >
                <div className="text-3xl mb-5">{icon}</div>
                <p className="text-xs font-semibold tracking-[0.18em] text-saabai-teal uppercase mb-3">{label}</p>
                <h3 className="text-lg font-semibold text-saabai-text mb-3 leading-snug">{headline}</h3>
                <p className="text-sm text-saabai-text-muted leading-relaxed mb-6">{detail}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-saabai-teal">{stat}</span>
                  <span className="text-saabai-text-dim text-sm group-hover:text-saabai-teal transition-colors">Learn more →</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <CalculatorSection />

      {/* ── Case Studies teaser ─────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-saabai-border">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">Results</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-4 leading-snug">
            Live systems. <span className="text-gradient">Real numbers.</span>
          </h2>
          <p className="text-saabai-text-muted text-center max-w-xl mx-auto mb-14 text-lg">
            Every engagement is different. The results aren't.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            {[
              {
                industry: "Law Firm",
                name: "Tributum Law",
                result: "12 hrs/week recovered. 90-second enquiry response. Live in 3 weeks.",
                quote: "The clients calling about ATO disputes are stressed. They want to know someone's there. Lex answers that in 90 seconds, any time of day.",
                href: "/case-studies",
              },
              {
                industry: "National Supplier",
                name: "Plastics Distributor",
                result: "40% of enquiries resolved without team involvement. After-hours revenue captured.",
                quote: "Rex handles the quoting work our team was doing manually all day. They're actually selling now instead of answering the same questions.",
                href: "/case-studies",
              },
            ].map(({ industry, name, result, quote, href }) => (
              <a key={name} href={href} className="group block bg-saabai-surface border border-saabai-border rounded-2xl p-8 hover:border-saabai-teal transition-colors">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xs font-semibold tracking-[0.18em] text-saabai-teal uppercase">{industry}</span>
                  <span className="text-saabai-border">·</span>
                  <span className="text-sm text-saabai-text-muted">{name}</span>
                </div>
                <p className="text-base font-semibold text-saabai-text mb-4 leading-snug">{result}</p>
                <p className="text-sm text-saabai-text-muted italic leading-relaxed border-l-2 border-saabai-teal pl-4 mb-5">&ldquo;{quote}&rdquo;</p>
                <span className="text-sm text-saabai-text-dim group-hover:text-saabai-teal transition-colors">Read case study →</span>
              </a>
            ))}
          </div>
          <div className="text-center">
            <a href="/case-studies" className="inline-block border border-saabai-border text-saabai-text-muted hover:text-saabai-teal hover:border-saabai-teal px-8 py-3 rounded-xl text-sm font-medium transition-colors">
              View all case studies →
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-3xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          FAQ
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-5 max-w-2xl mx-auto leading-snug">
          Questions we actually get asked.
        </h2>
        <p className="text-base text-saabai-text-muted text-center max-w-xl mx-auto mb-16 leading-relaxed">
          Honest answers — no buzzword bingo, no sales spin.
        </p>

        <div className="flex flex-col divide-y divide-saabai-border border border-saabai-border rounded-2xl overflow-hidden" style={{ boxShadow: "0 0 60px rgba(98,197,209,0.25), 0 0 24px rgba(98,197,209,0.15)" }}>
          {[
            {
              q: "We're not a tech company. Is this actually for us?",
              a: "This is almost exclusively for non-tech businesses. Law firms, real estate agencies, accounting practices, financial advisers — these are exactly who we work with. Your team doesn't need to understand how any of it works. You just get the time back.",
            },
            {
              q: "How long does it take to get something up and running?",
              a: "Simple automations can go live in a week or two. More complex multi-system workflows typically take four to six weeks from design to deployment. We move fast — but not at the expense of building it properly.",
            },
            {
              q: "We already use [insert software here]. Will this work with our existing tools?",
              a: "Almost certainly yes. We build on top of the tools you already have — your CRM, email platform, practice management software, calendar, documents. You shouldn't have to rip anything out. If a tool has an API (or even just a web interface), we can typically automate around it.",
            },
            {
              q: "We're an accounting or financial services firm. What about compliance and data security?",
              a: "Fair question and a serious one. We design systems with data handling in mind — we're not connecting sensitive client data to random third-party tools. We discuss your compliance requirements upfront and design around them. Most of what we automate involves workflow orchestration and communications, not raw financial data processing.",
            },
            {
              q: "Is the strategy call really free? What's the catch?",
              a: "Yes, genuinely free. No invoice, no follow-up pressure, no 'free call' that turns into a two-hour pitch. The catch, if there is one: we only take it if we think there's a real opportunity to help. If your operation isn't a good fit for what we do, we'll tell you on the call.",
            },
            {
              q: "We tried automation before and it didn't stick. Why would this be different?",
              a: "Usually because the previous attempt was a generic off-the-shelf tool that wasn't designed around how your business actually operates. Or it got set up, then nobody maintained it, then it broke, then everyone went back to doing it manually. We build custom systems and stay involved post-launch. If something breaks or drifts, that's our problem to fix — not yours.",
            },
          ].map(({ q, a }) => (
            <details key={q} className="group bg-saabai-surface">
              <summary className="flex items-center justify-between gap-6 px-8 py-6 cursor-pointer list-none select-none hover:bg-saabai-surface-raised transition-colors">
                <span className="text-base font-medium text-saabai-text leading-snug">{q}</span>
                <span className="shrink-0 w-6 h-6 rounded-full border border-saabai-border flex items-center justify-center text-saabai-text-dim text-sm font-light transition-all group-open:border-saabai-teal/60 group-open:text-saabai-teal group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="px-8 pb-7 pt-1">
                <p className="text-base text-saabai-text-muted leading-relaxed">{a}</p>
              </div>
            </details>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href="/faq"
            className="inline-flex items-center gap-2 text-sm font-medium text-saabai-teal hover:text-saabai-teal-bright transition-colors group"
          >
            See all frequently asked questions
            <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
          </a>
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
          Find out exactly how much time<br />
          <span className="text-gradient">your firm is losing — and how to get it back.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Book a free 30-minute call. We&apos;ll map the highest-value automation
          opportunities in your operation and give you a clear picture of
          what&apos;s possible — no obligation, no jargon.
        </p>
        <a
          href="https://calendly.com/shanegoldberg/30min" target="_blank" rel="noopener noreferrer"
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
