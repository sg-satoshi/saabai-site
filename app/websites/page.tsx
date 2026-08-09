import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "AI-Native Websites for Professional Firms | Saabai",
  description:
    "We build and rebuild websites for Australian professional firms, each with a trained AI chatbot built in. Three tiers from $2,000 plus care from $100/mo. Book a free website consult.",
  alternates: { canonical: "https://www.saabai.ai/websites" },
  openGraph: {
    url: "https://www.saabai.ai/websites",
    title: "AI-Native Websites for Professional Firms | Saabai",
    description:
      "We build and rebuild websites for Australian professional firms, each with a trained AI chatbot built in. Three tiers from $2,000 plus care from $100/mo.",
  },
};

const CALENDLY = "https://calendly.com/shanegoldberg/30min";

const tiers = [
  {
    name: "Presence",
    tagline: "Get online with an AI that answers",
    price: "from $2,000",
    priceNote: "one-off build",
    monthly: "then $100/mo care",
    description:
      "A polished, fast, professional website built for your firm, with a trained enquiry chatbot that answers common questions and captures every lead.",
    features: [
      "Custom site designed for your firm",
      "Fast, mobile and search ready",
      "Trained enquiry chatbot that answers FAQs",
      "Lead capture straight to your inbox",
      "Hosting, security and updates included",
    ],
    highlight: false,
  },
  {
    name: "Growth",
    tagline: "For firms that want the site to sell",
    price: "from $4,000",
    priceNote: "one-off build",
    monthly: "then $200/mo care",
    description:
      "Everything in Presence, on a larger or rebuilt site, with a chatbot that qualifies leads, books calls and hands off to your CRM.",
    features: [
      "Everything in Presence",
      "Larger site, or a full rebuild of your current one",
      "Lead qualifying chatbot with booking",
      "Handoff to your CRM or inbox",
      "Light workflow automations",
    ],
    highlight: true,
  },
  {
    name: "Signature",
    tagline: "Your brand, with an AI that sounds like you",
    price: "from $6,500",
    priceNote: "one-off build",
    monthly: "then $300/mo care",
    description:
      "Everything in Growth, plus a custom avatar trained to look and sound like the persona you choose, with deeper automations and priority support.",
    features: [
      "Everything in Growth",
      "Custom avatar trained to your chosen persona",
      "Looks and sounds like your brand voice",
      "Workflow automations across your enquiries",
      "Priority support",
    ],
    highlight: false,
  },
];

const faqs = [
  {
    q: "Is this a new website or can you rebuild my current one?",
    a: "Both. Every tier covers a brand new build or a full rebuild of your existing site. The AI team member is included either way.",
  },
  {
    q: "What does the chatbot actually do?",
    a: "It answers the questions your visitors keep asking, captures their details and sends every enquiry straight to you. On the Growth tier it also qualifies leads and books calls into your calendar.",
  },
  {
    q: "What is the custom avatar on the Signature tier?",
    a: "We train the AI to look and sound like a persona you choose, so it matches your brand voice rather than sounding like a generic bot. It becomes a recognisable part of your firm.",
  },
  {
    q: "What does the monthly care cover?",
    a: "Hosting, security, updates and keeping your AI running and trained. Your site stays fast, current and looked after without you lifting a finger.",
  },
  {
    q: "How do we get started?",
    a: "Book a free consult. We look at your current site, your enquiries and the persona you want, then recommend the right tier and a fixed scope.",
  },
];

