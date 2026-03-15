import Nav from "../components/Nav";

const steps = [
  {
    step: "01",
    title: "AI Efficiency Audit",
    description:
      "We analyse your current workflows to identify repetitive tasks, bottlenecks, and opportunities for automation.",
    detail:
      "In a focused 90-minute session, we map your existing tools, processes, and team workflows. You receive a written report detailing every automation opportunity ranked by business impact and ease of implementation.",
  },
  {
    step: "02",
    title: "Automation System Design",
    description:
      "We design AI-powered workflows and automation systems tailored to your business operations.",
    detail:
      "No generic templates. Every system is built around your specific tools, team structure, and commercial priorities — with a clear implementation roadmap and projected time savings.",
  },
  {
    step: "03",
    title: "Implementation & Deployment",
    description:
      "Your automation systems are deployed and integrated with your existing tools and software platforms.",
    detail:
      "We handle the full build, integration, and testing process. Your team gets working automation from day one — with handover documentation and training included.",
  },
  {
    step: "04",
    title: "Continuous Optimisation",
    description:
      "We refine and improve your automation systems to ensure they continue delivering efficiency gains.",
    detail:
      "Monthly review cycles, performance monitoring, and iterative improvements keep your systems compounding in value over time. Automation should get better the longer it runs.",
  },
];

export default function Process() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">

      <Nav activePage="/process" />

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
            Structured · Practical · Outcome-Driven
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          Our Automation
          <br />
          <span className="text-gradient">Process.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-14 leading-relaxed">
          A structured approach to identifying, designing, and deploying
          automation systems that deliver real business outcomes.
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

      {/* ── Steps ───────────────────────────────────────────────────────── */}
      <section className="py-8 px-6 max-w-4xl mx-auto">
        <div className="flex flex-col gap-0">
          {steps.map(({ step, title, description, detail }, i) => (
            <div
              key={step}
              className={`relative grid md:grid-cols-[80px_1fr] gap-8 py-16 ${i < steps.length - 1 ? "border-b border-saabai-border" : ""}`}
            >
              {/* Step number */}
              <div
                className="text-[72px] font-bold leading-none tracking-tight select-none hidden md:block"
                style={{ color: "var(--saabai-glow-mid)" }}
              >
                {step}
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center gap-4 mb-5">
                  <span
                    className="text-sm font-bold tracking-widest md:hidden"
                    style={{ color: "var(--saabai-glow-mid)" }}
                  >
                    {step}
                  </span>
                  <div className="w-8 h-px bg-saabai-teal/50" />
                </div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
                  {title}
                </h2>
                <p className="text-lg text-saabai-text-muted leading-relaxed mb-4">
                  {description}
                </p>
                <p className="text-base text-saabai-text-dim leading-relaxed">
                  {detail}
                </p>
              </div>
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
          Ready to automate
          <br />
          <span className="text-gradient">your operations?</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Start with a free AI Efficiency Audit. We&apos;ll map your workflows
          and identify exactly where automation will create the biggest impact.
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
