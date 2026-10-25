"use client";

import Nav from "./Nav";
import Footer from "./Footer";
import JsonLd from "./JsonLd";
import { locationServiceSchema } from "../../lib/seo-entity";
import { breadcrumbSchema, faqSchema } from "../../lib/seo-meta";
import { type LocationConfig } from "../../lib/location-data";

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
    spotlight,
    breadcrumbName,
    serviceName,
    dateModified,
    seo,
  } = config;

  const isHomeBase = slug === "gold-coast";

  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <JsonLd data={locationServiceSchema(city, seo.canonical, seo.description, serviceName)} />
      <JsonLd data={faqSchema(faqs)} />
      <JsonLd data={breadcrumbSchema([{ name: breadcrumbName ?? `Websites and AI ${city}`, path: `/${slug}` }])} />
      {dateModified ? (
        <JsonLd data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          url: seo.canonical,
          name: seo.title,
          dateModified,
        }} />
      ) : null}

      <Nav />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-20 md:pt-52 md:pb-36 px-5 sm:px-6 text-center max-w-5xl mx-auto overflow-hidden">
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
          <a href="/" className="inline-flex items-center min-h-[44px] hover:text-saabai-text transition-colors">
            Home
          </a>
          <span className="mx-2">&rsaquo;</span>
          <span>{city}</span>
        </nav>

        {/* Eyebrow */}
        <p className="relative text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-6">
          {isHomeBase ? "Home base · Gold Coast, QLD" : `Small businesses · ${city}, ${stateCode}`}
        </p>

        {/* Headline */}
        <h1 className="relative text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-8 text-balance">
          {heroHeadline}
        </h1>

        {/* Subheading */}
        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-3xl mx-auto mb-12 leading-relaxed">
          {heroSubheading}
        </p>

        {/* CTA */}
        <div className="relative mb-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <a
            href="/score"
            className="inline-flex items-center justify-center min-h-[48px] bg-saabai-teal text-saabai-bg px-8 py-3 rounded-lg font-semibold hover:bg-saabai-teal-bright transition-colors"
          >
            Get your free AI Readiness Score
          </a>
          <a
            href="/blueprint"
            className="inline-flex items-center justify-center min-h-[48px] border border-saabai-border text-saabai-text px-8 py-3 rounded-lg font-semibold hover:border-saabai-teal transition-colors"
          >
            See Saabai Blueprint
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

      {/* ── Two offers ──────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-5 sm:px-6 border-t border-saabai-border">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            What we do in {city}
          </p>
          <h2 className="text-2xl sm:text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Two ways we help {city} businesses
          </h2>
          <p className="text-saabai-text-muted max-w-3xl mb-10 leading-relaxed">
            {isHomeBase
              ? "We are a Gold Coast team, so local clients can meet us in person. We build for small businesses first, and professional practices too."
              : `Built for small businesses first, and professional practices too. We work with ${city} clients remotely, with calls and screen shares that fit your hours.`}
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-saabai-border p-6 md:p-8 flex flex-col" style={{ background: "var(--saabai-surface)" }}>
              <p className="text-xs font-semibold tracking-widest uppercase text-saabai-text-dim mb-2">Web Solutions</p>
              <h3 className="text-xl font-bold mb-2">We build, host and manage your website</h3>
              <p className="text-saabai-teal font-semibold mb-4">From $2,000 plus $100/mo</p>
              <p className="text-saabai-text-muted text-sm leading-relaxed mb-6">
                A fast, mobile-first site for your {city} business, with hosting, updates and changes handled for you. You run the business, we look after the website.
              </p>
              <a href="/websites" className="mt-auto inline-flex items-center justify-center min-h-[48px] border border-saabai-border rounded-lg px-6 font-semibold hover:border-saabai-teal transition-colors">
                See Web Solutions
              </a>
            </div>
            <div className="rounded-2xl border border-saabai-teal/40 p-6 md:p-8 flex flex-col" style={{ background: "var(--saabai-surface)" }}>
              <p className="text-xs font-semibold tracking-widest uppercase text-saabai-text-dim mb-2">Saabai Blueprint</p>
              <h3 className="text-xl font-bold mb-2">Your plan for AI that runs the busywork</h3>
              <ul className="text-sm text-saabai-text-muted space-y-1 mb-4">
                <li><span className="text-saabai-text font-semibold">Starter $497</span>, async fact-find, no call needed</li>
                <li><span className="text-saabai-text font-semibold">Pro $1,497</span>, delivered in 3 business days</li>
                <li><span className="text-saabai-text font-semibold">Business $3,500</span>, delivered in 2 to 3 weeks</li>
              </ul>
              <p className="text-saabai-text-muted text-sm leading-relaxed mb-6">
                A ranked plan of what to automate first and what it will save. The fee is credited if you book a build within 30 days.
              </p>
              <a href="/blueprint" className="mt-auto inline-flex items-center justify-center min-h-[48px] bg-saabai-teal text-saabai-bg rounded-lg px-6 font-semibold hover:bg-saabai-teal-bright transition-colors">
                Compare Blueprint tiers
              </a>
            </div>
          </div>
          <p className="text-sm text-saabai-text-muted mt-6">
            Not sure where to start?{" "}
            <a href="/score" className="inline-flex items-center min-h-[44px] text-saabai-teal font-medium hover:text-saabai-teal-bright">
              Take the free AI Readiness Score &rarr;
            </a>
          </p>
        </div>
      </section>

      {spotlight ? (
        <section className="py-16 md:py-24 px-5 sm:px-6 border-t border-saabai-border">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
              {spotlight.eyebrow}
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-6">
              {spotlight.title}
            </h2>
            <div className="text-saabai-text-muted text-lg leading-relaxed space-y-4 max-w-3xl">
              {spotlight.paragraphs.map((para) => (
                <p key={para}>{para}</p>
              ))}
            </div>
            <a
              href={spotlight.linkHref}
              className="inline-flex items-center min-h-[44px] mt-6 text-saabai-teal font-medium hover:text-saabai-teal-bright"
            >
              {spotlight.linkLabel} &rarr;
            </a>
          </div>
        </section>
      ) : null}

      {/* ── Local Market Context ────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-5 sm:px-6 border-t border-saabai-border">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            {city} Business Environment
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-10">
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
        className="py-16 md:py-24 px-5 sm:px-6 border-t border-saabai-border"
        style={{ background: "var(--saabai-surface)" }}
      >
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            Common Challenges
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-6">
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
      <section className="py-16 md:py-24 px-5 sm:px-6 border-t border-saabai-border">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            How We Help
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-6">
            Websites and AI Systems for {city} Businesses
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
        className="py-16 md:py-24 px-5 sm:px-6 border-t border-saabai-border"
        style={{ background: "var(--saabai-surface)" }}
      >
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            Real Experience
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-10">
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
            className="inline-flex items-center min-h-[44px] mt-6 text-saabai-teal font-medium hover:text-saabai-teal-bright transition-colors"
          >
            See more case studies &rarr;
          </a>
        </div>
      </section>

      {/* ── Industry Cross-Links ────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-5 sm:px-6 border-t border-saabai-border">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            Work With Us in {city}
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-6">
            How {city} businesses work with Saabai
          </h2>
          <p className="text-saabai-text-muted max-w-3xl mb-12 leading-relaxed">
            A website care plan from $100 a month, a Saabai Blueprint AI audit
            from $497, or start with the free AI score at saabai.ai/score.
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
              className="inline-flex items-center min-h-[44px] text-saabai-teal hover:text-saabai-teal-bright transition-colors"
            >
              View case studies &rarr;
            </a>
            <a
              href="/services"
              className="inline-flex items-center min-h-[44px] text-saabai-teal hover:text-saabai-teal-bright transition-colors"
            >
              All services &rarr;
            </a>
            <a
              href="/blueprint"
              className="inline-flex items-center min-h-[44px] text-saabai-teal hover:text-saabai-teal-bright transition-colors"
            >
              Get a Saabai Blueprint &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-5 sm:px-6 border-t border-saabai-border">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            Common Questions
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-10">
            FAQ: {city} Businesses
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
        className="relative py-16 md:py-24 px-5 sm:px-6 border-t border-saabai-border text-center overflow-hidden"
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
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-6">
            {ctaHeadline}
          </h2>
          <p className="text-saabai-text-muted text-lg mb-10 leading-relaxed">
            {ctaSubtext}
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <a
              href="/blueprint"
              className="inline-flex items-center justify-center min-h-[48px] bg-saabai-teal text-saabai-bg px-8 py-3 rounded-lg font-semibold hover:bg-saabai-teal-bright transition-colors"
            >
              Get your Saabai Blueprint
            </a>
            <a
              href="/score"
              className="inline-flex items-center justify-center min-h-[48px] border border-saabai-border text-saabai-text px-8 py-3 rounded-lg font-semibold hover:border-saabai-teal transition-colors"
            >
              Free AI Readiness Score
            </a>
          </div>
          <p className="text-xs text-saabai-text-dim mt-6">
            Blueprint from $497, credited if you build with us within 30 days.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
