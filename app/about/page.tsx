import type { Metadata } from "next";
import Image from "next/image";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import InShort from "../components/InShort";
import { pageMeta } from "@/lib/seo-meta";
import JsonLd from "../components/JsonLd";
import { breadcrumbSchema } from "@/lib/seo-meta";

export const metadata: Metadata = pageMeta({
  path: "/about",
  title: "About Saabai and Founder Shane Goldberg, Gold Coast | Saabai",
  description: "Saabai is a Gold Coast AI business founded by Shane Goldberg. Websites with AI chatbots and fixed-price AI audits for Australian small businesses.",
});

export default function About() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">

      <JsonLd data={breadcrumbSchema([{ name: "About", path: "/about" }])} />

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
            The Saabai Story
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-[clamp(2.25rem,11.5vw,3.75rem)] md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          We built what
          <br />
          <span className="text-gradient">we couldn&apos;t find.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-14 leading-relaxed">
          A Gold Coast AI business that helps Australian small businesses get
          found, win more enquiries and get hours back. No jargon, no
          six-month projects, no mystery invoices.
        </p>
        <InShort>
          Saabai is a Gold Coast, Queensland AI business founded by Shane Goldberg.
          We build and look after small business websites on care plans from{" "}
          <strong>$100 a month</strong>, and run the Saabai Blueprint, an AI audit
          from <strong>$497</strong> that includes SEO and AI search visibility.
          Head office Merrimac QLD 4226, ABN 71 889 082 572.
        </InShort>


        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{
          background: "linear-gradient(to bottom, transparent, var(--saabai-bg))"
        }} />
      </section>

      {/* ── Founder ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-4xl mx-auto">
        <div className="grid md:grid-cols-[280px_1fr] gap-16 items-start">

          {/* Left, headshot placeholder */}
          <div className="flex flex-col items-center md:items-start gap-5">
            <div
              className="w-48 h-48 rounded-2xl border border-saabai-border overflow-hidden"
              style={{ boxShadow: "0 0 40px rgba(98,197,209,0.2)" }}
            >
              <Image
                src="/shane-goldberg.png"
                alt="Shane Goldberg, Founder, Saabai"
                width={192}
                height={192}
                className="w-full h-full object-cover object-[center_25%]"
              />
            </div>
            <div>
              <h2 className="text-base font-semibold text-saabai-text tracking-tight">Shane Goldberg</h2>
              <p className="text-sm text-saabai-text-dim mt-0.5">Founder, Saabai · Gold Coast, QLD</p>
            </div>
          </div>

          {/* Right, founder narrative */}
          <div className="flex flex-col gap-6">
            <p className="text-xl md:text-2xl text-saabai-text-muted leading-relaxed">
              I started Saabai after years of watching good Australian
              businesses, tradies, clinics, studios, agencies, lose work to
              slow websites, missed enquiries and admin that ate their week.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              The problem wasn&apos;t effort. The wrong work
              was landing on the wrong desks, and the tools that were supposed
              to fix it either required a technical team to maintain, or weren&apos;t
              built for a business with five staff, not five hundred.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              So Saabai keeps it simple. A website that answers enquiries for you,
              looked after on a flat monthly plan. A Blueprint that tells you,
              in plain English and at a fixed price, where AI will actually save
              you time and money, and whether Google, ChatGPT, Claude, Perplexity
              and Gemini can even find you. Then we build what&apos;s worth
              building, and skip what isn&apos;t.
            </p>
          </div>

        </div>
      </section>

      {/* ── Mission ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-4xl mx-auto border-t border-saabai-border">
        <div className="grid md:grid-cols-[200px_1fr] gap-12 items-start">
          <div>
            <h2 className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-3">
              Our Mission
            </h2>
            <div className="w-8 h-px bg-saabai-teal/50 mt-4" />
          </div>
          <div>
            <p className="text-xl md:text-2xl text-saabai-text-muted leading-relaxed">
              Give Australian small businesses the kind of website, search
              visibility and AI help that used to need an agency, a developer and
              a consultant, for a price that makes sense on a small business
              budget.
            </p>
          </div>
        </div>
      </section>

      {/* ── Live Deployments ────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-4xl mx-auto border-t border-saabai-border">
        <div className="grid md:grid-cols-[200px_1fr] gap-12 items-start">
          <div>
            <h2 className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-3">
              Live in Production
            </h2>
            <div className="w-8 h-px bg-saabai-teal/50 mt-4" />
          </div>
          <div className="flex flex-col gap-5">
            <p className="text-xl md:text-2xl text-saabai-text-muted leading-relaxed">
              Systems currently running in production include a 24/7 AI quoting and lead capture agent for PlasticOnline (Holland Plastics), and an after-hours intake agent for Tributum Law, an Adelaide tax law firm, plus websites on our care plans. Saabai is based on the Gold Coast, Queensland, with head office in Merrimac QLD 4226 (ABN 71 889 082 572).
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              Neither client had to rip out their existing tools. Both were live within weeks.
            </p>
            <a href="/case-studies" className="text-sm font-semibold text-saabai-teal hover:text-saabai-teal-bright transition-colors tracking-wide">
              See the case studies →
            </a>
          </div>
        </div>
      </section>

      {/* ── Philosophy ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-4xl mx-auto border-t border-saabai-border">
        <div className="grid md:grid-cols-[200px_1fr] gap-12 items-start">
          <div>
            <h2 className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-3">
              Our Philosophy
            </h2>
            <div className="w-8 h-px bg-saabai-teal/50 mt-4" />
          </div>
          <div className="flex flex-col gap-6">
            <p className="text-2xl md:text-3xl font-semibold tracking-tight leading-snug">
              AI should deliver results.
              <br />
              <span className="text-saabai-text-muted">Not just a good demo.</span>
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              We don&apos;t sell AI for the sake of it. Every system we build is
              designed around a specific operational problem, with clear
              metrics for what success looks like before we write a line of
              code. If it doesn&apos;t recover time or reduce cost, we haven&apos;t
              done our job.
            </p>
            <p className="text-lg text-saabai-text-muted leading-relaxed">
              We also don&apos;t disappear after deployment. If something breaks or
              drifts, that&apos;s our problem to fix, not yours. Ongoing
              maintenance is part of how we work, not an add-on.
            </p>
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
          Curious where AI fits
          <br />
          <span className="text-gradient">in your business?</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Take the free AI score in a few minutes, or book a free 30-minute
          call with Shane. Either way you&apos;ll get a straight answer, no
          obligation.
        </p>
        <div className="relative flex flex-col items-center gap-4">
          <a
            href="https://calendly.com/shanegoldberg/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="relative inline-block max-sm:w-full bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
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
