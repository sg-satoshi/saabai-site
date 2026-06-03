"use client";

import Nav from "./Nav";
import Footer from "./Footer";
import { ALL_LOCATIONS, type LocationConfig } from "../../lib/location-data";

interface Props {
  config: LocationConfig;
}

export default function LocationPage({ config }: Props) {
  const {
    city,
    slug,
    stateCode,
    heroHeadline,
    heroSubheading,
    industries,
    marketContext,
    challengesIntro,
    challenges,
    howWeHelpIntro,
    services,
    caseStudy,
    industryLinks,
    faqs,
    ctaHeadline,
    ctaSubtext,
    seo,
  } = config;

  // ── JSON-LD Schemas ──────────────────────────────────────────────────────
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Saabai",
    url: seo.canonical,
    description: seo.description,
    serviceType: "AI Automation",
    areaServed: {
      "@type": "City",
      name: city,
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: stateCode,
      },
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.saabai.ai",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: `AI Automation ${city}`,
        item: seo.canonical,
      },
    ],
  };

  const otherLocations = ALL_LOCATIONS.filter((loc) => loc.slug !== slug);

  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Nav />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-52 pb-36 px-6 text-center max-w-5xl mx-auto overflow-hidden">
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

        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="relative text-xs text-saabai-text-dim mb-8"
        >
          <a href="/" className="hover:text-saabai-text transition-colors">
            Home
          </a>
          <span className="mx-2">&rsaquo;</span>
          <span>AI Automation {city}</span>
        </nav>

        {/* Eyebrow */}
        <p className="relative text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-6">
          AI Consulting · {city}, {stateCode}
        </p>

        {/* Headline */}
        <h1 className="relative text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-8">
          {heroHeadline}
        </h1>

        {/* Subheading */}
        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-3xl mx-auto mb-12 leading-relaxed">
          {heroSubheading}
        </p>

        {/* CTA */}
        <div className="relative mb-10">
          <a
            href="/ai-audit"
            className="inline-block bg-saabai-teal text-saabai-bg px-8 py-4 rounded-lg font-semibold hover:bg-saabai-teal-bright transition-colors"
          >
            Book an AI Strategy Session
          </a>
        </div>

        {/* Industry pills */}
        <div className="relative flex flex-wrap justify-center gap-2">
          {industries.map((industry) => (
            <span
              key={industry}
              className="border border-saabai-border text-saabai-text-dim text-xs rounded-full px-3 py-1"
            >
              {industry}
            </span>
          ))}
        </div>
      </section>

      {/* ── Local Market Context ────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-saabai-border">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            {city} Business Environment
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-10">
            Understanding the {city} Market
          </h2>
          <div className="text-saabai-text-muted text-lg leading-relaxed space-y-6 max-w-3xl">
            {marketContext.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </section>

      {/* ── Business Challenges ─────────────────────────────────────────── */}
      <section
        className="py-24 px-6 border-t border-saabai-border"
        style={{ background: "var(--saabai-surface)" }}
      >
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            Common Challenges
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
            What {city} Businesses Are Up Against
          </h2>
          <p className="text-saabai-text-muted max-w-3xl mb-12 leading-relaxed">
            {challengesIntro}
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {challenges.map((challenge) => (
              <div
                key={challenge.title}
                className="rounded-xl border border-saabai-border p-6"
                style={{ background: "var(--saabai-surface-raised)" }}
              >
                <span className="text-saabai-teal text-xl mb-4 inline-block">
                  &rarr;
                </span>
                <h3 className="font-bold mb-2">{challenge.title}</h3>
                <p className="text-saabai-text-muted text-sm leading-relaxed">
                  {challenge.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How Saabai Helps ────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-saabai-border">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            How We Help
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
            AI Systems for {city} Businesses
          </h2>
          <p className="text-saabai-text-muted max-w-3xl mb-12 leading-relaxed">
            {howWeHelpIntro}
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {services.map((service, i) => (
              <div
                key={service.title}
                className="rounded-xl border border-saabai-border p-6"
                style={{ background: "var(--saabai-surface)" }}
              >
                <span className="text-saabai-teal font-mono text-sm font-semibold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-bold mt-3 mb-2">{service.title}</h3>
                <p className="text-saabai-text-muted text-sm leading-relaxed">
                  {service.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Case Study ──────────────────────────────────────────────────── */}
      <section
        className="py-24 px-6 border-t border-saabai-border"
        style={{ background: "var(--saabai-surface)" }}
      >
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            Real Experience
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-10">
            Work We Have Done
          </h2>
          <div
            className="rounded-2xl border border-saabai-border p-8 md:p-10"
            style={{ background: "var(--saabai-surface-raised)" }}
          >
            <h3 className="text-2xl font-bold">{caseStudy.client}</h3>
            <p className="text-saabai-teal text-sm font-semibold mt-1 mb-6">
              {caseStudy.industry}
            </p>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-saabai-text-dim mb-2">
                Context
              </p>
              <p className="text-saabai-text-muted leading-relaxed">
                {caseStudy.context}
              </p>
            </div>
            <div className="my-7 border-t border-saabai-border" />
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-saabai-text-dim mb-2">
                Outcome
              </p>
              <p className="text-saabai-text-muted leading-relaxed">
                {caseStudy.outcome}
              </p>
            </div>
          </div>
          <a
            href="/case-studies"
            className="inline-block mt-6 text-saabai-teal font-medium hover:text-saabai-teal-bright transition-colors"
          >
            See more case studies &rarr;
          </a>
        </div>
      </section>

      {/* ── Industry Cross-Links ────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-saabai-border">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            {city} Businesses We Help
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
            Industries in {city}
          </h2>
          <p className="text-saabai-text-muted max-w-3xl mb-12 leading-relaxed">
            Saabai works across {city}&apos;s major industry sectors, building
            AI systems tailored to the way each one operates.
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {industryLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block rounded-xl border border-saabai-border p-6 hover:border-saabai-teal/30 transition-colors"
                style={{ background: "var(--saabai-surface)" }}
              >
                <h3 className="font-bold mb-2">
                  {city} {link.industry} &rarr;
                </h3>
                <p className="text-saabai-text-muted text-sm leading-relaxed">
                  {link.context}
                </p>
              </a>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 mt-10 text-sm font-medium">
            <a
              href="/case-studies"
              className="text-saabai-teal hover:text-saabai-teal-bright transition-colors"
            >
              View case studies &rarr;
            </a>
            <a
              href="/services"
              className="text-saabai-teal hover:text-saabai-teal-bright transition-colors"
            >
              All services &rarr;
            </a>
            <a
              href="/ai-audit"
              className="text-saabai-teal hover:text-saabai-teal-bright transition-colors"
            >
              Book an AI audit &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-saabai-border">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            Common Questions
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-10">
            FAQ &mdash; {city} Businesses
          </h2>
          <div className="space-y-4 max-w-3xl">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-saabai-border p-5"
                style={{ background: "var(--saabai-surface)" }}
              >
                <summary className="flex items-center justify-between cursor-pointer list-none font-medium">
                  <span>{faq.q}</span>
                  <span className="text-saabai-teal text-xl ml-4 shrink-0 group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="text-saabai-text-muted leading-relaxed mt-4">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section
        className="relative py-24 px-6 border-t border-saabai-border text-center overflow-hidden"
        style={{ background: "var(--saabai-surface)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 40%, var(--saabai-glow-mid) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
            {ctaHeadline}
          </h2>
          <p className="text-saabai-text-muted text-lg mb-10 leading-relaxed">
            {ctaSubtext}
          </p>
          <a
            href="/ai-audit"
            className="inline-block bg-saabai-teal text-saabai-bg px-8 py-4 rounded-lg font-semibold hover:bg-saabai-teal-bright transition-colors"
          >
            Book an AI Strategy Session
          </a>
          <p className="text-xs text-saabai-text-dim mt-6">
            No obligation. 30 minutes. Genuine advice for your business.
          </p>

          {/* Also serving */}
          <div className="mt-14 pt-10 border-t border-saabai-border">
            <p className="text-xs font-semibold tracking-widest uppercase text-saabai-text-dim mb-4">
              Also serving
            </p>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
              {otherLocations.map((loc) => (
                <a
                  key={loc.slug}
                  href={`/${loc.slug}`}
                  className="text-saabai-text-muted hover:text-saabai-teal transition-colors"
                >
                  {loc.city}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
