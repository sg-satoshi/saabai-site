import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { publicPageMeta } from "@/lib/seo-pages";
import BreadcrumbLd from "../components/BreadcrumbLd";

export const metadata: Metadata = publicPageMeta.useCases;

const useCases = [
  {
    category: "Trades & Home Services",
    description:
      "Tradies win work on how fast they quote and lose it on how slowly they follow up. Most of that happens at night, after a full day on the tools.",
    examples: [
      "Website AI agent that answers enquiries after hours. Booking is on Growth and Signature only",
      "Quoting from your price list is custom work, scoped and quoted separately",
      "Quote follow-up can be scoped as custom work",
      "Invoice and payment reminders are quoted separately",
    ],
    outcome: "More jobs quoted, fewer leads gone cold, and evenings back.",
  },

  {
    category: "Real Estate Agencies",
    description:
      "Lead qualification is where many agencies lose track of enquiries. An AI system can answer new enquiries at any hour, ask qualifying questions, and pass serious buyers and sellers to your agents.",
    examples: [
      "Fast AI response to inbound enquiries",
      "Illustrative example: inspection reminders and appraisal follow-up, quoted separately",
      "Listing update communications to matched buyers",
      "Vendor report automation",
    ],
    outcome: "Agents can spend more time on relationships and negotiations.",
  },
  {
    category: "Clinics, Studios & Salons",
    description:
      "Appointment businesses run on bookings, and the phone rings while you're with a client. A chatbot can answer questions at any hour. Booking is on Growth and Signature. Reminders are quoted separately.",
    examples: [
      "AI agent that answers FAQs at any hour",
      "Appointment reminders that cut no-shows (quoted separately, or use your booking system's built-in reminders)",
      "Post-visit review requests that build your Google rating (best done with an outside tool such as Podium, Birdeye or Hatch; we advise in your Blueprint)",
      "Rebooking nudges for clients who haven't been back (quoted separately)",
    ],
    outcome: "Fewer missed calls and no-shows, and a plan for building more five-star reviews.",
  },

  {
    category: "Local Retail & Hospitality",
    description:
      "Seasonal surges and after-hours questions swamp small teams. An AI agent handles the repeat questions and bookings so staff can serve the people in front of them.",
    examples: [
      "Opening hours, stock and booking questions answered at any hour",
      "Function and group booking enquiries captured and qualified",
      "Email and SMS offers to past customers, with opt-in handled properly",
      "Showing up when locals ask Google or ChatGPT for a recommendation",
    ],
    outcome: "Peak demand captured without hiring extra staff just to answer messages.",
  },

  {
    category: "Trade & E-commerce",
    description:
      "Product businesses get a lot of the same questions. An AI agent can answer product questions at any hour, qualify interest, and capture a lead. Quoting is custom work, scoped and quoted.",
    examples: [
      "AI agent handles product questions and specifications at any hour. Pricing is custom work",
      "Cut-to-size quoting can be scoped from your own product data",
      "Order status lookups without staff involvement",
      "Qualified leads automatically routed to CRM with full conversation context",
    ],
    outcome: "Inbound enquiries can get a fast response. Leads can be captured and followed up, day and night.",
  },
  {
    category: "Compliance & Document Automation",
    description:
      "Across every business, there is a layer of compliance, documentation, and audit trail work that consumes hours and creates risk when it falls behind. Automation brings consistency and speed to this work.",
    examples: [
      "Automated compliance checklist generation",
      "Quote, contract and job sheet workflows",
      "Audit trail documentation",
      "Regulatory deadline tracking and escalation",
    ],
    outcome: "Compliance runs to schedule. Documentation is consistent. Fewer missed deadlines and gaps in your records.",
  },
];

const CASE_LINKS: Record<string, { label: string; href: string }> = {
  "Trade & E-commerce": { label: "Read the Rex Plastics case study", href: "/case-studies/rex-plastics-online" },
  "Real Estate Agencies": { label: "Read the FAQ", href: "/faq" },
  "Clinics, Studios & Salons": { label: "Read the FAQ", href: "/faq" },
};

const inlineCta = {
  headline: "See this in your business?",
  body: "Take the free 3 minute AI score, or book a free 30 minute call. We'll help you find the highest-value opportunities in your business.",
  cta: "Book Your Free Strategy Call",
};

export default function UseCases() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <BreadcrumbLd name="Use cases" path="/use-cases" />

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
            AI for Australian Small Businesses · Real-World Applications
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[86px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          What can actually be
          <br />
          <span className="text-gradient">automated in your business?</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto mb-6 leading-relaxed">
          Practical examples of how Australian businesses are using AI automation
          to reclaim hours, reduce operational risk, and focus on the work that
          actually requires expertise.
        </p>
        <p className="relative text-base text-saabai-text-dim max-w-xl mx-auto mb-14 leading-relaxed">
          In most small businesses there&apos;s a layer of repeat admin that can
          be automated, without changing how you look after your customers.
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

              {/* Left, text */}
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
                {CASE_LINKS[category] ? (
                  <p className="mt-6">
                    <a href={CASE_LINKS[category].href} className="text-sm font-semibold text-saabai-teal hover:text-saabai-teal-bright">
                      {CASE_LINKS[category].label} →
                    </a>
                  </p>
                ) : null}
              </div>

              {/* Right, examples card */}
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

          {/* Inline CTA, after every 2nd use case */}
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
                <div className="shrink-0 flex flex-col items-start sm:items-end gap-3">
                  <a
                    href="https://calendly.com/shanegoldberg/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-saabai-teal text-saabai-bg px-7 py-3 rounded-xl font-semibold text-sm hover:bg-saabai-teal-bright transition-colors tracking-wide whitespace-nowrap"
                  >
                    {inlineCta.cta}
                  </a>
                  <a
                    href="/score"
                    className="text-sm font-semibold text-saabai-teal hover:text-saabai-teal-bright transition-colors tracking-wide whitespace-nowrap"
                  >
                    Take the free AI score →
                  </a>
                </div>
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
          <span className="text-gradient">automated in your business.</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-14 max-w-lg mx-auto leading-relaxed">
          Book a free 30-minute strategy call. We&apos;ll map your workflows,
          identify the highest-value automation opportunities, and give you a
          clear picture of what&apos;s possible, no obligation.
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
