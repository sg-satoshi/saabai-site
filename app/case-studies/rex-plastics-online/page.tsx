import type { Metadata } from "next";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

export const metadata: Metadata = {
  title: "Case Study: Rex Plastics — AI Sales Agent Recovers 60% of Sales Day",
  description:
    "How a national plastics supplier deployed an AI sales agent (Rex) and recovered 60% of their sales team's day: 344 leads in 30 days, $218K quoted pipeline, 59% email capture.",
  alternates: {
    canonical: "https://www.saabai.ai/case-studies/rex-plastics-online",
  },
  openGraph: {
    url: "https://www.saabai.ai/case-studies/rex-plastics-online",
    title: "Case Study: Rex Plastics — AI Sales Agent Recovers 60% of Sales Day | Saabai",
    description:
      "How a national plastics supplier deployed an AI sales agent and recovered 60% of their sales day: 344 leads in 30 days, $218K quoted pipeline.",
  },
};

const stats = [
  { value: "344", label: "Leads in 30 days" },
  { value: "$218K", label: "Quoted pipeline in 30 days" },
  { value: "59%", label: "Email capture rate" },
  { value: "$1,316", label: "Average quote value" },
];

export default function RexPlasticsCaseStudy() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <Nav />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-52 pb-20 px-6 max-w-5xl mx-auto overflow-hidden">
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

        {/* Tags */}
        <div className="relative flex flex-wrap items-center gap-3 mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-saabai-surface-raised border border-saabai-border text-[11px] font-medium tracking-[0.15em] text-saabai-teal uppercase">
            Trade &amp; Retail Supply
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-saabai-surface-raised border border-saabai-border text-[11px] font-medium tracking-[0.15em] text-saabai-text-dim uppercase">
            AI Sales Agent
          </span>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saabai-surface border border-saabai-border text-[11px] font-semibold tracking-[0.12em] text-saabai-teal uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal inline-block" />
            Live in 3 weeks
          </span>
        </div>

        <h1 className="relative text-5xl md:text-6xl lg:text-[72px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          How a National Plastics Supplier
          <br />
          <span className="text-gradient">Recovered 60% of Their Sales Day</span>
        </h1>

        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, var(--saabai-bg))",
          }}
        />
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="pb-20 px-6 max-w-5xl mx-auto">
        <div
          className="grid md:grid-cols-4 gap-px bg-saabai-border rounded-xl overflow-hidden"
          style={{
            boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 160px rgba(98,197,209,0.15)",
          }}
        >
          {stats.map(({ value, label }) => (
            <div key={label} className="bg-saabai-surface p-10 text-center relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
              <p className="stat-glow text-4xl md:text-5xl font-semibold tracking-tight text-saabai-teal mb-2">
                {value}
              </p>
              <p className="text-xs text-saabai-text-muted leading-relaxed">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Overview ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-4">
                  Company
                </p>
            <h2 className="text-3xl font-semibold tracking-tight mb-3">
              National Plastics Supplier
            </h2>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              A large national plastics supplier serving trade and retail
              customers across Australia. Name withheld on request.
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-4">
              Engagement
            </p>
            <h2 className="text-3xl font-semibold tracking-tight mb-3">
              AI Sales Agent: &ldquo;Rex&rdquo;
            </h2>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              3-week deployment of a custom AI sales agent embedded on the
              supplier&apos;s website, handling product enquiries, real-time
              cut-to-size pricing, and 24/7 lead capture.
            </p>
          </div>
        </div>
      </section>

      {/* ── Problem ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-5">
          The Problem
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-16 max-w-2xl leading-snug">
          Repetitive quoting was consuming 60% of the sales team&apos;s day.
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-saabai-surface border border-saabai-border rounded-xl p-10">
            <div className="text-[72px] font-bold leading-none tracking-tight mb-4 select-none" style={{ color: "var(--saabai-glow-mid)" }}>
              60%
            </div>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              Of the sales team&apos;s day was consumed by manual quoting —
              repetitive product and pricing enquiries that left no capacity
              for relationship-building or higher-value sales activity.
            </p>
          </div>
          <div className="bg-saabai-surface border border-saabai-border rounded-xl p-10">
            <div className="text-[72px] font-bold leading-none tracking-tight mb-4 select-none" style={{ color: "var(--saabai-glow-mid)" }}>
              2-4 hrs
            </div>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              Customers waited 2–4 hours for simple cut-to-size quotes. What
              could be answered in seconds was taking half a day, generating
              frustration and lost sales.
            </p>
          </div>
          <div className="bg-saabai-surface border border-saabai-border rounded-xl p-10">
            <div className="text-[72px] font-bold leading-none tracking-tight mb-4 select-none" style={{ color: "var(--saabai-glow-mid)" }}>
              Lost
            </div>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              After-hours enquiries were lost entirely. Customers visiting the
              website outside business hours had no way to get a quote or
              capture their enquiry. No follow-up, no contact captured — pure
              missed revenue.
            </p>
          </div>
        </div>
      </section>

      {/* ── Solution ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-teal uppercase mb-5">
          The Solution
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6 leading-snug">
          &ldquo;Rex&rdquo;, an AI sales agent embedded on the website.
        </h2>
        <p className="text-base text-saabai-text-muted max-w-3xl mb-16 leading-relaxed">
          Saabai deployed Rex, a custom AI sales agent trained on the
          supplier&apos;s full product catalogue, pricing tables, and
          cut-to-size calculation logic. Embedded directly on the website via
          a small widget, Rex handles every product and pricing enquiry in
          real time.
        </p>

        <div className="grid md:grid-cols-3 gap-px bg-saabai-border rounded-xl overflow-hidden">
          <div className="bg-saabai-surface p-10 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
            <div className="w-8 h-px bg-saabai-teal/50 mb-5" />
            <h3 className="text-base font-semibold mb-3 tracking-tight">
              Product Enquiries Handled Automatically
            </h3>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              Customers ask about products, dimensions, materials, and
              availability in natural language. Rex answers instantly with
              accurate, up-to-date information drawn from the supplier&apos;s
              product catalogue and knowledge base.
            </p>
          </div>
          <div className="bg-saabai-surface p-10 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
            <div className="w-8 h-px bg-saabai-teal/50 mb-5" />
            <h3 className="text-base font-semibold mb-3 tracking-tight">
              Real-Time Cut-to-Size Pricing
            </h3>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              Rex calculates cut-to-size pricing in real time using live
              WooCommerce data. What previously took a salesperson 15 minutes
              of manual calculation now happens in seconds. Complex orders
              with pricing variations are handled instantly.
            </p>
          </div>
          <div className="bg-saabai-surface p-10 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
            <div className="w-8 h-px bg-saabai-teal/50 mb-5" />
            <h3 className="text-base font-semibold mb-3 tracking-tight">
              24/7 Lead Capture &amp; Email Notifications
            </h3>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              Every interaction captures the customer&apos;s email (59%
              capture rate). Leads are emailed to the sales team with full
              context — what was discussed, what was quoted, and the
              customer&apos;s intent. Complex orders are handed off with no
              repeated questions.
            </p>
          </div>
        </div>
      </section>

      {/* ── Results ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-5">
          The Results
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-16 max-w-2xl leading-snug">
          Quantified outcomes measured in the first 30 days.
        </h2>

        <div className="grid md:grid-cols-2 gap-px bg-saabai-border rounded-xl overflow-hidden mb-px">
          <div className="bg-saabai-surface p-12 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
            <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-6">
              Lead Volume
            </p>
            <div className="text-6xl font-semibold tracking-tight text-saabai-teal stat-glow mb-3">
              344
            </div>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              Leads captured in the first 30 days of Rex going live. These
              are qualified enquiries, not spam — every lead engaged with Rex
              about a genuine product or pricing need. Previously, the
              majority of these would have been hours-long turnaround or lost
              after hours.
            </p>
          </div>
          <div className="bg-saabai-surface p-12 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
            <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-6">
              Quoted Pipeline
            </p>
            <div className="text-6xl font-semibold tracking-tight text-saabai-teal stat-glow mb-3">
              $218K
            </div>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              Total quoted pipeline generated in 30 days. Every quote
              represents real-time pricing calculated by Rex and presented to
              the customer during the conversation. The sales team receives
              the full context — no manual re-entry, no lost details.
            </p>
          </div>
          <div className="bg-saabai-surface p-12 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
            <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-6">
              Email Capture
            </p>
            <div className="text-6xl font-semibold tracking-tight text-saabai-teal stat-glow mb-3">
              59%
            </div>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              59% of all Rex conversations resulted in email capture,
              building a growing database of engaged, in-market prospects.
              Every captured lead enters an automated follow-up sequence,
              ensuring no enquiry goes cold even if the customer doesn&apos;t
              convert immediately.
            </p>
          </div>
          <div className="bg-saabai-surface p-12 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
            <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase mb-6">
              Average Quote
            </p>
            <div className="text-6xl font-semibold tracking-tight text-saabai-teal stat-glow mb-3">
              $1,316
            </div>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              Average quote value across all Rex-generated leads. At 344
              leads, the implied addressable pipeline at average quote is over
              $450K — and that&apos;s before factoring in repeat trade
              customers who now use Rex as their primary quoting channel.
            </p>
          </div>
        </div>

        {/* Additional impact stats */}
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <div className="bg-saabai-surface border border-saabai-border rounded-xl px-10 py-8 text-center">
            <p className="stat-glow text-4xl font-semibold tracking-tight text-saabai-teal mb-2">Seconds</p>
            <p className="text-xs text-saabai-text-muted leading-relaxed">
              Quotes delivered instantly, replacing 2–4 hour wait times
            </p>
          </div>
          <div className="bg-saabai-surface border border-saabai-border rounded-xl px-10 py-8 text-center">
            <p className="stat-glow text-4xl font-semibold tracking-tight text-saabai-teal mb-2">40%</p>
            <p className="text-xs text-saabai-text-muted leading-relaxed">
              Of enquiries fully resolved without any team involvement
            </p>
          </div>
          <div className="bg-saabai-surface border border-saabai-border rounded-xl px-10 py-8 text-center">
            <p className="stat-glow text-4xl font-semibold tracking-tight text-saabai-teal mb-2">24/7</p>
            <p className="text-xs text-saabai-text-muted leading-relaxed">
              After-hours capture — zero lost enquiries
            </p>
          </div>
        </div>
      </section>

      {/* ── Quote ──────────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <blockquote className="bg-saabai-surface-raised border-l-2 border-saabai-teal rounded-r-xl px-10 py-8 max-w-4xl">
          <p className="text-base italic text-saabai-text-muted leading-relaxed mb-5">
            &ldquo;Rex handles the quoting work our team was doing manually all
            day. They&apos;re actually selling now instead of answering the same
            questions. And the after-hours enquiries — we were just losing those
            before. The numbers speak for themselves.&rdquo;
          </p>
          <p className="text-xs font-medium tracking-[0.15em] text-saabai-text-dim uppercase">
            Operations Manager, National Plastics Supplier
          </p>
        </blockquote>
      </section>

      {/* ── Bridge to Audit CTA ────────────────────────────────────────────── */}
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
          Is Your Business Losing Revenue to Manual Processes?
        </p>
        <h2 className="relative text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.02em] mb-7 max-w-3xl mx-auto leading-[1.08]">
          Find out exactly how much capacity
          <br />
          <span className="text-gradient">your team can recover.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          The same approach that recovered 60% of a sales team&apos;s day can
          work for your business. Start with an AI Efficiency Audit
          — $2,500, one week, guaranteed $50K/yr recoverable capacity or free.
        </p>

        <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://calendly.com/shanegoldberg/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
          >
            Book Your Free Strategy Call
          </a>
          <a
            href="/audit"
            className="text-sm text-saabai-text-dim hover:text-saabai-teal transition-colors tracking-wide"
          >
            Learn more about the audit →
          </a>
        </div>
        <p className="relative text-saabai-text-dim text-xs mt-8 tracking-wide">
          No pitch, no invoice, no follow-up pressure. If we&apos;re not a good fit, we&apos;ll tell you.
        </p>
      </section>

      <Footer />
    </div>
  );
}