export default function WebsitesPage() {
  return (
    <div className="min-h-screen bg-saabai-bg text-saabai-text">
      <Nav activePage="/websites" />

      {/* Hero */}
      <section className="relative px-6 pt-40 pb-24 max-w-5xl mx-auto text-center overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(98,197,209,0.14), transparent 60%)",
          }}
        />
        <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-saabai-teal mb-6">
          AI-Native Websites · Built for Professional Firms
        </p>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05] mb-6">
          A website that works like an{" "}
          <span className="text-gradient">employee</span>
        </h1>
        <p className="text-lg text-saabai-text-muted max-w-2xl mx-auto leading-relaxed mb-10">
          We build and rebuild websites for professional firms, each one with a
          trained AI team member built in. It answers enquiries, qualifies leads
          and works around the clock, so your site does far more than sit there
          looking good.
        </p>
        <a
          href={CALENDLY}
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-block bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
        >
          Book a Free Website Consult
        </a>
      </section>

      {/* AI-native pitch */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <div className="max-w-2xl mb-14">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
            Most websites are a brochure. Yours is a{" "}
            <span className="text-gradient">team member</span>.
          </h2>
          <p className="text-saabai-text-muted leading-relaxed">
            A normal website waits. Someone lands, reads, and usually leaves.
            Ours greets every visitor, answers their questions in your words and
            captures the lead before it goes cold. That is the difference between
            a page and a team member.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-saabai-border rounded-xl overflow-hidden">
          {[
            {
              t: "Answers instantly",
              d: "Every visitor gets a fast, on-brand answer, day or night, without you touching your phone.",
            },
            {
              t: "Never misses a lead",
              d: "Enquiries are captured and sent to you the moment they happen, so slow follow-up stops costing you work.",
            },
            {
              t: "Sounds like your firm",
              d: "The AI is trained on your services and voice, so it reads like your team wrote it, not a generic bot.",
            },
          ].map((item) => (
            <div key={item.t} className="bg-saabai-surface p-8">
              <h3 className="text-lg font-semibold mb-2">{item.t}</h3>
              <p className="text-sm text-saabai-text-muted leading-relaxed">
                {item.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* New build or rebuild */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-10">
            <h3 className="text-2xl font-semibold tracking-tight mb-3">
              New build
            </h3>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              Starting fresh. We design and build a site that fits your firm,
              built to be fast, found on search and ready for the AI to go to
              work from day one.
            </p>
          </div>
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-10">
            <h3 className="text-2xl font-semibold tracking-tight mb-3">
              Rebuild
            </h3>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              Already have a site that looks tired or barely converts. We rebuild
              it to the same standard and add the AI team member, so it finally
              earns its place.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing tiers */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
            Three ways to work with us
          </h2>
          <p className="text-saabai-text-muted max-w-2xl mx-auto leading-relaxed">
            Every tier ships with a trained chatbot. You climb the tiers as you
            want more from the AI, up to a custom avatar that sounds like your
            brand.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col bg-saabai-surface border rounded-2xl p-10 transition-all ${
                tier.highlight
                  ? "border-saabai-teal/60"
                  : "border-saabai-border hover:border-saabai-teal/30"
              }`}
              style={
                tier.highlight
                  ? {
                      boxShadow:
                        "0 0 80px rgba(98,197,209,0.45), 0 0 32px rgba(98,197,209,0.25)",
                    }
                  : undefined
              }
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-saabai-teal text-saabai-bg text-[10px] font-bold tracking-[0.18em] uppercase px-4 py-1.5 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-semibold tracking-tight mb-1">
                  {tier.name}
                </h3>
                <p className="text-sm text-saabai-text-dim">{tier.tagline}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-semibold tracking-tight text-saabai-teal stat-glow">
                    {tier.price}
                  </span>
                  <span className="text-sm text-saabai-text-dim">AUD</span>
                </div>
                <p className="text-xs text-saabai-text-dim">{tier.priceNote}</p>
                <p className="text-xs font-medium text-saabai-teal mt-1">
                  {tier.monthly}
                </p>
              </div>

              <p className="text-sm text-saabai-text-muted leading-relaxed mb-8">
                {tier.description}
              </p>

              <ul className="flex flex-col gap-3 mb-10 flex-1">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-saabai-text-muted leading-relaxed"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal shrink-0 mt-2" />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={CALENDLY}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-center px-6 py-3.5 rounded-xl font-semibold text-sm transition-colors tracking-wide mb-3 ${
                  tier.highlight
                    ? "bg-saabai-teal text-saabai-bg hover:bg-saabai-teal-bright shadow-[0_0_30px_var(--saabai-glow-mid)]"
                    : "bg-saabai-teal text-saabai-bg hover:bg-saabai-teal-bright"
                }`}
              >
                Book a Consult
              </a>
              <a
                href={CALENDLY}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-xs text-saabai-text-dim hover:text-saabai-teal transition-colors tracking-wide"
              >
                Ask a question →
              </a>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-saabai-text-dim mt-8">
          Build fees are quoted from these figures and scoped to your project.
          Monthly care keeps your site and AI running.
        </p>
      </section>

      {/* Chatbot + avatar explainer */}
      <section className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-10 md:p-14">
          <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-saabai-teal mb-4">
            The AI on your site
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
            Every site gets a trained AI. The top tier sounds like{" "}
            <span className="text-gradient">you</span>.
          </h2>
          <p className="text-saabai-text-muted leading-relaxed max-w-2xl mb-6">
            On every tier, your chatbot is trained on your services, your prices
            and your common questions, so it answers the way your team would. On
            the Signature tier we go further and train a custom avatar to look and
            sound like the persona you choose, so the AI becomes a recognisable
            part of your brand rather than a plain chat box in the corner.
          </p>
          <a
            href={CALENDLY}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-semibold text-saabai-teal hover:text-saabai-teal-bright transition-colors tracking-wide"
          >
            See what your AI could sound like →
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 max-w-3xl mx-auto border-t border-saabai-border">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-10 text-center">
          Common questions
        </h2>
        <div className="flex flex-col gap-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group bg-saabai-surface border border-saabai-border rounded-xl px-6 py-5"
            >
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-base font-medium">
                {item.q}
                <span className="text-saabai-teal transition-transform group-open:rotate-45 shrink-0">
                  +
                </span>
              </summary>
              <p className="text-sm text-saabai-text-muted leading-relaxed mt-4">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 px-6 text-center overflow-hidden border-t border-saabai-border">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(98,197,209,0.12), transparent 65%)",
          }}
        />
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-tight mb-6 max-w-3xl mx-auto">
          Let us build you a website that earns its keep
        </h2>
        <p className="text-saabai-text-muted max-w-xl mx-auto leading-relaxed mb-10">
          Book a free consult. We will look at your current site, your enquiries
          and the persona you want, then recommend the right tier and a fixed
          scope.
        </p>
        <a
          href={CALENDLY}
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-block bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
        >
          Book a Free Website Consult
        </a>
      </section>

      <Footer />
    </div>
  );
}
