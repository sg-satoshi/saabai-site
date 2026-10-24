import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import InShort from "../components/InShort";
import { publicPageMeta } from "@/lib/seo-pages";

export const metadata: Metadata = publicPageMeta.services;

const services: { title: string; description: string; benefits: string[]; href?: string; price?: string }[] = [
  {
    title: "Website Care Plans",
    price: "$100, $200 or $300 a month",
    href: "/websites",
    description:
      "A fast, modern website built and looked after for you, with a trained AI chatbot that answers enquiries while you're busy doing the actual work.",
    benefits: [
      "Presence $100/mo, Growth $200/mo, Signature $300/mo",
      "Builds from $2,000, or a rebuild of your current site",
      "Hosting, security, updates and small changes included",
      "AI enquiry chatbot on every plan",
    ],
  },
  {
    title: "The Saabai Blueprint",
    price: "From $497",
    href: "/blueprint",
    description:
      "A fixed-price AI audit that ranks exactly where AI and automation will save you time and win you work, so you stop guessing and stop paying for shiny things you don't need.",
    benefits: [
      "Starter $497, Pro $1,497, Business $3,500",
      "Ranked fix list with effort, impact and dollar estimates",
      "SEO and AI search visibility included",
      "Fee credited if you build with us within 30 days",
    ],
  },
  {
    title: "SEO & AI Search Visibility",
    price: "In every Blueprint",
    href: "/blueprint",
    description:
      "Where you rank in Google, and whether ChatGPT, Claude, Perplexity and Gemini actually recommend you, or your competitor down the road.",
    benefits: [
      "Google ranking and Business Profile check",
      "AI answer checks across ChatGPT, Claude, Perplexity and Gemini",
      "Side-by-side competitor comparison",
      "Copy-paste fixes for your site",
    ],
  },
  {
    title: "AI Chat Agents & Automations",
    price: "Scoped from your Blueprint",
    href: "/blueprint",
    description:
      "Custom AI agents on your website that answer, quote and book around the clock, plus automations that take the follow-up, reminders and data entry off your plate.",
    benefits: [
      "Trained on your services, prices and FAQs",
      "Captures and qualifies every lead",
      "Follow-up, reminders and CRM handoff",
      "Scoped from your Blueprint, no surprise invoices",
    ],
  },
];

const steps = [
  {
    step: "01",
    title: "Saabai Blueprint",
    body: "A fixed-price audit of your business, website and search visibility, with a ranked plan of what to fix first.",
  },
  {
    step: "02",
    title: "System Design",
    body: "We design the website, AI agent or automation around the tools you already use and the way you already work.",
  },
  {
    step: "03",
    title: "Build & Deploy",
    body: "Your automation systems are implemented and integrated into your existing tools, no ripping anything out.",
  },
  {
    step: "04",
    title: "Ongoing Optimisation",
    body: "Your care plan keeps it hosted, secure, updated and improving. If something breaks, that's our problem, not yours.",
  },
];

const results = [
  {
    stat: "90s",
    label: "Enquiry response",
    detail: "Every enquiry answered within 90 seconds, day or night, for Tributum Law, an Adelaide tax law firm. Previously 2 to 14 hours.",
  },
  {
    stat: "12 hrs",
    label: "Recovered per week",
    detail: "Intake admin taken off the same team's plate each week by one AI agent.",
  },
  {
    stat: "40%",
    label: "Enquiries resolved by AI",
    detail: "Share of PlasticOnline (Holland Plastics) inbound enquiries fully handled without staff, with instant quotes.",
  },
  {
    stat: "3 wks",
    label: "Kickoff to live",
    detail: "Typical time from kickoff to an AI agent handling real customers. See the case studies.",
  },
];

