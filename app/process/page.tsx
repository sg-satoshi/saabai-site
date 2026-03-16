import Nav from "../components/Nav";
import Footer from "../components/Footer";

const steps = [
  {
    step: "01",
    title: "AI Audit",
    description:
      "We map your workflows, tools, and team operations to identify exactly where automation will create the biggest impact.",
    detail:
      "In a focused 90-minute session, we document your existing processes and bottlenecks. You receive a written report detailing every automation opportunity, ranked by business impact and ease of implementation — with projected time savings for each.",
  },
  {
    step: "02",
    title: "System Design",
    description:
      "We design custom automation workflows tailored to your firm — not generic templates adapted to fit.",
    detail:
      "Every system is built around your specific tools, team structure, and commercial priorities. You get a clear implementation roadmap, architecture documentation, and a realistic picture of what gets built and in what order.",
  },
  {
    step: "03",
    title: "Build & Deploy",
    description:
      "Your automation systems are implemented, integrated with your existing tools, and handed over with full documentation.",
    detail:
      "We handle the full build, integration, and testing process. Your team doesn&apos;t need to manage the technical side — they just get working automation. Handover includes documentation and training so your team can operate the system confidently.",
  },
  {
    step: "04",
    title: "Ongoing Optimisation",
    description:
      "We monitor, refine, and improve your systems monthly — so they get better over time, not worse.",
    detail:
      "Monthly review cycles, performance monitoring, and iterative improvements keep your systems compounding in value. Automation should get smarter the longer it runs. If something breaks or drifts, that&apos;s our problem to fix — not yours.",
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
            How We Work · Audit to Deployment · Built for Professional Firms
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          From audit to
          <br />
          <span className="text-gradient">operating advantage.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-14 leading-relaxed">
          A structured, four-step process that takes professional firms from
          identifying the right workflows to automating them — without
          disrupting how your team works.
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

      {/* ── Timeline callout ─────────────────────────────────────────────── */}
      <section className="py-16 px-6 max-w-4xl mx-auto border-t border-saabai-border">
        <div className="border-l-2 border-saabai-teal/50 pl-8 py-2">
          <p className="text-[11px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-3">
            Typical Timeline
          </p>
          <p className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
            Most firms have their first automations live within 2–4 weeks of the audit.
          </p>
          <p className="text-base text-saabai-text-muted leading-relaxed max-w-2xl">
            The AI Audit is the starting point — a 90-minute session that produces a written roadmap of what to automate, in what order, with projected time savings for each workflow. From there, we move to design and build quickly.
          </p>
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
          The audit is where
          <br />
          <span className="text-gradient">everything starts.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Book a free 30-minute strategy call. We&apos;ll map your workflows and
          identify exactly where automation will create the biggest impact in
          your firm — no commitment required.
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
