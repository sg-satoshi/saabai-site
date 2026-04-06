import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "AI Automation for Accounting Firms Australia | Saabai",
  description:
    "Recover 15–25 hours a week in your accounting practice. Automated document chasing, deadline reminders, client onboarding — without changing your software stack.",
  alternates: { canonical: "https://www.saabai.ai/for-accounting-firms" },
  openGraph: {
    url: "https://www.saabai.ai/for-accounting-firms",
    title: "AI Automation for Accounting Firms Australia | Saabai",
    description:
      "Recover 15–25 hours a week in your accounting practice. Automated document chasing, deadline reminders, client onboarding — without changing your software stack.",
  },
};

export default function ForAccountingFirms() {
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
            AI for Accounting Firms
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          Your accountants should be advising.
          <br />
          <span className="text-gradient">Not chasing.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-14 leading-relaxed">
          Document collection, deadline reminders, client onboarding — the
          work that buries your team every quarter. Saabai automates it so
          your accountants can focus on the advice clients actually pay for.
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
            The operational drag every practice lives with
          </h2>
        </div>

        <div
          className="grid md:grid-cols-3 gap-px bg-saabai-border rounded-xl overflow-hidden"
          style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 160px rgba(98,197,209,0.15)" }}
        >
          <div className="bg-saabai-surface p-12 flex flex-col gap-4">
            <p className="stat-glow text-5xl font-semibold tracking-tight text-saabai-teal">10+ hrs</p>
            <p className="text-base text-saabai-text-muted leading-relaxed">
              per week spent chasing clients for source documents, bank statements,
              and receipts — before any actual accounting work can begin.
            </p>
          </div>
          <div className="bg-saabai-surface p-12 flex flex-col gap-4">
            <p className="stat-glow text-5xl font-semibold tracking-tight text-saabai-teal">3 weeks</p>
            <p className="text-base text-saabai-text-muted leading-relaxed">
              average onboarding time for new clients — manual back-and-forth,
              engagement letters, software access, and data collection all done
              by hand, one email at a time.
            </p>
          </div>
          <div className="bg-saabai-surface p-12 flex flex-col gap-4">
            <p className="stat-glow text-5xl font-semibold tracking-tight text-saabai-teal">Every deadline</p>
            <p className="text-base text-saabai-text-muted leading-relaxed">
              carries manual coordination overhead — BAS, tax returns, SMSF
              lodgements. Someone on your team is tracking each one individually
              and chasing missing pieces as the date approaches.
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
              <p className="text-base font-medium mb-2">Client document collection at year end</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Your team emails each client a list of documents needed. Half don&apos;t
                respond. You send a follow-up. Then another. Then someone calls.
                Tax season becomes a document-chasing marathon that delays lodgements
                and pushes overtime costs through the roof.
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <span className="text-saabai-teal text-2xl">→</span>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-teal uppercase mb-4">After — 10 hrs recovered/week</p>
              <p className="text-base font-medium mb-2">Automated sequences with secure client portals</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Document requests go out automatically with a secure upload link
                personalised to each client. Reminders escalate on a schedule.
                Your team sees a live dashboard of what&apos;s outstanding — and only
                steps in for genuinely stuck cases. Lodgements happen on time.
              </p>
            </div>
          </div>

          {/* Row 2 */}
          <div className="bg-saabai-surface p-10 md:p-12 grid md:grid-cols-[1fr_auto_1fr] gap-8 items-start">
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-4">Before</p>
              <p className="text-base font-medium mb-2">Deadline reminder sequences</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Someone on your team maintains a spreadsheet of due dates. Each
                quarter, they manually email clients about upcoming BAS or tax
                return deadlines. Some clients are reminded, others are missed.
                Lodgement failures and late fees create avoidable disputes.
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <span className="text-saabai-teal text-2xl">→</span>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-teal uppercase mb-4">After — 4 hrs recovered/week</p>
              <p className="text-base font-medium mb-2">Every client reminded automatically, every time</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Deadlines are pulled from your practice management system. Reminder
                sequences fire automatically — 30 days out, 14 days, 7 days, and day
                of. Clients arrive prepared. Late lodgements drop. And nobody on your
                team has to maintain a reminder spreadsheet ever again.
              </p>
            </div>
          </div>

          {/* Row 3 */}
          <div className="bg-saabai-surface p-10 md:p-12 grid md:grid-cols-[1fr_auto_1fr] gap-8 items-start">
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-4">Before</p>
              <p className="text-base font-medium mb-2">New client onboarding</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                A new referral comes in. Someone sends a welcome email. Then an
                engagement letter. Then a software invite. Then a data collection
                request. Each step waits for the last. Three weeks later, the client
                is finally set up and wonders why it took so long.
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <span className="text-saabai-teal text-2xl">→</span>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-teal uppercase mb-4">After — 6 hrs recovered/week</p>
              <p className="text-base font-medium mb-2">Onboarding completes in days, not weeks</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                A single trigger kicks off the entire onboarding sequence — welcome
                message, engagement letter signature, software access, data collection
                form. Each step fires when the previous one is complete. Clients are
                fully set up within 3–5 business days with zero manual coordination
                from your team.
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
            Four automations accounting firms deploy first
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-px bg-saabai-border rounded-xl overflow-hidden">
          <div className="bg-saabai-surface p-10 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-lg bg-saabai-surface-raised border border-saabai-border flex items-center justify-center text-saabai-teal text-lg font-semibold">
              01
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Automated document collection</h3>
            <p className="text-saabai-text-muted text-sm leading-relaxed">
              Personalised document request sequences sent automatically to each client,
              with secure upload links and escalating reminders. Your team sees real-time
              status across all active clients — no chasing, no spreadsheets.
            </p>
          </div>
          <div className="bg-saabai-surface p-10 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-lg bg-saabai-surface-raised border border-saabai-border flex items-center justify-center text-saabai-teal text-lg font-semibold">
              02
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Deadline reminder sequences</h3>
            <p className="text-saabai-text-muted text-sm leading-relaxed">
              Automated multi-stage reminders triggered from your practice management
              system — BAS, income tax, SMSF lodgements, and more. Every client, every
              deadline, every time. Late lodgements and avoidable penalties become
              a thing of the past.
            </p>
          </div>
          <div className="bg-saabai-surface p-10 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-lg bg-saabai-surface-raised border border-saabai-border flex items-center justify-center text-saabai-teal text-lg font-semibold">
              03
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Client onboarding automation</h3>
            <p className="text-saabai-text-muted text-sm leading-relaxed">
              A sequenced onboarding flow triggered the moment a new engagement is
              confirmed — welcome, engagement letter, software access, data collection.
              New clients are fully set up in days, not weeks, and your team never
              has to manually coordinate a single step.
            </p>
          </div>
          <div className="bg-saabai-surface p-10 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-lg bg-saabai-surface-raised border border-saabai-border flex items-center justify-center text-saabai-teal text-lg font-semibold">
              04
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Report generation workflows</h3>
            <p className="text-saabai-text-muted text-sm leading-relaxed">
              Management reports, cash flow summaries, and year-end packages assembled
              and delivered automatically when the underlying data is ready. Your
              accountants review and sign off — they don&apos;t spend hours pulling numbers
              together from separate systems.
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
            What practices usually ask us first
          </h2>
        </div>

        <div className="flex flex-col divide-y divide-saabai-border border border-saabai-border rounded-2xl overflow-hidden">

          <details className="group bg-saabai-surface">
            <summary className="flex items-center justify-between gap-6 px-8 py-6 cursor-pointer list-none">
              <span className="text-base font-medium">We use XPM / MYOB / Xero — will it work with our stack?</span>
              <span className="text-saabai-teal text-xl flex-shrink-0 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-8 pb-8">
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Yes. We build integrations with XPM (Xero Practice Manager), MYOB Practice,
                Xero, FYI Docs, and most other tools in the Australian accounting stack.
                We don&apos;t ask you to change your software — we build automation layers that
                sit across your existing systems and make them work together. If your tool
                has an API or export capability, we can work with it.
              </p>
            </div>
          </details>

          <details className="group bg-saabai-surface">
            <summary className="flex items-center justify-between gap-6 px-8 py-6 cursor-pointer list-none">
              <span className="text-base font-medium">What about the busy season — can we handle deployment then?</span>
              <span className="text-saabai-teal text-xl flex-shrink-0 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-8 pb-8">
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                We recommend booking your strategy call well before peak season so
                systems are live and bedded in before the pressure hits — not launched
                during it. Most practices deploy in the quieter months (January–February
                or July) and arrive at tax season with their document collection and
                deadline reminders already running. That said, if you need something
                deployed quickly, our typical timeline from audit to live is 2–4 weeks.
              </p>
            </div>
          </details>

          <details className="group bg-saabai-surface">
            <summary className="flex items-center justify-between gap-6 px-8 py-6 cursor-pointer list-none">
              <span className="text-base font-medium">How do you handle client data security?</span>
              <span className="text-saabai-teal text-xl flex-shrink-0 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-8 pb-8">
              <p className="text-saabai-text-muted text-sm leading-relaxed">
                Client data stays in your systems. We don&apos;t build pipelines that pull
                sensitive financial data into external AI platforms for processing.
                Automation logic runs on infrastructure you control or on enterprise-grade
                automation platforms with SOC 2 compliance. Secure upload links use
                time-limited tokens. Every deployment is reviewed against your practice&apos;s
                obligations under the Privacy Act and relevant professional standards.
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
          Book a free 30-minute strategy call. We&apos;ll map your workflows,
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
