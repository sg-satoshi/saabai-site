import Nav from "../components/Nav";

const useCases = [
  {
    category: "Sales & Lead Qualification",
    description:
      "AI systems can automatically qualify leads, follow up with prospects, and book meetings without manual outreach.",
    examples: [
      "AI lead qualification and scoring",
      "Automated email follow-up sequences",
      "CRM pipeline automation",
      "Meeting booking automation",
    ],
    outcome: "Faster response times and more qualified sales conversations.",
  },
  {
    category: "Customer Support Automation",
    description:
      "AI-powered assistants can answer common questions instantly, reducing the workload on support teams.",
    examples: [
      "24/7 automated responses",
      "AI knowledge base assistants",
      "Ticket triage and routing",
      "Support workflow automation",
    ],
    outcome: "Lower support costs and faster customer response times.",
  },
  {
    category: "Operations & Admin Automation",
    description:
      "Many businesses waste hours on repetitive operational tasks that can be automated.",
    examples: [
      "Automated reporting",
      "Data synchronisation across systems",
      "Document processing",
      "Workflow automation",
    ],
    outcome: "Significant time savings and improved operational efficiency.",
  },
];

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
            Real-World Applications · Business Outcomes · Practical AI
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          AI Automation
          <br />
          <span className="text-gradient">Use Cases.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-6 leading-relaxed">
          Practical examples of how intelligent automation can eliminate
          repetitive work and unlock efficiency across modern businesses.
        </p>
        <p className="relative text-base text-saabai-text-dim max-w-xl mx-auto mb-14 leading-relaxed">
          Every business has processes that consume time, slow growth, or create
          operational bottlenecks. Saabai designs AI-powered systems that
          automate these workflows so teams can focus on higher-value work.
        </p>

        <a
          href="https://calendly.com/shanegoldberg/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="relative bg-saabai-teal text-saabai-bg px-9 py-[14px] rounded-xl font-semibold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide"
        >
          Book an AI Automation Strategy Call
        </a>

        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{
          background: "linear-gradient(to bottom, transparent, var(--saabai-bg))"
        }} />
      </section>

      {/* ── Use Case Sections ────────────────────────────────────────────── */}
      {useCases.map(({ category, description, examples, outcome }, i) => (
        <section
          key={category}
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
                  Business Outcome
                </p>
                <p className="text-base text-saabai-text leading-relaxed">
                  {outcome}
                </p>
              </div>
            </div>

            {/* Right — examples card */}
            <div className="bg-saabai-surface rounded-xl border border-saabai-border overflow-hidden" style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)" }}>
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
              <div className="p-8">
                <p className="text-[11px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-6">
                  Examples
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
          Discover what automation
          <br />
          <span className="text-gradient">could do for your business.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Book a short strategy call and we&apos;ll identify where automation
          could create the biggest impact in your operations.
        </p>
        <a
          href="https://calendly.com/shanegoldberg/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-block bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
        >
          Book an AI Automation Strategy Call
        </a>
        <ul className="relative mt-8 mb-4 flex flex-col items-start gap-3 text-left mx-auto w-fit">
          {[
            "Identify repetitive work that can be automated",
            "Discover where AI agents can save time and money",
            "Walk away with practical next steps",
          ].map((point) => (
            <li key={point} className="flex items-center gap-3 text-saabai-text-muted text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal shrink-0" />
              {point}
            </li>
          ))}
        </ul>
        <p className="relative text-saabai-text-dim text-xs mt-4 tracking-wide">
          No obligation. No jargon. Just a clear picture of what&apos;s possible.
        </p>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-saabai-border py-10 px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <a href="/">
          <img src="/brand/saabai-logo.png" alt="Saabai.ai" width={100} height={28} />
        </a>
        <p className="text-xs text-saabai-text-dim tracking-wide">
          © {new Date().getFullYear()} Saabai.ai. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
