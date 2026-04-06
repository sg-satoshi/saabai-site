import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "AI Automation for Real Estate Agencies Australia | Saabai",
  description:
    "Stop losing leads to slow follow-up. Saabai's AI systems respond to every enquiry within minutes, qualify buyers and sellers, and keep your agents focused on negotiations.",
  alternates: { canonical: "https://www.saabai.ai/for-real-estate" },
  openGraph: {
    url: "https://www.saabai.ai/for-real-estate",
    title: "AI Automation for Real Estate Agencies Australia | Saabai",
    description:
      "Stop losing leads to slow follow-up. Saabai's AI systems respond to every enquiry within minutes, qualify buyers and sellers, and keep your agents focused on negotiations.",
  },
};

export default function ForRealEstate() {
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
            AI for Real Estate Agencies
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          Every enquiry deserves an answer.
          <br />
          <span className="text-gradient">Not just the ones you&apos;re awake for.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-14 leading-relaxed">
          Buyers and sellers don&apos;t wait until 9 am. Saabai deploys AI systems
          that respond within minutes, qualify every lead, and keep your agents
          focused on negotiations — not inboxes.
        </p>

        <a
          href="https://calendly.com/shanegoldberg/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-block bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
        >
          Book Your Free Strategy Call
        </a>

        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{
          background: "linear-gradient(to bottom, transparent, var(--saabai-bg))"
        }} />
      </section>

      {/* ── Pain Points ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <div className="mb-14 text-center">
          <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-4">
            The Problem
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            The gap between enquiry and contact is costing you listings
          </h2>
        </div>

        <div
          className="grid md:grid-cols-3 gap-px bg-saabai-border rounded-xl overflow-hidden"
          style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 160px rgba(98,197,209,0.15)" }}
        >
          <div className="bg-saabai-surface p-12 flex flex-col gap-4">
            <p className="stat-glow text-5xl font-semibold tracking-tight text-saabai-teal">47 min</p>
            <p className="text-base text-saabai-text-muted leading-relaxed">
              average industry response time to a new property enquiry. The leading
              agencies respond in under 2 minutes. That gap decides who gets the
              inspection — and who gets the listing.
            </p>
          </div>
          <div className="bg-saabai-surface p-12 flex flex-col gap-4">
            <p className="stat-glow text-5xl font-semibold tracking-tight text-saabai-teal">30%</p>
            <p className="text-base text-saabai-text-muted leading-relaxed">
              of leads go cold within the first hour of enquiring. A buyer who
              submits a form at 7 pm on a Saturday is gone by Sunday morning if
              nobody has reached out.
            </p>
          </div>
          <div className="bg-saabai-surface p-12 flex flex-col gap-4">
            <p className="stat-glow text-5xl font-semibold tracking-tight text-saabai-teal">6+ hrs</p>
            <p className="text-base text-saabai-text-muted leading-relaxed">
              per agent per week lost to manual follow-up admin — logging enquiries,
              sending inspection confirmations, chasing appraisal feedback, and
              updating vendors on campaign progress.
            </p>
          </div>
        </div>
      </section>

      {/* ── Before / After ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <div className="mb-14 text-center">
          <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-4">
            Before &amp; After
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            What changes when your follow-up runs itself
          </h2>
        </div>

        <div className="flex flex-col gap-px bg-saabai-border rounded-xl overflow-hidden">

          {/* Row 1 */}
          <div className="bg-saabai-surface p-10 md:p-12 grid md:grid-cols-[1fr_auto_1fr] gap-8 items-start">
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-4">Before</p>
              <p className="text-base font-medium mb-2">New buyer enquiry on a Saturday evening</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                A buyer submits an enquiry on realestate.com.au at 7:30 pm. Your
                agent sees it Monday morning. By then the buyer has already inspected
                two properties with other agencies and isn&apos;t interested anymore. The
                lead is gone and nobody noticed.
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <span className="text-saabai-teal text-2xl">→</span>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-teal uppercase mb-4">After — 12 hrs recovered/week across the team</p>
              <p className="text-base font-medium mb-2">AI responds within 2 minutes, qualifies the buyer, books an inspection</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Your AI agent acknowledges the enquiry immediately, asks qualifying
                questions (timeline, finance, property type), answers common questions
                about the listing, and offers available inspection times. By Monday
                morning your agent has a pre-qualified buyer already booked — not
                a cold lead to call from scratch.
              </p>
            </div>
          </div>

          {/* Row 2 */}
          <div className="bg-saabai-surface p-10 md:p-12 grid md:grid-cols-[1fr_auto_1fr] gap-8 items-start">
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-4">Before</p>
              <p className="text-base font-medium mb-2">Appraisal follow-up sequence</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Your agent does an appraisal on Tuesday. They mean to follow up on
                Thursday, but three inspections and two offers get in the way. By the
                time they call, the vendor has signed with someone else who stayed in
                contact. The listing was there to win.
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <span className="text-saabai-teal text-2xl">→</span>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-teal uppercase mb-4">After — 5 hrs recovered/week</p>
              <p className="text-base font-medium mb-2">A nurture sequence fires automatically after every appraisal</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                The moment an appraisal is logged, an automated sequence begins — a
                personalised summary email 24 hours later, a market update at 5 days,
                a check-in at 2 weeks. Your agent is top of mind without lifting a
                finger, and gets a live alert the moment the vendor signals readiness
                to list.
              </p>
            </div>
          </div>

          {/* Row 3 */}
          <div className="bg-saabai-surface p-10 md:p-12 grid md:grid-cols-[1fr_auto_1fr] gap-8 items-start">
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-4">Before</p>
              <p className="text-base font-medium mb-2">Vendor reporting</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Every week your agent sits down to write vendor updates — enquiry
                numbers, inspection feedback, online views, comparable sales. It takes
                30 minutes per listing. For an agent with 8 active listings, that&apos;s
                4 hours a week of report writing.
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <span className="text-saabai-teal text-2xl">→</span>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-teal uppercase mb-4">After — 4 hrs recovered/week per agent</p>
              <p className="text-base font-medium mb-2">Reports assembled and delivered automatically each week</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Data from your CRM and portal analytics is pulled together automatically,
                formatted into a professional vendor report, and delivered to the vendor
                every Friday. Your agent reviews and sends — they don&apos;t write it. Vendors
                feel informed and confident; agents reclaim 4 hours a week.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Quick Wins ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <div className="mb-14 text-center">
          <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-4">
            What We Build
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Four automations real estate agencies deploy first
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-px bg-saabai-border rounded-xl overflow-hidden">
          <div className="bg-saabai-surface p-10 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-lg bg-saabai-surface-raised border border-saabai-border flex items-center justify-center text-saabai-teal text-lg font-semibold">
              01
            </div>
            <h3 className="text-lg font-semibold tracking-tight">24/7 instant enquiry response</h3>
            <p className="text-saabai-text-muted text-sm leading-relaxed">
              An AI agent that responds to every buyer or tenant enquiry within
              2 minutes — day, night, weekend. It qualifies the lead, answers listing
              questions, and offers inspection times. Your agents arrive Monday morning
              with a pipeline, not an inbox.
            </p>
          </div>
          <div className="bg-saabai-surface p-10 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-lg bg-saabai-surface-raised border border-saabai-border flex items-center justify-center text-saabai-teal text-lg font-semibold">
              02
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Automated appraisal follow-up</h3>
            <p className="text-saabai-text-muted text-sm leading-relaxed">
              A structured nurture sequence triggered automatically after every appraisal.
              Personalised touchpoints at 1 day, 5 days, and 2 weeks — market updates,
              comparable sales, readiness check-ins. Win more listings without relying
              on agents to remember to follow up.
            </p>
          </div>
          <div className="bg-saabai-surface p-10 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-lg bg-saabai-surface-raised border border-saabai-border flex items-center justify-center text-saabai-teal text-lg font-semibold">
              03
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Inspection scheduling automation</h3>
            <p className="text-saabai-text-muted text-sm leading-relaxed">
              Buyers self-select inspection slots from a live calendar. Confirmation and
              reminder messages go out automatically. Cancellations trigger re-engagement.
              Your admin team stops managing booking logistics and your inspections stay
              full with qualified attendees.
            </p>
          </div>
          <div className="bg-saabai-surface p-10 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-lg bg-saabai-surface-raised border border-saabai-border flex items-center justify-center text-saabai-teal text-lg font-semibold">
              04
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Vendor report generation</h3>
            <p className="text-saabai-text-muted text-sm leading-relaxed">
              Weekly vendor reports assembled automatically from your CRM and portal
              analytics — enquiry counts, inspection attendance, online views, and
              market context. Formatted, branded, and delivered every Friday. Vendors
              stay informed; agents stay focused on selling.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-3xl mx-auto border-t border-saabai-border">
        <div className="mb-14 text-center">
          <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-4">
            Common Questions
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            What agencies usually ask us first
          </h2>
        </div>

        <div className="flex flex-col divide-y divide-saabai-border border border-saabai-border rounded-2xl overflow-hidden">

          <details className="group bg-saabai-surface">
            <summary className="flex items-center justify-between gap-6 px-8 py-6 cursor-pointer list-none">
              <span className="text-base font-medium">Will buyers know they&apos;re talking to AI?</span>
              <span className="text-saabai-teal text-xl flex-shrink-0 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-8 pb-8">
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                We build AI agents that are transparent about what they are — they&apos;re
                introduced as your agency&apos;s digital assistant, not a person. In practice,
                buyers care far more about getting a fast, accurate response than who sent
                it. An agent that replies in 2 minutes at 9 pm will win more trust than
                a person who replies the next morning. For any complex or sensitive
                conversations, the AI escalates to a human immediately.
              </p>
            </div>
          </details>

          <details className="group bg-saabai-surface">
            <summary className="flex items-center justify-between gap-6 px-8 py-6 cursor-pointer list-none">
              <span className="text-base font-medium">What CRMs do you integrate with?</span>
              <span className="text-saabai-teal text-xl flex-shrink-0 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-8 pb-8">
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                We integrate with the major Australian real estate CRMs including
                Rex Software, VaultRE, Console Cloud, PropertyMe, and Agentbox. We
                also connect with portal feeds from realestate.com.au and Domain.
                If you use a CRM not listed here, get in touch — if it has an API
                or webhook capability, we can almost certainly work with it.
              </p>
            </div>
          </details>

          <details className="group bg-saabai-surface">
            <summary className="flex items-center justify-between gap-6 px-8 py-6 cursor-pointer list-none">
              <span className="text-base font-medium">Can this work for property management too?</span>
              <span className="text-saabai-teal text-xl flex-shrink-0 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-8 pb-8">
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Yes. Property management carries its own set of high-volume, repetitive
                workflows — maintenance request triage, lease renewal reminders, routine
                inspection scheduling, arrears follow-up. These are excellent candidates
                for automation. Many agencies start with sales-side enquiry response and
                then extend the same systems into their PM division. We can scope both
                in your strategy call.
              </p>
            </div>
          </details>

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
          Ready to see what&apos;s possible
          <br />
          <span className="text-gradient">in your agency?</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Book a free 30-minute strategy call. We&apos;ll map your enquiry and
          follow-up workflows, identify where automation creates the biggest
          impact, and give you a clear picture of what&apos;s possible — no obligation.
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
