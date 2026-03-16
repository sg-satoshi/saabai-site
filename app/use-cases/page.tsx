import Nav from "../components/Nav";
import Footer from "../components/Footer";

const useCases = [
  {
    category: "Law Firms",
    description:
      "Law firms run on expertise, relationships, and precision. The problem is that principals and staff spend a disproportionate amount of time on admin that has nothing to do with practising law.",
    examples: [
      "AI-assisted client intake that qualifies matters before anyone touches them",
      "Automated follow-up for enquiries that went quiet",
      "Document templates that populate from intake data",
      "Billing and deadline reminders without manual chasing",
    ],
    outcome: "Fee earners spend more time on client work. Intake runs itself. Nothing falls through the cracks.",
  },
  {
    category: "Real Estate Agencies",
    description:
      "Lead qualification and follow-up is where most agencies lose revenue. An AI system can respond to every new enquiry within seconds, qualify the opportunity, and escalate only the serious buyers and sellers to your agents.",
    examples: [
      "Instant AI response to every inbound enquiry",
      "Automated inspection reminders and appraisal follow-up sequences",
      "Listing update communications to matched buyers",
      "Vendor report automation",
    ],
    outcome: "Agents focus on relationships and negotiations. The system handles everything else.",
  },
  {
    category: "Accounting Firms",
    description:
      "Accounting firms operate on tight deadlines with high compliance requirements. Automation removes the manual coordination overhead — chasing clients for documents, sending reminders, generating reports — so your team can focus on advice.",
    examples: [
      "Automated client onboarding and document collection",
      "Deadline reminder sequences for tax and compliance lodgements",
      "Report generation from structured data",
      "Client communication workflows",
    ],
    outcome: "Less time chasing. More time advising. Deadlines managed without manual coordination.",
  },
  {
    category: "Financial Advisory",
    description:
      "Advisers spend a significant portion of their week on compliance documentation, review scheduling, and client communication — work that is highly repeatable and well-suited to automation.",
    examples: [
      "Annual review reminder and scheduling automation",
      "Pre-meeting data collection workflows",
      "Post-meeting follow-up and SOA preparation support",
      "Automated portfolio update communications",
    ],
    outcome: "More client-facing time for advisers. Compliance workflows running in the background.",
  },
  {
    category: "Compliance & Document Automation",
    description:
      "Across every professional firm, there is a layer of compliance, documentation, and audit trail work that consumes hours and creates risk when it falls behind. Automation brings consistency and speed to this work.",
    examples: [
      "Automated compliance checklist generation",
      "Contract and engagement letter workflows",
      "Audit trail documentation",
      "Regulatory deadline tracking and escalation",
    ],
    outcome: "Compliance runs to schedule. Documentation is consistent. Audit risk is reduced.",
  },
];

const inlineCta = {
  headline: "See this in your firm?",
  body: "Book a free 30-minute call. We'll identify the highest-value automation opportunities in your specific operation.",
  cta: "Book Your Free Strategy Call",
};

export default function UseCases() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">

      <Nav activePage="/use-cases" />

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
            AI Automation for Professional Firms · Real-World Applications
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          What can actually be
          <br />
          <span className="text-gradient">automated in your firm?</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-6 leading-relaxed">
          Practical examples of how professional firms are using AI automation
          to reclaim hours, reduce operational risk, and focus on the work that
          actually requires expertise.
        </p>
        <p className="relative text-base text-saabai-text-dim max-w-xl mx-auto mb-14 leading-relaxed">
          If your business runs on expertise, there&apos;s almost always a layer of
          operational work that can be automated — without changing how you
          deliver value to clients.
        </p>

        <a
          href="https://calendly.com/shanegoldberg/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="relative bg-saabai-teal text-saabai-bg px-9 py-[14px] rounded-xl font-semibold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide"
        >
          Book Your Free Strategy Call
        </a>

        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{
          background: "linear-gradient(to bottom, transparent, var(--saabai-bg))"
        }} />
      </section>

      {/* ── Use Case Sections ────────────────────────────────────────────── */}
      {useCases.map(({ category, description, examples, outcome }, i) => (
        <div key={category}>
          <section
            className={`py-24 px-6 max-w-5xl mx-auto ${i > 0 ? "border-t border-saabai-border" : ""}`}
          >
            <div className="grid md:grid-cols-2 gap-16 items-start">

              {/* Left — text */}
              <div>
                <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-4">
                  Use Case {String(i + 1).padStart(2, "0")}
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6 leading-snug">
                  {category}
                </h2>
                <p className="text-base text-saabai-text-muted leading-relaxed mb-8">
                  {description}
                </p>

                {/* Outcome */}
                <div className="border-l-2 border-saabai-teal/50 pl-5">
                  <p className="text-[11px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-1">
                    The Result
                  </p>
                  <p className="text-base text-saabai-text leading-relaxed">
                    {outcome}
                  </p>
                </div>
              </div>

              {/* Right — examples card */}
              <div className="bg-saabai-surface rounded-xl border border-saabai-border overflow-hidden relative" style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)" }}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
                <div className="p-8">
                  <p className="text-[11px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-6">
                    What Gets Automated
                  </p>
                  <ul className="flex flex-col gap-4">
                    {examples.map((ex) => (
                      <li key={ex} className="flex items-start gap-3 text-base text-saabai-text-muted">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-saabai-teal shrink-0" />
                        {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          </section>

          {/* Inline CTA — after every 2nd use case */}
          {(i === 1 || i === 3) && (
            <div className="px-6 py-12 max-w-5xl mx-auto border-t border-saabai-border">
              <div
                className="bg-saabai-surface rounded-2xl border border-saabai-border p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
                style={{ boxShadow: "0 0 40px rgba(98,197,209,0.2)" }}
              >
                <div>
                  <p className="text-lg font-semibold tracking-tight mb-1">{inlineCta.headline}</p>
                  <p className="text-sm text-saabai-text-muted max-w-md leading-relaxed">{inlineCta.body}</p>
                </div>
                <a
                  href="https://calendly.com/shanegoldberg/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 bg-saabai-teal text-saabai-bg px-7 py-3 rounded-xl font-semibold text-sm hover:bg-saabai-teal-bright transition-colors tracking-wide whitespace-nowrap"
                >
                  {inlineCta.cta}
                </a>
              </div>
            </div>
          )}
        </div>
      ))}

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
          Find out what could be
          <br />
          <span className="text-gradient">automated in your firm.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Book a free 30-minute strategy call. We&apos;ll map your workflows,
          identify the highest-value automation opportunities, and give you a
          clear picture of what&apos;s possible — no obligation.
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
          No obligation. No jargon. Just a clear picture of what&apos;s possible.
        </p>
      </section>

      <Footer />

    </div>
  );
}
