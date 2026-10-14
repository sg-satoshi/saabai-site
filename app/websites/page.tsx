import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import InShort from "../components/InShort";
import JsonLd from "../components/JsonLd";

export const metadata: Metadata = {
  title: "Websites and Care Plans for Small Businesses",
  description:
    "Website care plans for Australian small businesses from Saabai on the Gold Coast. Presence $100, Growth $200, Signature $300 a month, builds from $2,000, AI enquiry chatbot included.",
  alternates: { canonical: "https://www.saabai.ai/websites" },
  openGraph: {
    url: "https://www.saabai.ai/websites",
    title: "Website Care Plans for Small Businesses | Saabai",
    description:
      "Website care plans for Australian small businesses from Saabai on the Gold Coast. Presence $100, Growth $200, Signature $300 a month, builds from $2,000, AI enquiry chatbot included.",
  },
};

const CALENDLY = "https://calendly.com/shanegoldberg/30min";

const tiers = [
  {
    name: "Presence",
    tagline: "Get online with an AI that answers",
    price: "$2,000",
    priceNote: "fixed price build, buy online",
    monthly: "then $100/mo care",
    description:
      "A polished, fast website built for your business, with a trained enquiry chatbot that answers common questions and captures every lead.",
    features: [
      "Custom site designed for your business",
      "Fast, mobile and search ready",
      "Trained enquiry chatbot that answers FAQs",
      "Lead capture straight to your inbox",
      "Hosting, security and updates included",
    ],
    highlight: false,
  },
  {
    name: "Growth",
    tagline: "For businesses that want the site to sell",
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
    a: "We train the AI to look and sound like a persona you choose, so it matches your brand voice rather than sounding like a generic bot. It becomes a recognisable part of your business.",
  },
  {
    q: "What does the monthly care cover?",
    a: "Hosting, security, updates and keeping your AI running and trained. Your site stays fast, current and looked after without you lifting a finger.",
  },
  {
    q: "How much is a Saabai website care plan?",
    a: "Presence is $100 a month, Growth is $200 a month and Signature is $300 a month (AUD). Builds start from $2,000, $4,000 and $6,500 respectively. Not sure which fits? Take the free AI score at saabai.ai/score or book a free consult.",
  },
  {
    q: "How do we get started?",
    a: "Book a free consult. We look at your current site, your enquiries and the persona you want, then recommend the right tier and a fixed scope.",
  },
];

const SITE = "https://www.saabai.ai";
const CARE: Record<string, number> = { Presence: 100, Growth: 200, Signature: 300 };

const websitesSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": `${SITE}/websites#service`,
      name: "Saabai website care plans",
      serviceType: "Website build, hosting and care plan",
      description:
        "Saabai builds, hosts and manages small business websites with a trained AI enquiry chatbot built in. Monthly care covers hosting, security, updates and keeping the AI trained.",
      url: `${SITE}/websites`,
      provider: { "@id": `${SITE}/#organization` },
      areaServed: { "@type": "Country", name: "Australia" },
      offers: tiers.map((t) => ({
        "@type": "Offer",
        name: `${t.name} care plan`,
        description: `${t.tagline}. Build ${t.price}, ${t.monthly}.`,
        price: CARE[t.name],
        priceCurrency: "AUD",
        availability: "https://schema.org/InStock",
        url: `${SITE}/websites`,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: CARE[t.name],
          priceCurrency: "AUD",
          unitCode: "MON",
          referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
        },
      })),
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Websites", item: `${SITE}/websites` },
      ],
    },
  ],
};