export default function Services() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">

      <Nav activePage="/services" />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-52 pb-24 md:pb-32 px-6 text-center max-w-5xl mx-auto overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 90% 60% at 50% 30%, var(--saabai-glow-mid) 0%, transparent 65%)"
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 40% 30% at 50% 20%, var(--saabai-glow) 0%, transparent 70%)"
        }} />

        <div className="relative inline-flex items-center gap-2.5 mb-10">
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
          <p className="text-xs font-medium tracking-[0.2em] text-saabai-text-dim uppercase">
            Gold Coast · AI for Australian Small Businesses
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-[clamp(2rem,9vw,3.75rem)] md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          Get found.<br />Win the enquiry.<br />
          <span className="text-gradient">Get your week back.</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-14 leading-relaxed">
          Websites that answer enquiries for you, a fixed-price AI audit that
          tells you what&apos;s actually worth doing, and the automations to
          make it happen. Plain prices, no jargon.
        </p>
        <InShort>
          Saabai, founded by Shane Goldberg on the Gold Coast, offers website care
          plans (<strong>Presence $100</strong>, <strong>Growth $200</strong>,{" "}
          <strong>Signature $300</strong> a month), the Saabai Blueprint AI audit
          (<strong>Starter $497</strong>, <strong>Pro $1,497</strong>,{" "}
          <strong>Business $3,500</strong>) with SEO and AI search visibility, and
          custom AI agents and automations. Start free with the{" "}
          <a href="/score">AI score</a>.
        </InShort>


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

      {/* ── What We Help Automate ────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          What We Do
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-6 max-w-2xl mx-auto leading-snug">
          Four things, done properly.
        </h2>
        <p className="text-base text-saabai-text-muted text-center max-w-2xl mx-auto mb-20 leading-relaxed">
          Most small businesses don&apos;t need an &ldquo;AI transformation&rdquo;.
          They need a website that works, to show up when people search, and
          fewer hours lost to admin. That&apos;s what we do.
        </p>

        <div className="grid md:grid-cols-2 md:auto-rows-fr gap-px bg-saabai-border rounded-xl overflow-hidden" style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)" }}>
          {services.map(({ title, description, benefits, href, price }) => (
            <div
              key={title}
              className="bg-saabai-surface p-8 md:p-12 hover:bg-saabai-surface-raised transition-colors relative group flex flex-col"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-border to-transparent group-hover:via-saabai-teal/30 transition-all" />
              <h3 className="text-xl font-semibold mb-2 tracking-tight">{title}</h3>
              {price && <p className="text-sm font-semibold text-saabai-teal mb-3">{price}</p>}
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
              {href && (
                <a href={href} className="mt-auto pt-6 text-sm font-semibold text-saabai-teal hover:text-saabai-teal-bright">
                  Learn more →
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col md:flex-row md:items-center gap-6 md:gap-8 rounded-2xl border border-saabai-border-accent bg-saabai-surface p-7 md:px-10 md:py-9 shadow-[0_0_40px_var(--saabai-glow-mid)]" style={{ background: "radial-gradient(ellipse 60% 120% at 100% 0%, rgba(98,197,209,.16), transparent 60%), var(--saabai-surface)" }}>
          <div className="flex-1">
            <span className="inline-block font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold tracking-[0.12em] bg-saabai-teal text-saabai-bg px-2.5 py-1 rounded-full">FREE · 3 MIN</span>
            <h3 className="text-[22px] font-semibold tracking-tight mt-2 mb-2">Not sure where to start? Take the free AI score.</h3>
            <p className="text-base text-saabai-text-muted leading-relaxed">
              A few quick questions and you&apos;ll get a score showing how ready your business is for AI, and which of the above is worth doing first. Takes a few minutes, costs nothing.
            </p>
          </div>
          <a href="/score" className="btn-secondary w-full md:w-auto">Take the free AI score →</a>
        </div>
      </section>

      {/* ── Saabai Blueprint Pricing Preview ─────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          Start Here: Saabai Blueprint
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-6 max-w-2xl mx-auto leading-snug">
          Know exactly what to automate, before you spend a dollar building it.
        </h2>
        <p className="text-base text-saabai-text-muted text-center max-w-2xl mx-auto mb-16 leading-relaxed">
          Every Saabai engagement starts with a Saabai Blueprint, a fixed-price
          plan that ranks your highest-ROI automation opportunities. Three tiers,
          with the fee credited if you book a build within 30 days.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { name: "Starter", staff: "Async fact-find, no call", price: "$497", duration: "within 48 hours" },
            { name: "Pro", staff: "Includes walkthrough call", price: "$1,497", duration: "in 3 business days", highlight: true },
            { name: "Business", staff: "Deep dive for larger teams", price: "$3,500", duration: "in 2 to 3 weeks" },
          ].map((t) => (
            <div
              key={t.name}
              className={`bg-saabai-surface border rounded-xl p-8 text-center ${
                t.highlight ? "border-saabai-teal/60" : "border-saabai-border"
              }`}
              style={
                t.highlight
                  ? { boxShadow: "0 0 60px rgba(98,197,209,0.35), 0 0 24px rgba(98,197,209,0.18)" }
                  : undefined
              }
            >
              <h3 className="text-xl font-semibold mb-1 tracking-tight">{t.name}</h3>
              <p className="text-xs text-saabai-text-dim mb-5 tracking-wide">{t.staff}</p>
              <div className="text-4xl font-semibold tracking-tight text-saabai-teal stat-glow mb-1">
                {t.price}
              </div>
              <p className="text-xs text-saabai-text-dim tracking-wide">
                AUD · Delivered {t.duration}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <a
            href="/blueprint"
            className="inline-block bg-saabai-teal text-saabai-bg px-9 py-[14px] rounded-xl font-semibold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_30px_var(--saabai-glow-mid)]"
          >
            View Saabai Blueprint
          </a>
          <p className="text-xs text-saabai-text-dim mt-5 tracking-wide">
            Or book a free call to work out which tier fits
          </p>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <p className="text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase text-center mb-5">
          How We Work
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-24 max-w-2xl mx-auto leading-snug">
          From bottleneck to automated, in weeks.
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
          Results From Live Client Systems
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-20 max-w-2xl mx-auto leading-snug">
          Time recovered. Costs reduced. Capacity unlocked.
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-saabai-border rounded-xl overflow-hidden" style={{ boxShadow: "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)" }}>
          {results.map(({ stat, label, detail }) => (
            <div key={label} className="bg-saabai-surface p-10 relative h-full">
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
          Find out where your business
          <br />
          <span className="text-gradient">is leaking time and leads.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Take the free AI score, or book a free 30-minute call with Shane.
          You&apos;ll get a straight answer on what&apos;s worth doing, and
          what isn&apos;t. No obligation, no jargon.
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
