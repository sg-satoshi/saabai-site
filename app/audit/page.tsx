import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "AI Efficiency Audit: $2,500 — Guaranteed $50K Recovery or Free | Saabai",
  description:
    "Fixed-price AI Efficiency Audit ($2,500) for accounting firms. Guaranteed: if we don't find at least $50K/yr in recoverable capacity, you don't pay. Workflow map, dollar-figure roadmap, and prioritized build plan. 100% credited toward implementation.",
  alternates: { canonical: "https://www.saabai.ai/audit" },
  openGraph: {
    url: "https://www.saabai.ai/audit",
    title: "AI Efficiency Audit: $2,500 — Guaranteed $50K Recovery or Free | Saabai",
    description:
      "Fixed-price AI Efficiency Audit ($2,500) for accounting firms. Guaranteed: if we don't find at least $50K/yr in recoverable capacity, you don't pay.",
  },
};

const deliverables = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-saabai-teal">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
    title: "Workflow Map",
    description:
      "A complete visual map of your firm's core workflows — client intake, compliance, reporting, billing, and follow-up — showing exactly where time is lost and where automation creates the biggest impact.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-saabai-teal">
        <path d="M12 20V10" />
        <path d="M18 20V4" />
        <path d="M6 20v-4" />
      </svg>
    ),
    title: "Dollar-Figure Roadmap",
    description:
      "Every opportunity quantified in dollars per year. No vague estimates — you'll see the specific dollar value of recoverable capacity for each workflow, ranked so you know exactly where to start for maximum return.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-saabai-teal">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Prioritized Build Plan",
    description:
      "A ranked, actionable implementation plan ordered by ROI, complexity, and sequencing dependencies. Each opportunity includes estimated build cost, time to deploy, and projected monthly capacity recovered.",
  },
];

const process = [
  {
    step: "01",
    title: "You Book",
    body: "Schedule your audit via Calendly. We'll send you a pre-audit questionnaire (takes 10 minutes) to understand your firm's tools, team structure, and top pain points.",
  },
  {
    step: "02",
    title: "We Map",
    body: "A 90-minute discovery session where we map your core workflows in real time, measure time spent on each task, and identify the highest-opportunity areas for automation.",
  },
  {
    step: "03",
    title: "You Receive",
    body: "Within one week of the discovery session, you receive your complete audit: workflow map, dollar-figure roadmap, and prioritized build plan with projected ROI for each opportunity.",
  },
  {
    step: "04",
    title: "You Decide",
    body: "If the total recoverable capacity is under $50K/yr, the audit is free — you pay nothing. If it's over $50K/yr, you can proceed to implementation, with the $2,500 fully credited toward your first build engagement.",
  },
];

const faqs = [
  {
    q: "What does 'recoverable capacity' mean exactly?",
    a: "Recoverable capacity is the total annual dollar value of hours your team is spending on work that an AI system could handle. This includes manual data entry between systems, repetitive client follow-up emails, compliance document generation, report production, and routine client enquiries. We calculate it by mapping each workflow, measuring the hours consumed, and applying your team's effective hourly rate. If the total doesn't reach $50K/yr, you don't pay a cent.",
  },
  {
    q: "How do you measure recoverable capacity?",
    a: "Through a structured discovery session where we walk through your core workflows step by step. We estimate time per task, frequency per week, and the staff involved. We then cross-reference with any available time-tracking or billing data you provide. Every opportunity is quantified conservatively — we'd rather under-promise and over-deliver.",
  },
  {
    q: "What if my firm is very small — can we still find $50K?",
    a: "It depends. A sole practitioner billing $200/hr who spends 5 hours a week on admin is leaving $50K/yr on the table from just one workflow. For most firms with 2+ staff, $50K in recoverable capacity is a low bar. If we can't find it, the audit is free, and you walk away with a clearer picture of your operation at no cost.",
  },
  {
    q: "How is the $2,500 credited toward implementation?",
    a: "If after reviewing your audit you decide to proceed with an Efficiency Sprint or Managed AI Operations, the full $2,500 audit fee is deducted from your first build invoice. Think of it as a down payment on your automation journey. If you never proceed to a build, you still keep the audit — we don't claw it back.",
  },
  {
    q: "Is the audit remote or on-site?",
    a: "The audit is conducted entirely remotely via video call. We've audited firms across Brisbane, Sydney, Melbourne, Perth, Adelaide, and regional Australia — geography is not a limitation. If on-site would be more productive for your team, we can discuss that during booking.",
  },
  {
    q: "What happens after the audit?",
    a: "We present your findings in a 30-minute walkthrough call and answer any questions. You then decide whether to proceed with implementation. There is no pressure, no expiry on the audit pricing, and no sales follow-up sequence. Some firms implement immediately, others sit on it for months before acting. Either is fine.",
  },
];

