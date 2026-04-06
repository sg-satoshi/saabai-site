import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "AI Automation for Law Firms Australia | Saabai",
  description:
    "Saabai builds AI systems that recover 20+ hours a week for law firms — automated client intake, matter tracking, and document workflows. Free strategy call.",
  alternates: { canonical: "https://www.saabai.ai/for-law-firms" },
  openGraph: {
    url: "https://www.saabai.ai/for-law-firms",
    title: "AI Automation for Law Firms Australia | Saabai",
    description:
      "Saabai builds AI systems that recover 20+ hours a week for law firms — automated client intake, matter tracking, and document workflows. Free strategy call.",
  },
};

export default function ForLawFirms() {
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
            AI for Law Firms
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          Law firms run on expertise.
          <br />
          <span className="text-gradient">Not intake forms.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-14 leading-relaxed">
          Your fee earners are spending a fifth of their week on client intake,
          matter updates, and document chasing. Saabai automates it — so your
          lawyers do what they were trained for.
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
            Where billable hours go to die
          </h2>
        </div>

        <div
          className="grid md:grid-cols-3 gap-px bg-saabai-border rounded-xl overflow-hidden"
          style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 160px rgba(98,197,209,0.15)" }}
        >
          <div className="bg-saabai-surface p-12 flex flex-col gap-4">
            <p className="stat-glow text-5xl font-semibold tracking-tight text-saabai-teal">8+ hrs</p>
            <p className="text-base text-saabai-text-muted leading-relaxed">
              per week lost to manual client intake — answering initial enquiries,
              gathering conflict-check information, and opening new matters.
            </p>
          </div>
          <div className="bg-saabai-surface p-12 flex flex-col gap-4">
            <p className="stat-glow text-5xl font-semibold tracking-tight text-saabai-teal">40%</p>
            <p className="text-base text-saabai-text-muted leading-relaxed">
              of after-hours leads go unresponded. By the time someone replies the
              next morning, a third of those prospects have already moved on.
            </p>
          </div>
          <div className="bg-saabai-surface p-12 flex flex-col gap-4">
            <p className="stat-glow text-5xl font-semibold tracking-tight text-saabai-teal">60%</p>
            <p className="text-base text-saabai-text-muted leading-relaxed">
              of a solicitor&apos;s working week is non-billable admin — status updates,
              document requests, deadline chasing, and internal coordination.
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
            What changes when your workflows run themselves
          </h2>
        </div>

        <div className="flex flex-col gap-px bg-saabai-border rounded-xl overflow-hidden">

          {/* Row 1 */}
          <div className="bg-saabai-surface p-10 md:p-12 grid md:grid-cols-[1fr_auto_1fr] gap-8 items-start">
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-4">Before</p>
              <p className="text-base font-medium mb-2">New matter enquiry after hours</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Prospective client submits a web form at 9 pm. Your team sees it the
                next morning. By 9 am a competitor has already spoken to them. You
                spend 45 minutes manually qualifying the enquiry before opening a file.
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <span className="text-saabai-teal text-2xl">→</span>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-teal uppercase mb-4">After — 14 hrs recovered/week</p>
              <p className="text-base font-medium mb-2">AI responds within 90 seconds, around the clock</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Your AI intake agent acknowledges the enquiry instantly, collects matter
                details, runs a preliminary conflict check, and routes a pre-qualified
                brief to the right fee earner — ready for a 10-minute onboarding call,
                not a 45-minute discovery session.
              </p>
            </div>
          </div>

          {/* Row 2 */}
          <div className="bg-saabai-surface p-10 md:p-12 grid md:grid-cols-[1fr_auto_1fr] gap-8 items-start">
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-4">Before</p>
              <p className="text-base font-medium mb-2">Matter status updates to clients</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Clients call or email asking &quot;where are we up to?&quot; Your solicitors stop
                work, check the matter file, write a summary email, and log the time as
                non-billable. This happens several times a day across active matters.
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <span className="text-saabai-teal text-2xl">→</span>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-teal uppercase mb-4">After — 6 hrs recovered/week</p>
              <p className="text-base font-medium mb-2">Proactive updates sent automatically at each milestone</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                When a matter milestone is reached in your practice management system, a
                personalised status update goes to the client automatically. No manual
                drafting, no inbound calls, no non-billable write-off.
              </p>
            </div>
          </div>

          {/* Row 3 */}
          <div className="bg-saabai-surface p-10 md:p-12 grid md:grid-cols-[1fr_auto_1fr] gap-8 items-start">
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-4">Before</p>
              <p className="text-base font-medium mb-2">Document collection and chasing</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Your paralegal sends an email requesting documents. The client doesn&apos;t
                respond. Three days later someone remembers to follow up. The matter
                stalls and the file sits open for weeks longer than necessary.
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <span className="text-saabai-teal text-2xl">→</span>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-teal uppercase mb-4">After — 5 hrs recovered/week</p>
              <p className="text-base font-medium mb-2">Automated chasing sequences that escalate intelligently</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Document requests are sent automatically with a secure upload link.
                If no response in 48 hours, a reminder goes out. If still outstanding
                after 5 days, your team is flagged. Matters close faster, cash flow
                improves, and your paralegals aren&apos;t human reminder systems.
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
            Four automations law firms deploy first
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-px bg-saabai-border rounded-xl overflow-hidden">
          <div className="bg-saabai-surface p-10 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-lg bg-saabai-surface-raised border border-saabai-border flex items-center justify-center text-saabai-teal text-lg font-semibold">
              01
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Automated client intake &amp; conflict check</h3>
            <p className="text-saabai-text-muted text-sm leading-relaxed">
              A structured intake flow that collects matter details, runs a preliminary
              conflict check against your existing client list, and delivers a pre-qualified
              brief to the right lawyer — before they&apos;ve even opened their laptop.
            </p>
          </div>
          <div className="bg-saabai-surface p-10 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-lg bg-saabai-surface-raised border border-saabai-border flex items-center justify-center text-saabai-teal text-lg font-semibold">
              02
            </div>
            <h3 className="text-lg font-semibold tracking-tight">After-hours AI enquiry agent</h3>
            <p className="text-saabai-text-muted text-sm leading-relaxed">
              An AI agent that responds to new enquiries within 90 seconds, 24 hours a
              day, 7 days a week. It answers common questions about your practice areas,
              sets expectations on timelines, and captures qualified leads while your team sleeps.
            </p>
          </div>
          <div className="bg-saabai-surface p-10 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-lg bg-saabai-surface-raised border border-saabai-border flex items-center justify-center text-saabai-teal text-lg font-semibold">
              03
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Document chasing sequences</h3>
            <p className="text-saabai-text-muted text-sm leading-relaxed">
              Automated multi-step sequences that request, follow up, and escalate
              outstanding documents — sent via email or SMS, with secure upload links.
              Matters move faster and your paralegals focus on tasks that need a human.
            </p>
          </div>
          <div className="bg-saabai-surface p-10 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-lg bg-saabai-surface-raised border border-saabai-border flex items-center justify-center text-saabai-teal text-lg font-semibold">
              04
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Billing reminder automation</h3>
            <p className="text-saabai-text-muted text-sm leading-relaxed">
              Automated invoice reminders that go out on schedule — politely at first,
              firmly later — without anyone having to track payment status or draft
              awkward follow-up emails. Debtors days drop without a single extra call.
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
            What firms usually ask us first
          </h2>
        </div>

        <div className="flex flex-col divide-y divide-saabai-border border border-saabai-border rounded-2xl overflow-hidden">

          <details className="group bg-saabai-surface">
            <summary className="flex items-center justify-between gap-6 px-8 py-6 cursor-pointer list-none">
              <span className="text-base font-medium">Won&apos;t clients prefer speaking to a person?</span>
              <span className="text-saabai-teal text-xl flex-shrink-0 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-8 pb-8">
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Clients want a fast, clear response — especially in stressful legal situations. An AI
                that responds within 90 seconds at 10 pm will win more trust than a person who replies
                the next morning. The AI handles initial information gathering and sets expectations;
                your team handles the relationship. Clients typically can&apos;t tell the difference in
                the intake phase, and the ones who can will appreciate that your firm is responsive.
              </p>
            </div>
          </details>

          <details className="group bg-saabai-surface">
            <summary className="flex items-center justify-between gap-6 px-8 py-6 cursor-pointer list-none">
              <span className="text-base font-medium">What about confidentiality and legal privilege?</span>
              <span className="text-saabai-teal text-xl flex-shrink-0 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-8 pb-8">
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                All systems are built with confidentiality front of mind. Data collected during intake
                is stored in your existing practice management system — not in a third-party AI
                platform. We design intake flows to collect only what&apos;s necessary at each stage,
                before any retainer is in place. Every deployment goes through a review of your firm&apos;s
                obligations so the system is compliant from day one.
              </p>
            </div>
          </details>

          <details className="group bg-saabai-surface">
            <summary className="flex items-center justify-between gap-6 px-8 py-6 cursor-pointer list-none">
              <span className="text-base font-medium">How quickly can intake be automated?</span>
              <span className="text-saabai-teal text-xl flex-shrink-0 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-8 pb-8">
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Most law firm intake automations are live within 2–3 weeks of the initial audit.
                We start with a workflow mapping session to understand how your firm currently
                handles new enquiries, then build against your existing tools — whether that&apos;s
                LEAP, Smokeball, ActionStep, or a custom setup. You don&apos;t change your software;
                we make it work harder for you.
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
          <span className="text-gradient">in your firm?</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Book a free 30-minute strategy call. We&apos;ll map your intake workflows,
          identify where automation creates the biggest impact, and give you a
          clear picture of what&apos;s possible — no obligation.
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