export default function WebsitesPage() {
  return (
    <div className="min-h-screen bg-saabai-bg text-saabai-text">
      <JsonLd data={websitesSchema} />
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
          Website Care Plans · Gold Coast · Australia-wide
        </p>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05] mb-6">
          A website that works like an{" "}
          <span className="text-gradient">employee</span>
        </h1>
        <p className="text-lg text-saabai-text-muted max-w-2xl mx-auto leading-relaxed mb-10">
          We build, host and look after websites for Australian small
          businesses, each one with a trained AI team member built in. It
          answers enquiries, qualifies leads and works around the clock, so your
          site does more than sit there looking pretty.
        </p>

        <a
          href={CALENDLY}
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-block bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
        >
          Book a Free Website Consult
        </a>
        <InShort>
          Saabai builds and looks after small business websites on a monthly care
          plan: <strong>Presence $100</strong>, <strong>Growth $200</strong> or{" "}
          <strong>Signature $300</strong> a month (AUD), with builds from{" "}
          <strong>$2,000</strong>, or buy a Presence site online for a fixed{" "}
          <strong>$2,000</strong>. Hosting, security, updates and a trained AI
          enquiry chatbot are included. Founded by Shane Goldberg on the Gold
          Coast, Queensland.
        </InShort>
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
              t: "Sounds like you",
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
              Starting fresh. We design and build a site that fits your business,
              built to be fast, found on search and ready for the AI to go to
              work from day one.
            </p>
          </div>
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-10">
            <h3 className="text-2xl font-semibold tracking-tight mb-3">
              Rebuild
            </h3>
            <p className="text-sm text-saabai-text-muted leading-relaxed">
              Got a site that looks tired or barely converts? We rebuild
              it to the same standard and add the AI team member, so it finally
              earns its place.
            </p>
          </div>
        </div>
      </section>

      {/* Two paths: buy Presence now, or book a call for a custom build */}
      <section id="buy" className="py-24 px-6 max-w-5xl mx-auto border-t border-saabai-border">
        <div className="text-center mb-12">
          <p className="text-xs tracking-[0.2em] uppercase text-saabai-text-dim mb-3">Website pricing</p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
            Buy Presence now, or book a call for a custom build
          </h2>
          <p className="text-saabai-text-muted max-w-2xl mx-auto leading-relaxed">
            Two clear paths. Presence is a fixed price you can buy online today.
            Growth and Signature are scoped with you on a free call.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div
            className="relative flex flex-col bg-saabai-surface border border-saabai-teal/60 rounded-2xl p-8 sm:p-10"
            style={{ boxShadow: "0 0 80px rgba(98,197,209,0.35), 0 0 32px rgba(98,197,209,0.2)" }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-saabai-teal text-saabai-bg text-[10px] font-bold tracking-[0.18em] uppercase px-4 py-1.5 rounded-full">
              Buy now
            </div>
            <p className="text-xs tracking-[0.18em] uppercase text-saabai-teal mb-2">Fixed price</p>
            <h3 className="text-2xl font-semibold tracking-tight mb-1">Presence, buy now</h3>
            <p className="text-sm text-saabai-text-dim mb-6">A polished site with a trained enquiry chatbot. One path, one price.</p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-semibold tracking-tight text-saabai-teal stat-glow">$2,000</span>
              <span className="text-sm text-saabai-text-dim">AUD</span>
            </div>
            <p className="text-xs text-saabai-text-dim">One-off build</p>
            <p className="text-xs font-medium text-saabai-teal mt-1 mb-6">Then $100/mo care, starting at go-live</p>
            <p className="text-sm text-saabai-text-muted leading-relaxed mb-6">
              Custom site, mobile and search ready, a chatbot that answers FAQs and captures leads, with hosting and updates included.
            </p>
            <ul className="flex flex-col gap-3 mb-8 flex-1">
              {[
                "Pay a $1,000 deposit, fill in a short form, we start within 5 business days",
                "Fixed scope with 2 rounds of revisions, no discovery call needed",
                "$1,000 balance invoiced before go-live",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-saabai-text-muted leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal shrink-0 mt-2" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="/websites/buy"
              className="text-center min-h-12 flex items-center justify-center px-6 py-3.5 rounded-xl font-semibold text-sm bg-saabai-teal text-saabai-bg hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_30px_var(--saabai-glow-mid)]"
            >
              Buy Presence · pay $1,000 deposit
            </a>
            <p className="text-center text-xs text-saabai-text-dim mt-3">
              AUD. GST not applicable. Card via Stripe. Deposit refundable only before work starts.
            </p>
          </div>
          <div className="flex flex-col bg-saabai-surface border border-saabai-border rounded-2xl p-8 sm:p-10">
            <p className="text-xs tracking-[0.18em] uppercase text-saabai-teal mb-2">Custom build</p>
            <h3 className="text-2xl font-semibold tracking-tight mb-1">Growth and Signature</h3>
            <p className="text-sm text-saabai-text-dim mb-6">Larger sites, rebuilds, lead qualifying, CRM handoff, or a custom avatar.</p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-semibold tracking-tight text-saabai-teal stat-glow">from $4,000</span>
              <span className="text-sm text-saabai-text-dim">AUD</span>
            </div>
            <p className="text-xs text-saabai-text-dim">One-off build · Growth from $4,000 · Signature from $6,500</p>
            <p className="text-xs font-medium text-saabai-teal mt-1 mb-6">Then $200 or $300/mo care</p>
            <p className="text-sm text-saabai-text-muted leading-relaxed mb-6">
              Scoped with you on a free 30-minute call. Same prices as the Growth and Signature cards below.
            </p>
            <ul className="flex flex-col gap-3 mb-8 flex-1">
              {["Larger site or full rebuild", "Lead qualifying chatbot with booking", "CRM handoff and light automations", "Signature: custom avatar that sounds like your brand"].map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-saabai-text-muted leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal shrink-0 mt-2" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={CALENDLY}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-center min-h-12 flex items-center justify-center px-6 py-3.5 rounded-xl font-semibold text-sm border border-saabai-teal/60 text-saabai-teal hover:bg-saabai-teal/10 transition-colors tracking-wide"
            >
              Book a Free 30-Min Call
            </a>
            <p className="text-center text-xs text-saabai-text-dim mt-3">No deposit until we agree a fixed quote.</p>
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
                href={tier.name === "Presence" ? "/websites/buy" : CALENDLY}
                {...(tier.name === "Presence" ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                className={`text-center px-6 py-3.5 rounded-xl font-semibold text-sm transition-colors tracking-wide mb-3 ${
                  tier.highlight
                    ? "bg-saabai-teal text-saabai-bg hover:bg-saabai-teal-bright shadow-[0_0_30px_var(--saabai-glow-mid)]"
                    : "bg-saabai-teal text-saabai-bg hover:bg-saabai-teal-bright"
                }`}
              >
                {tier.name === "Presence" ? "Buy now · pay deposit" : "Book a Free 30-Min Call"}
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
          A website that earns its keep, not just its hosting fee
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
