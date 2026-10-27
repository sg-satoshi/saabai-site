import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import InShort from "../components/InShort";
import { publicPageMeta } from "@/lib/seo-pages";
import BreadcrumbLd from "../components/BreadcrumbLd";

export const metadata: Metadata = publicPageMeta.caseStudies;

export default function CaseStudies() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <BreadcrumbLd name="Case studies" path="/case-studies" />

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
            Case Studies
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          Real results
          <br />
          <span className="text-gradient">from a real business.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-14 leading-relaxed">
          A measured outcome from a business that deployed a Saabai AI agent:
          hours recovered, quotes delivered, and enquiries handled after hours.
        </p>
        <InShort>
          Saabai, a Gold Coast AI business founded by Shane Goldberg, has an AI agent
          live for a national plastics supplier
          (instant quotes, 40% of enquiries resolved without staff). Most projects start with a{" "}
          <a href="/blueprint">Saabai Blueprint from $497</a>.
        </InShort>


        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{
          background: "linear-gradient(to bottom, transparent, var(--saabai-bg))"
        }} />
      </section>

      {/* ── National Plastics Supplier ─────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-saabai-surface-raised border border-saabai-border text-[11px] font-medium tracking-[0.15em] text-saabai-teal uppercase">
            Trade &amp; Retail Supply
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-saabai-surface-raised border border-saabai-border text-[11px] font-medium tracking-[0.15em] text-saabai-text-dim uppercase">
            AI Sales Agent
          </span>
          <span className="ml-auto inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saabai-surface border border-saabai-border text-[11px] font-semibold tracking-[0.12em] text-saabai-teal uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal inline-block" />
            Live in 3 weeks
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
          <a href="/case-studies/rex-plastics-online">National Plastics Supplier</a>
        </h2>
        <p className="mb-6">
          <a href="/case-studies/rex-plastics-online" className="text-saabai-teal font-semibold underline underline-offset-2">Read the Rex case study</a>
        </p>
        <p className="text-saabai-text-muted text-base mb-16 max-w-2xl leading-relaxed">
          Large national plastics supplier (name withheld on request), trade and retail
          customers across Australia
        </p>

        {/* Problem / Solution */}
        <div className="grid md:grid-cols-2 gap-px bg-saabai-border rounded-xl overflow-hidden mb-px">
          <div className="bg-saabai-surface p-10 flex flex-col gap-5">
            <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase">
              The Problem
            </p>
            <h3 className="text-xl font-semibold tracking-tight">
              60% of the sales day lost to repetitive quoting
            </h3>
            <div className="flex flex-col gap-3 text-saabai-text-muted text-sm leading-relaxed">
              <p>
                The sales team was overwhelmed with repetitive product and pricing
                enquiries. Customers waited hours for simple cut-to-size quotes.
                After-hours enquiries were lost entirely.
              </p>
              <p>
                More than 60% of the team&apos;s day was consumed by quote requests, leaving
                no capacity to build relationships with trade accounts or focus on
                higher-value sales activity.
              </p>
            </div>
          </div>
          <div className="bg-saabai-surface p-10 flex flex-col gap-5">
            <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-teal uppercase">
              The Solution, &ldquo;Rex&rdquo;
            </p>
            <h3 className="text-xl font-semibold tracking-tight">
              AI sales agent embedded on the supplier&apos;s website
            </h3>
            <div className="flex flex-col gap-3 text-saabai-text-muted text-sm leading-relaxed">
              <p>
                Saabai deployed &ldquo;Rex&rdquo;, an AI sales agent that handles product enquiries,
                calculates cut-to-size pricing in real time, and captures leads directly
                on the supplier&apos;s website.
              </p>
              <p>
                Complex orders are handed off to the sales team with full context already
                captured, no repeated questions, no manual re-entry. Rex runs 24/7,
                so after-hours enquiries are quoted and captured automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Results grid */}
        <div
          className="grid md:grid-cols-4 gap-px bg-saabai-border rounded-b-xl overflow-hidden mb-10"
          style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 160px rgba(98,197,209,0.15)" }}
        >
          <div className="bg-saabai-surface p-8 flex flex-col gap-3">
            <p className="stat-glow text-4xl font-semibold tracking-tight text-saabai-teal">Seconds</p>
            <p className="text-saabai-text-muted text-xs leading-relaxed">
              Quotes delivered instantly, previously 2–4 hours per request
            </p>
          </div>
          <div className="bg-saabai-surface p-8 flex flex-col gap-3">
            <p className="stat-glow text-4xl font-semibold tracking-tight text-saabai-teal">40%</p>
            <p className="text-saabai-text-muted text-xs leading-relaxed">
              Of inbound enquiries fully resolved without any team involvement
            </p>
          </div>
          <div className="bg-saabai-surface p-8 flex flex-col gap-3">
            <p className="stat-glow text-4xl font-semibold tracking-tight text-saabai-teal">24/7</p>
            <p className="text-saabai-text-muted text-xs leading-relaxed">
              After-hours enquiries now captured and quoted automatically, zero lost
            </p>
          </div>
          <div className="bg-saabai-surface p-8 flex flex-col gap-3">
            <p className="stat-glow text-4xl font-semibold tracking-tight text-saabai-teal">3 wks</p>
            <p className="text-saabai-text-muted text-xs leading-relaxed">
              From kickoff to Rex handling live product and pricing enquiries
            </p>
          </div>
        </div>

        {/* Quote */}
        <blockquote className="bg-saabai-surface-raised border-l-2 border-saabai-teal rounded-r-xl px-10 py-8">
          <p className="text-base italic text-saabai-text-muted leading-relaxed mb-5">
            &ldquo;Rex handles the quoting work our team was doing manually all day. They&apos;re
            actually selling now instead of answering the same questions. And the
            after-hours enquiries, we were just losing those before.&rdquo;
          </p>
          <p className="text-xs font-medium tracking-[0.15em] text-saabai-text-dim uppercase">
           , Operations Manager, National Plastics Supplier
          </p>
        </blockquote>

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
          Ready to be
          <br />
          <span className="text-gradient">the next case study?</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Start with the free AI score, or go straight to a Saabai Blueprint
          (Starter $497, Pro $1,497, Business $3,500). Prefer a chat first? Book a
          free 30-minute call.
        </p>
        <div className="relative flex flex-col items-center gap-4">
          <a
            href="https://calendly.com/shanegoldberg/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="relative inline-block max-sm:w-full bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
          >
            Book Your Free Strategy Call
          </a>
          <a href="/score" className="btn-secondary max-sm:w-full">Or take the free AI score →</a>
        </div>
        <p className="relative text-saabai-text-dim text-xs mt-8 tracking-wide">
          No pitch, no invoice, no follow-up pressure. If we&apos;re not a good fit, we&apos;ll tell you.
        </p>
      </section>

      <Footer />

    </div>
  );
}
