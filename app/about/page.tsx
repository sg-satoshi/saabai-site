import Nav from "../components/Nav";

const differentiators = [
  "Focus on business outcomes, not AI buzzwords",
  "Custom automation systems tailored to each business",
  "Practical implementations that integrate with existing tools",
  "Continuous optimisation to maximise efficiency",
];

export default function About() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">

      <Nav activePage="/about" />

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
            Our Mission · Our Philosophy · Our Approach
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          About
          <br />
          <span className="text-gradient">Saabai.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-14 leading-relaxed">
          Helping businesses reclaim time, reduce operational friction, and
          unlock growth through intelligent automation.
        </p>

        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{
          background: "linear-gradient(to bottom, transparent, var(--saabai-bg))"
        }} />
      </section>

      {/* ── Mission ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-4xl mx-auto">
        <div className="grid md:grid-cols-[200px_1fr] gap-12 items-start">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-3">
              Our Mission
            </p>
            <div className="w-8 h-px bg-saabai-teal/50 mt-4" />
          </div>
          <div>
            <p className="text-xl md:text-2xl text-saabai-text-muted leading-relaxed">
              Saabai was created to help businesses escape the constant pressure
              of repetitive operational work. By designing intelligent automation
              systems, we enable teams to focus on strategy, growth, and
              high-value work instead of manual processes.
            </p>
          </div>
        </div>
      </section>

      {/* ── Philosophy ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-4xl mx-auto border-t border-saabai-border">
        <div className="grid md:grid-cols-[200px_1fr] gap-12 items-start">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-3">
              Our Philosophy
            </p>
            <div className="w-8 h-px bg-saabai-teal/50 mt-4" />
          </div>
          <div className="flex flex-col gap-6">
            <p className="text-2xl md:text-3xl font-semibold tracking-tight leading-snug">
              AI should not be hype.
              <br />
              <span className="text-saabai-text-muted">It should deliver measurable business outcomes.</span>
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              Saabai focuses on practical automation systems that reduce costs,
              save time, and make businesses run more efficiently. We don&apos;t
              sell AI for the sake of it — we solve real operational problems
              with the right tools.
            </p>
          </div>
        </div>
      </section>

      {/* ── What Makes Saabai Different ──────────────────────────────────── */}
      <section className="py-24 px-6 max-w-4xl mx-auto border-t border-saabai-border">
        <div className="grid md:grid-cols-[200px_1fr] gap-12 items-start">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-3">
              What Makes Us Different
            </p>
            <div className="w-8 h-px bg-saabai-teal/50 mt-4" />
          </div>
          <div className="flex flex-col gap-4">
            {differentiators.map((point) => (
              <div
                key={point}
                className="flex items-start gap-4 py-5 border-b border-saabai-border last:border-0"
              >
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-saabai-teal shrink-0" />
                <p className="text-lg text-saabai-text-muted leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
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
          Explore how automation could
          <br />
          <span className="text-gradient">transform your business.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Book a free strategy call and discover exactly where AI automation
          can save your business time, reduce costs, and unlock growth.
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
