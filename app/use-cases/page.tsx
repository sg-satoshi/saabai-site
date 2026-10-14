import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "AI Automation Use Cases for Small Businesses",
  description:
    "Practical examples of AI and automation for Australian small businesses: AI enquiry agents, instant quoting, follow-up and admin. Start with a Blueprint AI audit from $497.",
  alternates: { canonical: "https://www.saabai.ai/use-cases" },
  openGraph: {
    url: "https://www.saabai.ai/use-cases",
    title: "AI Automation Use Cases for Small Businesses | Saabai",
    description:
      "Practical examples of AI and automation for Australian small businesses: AI enquiry agents, instant quoting, follow-up and admin. Start with a Blueprint AI audit from $497.",
  },
};

const useCases = [
  {
    category: "Trades & Home Services",
    description:
      "Tradies win work on how fast they quote and lose it on how slowly they follow up. Most of that happens at night, after a full day on the tools.",
    examples: [
      "Website AI agent that answers enquiries and books site visits after hours",
      "Instant ballpark quotes from your own price list",
      "Automatic quote follow-up when a customer goes quiet",
      "Invoice and payment reminders without awkward phone calls",
    ],
    outcome: "More jobs quoted, fewer leads gone cold, and evenings back.",
  },

  {
    category: "Real Estate Agencies",
    description:
      "Lead qualification and follow-up is where most agencies lose revenue. An AI system can respond to every new enquiry within seconds, qualify the opportunity, and escalate only the serious buyers and sellers to your agents.",
    examples: [
      "Instant AI response to every inbound enquiry",
      "Automated inspection reminders and appraisal follow-up sequences",
      "Listing update communications to matched buyers",
      "Vendor report automation",
    ],
    outcome: "Agents focus on relationships and negotiations. The system handles everything else.",
  },
  {
    category: "Clinics, Studios & Salons",
    description:
      "Appointment businesses run on bookings, and the phone rings while you're with a client. Automation answers, books and reminds so your chair or room stays full.",
    examples: [
      "AI agent that answers FAQs and takes booking requests 24/7",
      "Appointment reminders that cut no-shows",
      "Post-visit review requests that build your Google rating",
      "Rebooking nudges for clients who haven't been back",
    ],
    outcome: "Fewer missed calls, fewer no-shows, more five-star reviews.",
  },

  {
    category: "Local Retail & Hospitality",
    description:
      "Seasonal surges and after-hours questions swamp small teams. An AI agent handles the repeat questions and bookings so staff can serve the people in front of them.",
    examples: [
      "Opening hours, stock and booking questions answered instantly",
      "Function and group booking enquiries captured and qualified",
      "Email and SMS offers to past customers, with opt-in handled properly",
      "Showing up when locals ask Google or ChatGPT for a recommendation",
    ],
    outcome: "Peak demand captured without hiring extra staff just to answer messages.",
  },

  {
    category: "Trade & E-commerce",
    description:
      "Product businesses with a high volume of inbound enquiries are leaving money on the table every hour they're not available to respond. An AI agent can quote, qualify, and capture leads instantly, without a sales team on standby.",
    examples: [
      "AI agent handles product Q&A, specifications, and pricing 24/7",
      "Cut-to-size and custom quoting handled in real time from a chat window",
      "Order status lookups without staff involvement",
      "Qualified leads automatically routed to CRM with full conversation context",
    ],
    outcome: "Every inbound enquiry gets an instant, accurate response. Leads are captured and followed up automatically, day and night.",
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
    outcome: "Compliance runs to schedule. Documentation is consistent. Audit risk is reduced.",
  },
];

const inlineCta = {
  headline: "See this in your business?",
  body: "Book a free 30-minute call. We'll identify the highest-value automation opportunities in your specific operation.",
  cta: "Book Your Free Strategy Call",
};

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
          If your business runs on expertise, there&apos;s almost always a layer of
          operational work that can be automated, without changing how you
          deliver value to clients.
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
                <a
                  href="https://calendly.com/shanegoldberg/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 bg-saabai-teal text-saabai-bg px-7 py-3 rounded-xl font-semibold text-sm hover:bg-saabai-teal-bright transition-colors tracking-wide whitespace-nowrap"
                >
                  {inlineCta.cta}
                </a>
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