export default function Audit() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <Nav activePage="/audit" />

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
            AI Efficiency Audit · Fixed-Price · For Accounting Firms
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          Find your firm&apos;s
          <br />
          <span className="text-gradient">hidden capacity.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-14 leading-relaxed">
          A fixed-price, one-week audit that maps your workflows, quantifies
          the hours your team is losing to manual processes, and delivers a
          dollar-figure roadmap of recoverable capacity — guaranteed.
        </p>

        <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <a
            href="https://calendly.com/shanegoldberg/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-saabai-teal text-saabai-bg px-9 py-[14px] rounded-xl font-semibold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_30px_var(--saabai-glow-mid)]"
          >
            Book Your Audit
          </a>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, var(--saabai-bg))",
          }}
        />
      </section>

      {/* ── The Guarantee ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <div
          className="relative rounded-2xl overflow-hidden border border-saabai-border-accent bg-saabai-surface p-14 text-center"
          style={{
            boxShadow: "0 0 80px rgba(98,197,209,0.35), 0 0 32px rgba(98,197,209,0.15)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/40 to-transparent" />
          <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-teal uppercase mb-6">
            The Guarantee
          </p>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-8 max-w-3xl mx-auto leading-[1.1]">
            &ldquo;If we don&apos;t find at least
            <br />
            <span className="text-gradient">$50K/yr in recoverable capacity</span>
            ,<br />
            you don&apos;t pay.&rdquo;
          </h2>
          <p className="text-base text-saabai-text-muted max-w-2xl mx-auto leading-relaxed mb-14">
            Most firms have tens of thousands of dollars in recoverable
            capacity sitting in manual processes, repetitive admin, and
            outdated workflows. If we can&apos;t find at least $50K/yr in
            your operation, the audit is completely free. No invoice, no fine
            print, no follow-up.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://calendly.com/shanegoldberg/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-saabai-teal text-saabai-bg px-9 py-[14px] rounded-xl font-semibold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_30px_var(--saabai-glow-mid)]"
            >
              Book Your Audit
            </a>
            <p className="text-xs text-saabai-text-dim tracking-wide">
              Pay only if we deliver $50K+ in findings
            </p>
          </div>
        </div>
      </section>

      {/* ── What You Get ──────────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          What You Get
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-6 max-w-2xl mx-auto leading-snug">
          Three deliverables, one week.
        </h2>
        <p className="text-base text-saabai-text-muted text-center max-w-2xl mx-auto mb-20 leading-relaxed">
          From discovery session to completed audit report in five business
          days. No meetings after the initial session — we do the work, you
          receive the output.
        </p>

        <div
          className="grid md:grid-cols-3 gap-px bg-saabai-border rounded-xl overflow-hidden"
          style={{
            boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)",
          }}
        >
          {deliverables.map(({ icon, title, description }) => (
            <div key={title} className="bg-saabai-surface p-12 relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
              <div className="mb-6">{icon}</div>
              <h3 className="text-xl font-semibold tracking-tight mb-4">
                {title}
              </h3>
              <p className="text-sm text-saabai-text-muted leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing Summary ────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <div className="grid md:grid-cols-2 gap-px bg-saabai-border rounded-xl overflow-hidden">
          <div className="bg-saabai-surface p-14 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-border to-transparent" />
            <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-5">
              Price
            </p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-6xl font-semibold tracking-tight text-saabai-teal stat-glow">
                $2,500
              </span>
              <span className="text-sm text-saabai-text-dim">AUD</span>
            </div>
            <p className="text-sm text-saabai-text-muted mt-2 leading-relaxed">
              One-time fixed price. Secure payment via Stripe. 7-day refund
              window before discovery session begins.
            </p>
          </div>
          <div className="bg-saabai-surface p-14 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-border to-transparent" />
            <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-5">
              Duration
            </p>
            <div className="text-5xl font-semibold tracking-tight stat-glow" style={{ color: "var(--saabai-glow-mid)" }}>
              1 week
            </div>
            <p className="text-sm text-saabai-text-muted mt-2 leading-relaxed">
              From Calendly booking to completed audit report. One 90-minute
              discovery session. The rest is done on our side.
            </p>
          </div>
        </div>
      </section>

      {/* ── 100% Credited ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <div
          className="relative rounded-xl overflow-hidden border border-saabai-border-accent bg-saabai-surface p-14 text-center"
          style={{
            boxShadow: "0 0 80px rgba(98,197,209,0.35), 0 0 32px rgba(98,197,209,0.15)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/40 to-transparent" />
          <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-teal uppercase mb-6">
            100% Credited Toward Build
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6 max-w-3xl mx-auto leading-snug">
            Your $2,500 audit fee is fully credited
            <br />
            <span className="text-gradient">toward your first implementation.</span>
          </h2>
          <p className="text-base text-saabai-text-muted max-w-2xl mx-auto leading-relaxed mb-10">
            When you&apos;re ready to build, the full $2,500 is deducted from
            your first Efficiency Sprint or Managed AI Operations invoice. The
            audit isn&apos;t an upsell — it&apos;s the first step in a
            partnership, and we credit the investment forward.
          </p>
          <a
            href="https://calendly.com/shanegoldberg/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-saabai-teal text-saabai-bg px-9 py-[14px] rounded-xl font-semibold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_30px_var(--saabai-glow-mid)]"
          >
            Book Your Audit
          </a>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          How the Audit Works
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-24 max-w-2xl mx-auto leading-snug">
          Book, map, receive, decide. That&apos;s it.
        </h2>

        <div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-saabai-border rounded-xl overflow-hidden"
          style={{
            boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)",
          }}
        >
          {process.map(({ step, title, body }) => (
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

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-3xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-teal uppercase text-center mb-5">
          AI Efficiency Audit FAQ
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-16 max-w-2xl mx-auto leading-snug">
          Everything you need to know before booking.
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
          Ready to Find Your Hidden Capacity?
        </p>
        <h2 className="relative text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.02em] mb-7 max-w-2xl mx-auto leading-[1.08]">
          Book a free 30-minute call
          <br />
          <span className="text-gradient">to get started.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          We&apos;ll confirm the audit is right for your firm and get you
          booked in. No pitch, no invoice, no follow-up pressure. If
          we&apos;re not a good fit, we&apos;ll tell you.
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
