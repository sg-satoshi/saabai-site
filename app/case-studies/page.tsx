import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Case Studies — AI Automation Results | Saabai",
  description:
    "See how Saabai's AI automation systems recovered 12+ hours a week for professional services firms — and went live in 3 weeks.",
  alternates: { canonical: "https://www.saabai.ai/case-studies" },
  openGraph: {
    url: "https://www.saabai.ai/case-studies",
    title: "Case Studies — AI Automation Results | Saabai",
    description:
      "See how Saabai's AI automation systems recovered 12+ hours a week for professional services firms — and went live in 3 weeks.",
  },
};

export default function CaseStudies() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">

      <Nav />

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
            Case Studies
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          Real results
          <br />
          <span className="text-gradient">from real firms.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-14 leading-relaxed">
          These aren&apos;t projections. They&apos;re outcomes from businesses that deployed
          Saabai AI agents and measured the difference — in hours recovered, leads
          converted, and revenue captured after hours.
        </p>

        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{
          background: "linear-gradient(to bottom, transparent, var(--saabai-bg))"
        }} />
      </section>

      {/* ── Case Study 1 — Tributum Law ─────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-saabai-surface-raised border border-saabai-border text-[11px] font-medium tracking-[0.15em] text-saabai-teal uppercase">
            Legal Services
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-saabai-surface-raised border border-saabai-border text-[11px] font-medium tracking-[0.15em] text-saabai-text-dim uppercase">
            AI Intake Agent
          </span>
          <span className="ml-auto inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saabai-surface border border-saabai-border text-[11px] font-semibold tracking-[0.12em] text-saabai-teal uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal inline-block" />
            Live in 3 weeks
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
          Tributum Law
        </h2>
        <p className="text-saabai-text-muted text-base mb-16 max-w-2xl leading-relaxed">
          Specialist ATO dispute and tax law firm — Brisbane
        </p>

        {/* Problem / Solution */}
        <div className="grid md:grid-cols-2 gap-px bg-saabai-border rounded-xl overflow-hidden mb-px">
          <div className="bg-saabai-surface p-10 flex flex-col gap-5">
            <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase">
              The Problem
            </p>
            <h3 className="text-xl font-semibold tracking-tight">
              Enquiries going unanswered for 12+ hours
            </h3>
            <div className="flex flex-col gap-3 text-saabai-text-muted text-sm leading-relaxed">
              <p>
                After-hours client enquiries sat untouched until the next business day —
                a 2–14 hour window where stressed ATO dispute clients were left wondering
                if anyone was there.
              </p>
              <p>
                Fee earners were manually qualifying every initial enquiry before
                deciding whether it was worth their time. Two paralegals were each
                spending around 6 hours per week on intake coordination alone.
              </p>
            </div>
          </div>
          <div className="bg-saabai-surface p-10 flex flex-col gap-5">
            <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-teal uppercase">
              The Solution — &ldquo;Lex&rdquo;
            </p>
            <h3 className="text-xl font-semibold tracking-tight">
              AI intake agent deployed across all channels
            </h3>
            <div className="flex flex-col gap-3 text-saabai-text-muted text-sm leading-relaxed">
              <p>
                Saabai deployed &ldquo;Lex&rdquo; — an AI intake agent that handles all incoming
                enquiries 24/7, qualifies the matter type, and captures key details
                before a human is ever involved.
              </p>
              <p>
                Urgent ATO dispute cases are routed immediately. Non-urgent matters
                enter an automated follow-up sequence, ensuring nothing falls through
                the cracks regardless of when it arrives.
              </p>
            </div>
          </div>
        </div>

        {/* Results grid */}
        <div
          className="grid md:grid-cols-4 gap-px bg-saabai-border rounded-b-xl overflow-hidden mb-10"
          style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 160px rgba(98,197,209,0.15)" }}
        >
          <div className="bg-saabai-surface p-8 flex flex-col gap-3">
            <p className="stat-glow text-4xl font-semibold tracking-tight text-saabai-teal">90s</p>
            <p className="text-saabai-text-muted text-xs leading-relaxed">
              100% of enquiries responded to within 90 seconds — previously 2–14 hours
            </p>
          </div>
          <div className="bg-saabai-surface p-8 flex flex-col gap-3">
            <p className="stat-glow text-4xl font-semibold tracking-tight text-saabai-teal">12 hrs</p>
            <p className="text-saabai-text-muted text-xs leading-relaxed">
              Per week recovered across the intake team — returned to billable work
            </p>
          </div>
          <div className="bg-saabai-surface p-8 flex flex-col gap-3">
            <p className="stat-glow text-4xl font-semibold tracking-tight text-saabai-teal">3x</p>
            <p className="text-saabai-text-muted text-xs leading-relaxed">
              Increase in qualified matters converted from first contact
            </p>
          </div>
          <div className="bg-saabai-surface p-8 flex flex-col gap-3">
            <p className="stat-glow text-4xl font-semibold tracking-tight text-saabai-teal">3 wks</p>
            <p className="text-saabai-text-muted text-xs leading-relaxed">
              From kickoff to Lex handling live enquiries in production
            </p>
          </div>
        </div>

        {/* Quote */}
        <blockquote className="bg-saabai-surface-raised border-l-2 border-saabai-teal rounded-r-xl px-10 py-8">
          <p className="text-base italic text-saabai-text-muted leading-relaxed mb-5">
            &ldquo;The clients calling about ATO disputes are stressed. They want to know
            someone&apos;s there. Lex answers that in 90 seconds, any time of day. The
            difference it&apos;s made to our conversion rate has been significant.&rdquo;
          </p>
          <p className="text-xs font-medium tracking-[0.15em] text-saabai-text-dim uppercase">
            — Principal, Tributum Law
          </p>
        </blockquote>

      </section>

      {/* ── Case Study 2 — National Plastics Supplier ───────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-saabai-surface-raised border border-saabai-border text-[11px] font-medium tracking-[0.15em] text-saabai-teal uppercase">
            Trade &amp; Retail Supply
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-saabai-surface-raised border border-saabai-border text-[11px] font-medium tracking-[0.15em] text-saabai-text-dim uppercase">
            AI Sales Agent
          </span>
          <span className="ml-auto inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saabai-surface border border-saabai-border text-[11px] font-semibold tracking-[0.12em] text-saabai-teal uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal inline-block" />
            Live in 3 weeks
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
          National Plastics Supplier
        </h2>
        <p className="text-saabai-text-muted text-base mb-16 max-w-2xl leading-relaxed">
          Large national plastics supplier (name withheld on request) — trade and retail
          customers across Australia
        </p>

        {/* Problem / Solution */}
        <div className="grid md:grid-cols-2 gap-px bg-saabai-border rounded-xl overflow-hidden mb-px">
          <div className="bg-saabai-surface p-10 flex flex-col gap-5">
            <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase">
              The Problem
            </p>
            <h3 className="text-xl font-semibold tracking-tight">
              60% of the sales day lost to repetitive quoting
            </h3>
            <div className="flex flex-col gap-3 text-saabai-text-muted text-sm leading-relaxed">
              <p>
                The sales team was overwhelmed with repetitive product and pricing
                enquiries. Customers waited hours for simple cut-to-size quotes.
                After-hours enquiries were lost entirely.
              </p>
              <p>
                More than 60% of the team&apos;s day was consumed by quote requests — leaving
                no capacity to build relationships with trade accounts or focus on
                higher-value sales activity.
              </p>
            </div>
          </div>
          <div className="bg-saabai-surface p-10 flex flex-col gap-5">
            <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-teal uppercase">
              The Solution — &ldquo;Rex&rdquo;
            </p>
            <h3 className="text-xl font-semibold tracking-tight">
              AI sales agent embedded on the supplier&apos;s website
            </h3>
            <div className="flex flex-col gap-3 text-saabai-text-muted text-sm leading-relaxed">
              <p>
                Saabai deployed &ldquo;Rex&rdquo; — an AI sales agent that handles product enquiries,
                calculates cut-to-size pricing in real time, and captures leads directly
                on the supplier&apos;s website.
              </p>
              <p>
                Complex orders are handed off to the sales team with full context already
                captured — no repeated questions, no manual re-entry. Rex runs 24/7,
                so after-hours enquiries are quoted and captured automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Results grid */}
        <div
          className="grid md:grid-cols-4 gap-px bg-saabai-border rounded-b-xl overflow-hidden mb-10"
          style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 160px rgba(98,197,209,0.15)" }}
        >
          <div className="bg-saabai-surface p-8 flex flex-col gap-3">
            <p className="stat-glow text-4xl font-semibold tracking-tight text-saabai-teal">Seconds</p>
            <p className="text-saabai-text-muted text-xs leading-relaxed">
              Quotes delivered instantly — previously 2–4 hours per request
            </p>
          </div>
          <div className="bg-saabai-surface p-8 flex flex-col gap-3">
            <p className="stat-glow text-4xl font-semibold tracking-tight text-saabai-teal">40%</p>
            <p className="text-saabai-text-muted text-xs leading-relaxed">
              Of inbound enquiries fully resolved without any team involvement
            </p>
          </div>
          <div className="bg-saabai-surface p-8 flex flex-col gap-3">
            <p className="stat-glow text-4xl font-semibold tracking-tight text-saabai-teal">24/7</p>
            <p className="text-saabai-text-muted text-xs leading-relaxed">
              After-hours enquiries now captured and quoted automatically — zero lost
            </p>
          </div>
          <div className="bg-saabai-surface p-8 flex flex-col gap-3">
            <p className="stat-glow text-4xl font-semibold tracking-tight text-saabai-teal">3 wks</p>
            <p className="text-saabai-text-muted text-xs leading-relaxed">
              From kickoff to Rex handling live product and pricing enquiries
            </p>
          </div>
        </div>

        {/* Quote */}
        <blockquote className="bg-saabai-surface-raised border-l-2 border-saabai-teal rounded-r-xl px-10 py-8">
          <p className="text-base italic text-saabai-text-muted leading-relaxed mb-5">
            &ldquo;Rex handles the quoting work our team was doing manually all day. They&apos;re
            actually selling now instead of answering the same questions. And the
            after-hours enquiries — we were just losing those before.&rdquo;
          </p>
          <p className="text-xs font-medium tracking-[0.15em] text-saabai-text-dim uppercase">
            — Operations Manager, National Plastics Supplier
          </p>
        </blockquote>

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
          Ready to be
          <br />
          <span className="text-gradient">the next case study?</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Book a free 30-minute strategy call. We&apos;ll map your workflows, identify
          where automation creates the biggest impact, and give you a clear picture
          of what&apos;s possible — no obligation.
        </p>
        <a
          href="https://calendly.com/shanegoldberg/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-block bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
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
