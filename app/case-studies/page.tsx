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
          One published example: a custom AI sales agent that ran on the Rex Plastics website.
        </p>
        <InShort>
          Saabai, a Gold Coast AI business founded by Shane Goldberg, had a custom AI
          sales agent for Rex Plastics. It answered
          product questions and priced cut-to-size jobs from that supplier&apos;s catalogue.
          A Blueprint is optional, from{" "}
          <a href="/blueprint">the Starter Blueprint at $497</a>. Website care plans are sold on their own.
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
            Custom build
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
          <a href="/case-studies/rex-plastics-online">Rex Plastics</a>
        </h2>
        <p className="mb-6">
          <a href="/case-studies/rex-plastics-online" className="text-saabai-teal font-semibold underline underline-offset-2">Read the Rex Plastics case study</a>
        </p>
        <p className="text-saabai-text-muted text-base mb-16 max-w-2xl leading-relaxed">
          Rex Plastics, a national plastics supplier, trade and retail
          customers across Australia
        </p>

        <div className="grid md:grid-cols-2 gap-px bg-saabai-border rounded-xl overflow-hidden">
          <div className="bg-saabai-surface p-10 flex flex-col gap-5">
            <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-text-dim uppercase">
              What it is
            </p>
            <h3 className="text-xl font-semibold tracking-tight">
              A custom agent, not a published plan
            </h3>
            <div className="flex flex-col gap-3 text-saabai-text-muted text-sm leading-relaxed">
              <p>
                Rex was a custom AI sales agent on the supplier&apos;s website. It answered
                product questions at any hour, priced cut-to-size jobs from that
                supplier&apos;s own product data, and captured leads.
              </p>
              <p>
                Leads were emailed to the sales team. This quoting setup was scoped
                for this client. It is not included in the website care plans.
              </p>
            </div>
          </div>
          <div className="bg-saabai-surface p-10 flex flex-col gap-5">
            <p className="text-[10px] font-medium tracking-[0.18em] text-saabai-teal uppercase">
              Note
            </p>
            <h3 className="text-xl font-semibold tracking-tight">
              Quoted to the job
            </h3>
            <div className="flex flex-col gap-3 text-saabai-text-muted text-sm leading-relaxed">
              <p>
                This page describes what the agent did. Custom agents are quoted to the job.
              </p>
            </div>
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
