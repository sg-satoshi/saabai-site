import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "AI Automation Services for Professional Firms",
  description:
    "Custom AI automation services for professional firms — client intake, workflow automation, compliance document systems, and 24/7 AI agents. Book a free strategy call.",
  alternates: { canonical: "https://www.saabai.ai/services" },
  openGraph: {
    url: "https://www.saabai.ai/services",
    title: "AI Automation Services for Professional Firms | Saabai",
    description:
      "Custom AI automation services for professional firms — client intake, workflow automation, compliance docs, and 24/7 AI agents. Book a free strategy call.",
  },
};

const services: { title: string; description: string; benefits: string[]; wide?: boolean }[] = [
  {
    title: "Client Intake & Lead Qualification",
    description:
      "AI systems that screen enquiries, qualify leads, and route them correctly — before anyone on your team touches them.",
    benefits: [
      "Automated lead scoring and qualification",
      "Intelligent enquiry routing",
      "CRM pipeline automation",
      "Instant follow-up sequences",
    ],
  },
  {
    title: "Client Communications & Support",
    description:
      "AI-powered response systems that handle routine client queries 24/7 — so your team focuses on complex, high-value work.",
    benefits: [
      "24/7 automated client responses",
      "Knowledge base integration",
      "Appointment and scheduling automation",
      "Proactive client status updates",
    ],
  },
  {
    title: "Operations & Workflow Automation",
    description:
      "Connect your CRM, documents, calendar, and billing systems into automated pipelines that run without manual input.",
    benefits: [
      "Cross-system data synchronisation",
      "Automated reporting and dashboards",
      "Document generation workflows",
      "Task routing and escalation",
    ],
  },
  {
    title: "Compliance & Document Automation",
    description:
      "Automate compliance documentation, contract workflows, and audit trails — reducing risk and reclaiming hours.",
    benefits: [
      "Automated document generation",
      "Compliance checklists and reminders",
      "Digital signature workflows",
      "Audit trail management",
    ],
  },
  {
    title: "AI Chat Agents",
    description:
      "Custom AI agents embedded directly on your website — handling enquiries, quoting, lead qualification, and client support around the clock. Currently live across specialist law firms, trade businesses, and professional services. No staff required after hours.",
    benefits: [
      "Custom-trained on your products, services, and pricing",
      "Captures and qualifies leads automatically",
      "Instant responses — day, night, and weekends",
      "CRM integration and email notification on every lead",
    ],
    wide: true,
  },
];

const steps = [
  {
    step: "01",
    title: "AI Audit",
    body: "We analyse your current operations to identify where automation can create the biggest impact.",
  },
  {
    step: "02",
    title: "System Design",
    body: "We design custom AI workflows tailored to your firm's specific tools, team structure, and commercial priorities.",
  },
  {
    step: "03",
    title: "Build & Deploy",
    body: "Your automation systems are implemented and integrated into your existing tools — no ripping anything out.",
  },
  {
    step: "04",
    title: "Ongoing Optimisation",
    body: "Monthly review cycles, performance monitoring, and iterative improvements to compound efficiency over time.",
  },
];

const results = [
  {
    stat: "20–30 hrs",
    label: "Recovered per week",
    detail: "Professional firms typically recover 20–30 hours a week by automating admin, reporting, follow-up, and document workflows.",
  },
  {
    stat: "3×",
    label: "Faster response times",
    detail: "AI agents respond to leads and clients instantly — day or night — without increasing headcount.",
  },
  {
    stat: "40%",
    label: "Reduction in operational costs",
    detail: "Automating manual workflows reduces the cost of delivery, support, and administration across the firm.",
  },
  {
    stat: "24/7",
    label: "Automated coverage",
    detail: "AI systems handle enquiries, follow-up, and routine tasks around the clock — no sick days, no overtime.",
  },
];

export default function Services() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">

      <Nav activePage="/services" />

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
            AI Automation for Professional Firms · Australia
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          Stop managing admin.
          <br />
          <span className="text-gradient">Start scaling expertise.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-14 leading-relaxed">
          We design and deploy custom automation systems that eliminate
          operational drag — so your team can focus on high-value client work,
          not the admin wrapped around it.
        </p>

        <div className="relative">
          <a
            href="https://calendly.com/shanegoldberg/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-saabai-teal text-saabai-bg px-9 py-[14px] rounded-xl font-semibold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide"
          >
            Book Your Free Strategy Call
          </a>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{
          background: "linear-gradient(to bottom, transparent, var(--saabai-bg))"
        }} />
      </section>

      {/* ── Advisory & Board Roles ───────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <div
          className="relative rounded-xl overflow-hidden border border-saabai-border-accent bg-saabai-surface p-10 md:p-14 flex flex-col md:flex-row md:items-center gap-8"
          style={{ boxShadow: "0 0 80px rgba(98,197,209,0.35), 0 0 32px rgba(98,197,209,0.15)" }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/40 to-transparent" />
          <div className="flex-1">
            <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-teal uppercase mb-4">
              New Offering
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4 leading-snug">
              Advisory &amp; Board Roles
            </h2>
            <p className="text-base text-saabai-text-muted leading-relaxed max-w-xl">
              Beyond implementation — Shane Goldberg is now available for advisory retainers,
              board of director positions, advisory board roles, and implementation oversight
              engagements. For leadership teams and boards that need AI expertise at the
              decision-making level, not just the operational level.
            </p>
            <ul className="flex flex-col gap-2.5 mt-6">
              {["AI Advisory Retainer (2–4 days/month)", "Board of Directors", "Advisory Board Member", "Implementation Oversight"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-saabai-text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="shrink-0">
            <a
              href="/advisory"
              className="inline-block bg-saabai-teal text-saabai-bg px-8 py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity tracking-wide shadow-[0_0_30px_var(--saabai-glow-mid)] whitespace-nowrap"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* ── What We Help Automate ────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          What We Help Professional Firms Automate
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-6 max-w-2xl mx-auto leading-snug">
          Stop doing manually what AI can do automatically.
        </h2>
        <p className="text-base text-saabai-text-muted text-center max-w-2xl mx-auto mb-20 leading-relaxed">
          Most professional firms are held back by the same problems: manual
          admin, slow client follow-up, repetitive reporting. Saabai identifies
          these bottlenecks and replaces them with intelligent systems built
          around how your firm actually operates.
        </p>

        <div className="grid md:grid-cols-2 gap-px bg-saabai-border rounded-xl overflow-hidden" style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)" }}>
          {services.map(({ title, description, benefits, wide }) => (
            <div
              key={title}
              className={`bg-saabai-surface p-12 hover:bg-saabai-surface-raised transition-colors relative group${wide ? " md:col-span-2" : ""}`}
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
          How We Work
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-24 max-w-2xl mx-auto leading-snug">
          From bottleneck to automated — in weeks.
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-saabai-border rounded-xl overflow-hidden" style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)" }}>
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
          Results Professional Firms Typically See
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-20 max-w-2xl mx-auto leading-snug">
          Time recovered. Costs reduced. Capacity unlocked.
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-saabai-border rounded-xl overflow-hidden" style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)" }}>
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
          Find out exactly where your firm
          <br />
          <span className="text-gradient">is losing time — and how to fix it.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Book a free 30-minute strategy call. We&apos;ll map the highest-value
          automation opportunities in your operation and give you a clear
          picture of what&apos;s possible — no obligation, no jargon.
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
